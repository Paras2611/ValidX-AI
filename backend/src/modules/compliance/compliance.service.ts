import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import {
  ComplianceRule,
  ComplianceRuleVersion,
  RuleEvaluation,
  CheckOutcome,
  RuleCondition,
} from '../../types';

export class ComplianceService {
  /**
   * Evaluate all active approved compliance rules for an application
   */
  public static async evaluateRules(applicationId: string): Promise<RuleEvaluation[]> {
    const app = db.findById('applications', applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found`);

    const documents = db.find('documents', (d) => d.application_id === applicationId);
    const extractedFields = db.find('extracted_fields', (f) =>
      documents.some((d) => d.id === f.document_id)
    );
    const discrepancies = db.find('discrepancies', (d) => d.application_id === applicationId);

    // Clean up previous evaluations
    db.deleteWhere('rule_evaluations', (re) => re.application_id === applicationId);

    // Find all active rules
    const activeRules = db.find('compliance_rules', (r) => r.is_active && !!r.active_version_id);
    const evaluations: RuleEvaluation[] = [];

    for (const rule of activeRules) {
      const version = db.findById('compliance_rule_versions', rule.active_version_id!);
      if (!version || version.status !== 'approved') continue;

      let rulePassed = true;
      let ruleInconclusive = false;
      const evidence: Record<string, any> = {};
      const missingInputs: string[] = [];
      const conditionExplanations: string[] = [];

      for (const cond of version.conditions) {
        const evalResult = this.evaluateCondition(cond, {
          application: app,
          documents,
          extractedFields,
          discrepancies,
        });

        evidence[cond.field] = evalResult.observedValue;
        conditionExplanations.push(evalResult.explanation);

        if (evalResult.isMissing) {
          missingInputs.push(cond.field);
          ruleInconclusive = true;
        } else if (!evalResult.passed) {
          rulePassed = false;
        }
      }

      let outcome: CheckOutcome = 'passed';
      let explanation = `All criteria for rule '${rule.name}' were satisfied.`;

      if (!rulePassed) {
        outcome = 'failed';
        explanation = `Rule evaluation failed: ${conditionExplanations.join('; ')}. Remediation: ${rule.remediation}`;
      } else if (ruleInconclusive) {
        outcome = 'inconclusive';
        explanation = `Required inputs missing: ${missingInputs.join(', ')}. Cannot conclusively verify.`;
      }

      const evaluation: RuleEvaluation = {
        id: uuidv4(),
        application_id: applicationId,
        rule_id: rule.id,
        rule_version_id: version.id,
        outcome,
        evidence,
        explanation,
        missing_inputs: missingInputs,
        evaluated_at: new Date().toISOString(),
      };

      evaluations.push(db.insert('rule_evaluations', evaluation));
    }

    return evaluations;
  }

  private static evaluateCondition(
    cond: RuleCondition,
    context: {
      application: any;
      documents: any[];
      extractedFields: any[];
      discrepancies: any[];
    }
  ): { passed: boolean; isMissing: boolean; observedValue: any; explanation: string } {
    const { field, operator, value, target_field } = cond;
    let actualValue: any = undefined;

    // Resolve context values
    if (field === 'documents.missing_count') {
      const missingDiscrepancies = context.discrepancies.filter(
        (d) => d.field_name.includes('doc') || d.comparison_method === 'DOCUMENT_INVENTORY_AUDIT'
      );
      actualValue = missingDiscrepancies.length;
    } else if (field.startsWith('declared_data.')) {
      const key = field.replace('declared_data.', '');
      actualValue = context.application.declared_data?.[key];
    } else if (field.startsWith('extracted.')) {
      const key = field.replace('extracted.', '');
      const match = context.extractedFields.find((f) => f.field_name === key);
      actualValue = match ? match.normalized_value : undefined;
    }

    if (actualValue === undefined || actualValue === null) {
      return {
        passed: false,
        isMissing: true,
        observedValue: null,
        explanation: `Field '${field}' is not provided or could not be extracted`,
      };
    }

    switch (operator) {
      case 'equals': {
        const passed = actualValue === value;
        return {
          passed,
          isMissing: false,
          observedValue: actualValue,
          explanation: `Observed ${actualValue} (Expected: ${value})`,
        };
      }
      case 'less_than': {
        const numActual = parseFloat(String(actualValue).replace(/,/g, ''));
        const passed = !isNaN(numActual) && numActual < Number(value);
        return {
          passed,
          isMissing: false,
          observedValue: numActual,
          explanation: `Observed value ${numActual} vs threshold ceiling < ${value}`,
        };
      }
      case 'greater_than': {
        const numActual = parseFloat(String(actualValue).replace(/,/g, ''));
        const passed = !isNaN(numActual) && numActual > Number(value);
        return {
          passed,
          isMissing: false,
          observedValue: numActual,
          explanation: `Observed value ${numActual} vs threshold minimum > ${value}`,
        };
      }
      case 'is_not_expired': {
        const expDate = new Date(actualValue);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const passed = !isNaN(expDate.getTime()) && expDate >= today;
        return {
          passed,
          isMissing: false,
          observedValue: actualValue,
          explanation: passed ? `Document active (expires ${actualValue})` : `Document expired on ${actualValue}`,
        };
      }
      case 'matches_declared': {
        let declaredTarget: any = undefined;
        if (target_field?.startsWith('declared_data.')) {
          const key = target_field.replace('declared_data.', '');
          declaredTarget = context.application.declared_data?.[key];
        }
        const s1 = String(actualValue).toUpperCase().trim();
        const s2 = String(declaredTarget || '').toUpperCase().trim();
        const passed = s1.includes(s2) || s2.includes(s1);
        return {
          passed,
          isMissing: false,
          observedValue: actualValue,
          explanation: `Extracted '${actualValue}' vs Declared '${declaredTarget}'`,
        };
      }
      default:
        return {
          passed: true,
          isMissing: false,
          observedValue: actualValue,
          explanation: 'Evaluated default condition',
        };
    }
  }

  /**
   * Create or update a rule
   */
  public static createRule(params: {
    ruleCode: string;
    name: string;
    description: string;
    jurisdiction: string;
    severity: 'warning' | 'error' | 'info';
    remediation: string;
    conditions: RuleCondition[];
    userId: string;
  }): ComplianceRule {
    const ruleId = uuidv4();
    const versionId = uuidv4();

    const rule: ComplianceRule = {
      id: ruleId,
      rule_code: params.ruleCode,
      name: params.name,
      description: params.description,
      jurisdiction: params.jurisdiction,
      severity: params.severity,
      remediation: params.remediation,
      is_active: true,
      active_version_id: versionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.insert('compliance_rules', rule);

    db.insert('compliance_rule_versions', {
      id: versionId,
      rule_id: ruleId,
      version_number: 1,
      conditions: params.conditions,
      created_by: params.userId,
      approved_by: params.userId,
      approved_at: new Date().toISOString(),
      status: 'approved',
      created_at: new Date().toISOString(),
    });

    return rule;
  }
}
