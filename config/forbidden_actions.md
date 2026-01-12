# Forbidden Actions

**Purpose:** This document defines actions the God-Mode Ops System **MUST NEVER** perform, regardless of configuration, user request, or system state.

**Enforcement:** These constraints are enforced at the code level. Violating these rules should be impossible in properly implemented code.

---

## Category 1: External Communications (Default)

**Context:** System is internal-only by default. These actions are forbidden unless `external_comms_enabled=true` is explicitly set in `agent_controls` table AND additional approval gates are implemented.

### Forbidden (unless explicitly enabled + gated):
- ❌ Send any message to a customer
- ❌ Send any message to a prospect
- ❌ Send any message to a partner
- ❌ Send any message to a vendor
- ❌ Post to public social media
- ❌ Send emails to external addresses (non-Jonah)
- ❌ Make phone calls to external numbers (non-Jonah)
- ❌ Send SMS to external numbers (non-Jonah)
- ❌ Update external CRM records (HubSpot, etc.)
- ❌ Create external support tickets
- ❌ Respond to external webhook requests

**Rationale:** Prevents accidental customer contact, brand damage, compliance violations.

**Allowed (internal only):**
- ✅ Send messages to Jonah's phone number (from allowlist)
- ✅ Send messages to Jonah's Telegram
- ✅ Internal logging and audit trails
- ✅ Internal notifications

---

## Category 2: Data Deletion

**Context:** System maintains complete history for traceability and rollback. Deletion is never necessary.

### Forbidden Always:
- ❌ DELETE from any database table
- ❌ DROP database tables
- ❌ TRUNCATE tables
- ❌ Delete Notion pages
- ❌ Delete workflow executions
- ❌ Delete audit logs
- ❌ Delete supersession history
- ❌ Delete correction records
- ❌ Permanently remove any knowledge

**Rationale:** Enables rollback, maintains audit trail, prevents data loss.

**Allowed:**
- ✅ Mark as superseded/deprecated (soft delete)
- ✅ Archive old records
- ✅ Expire old cache entries
- ✅ Clean up temporary files

---

## Category 3: Direct Modifications

**Context:** System proposes changes; humans approve and apply. Direct modification bypasses review.

### Forbidden Always:
- ❌ Modify production workflow definitions (n8n)
- ❌ Change production config files
- ❌ Update Notion pages (write access)
- ❌ Modify HubSpot records
- ❌ Change API credentials
- ❌ Alter database schema (except via approved migrations)
- ❌ Execute code deployments
- ❌ Restart services
- ❌ Modify firewall rules
- ❌ Change access controls

**Rationale:** Humans must review and approve changes to production systems.

**Allowed:**
- ✅ Create proposals for modifications
- ✅ Store proposed changes in proposals table
- ✅ Simulate changes in test environment (if implemented)
- ✅ Log all actions for review

---

## Category 4: Financial Actions

**Context:** System has no business executing financial transactions.

### Forbidden Always:
- ❌ Process payments
- ❌ Issue refunds
- ❌ Modify pricing
- ❌ Create invoices
- ❌ Approve purchases
- ❌ Transfer funds
- ❌ Update billing information
- ❌ Cancel subscriptions
- ❌ Apply discounts
- ❌ Modify payment methods

**Rationale:** Financial actions require explicit human authorization.

**Allowed:**
- ✅ Track costs and spending
- ✅ Propose cost optimization
- ✅ Alert on cost anomalies
- ✅ Generate cost reports

---

## Category 5: Credential Management

**Context:** Credentials are sensitive. System reads them but never modifies.

### Forbidden Always:
- ❌ Rotate API keys
- ❌ Change passwords
- ❌ Modify auth tokens
- ❌ Update OAuth credentials
- ❌ Generate new API keys
- ❌ Revoke access tokens
- ❌ Change permission scopes
- ❌ Share credentials externally
- ❌ Log credentials (even to audit log)

**Rationale:** Credential management is high-risk and requires manual oversight.

**Allowed:**
- ✅ Detect expired credentials
- ✅ Alert when credentials fail
- ✅ Propose credential rotation schedule
- ✅ Read credentials from env (for API calls)

---

## Category 6: Code Execution

**Context:** Arbitrary code execution is a security risk.

### Forbidden Always:
- ❌ Execute arbitrary SQL (only parameterized queries)
- ❌ Execute shell commands without explicit allow-list
- ❌ Eval() or exec() of user input
- ❌ Load external modules dynamically
- ❌ Execute code from database strings
- ❌ Run scripts from untrusted sources
- ❌ Modify source code files
- ❌ Deploy code changes

