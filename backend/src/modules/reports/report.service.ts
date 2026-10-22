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
    const decisions = db.find('review_decisions', (d) => d.application_id === applicationId);
    const latestDecision = decisions[decisions.length - 1];

    const reportRef = `VR-${app.reference_no}-${Date.now().toString().slice(-6)}`;
    const filename = `${reportRef}.pdf`;
    const outputPath = path.join(config.reportsDir, filename);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header Banner
      doc.rect(0, 0, doc.page.width, 90).fill('#0F172A');
      doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('VALIDATEX', 50, 25);
      doc.fontSize(10).font('Helvetica').text('AI-Powered Application & Document Verification System', 50, 52);
      doc.fontSize(9).text(`AUDIT REPORT REFERENCE: ${reportRef}`, doc.page.width - 250, 32, { align: 'right', width: 200 });
      doc.text(`DATE ISSUED: ${new Date().toLocaleDateString('en-GB')}`, doc.page.width - 250, 48, { align: 'right', width: 200 });

      // Spacing
      doc.moveDown(4);
      doc.fillColor('#0F172A');

      // Section: Application Overview
      doc.fontSize(14).font('Helvetica-Bold').text('1. APPLICATION AUDIT DOSSIER');
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y + 4).lineTo(doc.page.width - 50, doc.y + 4).stroke();
      doc.moveDown(0.8);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Application Reference: `, { continued: true }).font('Helvetica-Bold').text(app.reference_no);
      doc.font('Helvetica').text(`Scheme / Program: `, { continued: true }).font('Helvetica-Bold').text(appType?.name || 'General Application');
      doc.font('Helvetica').text(`Current Status: `, { continued: true }).font('Helvetica-Bold').text(app.status.toUpperCase());
      doc.font('Helvetica').text(`Priority Assessment: `, { continued: true }).font('Helvetica-Bold').text(`${app.priority.toUpperCase()} (${app.priority_reason || 'N/A'})`);
      doc.font('Helvetica').text(`Submission Timestamp: `, { continued: true }).font('Helvetica').text(app.submitted_at || app.created_at);

      doc.moveDown(1.2);

      // Section: Document Inventory & Cryptographic Hashes
      doc.fontSize(14).font('Helvetica-Bold').text('2. DOCUMENT VAULT INVENTORY & HASHES');
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y + 4).lineTo(doc.page.width - 50, doc.y + 4).stroke();
      doc.moveDown(0.8);

      if (documents.length === 0) {
        doc.fontSize(10).font('Helvetica-Oblique').text('No documents submitted in this application.');
      } else {
        documents.forEach((d, idx) => {
          doc.fontSize(10).font('Helvetica-Bold').text(`${idx + 1}. [${d.document_type.toUpperCase()}] ${d.original_filename}`);
          doc.fontSize(8).font('Helvetica').fillColor('#475569')
            .text(`   MIME: ${d.mime_type} | Size: ${(d.file_size / 1024).toFixed(1)} KB | SHA-256: ${d.sha256_hash}`)
            .fillColor('#0F172A');
        });
      }

      doc.moveDown(1.2);

      // Section: Verification Checks & Discrepancies
      doc.fontSize(14).font('Helvetica-Bold').text('3. DETERMINISTIC VERIFICATION & CROSS-VALIDATION');
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y + 4).lineTo(doc.page.width - 50, doc.y + 4).stroke();
      doc.moveDown(0.8);

      checks.slice(0, 6).forEach((c) => {
        const symbol = c.outcome === 'passed' ? '[PASS]' : c.outcome === 'failed' ? '[FAIL]' : '[WARN]';
        const color = c.outcome === 'passed' ? '#166534' : c.outcome === 'failed' ? '#991B1B' : '#854D0E';
        doc.fillColor(color).fontSize(9).font('Helvetica-Bold').text(`${symbol} ${c.check_type}: `, { continued: true })
          .fillColor('#0F172A').font('Helvetica').text(c.explanation);
      });

      if (discrepancies.length > 0) {
        doc.moveDown(0.5);
        doc.fillColor('#991B1B').fontSize(10).font('Helvetica-Bold').text(`Flagged Discrepancies (${discrepancies.length}):`);
        discrepancies.forEach((disc) => {
          doc.fillColor('#7F1D1D').fontSize(9).font('Helvetica')
            .text(`- Field [${disc.field_name}]: Declared "${disc.declared_value}" vs Observed "${disc.observed_value}" (${disc.status.toUpperCase()})`);
        });
        doc.fillColor('#0F172A');
      }

      doc.moveDown(1.2);

      // Section: Statutory Compliance Evaluations
      doc.fontSize(14).font('Helvetica-Bold').text('4. STATUTORY COMPLIANCE RULE EVALUATION');
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y + 4).lineTo(doc.page.width - 50, doc.y + 4).stroke();
      doc.moveDown(0.8);

      evaluations.slice(0, 5).forEach((ev) => {
        const rule = db.findById('compliance_rules', ev.rule_id);
        const symbol = ev.outcome === 'passed' ? 'COMPLIANT' : 'NON-COMPLIANT';
        const color = ev.outcome === 'passed' ? '#166534' : '#991B1B';
        doc.fillColor(color).fontSize(9).font('Helvetica-Bold').text(`[${symbol}] ${rule?.rule_code || 'RULE'}: `, { continued: true })
          .fillColor('#0F172A').font('Helvetica').text(ev.explanation);
      });

      doc.moveDown(1.2);

      // Section: Reviewer Decision & Legal Disclaimer
      doc.fontSize(14).font('Helvetica-Bold').text('5. AUTHORIZED HUMAN REVIEW DECISION');
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y + 4).lineTo(doc.page.width - 50, doc.y + 4).stroke();
      doc.moveDown(0.8);

      if (latestDecision) {
        doc.fontSize(10).font('Helvetica-Bold').text(`Final Action: `, { continued: true })
          .text(latestDecision.action.toUpperCase(), { underline: true });
        doc.font('Helvetica').text(`Decision Reason: ${latestDecision.reason}`);
        doc.text(`Recorded On: ${latestDecision.created_at}`);
      } else {
        doc.fontSize(10).font('Helvetica-Oblique').text('Application review currently in progress. Final authorized determination pending.');
      }

      // Footer Seal & Disclaimers
      doc.fontSize(8).fillColor('#64748B').text(
        'DISCLAIMER: Automated checks & AI recommendations are advisory and do not replace authorized human statutory determinations. This document bears cryptographic authenticity through SHA-256 digest validation.',
        50,
        doc.page.height - 70,
        { align: 'center', width: doc.page.width - 100 }
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
