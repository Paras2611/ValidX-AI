import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';

export interface StoredFileMetadata {
  storageKey: string;
  filePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
}

export class StorageService {
  /**
   * Validate file buffer signature (magic bytes) to prevent extension spoofing
   */
  public static validateFileSignature(buffer: Buffer, declaredMimeType: string): boolean {
    if (buffer.length < 4) return false;

    // PDF signature: %PDF (25 50 44 46)
    if (
      declaredMimeType === 'application/pdf' &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return true;
    }

    // PNG signature: 89 50 4E 47
    if (
      declaredMimeType === 'image/png' &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return true;
    }

    // JPEG signature: FF D8 FF
    if (
      (declaredMimeType === 'image/jpeg' || declaredMimeType === 'image/jpg') &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return true;
    }

    return false;
  }

  /**
   * Save an uploaded file to private vault with unique storage key and SHA-256 hash
   */
  public static saveFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): StoredFileMetadata {
    // Generate secure randomized storage key
    const ext = path.extname(originalFilename).toLowerCase() || '.bin';
    const storageKey = `${uuidv4()}${ext}`;
    const targetPath = path.join(config.storageDir, storageKey);

    // Compute cryptographic SHA-256 hash
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Atomic write to private vault
    fs.writeFileSync(targetPath, fileBuffer);

    return {
      storageKey,
      filePath: targetPath,
      originalFilename,
      mimeType,
      sizeBytes: fileBuffer.length,
      sha256Hash: hash,
    };
  }

  /**
   * Get file path for a storage key
   */
  public static getFilePath(storageKey: string): string | null {
    // Prevent path traversal
    const sanitizedKey = path.basename(storageKey);
    const fullPath = path.join(config.storageDir, sanitizedKey);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return fullPath;
  }

  /**
   * Read file buffer
   */
  public static getFileBuffer(storageKey: string): Buffer | null {
    const filePath = this.getFilePath(storageKey);
    if (!filePath) return null;
    return fs.readFileSync(filePath);
  }

  /**
   * Delete file from private storage
   */
  public static deleteFile(storageKey: string): boolean {
    const filePath = this.getFilePath(storageKey);
    if (!filePath) return false;
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
