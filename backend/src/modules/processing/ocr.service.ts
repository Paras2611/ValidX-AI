import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { StorageService } from '../storage/storage.service';

export interface ExtractedFieldResult {
  fieldName: string;
  rawValue: string;
  normalizedValue: string;
  confidence: number;
  extractionMethod: 'pdf_text' | 'ocr' | 'ai' | 'manual';
  pageNumber: number;
}

export interface ProcessingResult {
  rawText: string;
  pageCount: number;
  fields: ExtractedFieldResult[];
}

export class OcrService {
  /**
   * Extract text from PDF using digital stream parser or fallback
   */
  public static async processDocument(
    storageKey: string,
    mimeType: string
  ): Promise<ProcessingResult> {
    const filePath = StorageService.getFilePath(storageKey);
    if (!filePath) {
      throw new Error(`File not found in storage for key: ${storageKey}`);
    }

    const fileBuffer = fs.readFileSync(filePath);

    if (mimeType === 'application/pdf') {
      let extractedText = '';
      let pageCount = 1;

      // Method 1: Try modern PDFParse instance if available
      try {
        const pdfModule: any = require('pdf-parse');
        if (pdfModule?.PDFParse) {
          const parser = new pdfModule.PDFParse({ data: fileBuffer });
          await parser.load();
          const textResult = await parser.getText();
          if (typeof textResult === 'string' && textResult.trim().length > 0) {
            extractedText = textResult;
          } else if (textResult?.text) {
            extractedText = textResult.text;
          }
          if (typeof parser.getPageCount === 'function') {
            pageCount = await parser.getPageCount();
          }
        } else if (typeof pdfModule === 'function') {
          const res = await pdfModule(fileBuffer);
          extractedText = res.text || '';
          pageCount = res.numpages || 1;
        }
      } catch (err: any) {
        // Continue to stream extractor
      }

      // Method 2: High-reliability digital text stream regex extractor
      if (!extractedText || extractedText.trim().length < 5) {
        const rawPdfString = fileBuffer.toString('latin1');
        // Extract literal string blocks inside Tj or TJ operations: (Hello World) Tj
        const matches = rawPdfString.matchAll(/\(([^)]+)\)\s*(?:Tj|'|")/g);
        const textParts: string[] = [];
        for (const m of matches) {
          if (m[1]) textParts.push(m[1]);
        }
        if (textParts.length > 0) {
          extractedText = textParts.join(' ');
        }
      }

      const fields = this.extractFieldsFromText(extractedText, 'pdf_text');
      return {
        rawText: extractedText,
        pageCount: Math.max(1, pageCount),
        fields,
      };
    }

    // Process image documents (PNG, JPEG) with Tesseract.js
    if (mimeType.startsWith('image/')) {
      let worker: any = null;
      try {
        worker = await createWorker('eng');
        const ret = await worker.recognize(filePath);
        const text = ret.data?.text || '';
        const confidence = (ret.data?.confidence || 80) / 100;
        const fields = this.extractFieldsFromText(text, 'ocr', confidence);

        return {
          rawText: text,
          pageCount: 1,
          fields,
        };
      } catch (ocrErr: any) {
        console.warn('Image OCR processing warning:', ocrErr?.message);
        return {
          rawText: '',
          pageCount: 1,
          fields: [],
        };
      } finally {
        if (worker) {
          try {
            await worker.terminate();
          } catch {
            // ignore
          }
        }
      }
    }

    return {
      rawText: '',
      pageCount: 1,
      fields: [],
    };
  }

  /**
   * Deterministic pattern extractors for key verification fields
   */
  public static extractFieldsFromText(
    text: string,
    method: 'pdf_text' | 'ocr' | 'ai' = 'pdf_text',
    baseConfidence: number = 0.95
  ): ExtractedFieldResult[] {
    const fields: ExtractedFieldResult[] = [];
    const cleanText = text.replace(/\r\n/g, '\n');

    // 1. Name patterns: Name:\s*([A-Za-z\s]+)
    const nameMatch = cleanText.match(/(?:Name|Full Name|Candidate Name|Applicant Name|Student Name|Holder Name)\s*[:\-]?\s*([A-Za-z\s.]{3,40})/i);
    if (nameMatch && nameMatch[1]) {
      const raw = nameMatch[1].trim();
      fields.push({
        fieldName: 'full_name',
        rawValue: raw,
        normalizedValue: raw.toUpperCase().replace(/\s+/g, ' '),
        confidence: baseConfidence,
        extractionMethod: method,
        pageNumber: 1,
      });
    }

    // 2. Date of Birth patterns
    const dobMatch = cleanText.match(/(?:DOB|Date of Birth|Birth Date)\s*[:\-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
    if (dobMatch && dobMatch[1]) {
      const raw = dobMatch[1].trim();
      fields.push({
        fieldName: 'dob',
        rawValue: raw,
        normalizedValue: this.normalizeDate(raw),
        confidence: baseConfidence,
        extractionMethod: method,
        pageNumber: 1,
      });
    }

    // 3. Annual Income patterns
    const incomeMatch = cleanText.match(/(?:Annual Income|Family Income|Total Income|Gross Income)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
    if (incomeMatch && incomeMatch[1]) {
      const raw = incomeMatch[1].trim();
      const numVal = raw.replace(/,/g, '');
      fields.push({
        fieldName: 'income_annual',
        rawValue: raw,
        normalizedValue: numVal,
        confidence: baseConfidence,
        extractionMethod: method,
        pageNumber: 1,
      });
    }

    // 4. GPA / Percentage patterns
    const gpaMatch = cleanText.match(/(?:CGPA|GPA|Percentage|Marks|Score)\s*[:\-]?\s*([0-9]{1,2}(?:\.[0-9]{1,2})?%?)/i);
    if (gpaMatch && gpaMatch[1]) {
      const raw = gpaMatch[1].trim();
      const cleanVal = raw.replace('%', '');
      fields.push({
        fieldName: 'undergrad_gpa',
        rawValue: raw,
        normalizedValue: cleanVal,
        confidence: baseConfidence,
        extractionMethod: method,
        pageNumber: 1,
      });
    }

    // 5. Document / Identity Number (PAN: 10 chars, Aadhaar: 12 digits, Registration: alphanumeric)
    const panMatch = cleanText.match(/\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/);
    if (panMatch && panMatch[1]) {
      fields.push({
        fieldName: 'tax_id_pan',
        rawValue: panMatch[1],
        normalizedValue: panMatch[1].toUpperCase(),
        confidence: 0.98,
        extractionMethod: method,
        pageNumber: 1,
      });
    }

    const aadhaarMatch = cleanText.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
    if (aadhaarMatch && aadhaarMatch[1]) {
      fields.push({
        fieldName: 'aadhaar_no',
        rawValue: aadhaarMatch[1],
        normalizedValue: aadhaarMatch[1].replace(/\s/g, ''),
        confidence: 0.95,
        extractionMethod: method,
        pageNumber: 1,
      });
    }

    // 6. Expiry Date
    const expiryMatch = cleanText.match(/(?:Valid Upto|Expiry Date|Expires On|Valid Till)\s*[:\-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
    if (expiryMatch && expiryMatch[1]) {
      const raw = expiryMatch[1].trim();
      fields.push({
        fieldName: 'expiry_date',
        rawValue: raw,
        normalizedValue: this.normalizeDate(raw),
        confidence: baseConfidence,
        extractionMethod: method,
        pageNumber: 1,
      });
    }

    // 7. Issuing Authority
    const authorityMatch = cleanText.match(/(?:Issued By|Authority|Government of [A-Za-z]+|Tahsildar|Revenue Department|Sub-Divisional Magistrate)/i);
    if (authorityMatch && authorityMatch[0]) {
      fields.push({
        fieldName: 'issuing_authority',
        rawValue: authorityMatch[0].trim(),
        normalizedValue: authorityMatch[0].trim().toUpperCase(),
        confidence: 0.88,
        extractionMethod: method,
        pageNumber: 1,
      });
    }

    return fields;
  }

  public static normalizeDate(raw: string): string {
    const parts = raw.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else {
        // DD-MM-YYYY
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    return raw;
  }
}
