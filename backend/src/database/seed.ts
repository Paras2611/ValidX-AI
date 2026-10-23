import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './index';
import {
  User,
  Organization,
  ApplicationType,
  ComplianceRule,
  ComplianceRuleVersion,
} from '../types';

export function seedDatabase() {
  console.log('--- Initializing VALIDATEX Seed Data ---');

  // 1. Seed Organizations
  let defaultOrg = db.findOne('organizations', (o) => o.code === 'AICTE');
  if (!defaultOrg) {
    defaultOrg = db.insert('organizations', {
      id: uuidv4(),
      name: 'All India Council for Technical Education (AICTE)',
      code: 'AICTE',
      settings: {
        auto_verification_enabled: true,
        priority_threshold_medium: 1,
        priority_threshold_high: 2,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log('Seeded Organization: AICTE');
  }

  // 2. Seed Users
  const passwordHash = bcrypt.hashSync('Password@123', 10);
  const usersToSeed: Array<Omit<User, 'id' | 'created_at' | 'updated_at'>> = [
    {
      email: 'applicant@validx.ai',
      password_hash: passwordHash,
      full_name: 'Rahul Sharma (Applicant)',
      role: 'applicant',
      organization_id: defaultOrg.id,
    },
    {
      email: 'officer@validx.ai',
      password_hash: passwordHash,
      full_name: 'Priya Nair (Verification Officer)',
      role: 'officer',
      organization_id: defaultOrg.id,
    },
    {
      email: 'compliance@validx.ai',
      password_hash: passwordHash,
      full_name: 'Dr. Vikram Sen (Compliance Officer)',
      role: 'compliance',
      organization_id: defaultOrg.id,
    },
    {
      email: 'admin@validx.ai',
      password_hash: passwordHash,
      full_name: 'System Administrator',
      role: 'admin',
      organization_id: defaultOrg.id,
    },
    {
      email: 'auditor@validx.ai',
      password_hash: passwordHash,
      full_name: 'Ananya Gupta (Quality Auditor)',
      role: 'auditor',
      organization_id: defaultOrg.id,
    },
  ];

  for (const u of usersToSeed) {
    const existing = db.findOne('users', (user) => user.email === u.email);
    if (!existing) {
      db.insert('users', {
        id: uuidv4(),
        ...u,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log(`Seeded user: ${u.email} (${u.role})`);
    }
  }

  // 3. Seed Application Types
  const appTypesToSeed: Array<Omit<ApplicationType, 'id' | 'created_at' | 'updated_at'>> = [
    {
      code: 'SCHOLARSHIP_PG',
      name: 'Post-Graduate Merit-cum-Means Scholarship',
      description: 'Institutional scholarship for technical & management postgraduate candidates with income ceiling checks.',
      category: 'Education & Grants',
      required_fields: [
        { name: 'full_name', label: 'Full Legal Name', type: 'string', required: true },
        { name: 'dob', label: 'Date of Birth (YYYY-MM-DD)', type: 'date', required: true },
        { name: 'income_annual', label: 'Family Annual Income (INR)', type: 'number', required: true },
        { name: 'undergrad_gpa', label: 'Undergraduate GPA / Percentage', type: 'number', required: true },
        { name: 'category', label: 'Social Category', type: 'select', required: true, options: ['General', 'OBC', 'SC', 'ST', 'EWS'] },
        { name: 'account_no', label: 'Bank Account Number', type: 'string', required: true },
        { name: 'ifsc_code', label: 'Bank IFSC Code', type: 'string', required: true },
      ],
      required_document_types: [
        {
          type: 'id_proof',
          label: 'National Identity Proof (Aadhaar / Passport / Voter ID)',
          description: 'Official government photo identification displaying full name and date of birth.',
          required: true,
          allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
          max_size_mb: 10,
        },
        {
          type: 'income_certificate',
          label: 'Revenue Authority Income Certificate',
          description: 'Income proof issued by Tehsildar or competent revenue authority valid for current fiscal year.',
          required: true,
          allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
          max_size_mb: 10,
        },
        {
          type: 'degree_marksheet',
          label: 'Undergraduate Final Degree Marksheet',
          description: 'Certified transcript or degree certificate displaying graduation marks/grade.',
          required: true,
          allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
          max_size_mb: 15,
        },
      ],
    },
    {
      code: 'AICTE_EOA_EXISTING',
      name: 'AICTE Extension of Approval (EoA) — Existing Institution',
      description: 'Annual statutory Extension of Approval for existing technical institutions under AICTE Approval Process Handbook (APH) 2026-27.',
      category: 'AICTE Statutory Approvals',
      required_fields: [
        { name: 'institution_name', label: 'Institution Registered Name', type: 'string', required: true },
        { name: 'aicte_permanent_id', label: 'AICTE Permanent Institute ID (e.g. 1-3324567891)', type: 'string', required: true },
        { name: 'principal_name', label: 'Head of Institution / Director', type: 'string', required: true },
        { name: 'affiliating_university', label: 'Affiliating University Name', type: 'string', required: true },
        { name: 'approved_intake_total', label: 'Current Approved Total Intake', type: 'number', required: true },
        { name: 'faculty_count_total', label: 'Total Regular Faculty Count', type: 'number', required: true },
        { name: 'land_area_acres', label: 'Campus Land Area (in Acres)', type: 'number', required: true },
        { name: 'establishment_year', label: 'Year of Establishment', type: 'number', required: true },
      ],
      required_document_types: [
        {
          type: 'aicte_previous_eoa',
          label: 'Preceding Session AICTE Extension of Approval (EoA) Order',
          description: 'Official AICTE EoA approval letter issued for the preceding academic cycle.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 15,
        },
        {
          type: 'state_govt_noc',
          label: 'State Government Concurrence / NOC',
          description: 'Valid No Objection Certificate from State Technical Education Department.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 10,
        },
        {
          type: 'university_affiliation_noc',
          label: 'Affiliating University Annual Affiliation Order',
          description: 'Current affiliation letter from the affiliating state/central university.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 10,
        },
        {
          type: 'fire_safety_cert',
          label: 'Municipal Fire Safety Clearance Certificate',
          description: 'Current fire and life safety certificate issued by competent authority.',
          required: true,
          allowed_mime_types: ['application/pdf', 'image/jpeg'],
          max_size_mb: 10,
        },
        {
          type: 'land_building_affidavit',
          label: 'Land Title & Built-up Instructional Area Affidavit',
          description: 'Notarized affidavit conforming to AICTE land norms and ownership.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 10,
        },
        {
          type: 'ter_fee_receipt',
          label: 'Technical Education Regulatory (TER) Fee Receipt',
          description: 'Proof of statutory processing fee payment to AICTE.',
          required: true,
          allowed_mime_types: ['application/pdf', 'image/jpeg'],
          max_size_mb: 10,
        },
        {
          type: 'anti_ragging_undertaking',
          label: 'Mandatory Anti-Ragging Institutional Undertaking',
          description: 'Prescribed undertaking on prevention and prohibition of ragging.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 10,
        },
      ],
    },
    {
      code: 'AICTE_INTAKE_INCREASE',
      name: 'AICTE Program Expansion & Increase in Intake',
      description: 'Application for introduction of new courses, division expansion, or supernumerary seat intake.',
      category: 'AICTE Statutory Approvals',
      required_fields: [
        { name: 'institution_name', label: 'Institution Registered Name', type: 'string', required: true },
        { name: 'aicte_permanent_id', label: 'AICTE Permanent Institute ID', type: 'string', required: true },
        { name: 'program_name', label: 'Target Program / Course Name', type: 'string', required: true },
        { name: 'current_intake', label: 'Existing Course Intake', type: 'number', required: true },
        { name: 'requested_intake', label: 'Proposed Total Intake', type: 'number', required: true },
        { name: 'nba_accreditation_status', label: 'NBA Accreditation Status', type: 'select', required: true, options: ['Accredited', 'Applied', 'Not Eligible'] },
      ],
      required_document_types: [
        {
          type: 'nba_accreditation_cert',
          label: 'National Board of Accreditation (NBA) Certificate',
          description: 'Mandatory valid NBA accreditation certificate for the eligible course.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 15,
        },
        {
          type: 'university_expansion_noc',
          label: 'University NOC for Additional Intake / Course',
          description: 'Affiliating university concurrence for increased capacity.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 10,
        },
        {
          type: 'ter_fee_receipt',
          label: 'TER Expansion Processing Fee Receipt',
          description: 'Payment voucher for program expansion evaluation.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 10,
        },
      ],
    },
    {
      code: 'INSTITUTION_ACCREDITATION',
      name: 'AICTE Institutional Program Approval & Verification',
      description: 'Annual verification and mandatory compliance audit for technical education programs.',
      category: 'Institutional Accreditation',
      required_fields: [
        { name: 'institution_name', label: 'Institution Name', type: 'string', required: true },
        { name: 'aicte_code', label: 'Permanent AICTE Institute ID', type: 'string', required: true },
        { name: 'principal_name', label: 'Head of Institution / Principal', type: 'string', required: true },
        { name: 'total_faculty_count', label: 'Total Approved Faculty Count', type: 'number', required: true },
        { name: 'establishment_year', label: 'Year of Establishment', type: 'number', required: true },
      ],
      required_document_types: [
        {
          type: 'aicte_approval_letter',
          label: 'Previous Year AICTE Extension of Approval (EoA)',
          description: 'Copy of preceding academic session approval letter.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 15,
        },
        {
          type: 'fire_safety_cert',
          label: 'Building Fire & Structural Safety Certificate',
          description: 'Valid certificate issued by Municipal Fire Safety Department.',
          required: true,
          allowed_mime_types: ['application/pdf', 'image/jpeg'],
          max_size_mb: 10,
        },
      ],
    },
    {
      code: 'VENDOR_KYC',
      name: 'Enterprise Vendor & Supplier KYC Verification',
      description: 'Commercial supplier onboarding, tax registration, and identity audit.',
      category: 'Procurement & Compliance',
      required_fields: [
        { name: 'company_name', label: 'Company Registered Name', type: 'string', required: true },
        { name: 'tax_id_pan', label: 'Permanent Account Number (PAN)', type: 'string', required: true },
        { name: 'gstin', label: 'GSTIN Registration Number', type: 'string', required: true },
        { name: 'registered_address', label: 'Registered Business Address', type: 'string', required: true },
      ],
      required_document_types: [
        {
          type: 'pan_card',
          label: 'Entity PAN Card',
          description: 'Clear copy of business or authorized director PAN card.',
          required: true,
          allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
          max_size_mb: 10,
        },
        {
          type: 'incorporation_certificate',
          label: 'Certificate of Incorporation / Registration',
          description: 'MCA certificate of incorporation or MSME Udyam registration.',
          required: true,
          allowed_mime_types: ['application/pdf'],
          max_size_mb: 10,
        },
      ],
    },
  ];

  for (const at of appTypesToSeed) {
    const existing = db.findOne('application_types', (t) => t.code === at.code);
    if (!existing) {
      db.insert('application_types', {
        id: uuidv4(),
        ...at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log(`Seeded Application Type: ${at.name}`);
    }
  }

  // 4. Seed Versioned Compliance Rules
  const adminUser = db.findOne('users', (u) => u.role === 'compliance') || db.findOne('users', (u) => u.role === 'admin');
  const creatorId = adminUser ? adminUser.id : uuidv4();

  const rulesToSeed = [
    {
      rule_code: 'CR-APH-01',
      name: 'AICTE Faculty-to-Student Cadre Ratio',
      description: 'Mandates minimum approved faculty count relative to total institutional student intake (APH 2026-27 Clause 2.4).',
      jurisdiction: 'AICTE Approval Process Handbook 2026-27, Chapter II',
      severity: 'error' as const,
      remediation: 'Total faculty count is below the statutory cadre quota. Recruit qualified faculty according to AICTE pay scales.',
      conditions: [
        { field: 'declared_data.faculty_count_total', operator: 'greater_than' as const, value: 15 }
      ]
    },
    {
      rule_code: 'CR-APH-02',
      name: 'Minimum Campus Land Area Compliance',
      description: 'Verifies that institutional contiguous land parcel satisfies AICTE norms (minimum 2.5 acres for Technical Engineering programs).',
      jurisdiction: 'AICTE Approval Process Handbook 2026-27, Chapter I',
      severity: 'error' as const,
      remediation: 'Land area declared is below the statutory threshold (2.5 acres). Rectify land registry records or provide exemption.',
      conditions: [
        { field: 'declared_data.land_area_acres', operator: 'greater_than' as const, value: 2.49 }
      ]
    },
    {
      rule_code: 'CR-APH-03',
      name: 'Mandatory Fire & Structural Safety Currency',
      description: 'Statutory requirement that building fire safety clearance is active and unexpired (APH Appendix 6).',
      jurisdiction: 'AICTE Approval Process Handbook 2026-27, Appendix 6',
      severity: 'error' as const,
      remediation: 'Renew and furnish valid municipal fire safety clearance certificate prior to approval consideration.',
      conditions: [
        { field: 'extracted.expiry_date', operator: 'is_not_expired' as const }
      ]
    },
    {
      rule_code: 'CR-SCH-01',
      name: 'Mandatory Documents Completeness',
      description: 'Verifies that all required documents specified for the application type are uploaded and readable.',
      jurisdiction: 'National - AICTE Guidelines',
      severity: 'error' as const,
      remediation: 'Please upload all missing required supporting documents.',
      conditions: [
        { field: 'documents.missing_count', operator: 'equals' as const, value: 0 }
      ]
    },
    {
      rule_code: 'CR-SCH-02',
      name: 'Annual Income Eligibility Ceiling',
      description: 'Mandatory verification that family annual income declared does not exceed INR 8,00,000 threshold for means-based assistance.',
      jurisdiction: 'National - AICTE Guidelines',
      severity: 'error' as const,
      remediation: 'Applicant income exceeds the scheme cap (INR 8,00,000). Manual review or exception certificate required.',
      conditions: [
        { field: 'declared_data.income_annual', operator: 'less_than' as const, value: 800001 }
      ]
    },
    {
      rule_code: 'CR-SCH-03',
      name: 'Minimum Qualifying Academic Score',
      description: 'Ensures undergraduate academic score meets minimum threshold of 60% or 6.5 GPA.',
      jurisdiction: 'National - AICTE Guidelines',
      severity: 'error' as const,
      remediation: 'Academic score is below the minimum qualifying merit threshold.',
      conditions: [
        { field: 'declared_data.undergrad_gpa', operator: 'greater_than' as const, value: 6.49 }
      ]
    },
    {
      rule_code: 'CR-SCH-04',
      name: 'Identity Name Concordance',
      description: 'Cross-validates that the name extracted from government ID proof matches the declared applicant name.',
      jurisdiction: 'National - AICTE Guidelines',
      severity: 'warning' as const,
      remediation: 'Ensure the name on the ID card matches your application legal name or provide gazetted name change proof.',
      conditions: [
        { field: 'extracted.name', operator: 'matches_declared' as const, target_field: 'declared_data.full_name' }
      ]
    },
    {
      rule_code: 'CR-SCH-05',
      name: 'Document Expiration & Currency',
      description: 'Verifies that supporting certificates, licenses, or approvals have not passed their expiry date.',
      jurisdiction: 'National - AICTE Guidelines',
      severity: 'error' as const,
      remediation: 'Renew and re-upload the expired certificate before proceeding.',
      conditions: [
        { field: 'extracted.expiry_date', operator: 'is_not_expired' as const }
      ]
    }
  ];

  for (const r of rulesToSeed) {
    let rule = db.findOne('compliance_rules', (cr) => cr.rule_code === r.rule_code);
    if (!rule) {
      const ruleId = uuidv4();
      const versionId = uuidv4();

      rule = db.insert('compliance_rules', {
        id: ruleId,
        rule_code: r.rule_code,
        name: r.name,
        description: r.description,
        jurisdiction: r.jurisdiction,
        severity: r.severity,
        remediation: r.remediation,
        is_active: true,
        active_version_id: versionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      db.insert('compliance_rule_versions', {
        id: versionId,
        rule_id: ruleId,
        version_number: 1,
        conditions: r.conditions,
        created_by: creatorId,
        approved_by: creatorId,
        approved_at: new Date().toISOString(),
        status: 'approved',
        created_at: new Date().toISOString(),
      });

      console.log(`Seeded Compliance Rule: ${r.rule_code} - ${r.name} (v1 Approved)`);
    }
  }

  console.log('--- VALIDATEX Seed Data Completed Successfully ---');
}

if (require.main === module) {
  seedDatabase();
}
