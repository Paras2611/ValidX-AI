import fs from 'fs';
import path from 'path';
import { config } from '../config';
import {
  User,
  Organization,
  ApplicationType,
  Application,
  Document,
  ExtractedField,
  VerificationCheck,
  Discrepancy,
  ComplianceRule,
  ComplianceRuleVersion,
  RuleEvaluation,
  ReviewDecision,
  ReviewComment,
  Report,
  Notification,
  AuditEvent,
  IssuingAuthorityCheck,
  DocumentAnomaly,
} from '../types';

export interface DatabaseSchema {
  users: User[];
  organizations: Organization[];
  application_types: ApplicationType[];
  applications: Application[];
  documents: Document[];
  extracted_fields: ExtractedField[];
  verification_checks: VerificationCheck[];
  issuing_authority_checks: IssuingAuthorityCheck[];
  document_anomalies: DocumentAnomaly[];
  discrepancies: Discrepancy[];
  compliance_rules: ComplianceRule[];
  compliance_rule_versions: ComplianceRuleVersion[];
  rule_evaluations: RuleEvaluation[];
  review_decisions: ReviewDecision[];
  review_comments: ReviewComment[];
  reports: Report[];
  notifications: Notification[];
  audit_events: AuditEvent[];
}

const defaultSchema: DatabaseSchema = {
  users: [],
  organizations: [],
  application_types: [],
  applications: [],
  documents: [],
  extracted_fields: [],
  verification_checks: [],
  issuing_authority_checks: [],
  document_anomalies: [],
  discrepancies: [],
  compliance_rules: [],
  compliance_rule_versions: [],
  rule_evaluations: [],
  review_decisions: [],
  review_comments: [],
  reports: [],
  notifications: [],
  audit_events: [],
};

class Database {
  private data: DatabaseSchema;
  private filePath: string;
  private isSaving: boolean = false;
  private pendingSave: boolean = false;

  constructor() {
    this.filePath = config.dbFile;
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(content);
        return { ...defaultSchema, ...parsed };
      }
    } catch (err) {
      console.error('Error loading database file, initializing empty schema:', err);
    }
    this.persistSync(defaultSchema);
    return { ...defaultSchema };
  }

  private persistSync(data: DatabaseSchema) {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to persist database synchronously:', err);
    }
  }

  public save() {
    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }
    this.isSaving = true;
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to persist database:', err);
    } finally {
      this.isSaving = false;
      if (this.pendingSave) {
        this.pendingSave = false;
        this.save();
      }
    }
  }

  public find<K extends keyof DatabaseSchema>(
    table: K,
    predicate?: (item: DatabaseSchema[K][number]) => boolean
  ): DatabaseSchema[K] {
    const list = this.data[table] || [];
    if (!predicate) return [...list] as DatabaseSchema[K];
    return list.filter(predicate as any) as DatabaseSchema[K];
  }

  public findOne<K extends keyof DatabaseSchema>(
    table: K,
    predicate: (item: DatabaseSchema[K][number]) => boolean
  ): DatabaseSchema[K][number] | null {
    const list = this.data[table] || [];
    const item = list.find(predicate as any);
    return item ? { ...item } : null;
  }

  public findById<K extends keyof DatabaseSchema>(
    table: K,
    id: string
  ): DatabaseSchema[K][number] | null {
    return this.findOne(table, (item: any) => item.id === id);
  }

  public insert<K extends keyof DatabaseSchema>(
    table: K,
    item: DatabaseSchema[K][number]
  ): DatabaseSchema[K][number] {
    const now = new Date().toISOString();
    const enriched = {
      ...item,
      created_at: (item as any).created_at || now,
      updated_at: (item as any).updated_at !== undefined ? now : undefined,
    };
    (this.data[table] as any[]).push(enriched);
    this.save();
    return { ...enriched };
  }

  public update<K extends keyof DatabaseSchema>(
    table: K,
    id: string,
    updates: Partial<DatabaseSchema[K][number]>
  ): DatabaseSchema[K][number] | null {
    const list = this.data[table] as any[];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const current = list[index];
    const now = new Date().toISOString();
    const updated = {
      ...current,
      ...updates,
      id: current.id, // prevent changing ID
      updated_at: current.updated_at !== undefined ? now : current.updated_at,
    };
    list[index] = updated;
    this.save();
    return { ...updated };
  }

  public delete<K extends keyof DatabaseSchema>(table: K, id: string): boolean {
    const list = this.data[table] as any[];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    this.save();
    return true;
  }

  public deleteWhere<K extends keyof DatabaseSchema>(
    table: K,
    predicate: (item: DatabaseSchema[K][number]) => boolean
  ): number {
    const list = this.data[table] as any[];
    const initialLen = list.length;
    this.data[table] = list.filter((item) => !predicate(item)) as any;
    const removed = initialLen - this.data[table].length;
    if (removed > 0) this.save();
    return removed;
  }

  public count<K extends keyof DatabaseSchema>(
    table: K,
    predicate?: (item: DatabaseSchema[K][number]) => boolean
  ): number {
    const list = this.data[table] || [];
    if (!predicate) return list.length;
    return list.filter(predicate as any).length;
  }
}

export const db = new Database();
