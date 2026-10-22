import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const samplesDir = path.join(__dirname, '../../../sample-documents');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

function createSamplePdf(filename: string, title: string, fields: Record<string, string>) {
  const filePath = path.join(samplesDir, filename);
  const doc = new PDFDocument({ margin: 40, size: 'A5' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.rect(0, 0, doc.page.width, 60).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(title, 40, 20);
  doc.fontSize(8).font('Helvetica').text('GOVERNMENT OF INDIA - OFFICIAL CERTIFICATION DOCUMENT', 40, 42);

  doc.moveDown(3);
  doc.fillColor('#0F172A');

  Object.entries(fields).forEach(([k, v]) => {
    doc.fontSize(11).font('Helvetica-Bold').text(`${k}: `, { continued: true })
      .font('Helvetica').text(v);
    doc.moveDown(0.5);
  });

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#64748B')
    .text('This digital document is generated for institutional verification testing in VALIDATEX.');

  doc.end();
}

console.log('Generating sample test documents...');

createSamplePdf('valid_identity_proof.pdf', 'National Identity Proof (Aadhaar)', {
  'Full Name': 'Rahul Sharma',
  'Date of Birth': '1999-05-14',
  'Identity Number': '9876 5432 1012',
  'Issued By': 'Government of India',
});

createSamplePdf('mismatched_name_proof.pdf', 'Identity Card (Mismatched Name)', {
  'Full Name': 'Amit Kumar Verma',
  'Date of Birth': '1999-05-14',
  'Identity Number': '9876 1111 2222',
  'Issued By': 'Government of India',
});

createSamplePdf('valid_income_certificate.pdf', 'Revenue Authority Income Certificate', {
  'Candidate Name': 'Rahul Sharma',
  'Annual Income': 'INR 4,20,000',
  'Issuing Authority': 'Revenue Department Tahsildar',
  'Valid Upto': '2027-03-31',
});

createSamplePdf('expired_certificate.pdf', 'Expired Building & Fire Clearance', {
  'Institution Name': 'Rajarambapu Institute of Technology',
  'Certificate Type': 'Fire Safety Department Clearance',
  'Expiry Date': '2023-01-15',
  'Issuing Authority': 'Municipal Fire Safety Department',
});

createSamplePdf('valid_degree_transcript.pdf', 'Final Degree Marksheet & Transcript', {
  'Student Name': 'Rahul Sharma',
  'Degree Awarded': 'Bachelor of Technology (Computer Engineering)',
  'CGPA': '8.4',
  'Issued By': 'State Technical University',
});

console.log('Sample test documents created successfully in sample-documents/');
