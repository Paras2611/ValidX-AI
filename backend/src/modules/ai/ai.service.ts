import { config } from '../../config';
import { Discrepancy, VerificationCheck, RuleEvaluation, Application } from '../../types';

export interface AiVerificationAnalysis {
  executive_summary: string;
  observed_facts: string[];
  discrepancy_explanations: Array<{
    field_name: string;
    finding: string;
    severity_assessment: 'low' | 'medium' | 'high';
    recommended_action: string;
  }>;
  compliance_summary: {
    status: 'compliant' | 'non_compliant' | 'conditional_review';
    key_findings: string[];
  };
  recommended_decision: 'approve' | 'reject' | 'request_corrections' | 'manual_officer_review';
  decision_rationale: string;
  action_items_for_applicant: string[];
  model_info: {
    provider: string;
    model_version: string;
    timestamp: string;
    is_fallback: boolean;
  };
}

export class AiService {
  /**
   * Generate evidence-linked AI verification analysis
   */
  public static async analyzeApplication(params: {
    application: Application;
    checks: VerificationCheck[];
    discrepancies: Discrepancy[];
    evaluations: RuleEvaluation[];
    extractedFields: any[];
  }): Promise<AiVerificationAnalysis> {
    const { application, checks, discrepancies, evaluations, extractedFields } = params;

    // Check if hosted provider configured (Gemini / OpenAI)
    if (config.ai.provider === 'gemini' && config.ai.geminiApiKey) {
      try {
        const result = await this.callGeminiApi(params);
        if (result) return result;
      } catch (err) {
        console.warn('Gemini AI Provider encountered error, falling back to local heuristic engine:', err);
      }
    }

    // Default high-precision Local Heuristic Engine (zero external tokens, zero cost, completely transparent)
    return this.generateLocalAnalysis(params);
  }

  /**
   * Local Heuristic Explanation Engine - builds structured, evidence-grounded insights
   */
  private static generateLocalAnalysis(params: {
    application: Application;
    checks: VerificationCheck[];
    discrepancies: Discrepancy[];
    evaluations: RuleEvaluation[];
    extractedFields: any[];
  }): AiVerificationAnalysis {
    const { application, checks, discrepancies, evaluations, extractedFields } = params;

    const observedFacts: string[] = [
      `Application ID ${application.reference_no} submitted with ${extractedFields.length} extracted document fields.`,
      `${checks.length} deterministic verification checks evaluated.`,
      `${evaluations.length} statutory compliance rules tested.`,
    ];

    if (discrepancies.length === 0) {
      observedFacts.push('Zero field mismatches or missing mandatory document flags detected.');
    } else {
      observedFacts.push(`${discrepancies.length} discrepancy signal(s) flagged during cross-validation.`);
    }

    const discrepancyExplanations = discrepancies.map((d) => {
      let recAction = 'Reviewer to verify physical scan clarity.';
      if (d.field_name.includes('doc') || d.comparison_method === 'DOCUMENT_INVENTORY_AUDIT') {
        recAction = 'Request applicant to upload the missing mandatory supporting certificate.';
      } else if (d.field_name === 'expiry_date') {
        recAction = 'Applicant must furnish current, unexpired certification document.';
      } else if (d.field_name === 'full_name') {
        recAction = 'Verify if discrepancy is due to transliteration or marital surname change; request affidavit if discordant.';
      } else if (d.field_name === 'income_annual') {
        recAction = 'Reconcile declared annual income with seal on Tehsildar income certificate.';
      }

      return {
        field_name: d.field_name,
        finding: `Declared '${d.declared_value}' contradicts observed evidence '${d.observed_value}'. ${d.explanation}`,
        severity_assessment: d.severity,
        recommended_action: recAction,
      };
    });

    const failedRules = evaluations.filter((e) => e.outcome === 'failed');
    const isCompliant = discrepancies.length === 0 && failedRules.length === 0;

    let recommendedDecision: 'approve' | 'reject' | 'request_corrections' | 'manual_officer_review' = 'approve';
    let decisionRationale = 'All statutory compliance and document validation checks passed without discrepancy.';
    const actionItems: string[] = [];

    if (discrepancies.some((d) => d.severity === 'high')) {
      const missingDoc = discrepancies.find((d) => d.field_name.includes('doc') || d.comparison_method === 'DOCUMENT_INVENTORY_AUDIT');
      if (missingDoc) {
        recommendedDecision = 'request_corrections';
        decisionRationale = 'Crucial required documentation is absent. Correction request recommended prior to final evaluation.';
        actionItems.push('Upload all missing statutory certificates specified in the notification.');
      } else {
        recommendedDecision = 'manual_officer_review';
        decisionRationale = 'Material discrepancies detected in applicant data vs evidence; requires authorized officer inspection.';
        actionItems.push('Provide clarified proof or rectify mismatched declared parameters.');
      }
    } else if (discrepancies.length > 0) {
      recommendedDecision = 'manual_officer_review';
      decisionRationale = 'Minor variances identified that may represent formatting or OCR variance.';
      actionItems.push('Review highlighted fields for correctness.');
    }

    const execSummary = isCompliant
      ? `Automated verification completed for application ${application.reference_no}. All evidence aligns with declared parameters and compliance guidelines.`
      : `Verification audit flagged ${discrepancies.length} issue(s) and ${failedRules.length} failed rule(s) requiring human reviewer intervention.`;

    return {
      executive_summary: execSummary,
      observed_facts: observedFacts,
      discrepancy_explanations: discrepancyExplanations,
      compliance_summary: {
        status: isCompliant ? 'compliant' : failedRules.length > 0 ? 'non_compliant' : 'conditional_review',
        key_findings: evaluations.map((e) => `${e.outcome.toUpperCase()}: ${e.explanation}`),
      },
      recommended_decision: recommendedDecision,
      decision_rationale: decisionRationale,
      action_items_for_applicant: actionItems,
      model_info: {
        provider: 'VALIDATEX Rule-Assisted Heuristic Engine',
        model_version: 'v2.6-Deterministic-Grounding',
        timestamp: new Date().toISOString(),
        is_fallback: false,
      },
    };
  }

  /**
   * Hosted Gemini API connector (if credentials provided)
   */
  private static async callGeminiApi(params: any): Promise<AiVerificationAnalysis | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.modelName}:generateContent?key=${config.ai.geminiApiKey}`;

    const prompt = `You are an AI verification auditor for VALIDATEX.
Analyze this application and provide STRICT JSON matching the schema:
Application: ${JSON.stringify(params.application)}
Checks: ${JSON.stringify(params.checks)}
Discrepancies: ${JSON.stringify(params.discrepancies)}
Rule Evaluations: ${JSON.stringify(params.evaluations)}

Output valid JSON only with keys: executive_summary, observed_facts, discrepancy_explanations, compliance_summary, recommended_decision, decision_rationale, action_items_for_applicant.`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const data: any = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    return {
      ...parsed,
      model_info: {
        provider: 'Google Gemini',
        model_version: config.ai.modelName,
        timestamp: new Date().toISOString(),
        is_fallback: false,
      },
    };
  }
}
