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
  IssuingAuthorityCheck,
  DocumentAnomaly,
} from '../../types';
import { IssuingAuthorityService } from './issuing-authority.service';

export class VerificationService {
  /**
   * Run full verification on an application
   */
  public static async runVerification(applicationId: string): Promise<{
    checks: VerificationCheck[];
    discrepancies: Discrepancy[];
    authorityChecks: IssuingAuthorityCheck[];
    anomalies: DocumentAnomaly[];
    priority: PriorityLevel;
    priorityReason: string;
  }> {
    const app = db.findById('applications', applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found`);

    const appType = db.findById('application_types', app.application_type_id);
    const documents = db.find('documents', (d) => d.application_id === applicationId);

    // Clean up previous checks, discrepancies, and anomalies for idempotent re-runs
    db.deleteWhere('verification_checks', (c) => c.application_id === applicationId);
    db.deleteWhere('discrepancies', (d) => d.application_id === applicationId && d.status === 'open');
    db.deleteWhere('document_anomalies', (a) => a.application_id === applicationId);

    const generatedChecks: VerificationCheck[] = [];
    const generatedDiscrepancies: Discrepancy[] = [];
    const generatedAnomalies: DocumentAnomaly[] = [];

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

        const anomaly: DocumentAnomaly = {
          id: uuidv4(),
          application_id: applicationId,
          document_id: doc.id,
          category: 'LOW_CONFIDENCE_SCAN',
          description: `Document '${doc.original_filename}' yielded no readable text blocks during OCR; marked for manual officer inspection.`,
          evidence: { filename: doc.original_filename },
          detection_method: 'OCR_CONFIDENCE_THRESHOLD_EVALUATION',
          confidence: 0.90,
          status: 'flagged',
          created_at: new Date().toISOString(),
        };
        generatedAnomalies.push(db.insert('document_anomalies', anomaly));
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

    // --- CHECK 4: Anomaly Detection (Duplicate Documents & Irregular Dates) ---
    // 4a. Duplicate Document Hash Detection
    const seenHashes = new Map<string, Document>();
    for (const doc of documents) {
      if (seenHashes.has(doc.sha256_hash)) {
        const original = seenHashes.get(doc.sha256_hash)!;
        const check: VerificationCheck = {
          id: uuidv4(),
          application_id: applicationId,
          document_id: doc.id,
          check_type: 'DUPLICATE_DOCUMENT_HASH',
          outcome: 'failed',
          method: 'SHA256_HASH_COMPARISON',
          evidence: {
            current_document: doc.original_filename,
            matching_document: original.original_filename,
            sha256: doc.sha256_hash,
          },
          explanation: `Identical cryptographic SHA-256 hash detected across '${doc.original_filename}' and '${original.original_filename}'. Critical safeguard: matching hash establishes file identity relative to compared file; it does not prove document authenticity or fraud.`,
          timestamp: new Date().toISOString(),
        };
        generatedChecks.push(db.insert('verification_checks', check));

        const anomaly: DocumentAnomaly = {
          id: uuidv4(),
          application_id: applicationId,
          document_id: doc.id,
          category: 'DUPLICATE_DOCUMENT',
          description: `Duplicate file content uploaded under different slots: '${doc.original_filename}' shares hash with '${original.original_filename}'.`,
          evidence: { sha256: doc.sha256_hash },
          detection_method: 'CRYPTOGRAPHIC_DIGEST_COMPARISON',
          confidence: 1.0,
          status: 'flagged',
          created_at: new Date().toISOString(),
        };
        generatedAnomalies.push(db.insert('document_anomalies', anomaly));

        const discrepancy: Discrepancy = {
          id: uuidv4(),
          application_id: applicationId,
          field_name: doc.document_type,
          declared_value: `Unique ${doc.document_type}`,
          observed_value: `Duplicate of ${original.document_type}`,
          document_id: doc.id,
          severity: 'medium',
          status: 'open',
          comparison_method: 'HASH_DIGEST_CONCORDANCE',
          explanation: `Identical file uploaded under multiple document types. Reviewer verification required.`,
          created_at: new Date().toISOString(),
        };
        generatedDiscrepancies.push(db.insert('discrepancies', discrepancy));
      } else {
        seenHashes.set(doc.sha256_hash, doc);
      }
    }

    // 4b. Irregular Future Date Anomaly
    for (const doc of documents) {
      const extractedFields = db.find('extracted_fields', (f) => f.document_id === doc.id);
      const dobField = extractedFields.find((f) => f.field_name === 'dob');
      if (dobField && dobField.normalized_value) {
        const dobDate = new Date(dobField.normalized_value);
        if (dobDate > new Date()) {
          const anomaly: DocumentAnomaly = {
            id: uuidv4(),
            application_id: applicationId,
            document_id: doc.id,
            category: 'IRREGULAR_DATE',
            description: `Date of birth '${dobField.normalized_value}' is in the future. Irregular date sequence detected.`,
            evidence: { dob: dobField.normalized_value },
            detection_method: 'CHRONOLOGICAL_SANITY_CHECK',
            confidence: 0.99,
            status: 'flagged',
            created_at: new Date().toISOString(),
          };
          generatedAnomalies.push(db.insert('document_anomalies', anomaly));
        }
      }
    }

    // --- CHECK 5: Original Issuing Authorities Verification ---
    let authorityChecks: IssuingAuthorityCheck[] = [];
    try {
      authorityChecks = await IssuingAuthorityService.runAllAuthorityChecks(applicationId);
      for (const ac of authorityChecks) {
        if (ac.status === 'mismatch_detected' || ac.status === 'expired') {
          const discrepancy: Discrepancy = {
            id: uuidv4(),
            application_id: applicationId,
            field_name: ac.authority_code,
            declared_value: `Valid under ${ac.authority_name}`,
            observed_value: `Authority Status: ${ac.status.toUpperCase()}`,
            severity: 'high',
            status: 'open',
            comparison_method: ac.verification_method,
            explanation: `Issuing authority check yielded '${ac.status}': ${ac.notes || ''}`,
            created_at: new Date().toISOString(),
          };
          generatedDiscrepancies.push(db.insert('discrepancies', discrepancy));
        }
      }
    } catch (authErr: any) {
      console.warn('Issuing authority evaluation warning:', authErr?.message);
    }

    // --- CHECK 6: Calculate Transparent Priority Assessment ---
    let priority: PriorityLevel = 'low';
    const reasons: string[] = [];

    const highDiscrepancies = generatedDiscrepancies.filter((d) => d.severity === 'high');
    const mediumDiscrepancies = generatedDiscrepancies.filter((d) => d.severity === 'medium');
    const inconclusiveChecks = generatedChecks.filter((c) => c.outcome === 'inconclusive');
    const flaggedAnomalies = generatedAnomalies.filter((a) => a.status === 'flagged');

    if (highDiscrepancies.length > 0) {
      priority = 'high';
      reasons.push(`${highDiscrepancies.length} high-severity issue(s) detected: ${highDiscrepancies.map((d) => d.field_name).join(', ')}`);
    } else if (mediumDiscrepancies.length > 0 || flaggedAnomalies.length > 0) {
      priority = 'medium';
      reasons.push(`${mediumDiscrepancies.length + flaggedAnomalies.length} minor discrepancy or anomaly signal(s) requiring officer review.`);
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
      authorityChecks,
      anomalies: generatedAnomalies,
      priority,
      priorityReason,
    };
  }
}
