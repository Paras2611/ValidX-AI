# AICTE External Integration Limitations & Adapter Architecture

**Product:** VALIDATEX — AI-Powered Application & Document Verification System  
**Document Reference:** LIM-AICTE-SIH26261-2026  
**Auditor Classification:** Regulatory & Cybersecurity Compliance  

---

## 1. Statutory Notice on Government Data Integrations

> [!CAUTION]
> Direct real-time API connectivity to sovereign government databases, institutional portals, and statutory registries (such as the AICTE Central Portal, DigiLocker NAD API, MCA21, NSDL PAN Verification, State Higher Education Portals, or municipal fire safety registries) requires **official statutory authorization, enterprise API gateway credentials, contractual data-sharing agreements (SLAs), and network IP whitelisting**.

In strict adherence to **Rule #7, #8, #9, and #11** of the Antigravity Master Audit Prompt:
1. **VALIDATEX does not fabricate government credentials, simulate unauthorized access, or misrepresent simulated responses as live statutory approvals.**
2. When an external issuing authority connection is not configured or lacks production credentials, the system explicitly reports the status as:
   - `Not Configured`
   - `Source Unavailable`
   - `Access Not Authorized`
   - `Manual Review Required`
   - `Inconclusive`
3. A clearly labeled **Test Adapter Interface** is implemented to demonstrate the exact data contracts, network error handling, schema validation, and retry logic required for production integration without violating legal boundaries.

---

## 2. Integrated Issuing Authorities & Interface Architecture

VALIDATEX implements a unified integration boundary via `IssuingAuthorityService`. The table below outlines the target authorities, verification methods, required inputs, and production dependencies:

| Authority Code | Source Name | Verification Method | Input Fields / Identifiers | Production Dependency | Configured State in Sandbox |
|---|---|---|---|---|---|
| `AICTE_CENTRAL_REGISTRY` | AICTE National Portal | REST JSON Gateway / OAuth 2.0 | `aicte_permanent_id`, `application_year`, `institute_pan` | AICTE API credentials & IP whitelisting | **Controlled Test Adapter** (`Not Configured` / Simulated test response) |
| `DIGILOCKER_NAD` | National Academic Depository / MeitY | DigiLocker Partner API (HMAC-SHA256) | `doc_uri`, `student_name`, `roll_no`, `aadhaar_hash` | MeitY Partner Client ID & X.509 Certificate | **Controlled Test Adapter** (`Not Configured` / Verified in test scope) |
| `STATE_TECH_BOARD` | State Directorate of Technical Education / University | Affiliation Webhook / Query API | `university_code`, `affiliation_letter_no`, `session_year` | State Higher Education Council portal access | **Controlled Test Adapter** (`Source Unavailable` fallback testable) |
| `REVENUE_EDISTRICT` | State Revenue Authority / e-District | e-District Certificate Verification API | `certificate_no`, `application_no`, `issuing_tehsil` | State e-District portal gateway keys | **Controlled Test Adapter** (Deterministic certificate validation) |
| `FIRE_SAFETY_MUNICIPAL` | Municipal Fire Department | Building Safety Compliance Registry | `noc_number`, `survey_plot_no`, `validity_year` | Municipal Corporation e-Governance API | **Controlled Test Adapter** (Deterministic expiry evaluation) |
| `NSDL_PAN_VERIFY` | Income Tax Dept / NSDL Portal | Encrypted REST Payload (B2B API) | `pan_number`, `entity_name`, `date_of_incorporation` | NSDL B2B API subscription & DSC | **Controlled Test Adapter** (Checksum & checksum regex validation) |

---

## 3. Standardized Verification Outcome Vocabulary

To ensure complete clarity for verification officers, compliance committees, and statutory auditors, VALIDATEX strictly enforces the following outcome taxonomy:

```
+--------------------------------------------------------------------------------------------------+
| Outcome                    | Definition and Legal / Regulatory Meaning                            |
+--------------------------------------------------------------------------------------------------+
| Verified                   | Verified directly against an authorized external source or trusted  |
|                            | digital repository with cryptographic proof or authoritative match.  |
+--------------------------------------------------------------------------------------------------+
| Mismatch Detected          | External issuing authority record contradicts the declared value.     |
+--------------------------------------------------------------------------------------------------+
| Expired                    | Issuing authority confirms certificate or approval validity lapsed.   |
+--------------------------------------------------------------------------------------------------+
| Verification Pending       | External request queued or awaiting asynchronous batch reconciliation.|
+--------------------------------------------------------------------------------------------------+
| Source Unavailable         | External API timed out, returned 5xx, or is offline for maintenance. |
+--------------------------------------------------------------------------------------------------+
| Manual Review Required     | Inconclusive response, partial match, or low OCR scan quality.       |
+--------------------------------------------------------------------------------------------------+
| Not Configured             | API credentials or external gateway not provisioned in current env.  |
+--------------------------------------------------------------------------------------------------+
| Inconclusive               | Record could not be definitively validated due to missing inputs.    |
+--------------------------------------------------------------------------------------------------+
```

---

## 4. Cryptographic Hash & QR Code Safeguard Disclaimers

In accordance with Section 3.D and 3.E:
1. **File Hash ≠ Document Authenticity:** A matching SHA-256 hash proves that the file content is identical to a reference file in the vault. It does not prove that the underlying claims or original certificates are genuine or legally valid.
2. **QR Code ≠ Verification:** A QR code printed on a PDF is not accepted as definitive proof of authenticity unless its digital signature or resolving URL is cryptographically verified against a trusted issuing authority's public key.
3. **AI Flags ≠ Final Regulatory Outcomes:** AI-generated observations, priority flags, and summaries are strictly advisory. No application may be rejected or approved without an authorized human officer's recorded statutory determination.

---

## 5. Transition to Production Checklist

To transition the controlled test adapters to live production integrations:
- [ ] Execute formal Memorandum of Understanding (MoU) with MeitY for DigiLocker NAD production API keys.
- [ ] Connect to AICTE Central Data Repository through secure enterprise VPN / Mutual TLS (mTLS).
- [ ] Provision hardware security module (HSM) or cloud KMS for signing outgoing API payloads.
- [ ] Whitelist production egress IP addresses with State Higher Education portals.
- [ ] Enable periodic certificate revocation list (CRL) and OCSP checks for digital signatures.
