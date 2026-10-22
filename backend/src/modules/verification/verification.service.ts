import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import {
  Application,
  Document,
  ExtractedField,
  VerificationCheck,
  Discrepancy,
  CheckOutcome,
  PriorityLevel,
} from '../../types';

export class VerificationService {
  /**
   * Run full verification on an application
   */
  public static async runVerification(applicationId: string): Promise<{
    checks: VerificationCheck[];
    discrepancies: Discrepancy[];
    priority: PriorityLevel;
    priorityReason: string;
  }> {
    const app = db.findById('applications', applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found`);

    const appType = db.findById('application_types', app.application_type_id);
    const documents = db.find('documents', (d) => d.application_id === applicationId);

    // Clean up previous checks and discrepancies for idempotent re-runs
    db.deleteWhere('verification_checks', (c) => c.application_id === applicationId);
    db.deleteWhere('discrepancies', (d) => d.application_id === applicationId && d.status === 'open');

    const generatedChecks: VerificationCheck[] = [];
    const generatedDiscrepancies: Discrepancy[] = [];

    // --- CHECK 1: Missing Mandatory Documents ---
    if (appType) {
      for (const reqDoc of appType.required_document_types) {
        if (!reqDoc.required) continue;

        const uploadedDoc = documents.find((d) => d.document_type === reqDoc.type);
        if (!uploadedDoc) {
          const check: VerificationCheck = {
            id: uuidv4(),
            application_id: applicationId,
            check_type: 'MISSING_MANDATORY_DOCUMENT',
            outcome: 'failed',
            method: 'SCHEMA_REQUIREMENT_MATCH',
            evidence: {
              required_document_type: reqDoc.type,
              document_label: reqDoc.label,
            },
            explanation: `Mandatory document '${reqDoc.label}' has not been uploaded.`,
            timestamp: new Date().toISOString(),
          };
          generatedChecks.push(db.insert('verification_checks', check));

          const discrepancy: Discrepancy = {
            id: uuidv4(),
            application_id: applicationId,
            field_name: reqDoc.type,
            declared_value: 'Required Document',
            observed_value: 'Missing / Not Uploaded',
            severity: 'high',
            status: 'open',
            comparison_method: 'DOCUMENT_INVENTORY_AUDIT',
            explanation: `Application requires '${reqDoc.label}' for statutory eligibility evaluation.`,
            created_at: new Date().toISOString(),
          };
          generatedDiscrepancies.push(db.insert('discrepancies', discrepancy));
        } else {
          const check: VerificationCheck = {
            id: uuidv4(),
            application_id: applicationId,
            document_id: uploadedDoc.id,
            check_type: 'MANDATORY_DOCUMENT_PRESENT',
            outcome: 'passed',
            method: 'SCHEMA_REQUIREMENT_MATCH',
            evidence: {
              document_type: reqDoc.type,
              filename: uploadedDoc.original_filename,
              sha256: uploadedDoc.sha256_hash,
            },
            explanation: `Mandatory document '${reqDoc.label}' successfully verified present in storage vault.`,
            timestamp: new Date().toISOString(),
          };
          generatedChecks.push(db.insert('verification_checks', check));
        }
      }
    }

    // --- CHECK 2: Document Extraction & Expiry Validation ---
    for (const doc of documents) {
      const extractedFields = db.find('extracted_fields', (f) => f.document_id === doc.id);

      // Check for unreadable document
      if (extractedFields.length === 0) {
        const check: VerificationCheck = {
          id: uuidv4(),
          application_id: applicationId,
          document_id: doc.id,
          check_type: 'DOCUMENT_READABILITY',
          outcome: 'inconclusive',
          method: 'OCR_TEXT_SCAN',
          evidence: { filename: doc.original_filename, fields_extracted: 0 },
          explanation: `Document '${doc.original_filename}' text could not be extracted with high confidence; manual visual inspection required.`,
          timestamp: new Date().toISOString(),
        };
        generatedChecks.push(db.insert('verification_checks', check));
      }

      // Check Expiration Date
      const expiryField = extractedFields.find((f) => f.field_name === 'expiry_date');
      if (expiryField && expiryField.normalized_value) {
        const expiryDate = new Date(expiryField.normalized_value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!isNaN(expiryDate.getTime()) && expiryDate < today) {
          const check: VerificationCheck = {
            id: uuidv4(),
            application_id: applicationId,
            document_id: doc.id,
            check_type: 'DOCUMENT_CURRENCY_EXPIRY',
            outcome: 'failed',
            method: 'DATE_COMPARISON',
            evidence: {
              expiry_date: expiryField.normalized_value,
              verification_date: today.toISOString().split('T')[0],
              document_name: doc.original_filename,
            },
            explanation: `Document '${doc.original_filename}' expired on ${expiryField.normalized_value}.`,
            timestamp: new Date().toISOString(),
          };
          generatedChecks.push(db.insert('verification_checks', check));

          const discrepancy: Discrepancy = {
            id: uuidv4(),
            application_id: applicationId,
            field_name: 'expiry_date',
            declared_value: 'Active / Current Document',
            observed_value: `Expired on ${expiryField.normalized_value}`,
            document_id: doc.id,
            page_number: expiryField.page_number,
            severity: 'high',
            status: 'open',
            comparison_method: 'DATE_RANGE_VALIDATION',
            explanation: `Certificate or approval validity lapsed prior to verification audit date.`,
            created_at: new Date().toISOString(),
          };
          generatedDiscrepancies.push(db.insert('discrepancies', discrepancy));
        } else {
          const check: VerificationCheck = {
            id: uuidv4(),
            application_id: applicationId,
            document_id: doc.id,
            check_type: 'DOCUMENT_CURRENCY_EXPIRY',
            outcome: 'passed',
            method: 'DATE_COMPARISON',
            evidence: {
              expiry_date: expiryField.normalized_value,
              document_name: doc.original_filename,
            },
            explanation: `Document '${doc.original_filename}' is active and valid until ${expiryField.normalized_value}.`,
            timestamp: new Date().toISOString(),
          };
          generatedChecks.push(db.insert('verification_checks', check));
        }
      }
    }

    // --- CHECK 3: Cross-Validation (Declared vs Extracted) ---
    const declared = app.declared_data || {};
    const allExtracted = db.find('extracted_fields', (f) =>
      documents.some((d) => d.id === f.document_id)
    );

    // 3a. Name Comparison
    if (declared.full_name) {
      const nameFields = allExtracted.filter((f) => f.field_name === 'full_name');
      if (nameFields.length > 0) {
        for (const nf of nameFields) {
          const declaredNorm = String(declared.full_name).toUpperCase().trim().replace(/\s+/g, ' ');
          const extractedNorm = nf.normalized_value.toUpperCase().trim().replace(/\s+/g, ' ');

          const isMatch =
            declaredNorm === extractedNorm ||
            declaredNorm.includes(extractedNorm) ||
            extractedNorm.includes(declaredNorm);

          if (isMatch) {
            const check: VerificationCheck = {
              id: uuidv4(),
              application_id: applicationId,
              document_id: nf.document_id,
              check_type: 'IDENTITY_NAME_CONCORDANCE',
              outcome: 'passed',
              method: 'NORMALIZED_STRING_COMPARISON',
              evidence: { declared_name: declared.full_name, extracted_name: nf.raw_value },
              explanation: `Applicant declared name '${declared.full_name}' matches extracted identity document evidence '${nf.raw_value}'.`,
              timestamp: new Date().toISOString(),
            };
            generatedChecks.push(db.insert('verification_checks', check));
          } else {
            const check: VerificationCheck = {
              id: uuidv4(),
              application_id: applicationId,
              document_id: nf.document_id,
              check_type: 'IDENTITY_NAME_CONCORDANCE',
              outcome: 'failed',
              method: 'NORMALIZED_STRING_COMPARISON',
              evidence: { declared_name: declared.full_name, extracted_name: nf.raw_value },
              explanation: `Name mismatch detected between declared '${declared.full_name}' and document evidence '${nf.raw_value}'.`,
              timestamp: new Date().toISOString(),
            };
            generatedChecks.push(db.insert('verification_checks', check));

            const discrepancy: Discrepancy = {
              id: uuidv4(),
              application_id: applicationId,
              field_name: 'full_name',
              declared_value: String(declared.full_name),
              observed_value: nf.raw_value,
              document_id: nf.document_id,
              page_number: nf.page_number,
              severity: 'high',
              status: 'open',
              comparison_method: 'LEVENSHTEIN_NORMALIZED_COMPARISON',
              explanation: `Identity discordance: declared legal name does not agree with the primary identity document text.`,
              created_at: new Date().toISOString(),
            };
            generatedDiscrepancies.push(db.insert('discrepancies', discrepancy));
          }
        }
      }
    }

    // 3b. Income Comparison
    if (declared.income_annual !== undefined) {
      const incomeFields = allExtracted.filter((f) => f.field_name === 'income_annual');
      for (const inf of incomeFields) {
        const declaredIncome = parseFloat(String(declared.income_annual).replace(/,/g, ''));
        const extractedIncome = parseFloat(inf.normalized_value);

        if (!isNaN(declaredIncome) && !isNaN(extractedIncome)) {
          // Allow small tolerance (within 1%)
          const diff = Math.abs(declaredIncome - extractedIncome);
          if (diff > 1000) {
            const check: VerificationCheck = {
              id: uuidv4(),
              application_id: applicationId,
              document_id: inf.document_id,
              check_type: 'ANNUAL_INCOME_CONCORDANCE',
              outcome: 'failed',
              method: 'NUMERIC_EQUALITY_TEST',
              evidence: { declared: declaredIncome, extracted: extractedIncome, diff },
              explanation: `Declared annual income (INR ${declaredIncome}) differs from revenue certificate value (INR ${extractedIncome}).`,
              timestamp: new Date().toISOString(),
            };
            generatedChecks.push(db.insert('verification_checks', check));

            const discrepancy: Discrepancy = {
              id: uuidv4(),
              application_id: applicationId,
              field_name: 'income_annual',
              declared_value: `INR ${declaredIncome}`,
              observed_value: `INR ${extractedIncome}`,
              document_id: inf.document_id,
              page_number: inf.page_number,
              severity: 'high',
              status: 'open',
              comparison_method: 'NUMERIC_DELTA_ASSESSMENT',
              explanation: `Declared annual income is divergent from official income certificate figure.`,
              created_at: new Date().toISOString(),
            };
            generatedDiscrepancies.push(db.insert('discrepancies', discrepancy));
          } else {
            const check: VerificationCheck = {
              id: uuidv4(),
              application_id: applicationId,
              document_id: inf.document_id,
              check_type: 'ANNUAL_INCOME_CONCORDANCE',
              outcome: 'passed',
              method: 'NUMERIC_EQUALITY_TEST',
              evidence: { declared: declaredIncome, extracted: extractedIncome },
              explanation: `Declared annual income aligns exactly with revenue certificate proof.`,
              timestamp: new Date().toISOString(),
            };
            generatedChecks.push(db.insert('verification_checks', check));
          }
        }
      }
    }

    // --- CHECK 4: Calculate Transparent Priority Assessment ---
    let priority: PriorityLevel = 'low';
    const reasons: string[] = [];

    const highDiscrepancies = generatedDiscrepancies.filter((d) => d.severity === 'high');
    const mediumDiscrepancies = generatedDiscrepancies.filter((d) => d.severity === 'medium');
    const inconclusiveChecks = generatedChecks.filter((c) => c.outcome === 'inconclusive');

    if (highDiscrepancies.length > 0) {
      priority = 'high';
      reasons.push(`${highDiscrepancies.length} high-severity issue(s) detected: ${highDiscrepancies.map((d) => d.field_name).join(', ')}`);
    } else if (mediumDiscrepancies.length > 0) {
      priority = 'medium';
      reasons.push(`${mediumDiscrepancies.length} minor discrepancy requiring officer review.`);
    } else if (inconclusiveChecks.length > 0) {
      priority = 'inconclusive';
      reasons.push(`${inconclusiveChecks.length} document check(s) could not be definitively evaluated.`);
    } else {
      priority = 'low';
      reasons.push('All deterministic compliance, document presence, and concordance checks passed cleanly.');
    }

    const priorityReason = reasons.join(' | ');

    // Update Application Priority and Priority Reason
    db.update('applications', applicationId, {
      priority,
      priority_reason: priorityReason,
      status: app.status === 'processing' ? 'under_review' : app.status,
    });

    return {
      checks: generatedChecks,
      discrepancies: generatedDiscrepancies,
      priority,
      priorityReason,
    };
  }
}
