import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { db } from '../../database';
import { Report } from '../../types';

export class ReportService {
  /**
   * Generate an official VALIDATEX digital verification audit report
   */
  public static async generateReport(applicationId: string, generatedByUserId: string): Promise<Report> {
    const app = db.findById('applications', applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found`);

    const appType = db.findById('application_types', app.application_type_id);
    const documents = db.find('documents', (d) => d.application_id === applicationId);
    const checks = db.find('verification_checks', (c) => c.application_id === applicationId);
    const discrepancies = db.find('discrepancies', (d) => d.application_id === applicationId);
    const evaluations = db.find('rule_evaluations', (e) => e.application_id === applicationId);
    const authorityChecks = db.find('issuing_authority_checks', (ac) => ac.application_id === applicationId);
    const anomalies = db.find('document_anomalies', (a) => a.application_id === applicationId);
    const decisions = db.find('review_decisions', (d) => d.application_id === applicationId);
    const latestDecision = decisions[decisions.length - 1];

    const reportRef = `VR-${app.reference_no}-${Date.now().toString().slice(-6)}`;
    const filename = `${reportRef}.pdf`;
    const outputPath = path.join(config.reportsDir, filename);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const leftMargin = 45;
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - leftMargin * 2;

      // Header Banner
      doc.rect(0, 0, pageWidth, 74).fill('#0F172A');
      const logoAssetPath = path.resolve(__dirname, '../../../assets/ValidateXLogo.png');
      if (fs.existsSync(logoAssetPath)) {
        try {
          doc.image(logoAssetPath, leftMargin, 15, { height: 44 });
          doc.fillColor('#FFFFFF').fontSize(17).font('Helvetica-Bold').text('VALIDATEX', 135, 20);
          doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text('AI-Powered Application & Document Verification System', 135, 43);
        } catch {
          doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('VALIDATEX', leftMargin, 20);
          doc.fillColor('#94A3B8').fontSize(8.5).font('Helvetica').text('AI-Powered Application & Document Verification System', leftMargin, 43);
        }
      } else {
        doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('VALIDATEX', leftMargin, 20);
        doc.fillColor('#94A3B8').fontSize(8.5).font('Helvetica').text('AI-Powered Application & Document Verification System', leftMargin, 43);
      }

      // Header Meta (Right aligned, strictly positioned coordinates to prevent wrapping or collision)
      const rightBlockWidth = 240;
      const rightBlockX = pageWidth - leftMargin - rightBlockWidth;
      doc.fillColor('#94A3B8').fontSize(7).font('Helvetica-Bold').text('AUDIT REPORT REFERENCE', rightBlockX, 18, { width: rightBlockWidth, align: 'right' });
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(reportRef, rightBlockX, 29, { width: rightBlockWidth, align: 'right' });
      doc.fillColor('#94A3B8').fontSize(7).font('Helvetica').text(`DATE ISSUED: ${new Date().toLocaleDateString('en-GB')}`, rightBlockX, 42, { width: rightBlockWidth, align: 'right' });
      doc.fillColor('#38BDF8').fontSize(7.5).font('Helvetica-Bold').text(`STATUS: ${app.status.toUpperCase()}`, rightBlockX, 53, { width: rightBlockWidth, align: 'right' });

      // Reset cursor to start body below header at the exact left margin
      doc.x = leftMargin;
      doc.y = 90;
      doc.fillColor('#0F172A');

      const renderSectionHeading = (title: string) => {
        doc.x = leftMargin;
        doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0F172A').text(title, leftMargin, doc.y, { width: contentWidth });
        doc.y += 2;
        doc.strokeColor('#CBD5E1').lineWidth(0.8).moveTo(leftMargin, doc.y).lineTo(pageWidth - leftMargin, doc.y).stroke();
        doc.y += 6;
        doc.x = leftMargin;
      };

      // Section 1: Application Overview
      renderSectionHeading('1. APPLICATION AUDIT DOSSIER');

      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text('Application Reference: ', leftMargin, doc.y, { continued: true }).font('Helvetica-Bold').fillColor('#0F172A').text(app.reference_no);
      doc.y += 2;
      doc.font('Helvetica').fillColor('#334155').text('Scheme / Program: ', leftMargin, doc.y, { continued: true }).font('Helvetica-Bold').fillColor('#0F172A').text(appType?.name || 'General Application');
      doc.y += 2;
      doc.font('Helvetica').fillColor('#334155').text('Current Status: ', leftMargin, doc.y, { continued: true }).font('Helvetica-Bold').fillColor('#0F172A').text(app.status.toUpperCase());
      doc.y += 2;
      doc.font('Helvetica').fillColor('#334155').text('Priority Assessment: ', leftMargin, doc.y, { continued: true }).font('Helvetica-Bold').fillColor('#0F172A').text(`${app.priority.toUpperCase()} (${app.priority_reason || 'Standard'})`);
      doc.y += 2;
      doc.font('Helvetica').fillColor('#334155').text('Submission Timestamp: ', leftMargin, doc.y, { continued: true }).font('Helvetica').fillColor('#0F172A').text(app.submitted_at || app.created_at);

      doc.y += 10;

      // Section 2: Document Vault Inventory & Hashes
      renderSectionHeading('2. DOCUMENT VAULT INVENTORY & HASHES');

      if (documents.length === 0) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748B').text('No documents submitted in this application.', leftMargin, doc.y, { width: contentWidth });
        doc.y += 3;
      } else {
        documents.slice(0, 3).forEach((d, idx) => {
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text(`${idx + 1}. [${d.document_type.toUpperCase()}] ${d.original_filename}`, leftMargin, doc.y, { width: contentWidth });
          doc.y += 1.5;
          doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
            .text(`MIME: ${d.mime_type}  |  Size: ${(d.file_size / 1024).toFixed(1)} KB  |  SHA-256: ${d.sha256_hash}`, leftMargin + 8, doc.y, { width: contentWidth - 8 });
          doc.y += 3;
        });
        if (documents.length > 3) {
          doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748B').text(`...and ${documents.length - 3} more document(s) securely archived in vault.`, leftMargin + 8, doc.y);
          doc.y += 3;
        }
      }

      doc.y += 10;

      // Section 3: Verification Checks & Discrepancies
      renderSectionHeading('3. DETERMINISTIC VERIFICATION & CROSS-VALIDATION');

      if (checks.length === 0) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748B').text('No automated verification checks recorded.', leftMargin, doc.y, { width: contentWidth });
        doc.y += 3;
      } else {
        checks.slice(0, 4).forEach((c) => {
          const symbol = c.outcome === 'passed' ? '[PASS]' : c.outcome === 'failed' ? '[FAIL]' : '[WARN]';
          const color = c.outcome === 'passed' ? '#166534' : c.outcome === 'failed' ? '#991B1B' : '#854D0E';
          doc.fillColor(color).fontSize(8.5).font('Helvetica-Bold').text(`${symbol} ${c.check_type}: `, leftMargin, doc.y, { continued: true })
            .fillColor('#334155').font('Helvetica').text(c.explanation, { width: contentWidth });
          doc.y += 2.5;
        });
      }

      if (discrepancies.length > 0) {
        doc.y += 2;
        doc.fillColor('#991B1B').fontSize(9).font('Helvetica-Bold').text(`Flagged Discrepancies (${discrepancies.length}):`, leftMargin, doc.y);
        doc.y += 3;
        discrepancies.slice(0, 3).forEach((disc) => {
          doc.fillColor('#7F1D1D').fontSize(8).font('Helvetica')
            .text(`- Field [${disc.field_name}]: Declared "${disc.declared_value}" vs Observed "${disc.observed_value}" (${disc.status.toUpperCase()})`, leftMargin + 8, doc.y, { width: contentWidth - 8 });
          doc.y += 2;
        });
        if (discrepancies.length > 3) {
          doc.fillColor('#991B1B').fontSize(7.5).font('Helvetica-Oblique').text(`  (+ ${discrepancies.length - 3} additional discrepancy items recorded in audit ledger)`, leftMargin + 8, doc.y);
          doc.y += 2;
        }
        doc.fillColor('#0F172A');
      }

      doc.y += 10;

      // Section 4: Statutory Compliance Evaluations
      renderSectionHeading('4. STATUTORY COMPLIANCE RULE EVALUATION');

      if (evaluations.length === 0) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748B').text('No statutory rule evaluations recorded.', leftMargin, doc.y, { width: contentWidth });
        doc.y += 3;
      } else {
        evaluations.slice(0, 3).forEach((ev) => {
          const rule = db.findById('compliance_rules', ev.rule_id);
          const symbol = ev.outcome === 'passed' ? 'COMPLIANT' : 'NON-COMPLIANT';
          const color = ev.outcome === 'passed' ? '#166534' : '#991B1B';
          doc.fillColor(color).fontSize(8.5).font('Helvetica-Bold').text(`[${symbol}] ${rule?.rule_code || 'RULE'}: `, leftMargin, doc.y, { continued: true })
            .fillColor('#334155').font('Helvetica').text(ev.explanation, { width: contentWidth });
          doc.y += 2.5;
        });
      }

      doc.y += 10;

      // Section 5: Reviewer Decision & Legal Disclaimer
      renderSectionHeading('5. AUTHORIZED HUMAN REVIEW DECISION');

      if (latestDecision) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text('Final Action: ', leftMargin, doc.y, { continued: true })
          .text(latestDecision.action.toUpperCase(), { underline: true });
        doc.y += 2;
        doc.font('Helvetica').fillColor('#334155').text(`Decision Reason: ${latestDecision.reason}`, leftMargin, doc.y, { width: contentWidth });
        if (latestDecision.requires_physical_inspection) {
          doc.y += 2;
          doc.fillColor('#991B1B').font('Helvetica-Bold')
            .text(`Physical Site Inspection Required: YES (Committee: ${latestDecision.inspection_committee_type || 'EVC'})`, leftMargin, doc.y, { width: contentWidth });
          if (latestDecision.infrastructure_observations) {
            doc.y += 1.5;
            doc.font('Helvetica').fillColor('#334155').text(`Infrastructure Observations: ${latestDecision.infrastructure_observations}`, leftMargin, doc.y, { width: contentWidth });
          }
        }
        doc.y += 2;
        doc.font('Helvetica').fillColor('#64748B').text(`Recorded On: ${latestDecision.created_at}`, leftMargin, doc.y, { width: contentWidth });
      } else {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748B').text('Application review currently in progress. Final authorized determination pending.', leftMargin, doc.y, { width: contentWidth });
      }

      // Footer Seal & Disclaimers
      if (doc.y > doc.page.height - 65) {
        doc.addPage();
        doc.x = leftMargin;
        doc.y = 50;
      } else {
        doc.y += 12;
      }

      doc.fontSize(7).font('Helvetica').fillColor('#64748B').text(
        'DISCLAIMER: Automated checks & AI recommendations are advisory and do not replace authorized human statutory determinations. This document bears cryptographic authenticity through SHA-256 digest validation.',
        leftMargin,
        doc.y,
        { align: 'center', width: contentWidth }
      );

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    });

    // Compute cryptographic SHA-256 hash of the generated PDF report
    const pdfBuffer = fs.readFileSync(outputPath);
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const reportRecord: Report = {
      id: uuidv4(),
      application_id: applicationId,
      report_reference: reportRef,
      file_path: outputPath,
      sha256_hash: sha256,
      summary: {
        application_reference: app.reference_no,
        priority: app.priority,
        checks_count: checks.length,
        discrepancies_count: discrepancies.length,
        evaluations_count: evaluations.length,
        decision: latestDecision?.action || 'pending',
      },
      generated_by: generatedByUserId,
      created_at: new Date().toISOString(),
    };

    return db.insert('reports', reportRecord);
  }
}
