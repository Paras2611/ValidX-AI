import { Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import { config } from '../../config';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { StorageService } from '../storage/storage.service';
import { OcrService } from '../processing/ocr.service';
import { AuditService } from '../audit/audit.service';
import { Document, ExtractedField } from '../../types';

// Multer memory storage configuration with size limit
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
});

export class DocumentsController {
  /**
   * Upload document for an application
   */
  public static async uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { applicationId } = req.params;
      const { document_type } = req.body;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'Bad Request', message: 'No file was uploaded' });
        return;
      }

      if (!document_type) {
        res.status(400).json({ error: 'Bad Request', message: 'document_type is required' });
        return;
      }

      const app = db.findById('applications', applicationId);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      // Authorization check
      if (user.role === 'applicant' && app.applicant_id !== user.id) {
        res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        return;
      }

      // Check application status allows upload
      if (!['draft', 'action_required', 'under_review'].includes(app.status)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Cannot upload documents when application is in status '${app.status}'`,
        });
        return;
      }

      // 1. Validate File Signature (Magic Bytes)
      const isValidSignature = StorageService.validateFileSignature(file.buffer, file.mimetype);
      if (!isValidSignature) {
        AuditService.log({
          actorId: user.id,
          actorRole: user.role,
          action: 'DOCUMENT_UPLOAD_INVALID_SIGNATURE',
          resourceType: 'DOCUMENT',
          outcome: 'failure',
          ipAddress: req.ip,
          metadata: { filename: file.originalname, mimetype: file.mimetype },
        });

        res.status(400).json({
          error: 'Validation Error',
          message: 'File content does not match declared MIME signature (file may be corrupted or spoofed)',
        });
        return;
      }

      // 2. Save securely to private vault & compute SHA-256
      const stored = StorageService.saveFile(file.buffer, file.originalname, file.mimetype);

      // Check if document of this type already exists for application (replace or version)
      const existingDoc = db.findOne('documents', (d) => d.application_id === applicationId && d.document_type === document_type);
      let docId: string;

      if (existingDoc) {
        docId = existingDoc.id;
        // Clean up previous extracted fields
        db.deleteWhere('extracted_fields', (f) => f.document_id === docId);

        db.update('documents', docId, {
          original_filename: stored.originalFilename,
          storage_key: stored.storageKey,
          mime_type: stored.mimeType,
          file_size: stored.sizeBytes,
          sha256_hash: stored.sha256Hash,
          status: 'uploaded',
        });
      } else {
        docId = uuidv4();
        const docRecord: Document = {
          id: docId,
          application_id: applicationId,
          document_type,
          original_filename: stored.originalFilename,
          storage_key: stored.storageKey,
          mime_type: stored.mimeType,
          file_size: stored.sizeBytes,
          sha256_hash: stored.sha256Hash,
          status: 'uploaded',
          page_count: 1,
          uploader_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.insert('documents', docRecord);
      }

      // 3. Immediately trigger OCR and structured field extraction
      try {
        const processRes = await OcrService.processDocument(stored.storageKey, stored.mimeType);
        db.update('documents', docId, {
          status: 'verified',
          page_count: processRes.pageCount,
        });

        for (const ef of processRes.fields) {
          const fieldRecord: ExtractedField = {
            id: uuidv4(),
            document_id: docId,
            field_name: ef.fieldName,
            raw_value: ef.rawValue,
            normalized_value: ef.normalizedValue,
            confidence: ef.confidence,
            extraction_method: ef.extractionMethod,
            page_number: ef.pageNumber,
            is_confirmed: false,
            created_at: new Date().toISOString(),
          };
          db.insert('extracted_fields', fieldRecord);
        }
      } catch (ocrErr: any) {
        console.warn(`OCR warning on document ${docId}:`, ocrErr.message);
      }

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'DOCUMENT_UPLOADED',
        resourceType: 'DOCUMENT',
        resourceId: docId,
        outcome: 'success',
        ipAddress: req.ip,
        metadata: {
          filename: stored.originalFilename,
          sha256: stored.sha256Hash,
          sizeBytes: stored.sizeBytes,
        },
      });

      const updatedDoc = db.findById('documents', docId);
      const extracted = db.find('extracted_fields', (f) => f.document_id === docId);

      res.status(201).json({
        message: 'Document uploaded and processed successfully',
        document: updatedDoc,
        extracted_fields: extracted,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Securely stream document content (preview / download)
   */
  public static async getDocumentContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const doc = db.findById('documents', id);
      if (!doc) {
        res.status(404).json({ error: 'Not Found', message: 'Document not found' });
        return;
      }

      const app = db.findById('applications', doc.application_id);
      if (!app) {
        res.status(404).json({ error: 'Not Found', message: 'Application not found' });
        return;
      }

      // IDOR Permission Check
      if (user.role === 'applicant' && app.applicant_id !== user.id) {
        AuditService.log({
          actorId: user.id,
          actorRole: user.role,
          action: 'UNAUTHORIZED_DOCUMENT_STREAM_ACCESS',
          resourceType: 'DOCUMENT',
          resourceId: id,
          outcome: 'denied',
          ipAddress: req.ip,
        });
        res.status(403).json({ error: 'Forbidden', message: 'Access denied to document content' });
        return;
      }

      const buffer = StorageService.getFileBuffer(doc.storage_key);
      if (!buffer) {
        res.status(404).json({ error: 'Not Found', message: 'Physical file not found in storage vault' });
        return;
      }

      res.setHeader('Content-Type', doc.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * Get document metadata and extracted fields
   */
  public static async getDocumentDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const doc = db.findById('documents', id);
      if (!doc) {
        res.status(404).json({ error: 'Not Found', message: 'Document not found' });
        return;
      }

      const fields = db.find('extracted_fields', (f) => f.document_id === id);
      res.json({ document: doc, extracted_fields: fields });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}