**Rationale:** Prevents injection attacks and unauthorized code execution.

**Allowed:**
- ✅ Execute pre-defined, parameterized queries
- ✅ Run approved background jobs
- ✅ Call external APIs (with rate limiting)
- ✅ Generate code as proposal (not executed)

---

## Category 7: Access Control

**Context:** System operates with read-mostly permissions. Elevation requires explicit gates.

### Forbidden Always:
- ❌ Grant access to other users
- ❌ Modify user permissions
- ❌ Create new API keys
- ❌ Bypass authentication
- ❌ Impersonate other users
- ❌ Escalate own privileges
- ❌ Modify audit log entries
- ❌ Disable safety checks

**Rationale:** Prevents privilege escalation and unauthorized access.

**Allowed:**
- ✅ Operate with assigned permissions
- ✅ Request elevated access (if implemented)
- ✅ Log all access attempts

---

## Category 8: Kill Switch Bypass

**Context:** Kill switch is emergency stop. Nothing overrides it.

### Forbidden Always:
- ❌ Disable kill switch programmatically
- ❌ Bypass kill switch checks
- ❌ Continue operations when kill_switch=true
- ❌ Hide kill switch state
- ❌ Modify agent_controls table without audit log

**Rationale:** Kill switch must always work, no exceptions.

**Allowed:**
- ✅ Check kill switch before every action
- ✅ Enter read-only mode when enabled
- ✅ Alert Jonah that kill switch is active

---

## Category 9: Compliance Violations

**Context:** Even if technically possible, some actions violate regulations.

### Forbidden Always:
- ❌ Send spam (unsolicited bulk messages)
- ❌ Scrape data without permission
- ❌ Store passwords in plain text
- ❌ Share personal data without consent
- ❌ Bypass GDPR/privacy controls
- ❌ Log sensitive PII unnecessarily
- ❌ Transmit data without encryption
- ❌ Violate terms of service of external APIs

**Rationale:** Legal compliance is non-negotiable.

**Allowed:**
- ✅ Process data according to privacy policy
- ✅ Encrypt sensitive data
- ✅ Respect data retention policies
- ✅ Honor deletion requests

---

## Category 10: Autonomous Recursion

**Context:** System should not modify itself without oversight.

### Forbidden Always:
- ❌ Modify own source code
- ❌ Update own dependencies automatically
- ❌ Change own configuration without approval
- ❌ Create proposals to bypass safety checks
- ❌ Disable own audit logging
- ❌ Increase own rate limits
- ❌ Spawn uncontrolled processes
- ❌ Self-replicate across systems

**Rationale:** Prevents runaway behavior and loss of control.

**Allowed:**
- ✅ Propose configuration changes
- ✅ Detect when updates are available
- ✅ Self-monitor and health-check
- ✅ Log all self-referential actions

---

## Enforcement Mechanisms

### 1. Code-Level Checks
Every action must pass these checks:
```typescript
function beforeAction(action: Action): void {
  // 1. Check kill switch
  if (isKillSwitchEnabled()) throw new Error("Kill switch active");

  // 2. Check if action is forbidden
  if (isForbiddenAction(action)) throw new Error("Forbidden action");

  // 3. Check permissions
  if (!hasPermission(action)) throw new Error("Permission denied");

  // 4. Log to audit trail
  auditLog(action);
}
```

### 2. Database Constraints
- Foreign key constraints prevent orphaned records
- Check constraints enforce data integrity
- Triggers log all modifications
- Views restrict access to sensitive data

### 3. API Gateway
- Rate limiting at API level
- Authentication/authorization required
- Request validation against schema
- Forbidden endpoints return 403

### 4. Environment Separation
- Production vs. development environments
- Separate credentials per environment
- No production access from dev
- Audit log spans all environments

---

## Exceptions

**There are NO exceptions to forbidden actions.**

If a use case requires a forbidden action:
1. It must be redesigned to avoid the forbidden action
2. OR it must be implemented as a separate, explicitly approved system
3. OR it must be a manual action (not automated)

**Example:**
- Forbidden: Automatically email customers about issues
- Allowed: Create draft email for Jonah to review and send

---

## Reporting Violations

If system attempts a forbidden action:
1. Block the action immediately
2. Log to audit_log with severity=SEV1
3. Alert Jonah immediately (bypass quiet hours)
4. Enter read-only mode (disable jobs)
5. Capture full stack trace
6. Await manual review before resuming

---

## Version History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2026-01-12 | Initial forbidden actions list   |

---

**Document Status:** Active
**Review Frequency:** Quarterly or after any security incident
**Approval Required:** Yes (Jonah)
