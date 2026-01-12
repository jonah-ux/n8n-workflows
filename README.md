# God-Mode Personal Ops System

**Autonomous agent system for continuous improvement and operational intelligence.**

---

## Overview

This is a **God-Mode Personal Ops System** designed to:
- Learn continuously from multiple data sources (Notion, n8n, HubSpot, chat logs)
- Maintain a two-tier knowledge system (canonical vs. raw)
- Detect patterns and generate actionable improvement proposals
- Under-alert with daily digests (8:00 AM) and morning calls (6:00 AM)
- Remain internal-only by default (no customer contact without explicit flag)
- Respect strict safety guardrails (kill switch, audit logging, forbidden actions)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                              │
├─────────────────────────────────────────────────────────────┤
│  Notion (Canonical)  │  n8n  │  HubSpot  │  Chat Logs      │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                KNOWLEDGE SYSTEM (Two-Tier)                   │
├─────────────────────────────────────────────────────────────┤
│  Canonical (Notion) > Verified > Inferred                    │
│  • Never delete (supersede with version history)             │
│  • Authority hierarchy enforced                              │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                 INTELLIGENCE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  Pattern Detection  →  Proposal Generation                   │
│  • Repeated failures  • Missing SOPs  • Config drift         │
│  • Cost anomalies  • Performance issues                      │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKGROUND JOBS                             │
├─────────────────────────────────────────────────────────────┤
│  • Periodic Scan (30 min)  • Daily Digest (8:00 AM)         │
│  • Morning Call (6:00 AM)  • Watchers (5 min)               │
│  • Retry Queue  • Cleanup                                    │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│              COMMUNICATION LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Salesmsg (Primary)  │  Telegram (Fallback)                 │
│  • Internal-only by default  • Allowlist enforced           │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 🔒 Safety First
- **Kill Switch:** Global emergency stop for all actions
- **Control Flags:** Fine-grained control (comms, write, jobs, external_comms)
- **Forbidden Actions:** Explicit list of never-allowed operations
- **Audit Logging:** Complete trail of all actions
- **Rate Limiting:** 10 proposals/hour, 1 digest/day

### 📚 Two-Tier Knowledge System
- **Canonical (Notion):** Single source of truth, always wins
- **Verified:** User-confirmed knowledge
- **Inferred:** Pattern-detected knowledge
- **Version History:** Never delete, always supersede with reason

### 🔍 Pattern Detection
- Repeated workflow failures
- Missing SOPs
- Configuration drift
- Cost anomalies
- Performance degradation

### 📊 Under-Alerting
- **Daily Digest:** 8:00 AM, max 5 bullet points
- **Morning Call:** 6:00 AM, 60-second voice summary
- **Quiet Hours:** 21:00-06:00 (only SEV0/SEV1 bypass)

### 🤖 Proposal-Based Actions
- System proposes improvements
- Human reviews and approves
- System applies changes
- Never auto-modifies production

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Supabase project (PostgreSQL)
- Notion integration
- n8n instance
- HubSpot account (optional)
- Salesmsg account
- Telegram bot

### 2. Installation

```bash
# Clone repository
git clone https://github.com/jonah-ux/n8n-workflows.git
cd n8n-workflows

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 3. Database Setup

```bash
# Apply migration to create all tables
# In Supabase SQL Editor, run:
cat migrations/001_create_agent_core.sql

# Verify tables created
# Check: agent_controls, memory_items, proposals, incidents, etc.
```

### 4. Configuration

Edit `config/defaults.yaml` to customize:
- Scan intervals
- Digest/call times
- Quiet hours
- Rate limits
- Authority hierarchy

### 5. Run

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start

# Test kill switch
node -e "require('./src/lib/safety').activateKillSwitch(db, 'testing')"
```

---

## Project Structure

```
n8n-workflows/
├── config/                    # Configuration files
│   ├── defaults.yaml          # System defaults
│   └── forbidden_actions.md   # Explicitly forbidden actions
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # System architecture
│   ├── JOBS.md               # Background jobs spec
│   └── IMPLEMENTATION_PLAN.md # Implementation roadmap
├── migrations/                # Database migrations
│   └── 001_create_agent_core.sql
├── src/                       # Source code
│   ├── lib/                   # Core infrastructure
│   │   ├── database.ts        # Supabase client wrapper
│   │   ├── safety.ts          # Kill switch & safety checks
│   │   └── audit.ts           # Audit logging
│   ├── integrations/          # External service integrations
│   │   ├── notion.ts          # Notion API client
│   │   ├── n8n.ts            # n8n API client
│   │   ├── hubspot.ts         # HubSpot API client
│   │   ├── salesmsg.ts        # Salesmsg API client
│   │   └── telegram.ts        # Telegram bot client
│   ├── comms/                 # Communication layer
│   │   └── router.ts          # Message routing & safety
│   ├── memory/                # Knowledge system
│   │   └── store.ts           # Memory storage & versioning
│   ├── intelligence/          # Pattern detection & proposals
│   │   ├── pattern-detector.ts
│   │   └── proposal-generator.ts
│   ├── jobs/                  # Background jobs
│   │   └── framework.ts       # Job base class
│   └── background/            # Background services
│       ├── watchers.ts        # Monitoring & alerting
│       ├── retry-queue.ts     # Failed job retry
│       └── health-monitor.ts  # System health checks
├── tests/                     # Test suite
│   ├── unit/
│   ├── integration/
│   └── safety/
├── .env.example              # Environment variables template
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
```

---

## Safety Guardrails

### Forbidden Actions (NEVER allowed)

See `config/forbidden_actions.md` for complete list:

- ❌ Send messages to customers (unless external_comms_enabled=true)
- ❌ Delete any data (always supersede)
- ❌ Modify production directly (propose first)
- ❌ Process payments or financial transactions
- ❌ Rotate credentials automatically
- ❌ Execute arbitrary code
- ❌ Bypass kill switch

### Control Flags

```typescript
// Check control flags
const controls = await db.getAgentControls();

controls.kill_switch           // Emergency stop (blocks ALL)
controls.jobs_enabled          // Enable background jobs
controls.comms_enabled         // Enable communications
controls.write_enabled         // Enable database writes
controls.external_comms_enabled // Enable customer contact (default: false)
```

### Rate Limits

- **Proposals:** 10/hour, 50/day
- **Corrections:** 20/hour
- **Digests:** 1/day
- **Calls:** 1/day
- **Salesmsg:** 5/hour
- **Telegram:** 10/hour

---

## Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Complete system architecture
- **[JOBS.md](docs/JOBS.md)** - Background jobs specification
- **[IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)** - Implementation roadmap
- **[forbidden_actions.md](config/forbidden_actions.md)** - Forbidden actions list

---

## Support

For issues or questions:
1. Check documentation in `docs/`
2. Review audit logs: `SELECT * FROM agent_audit_log`
3. Check kill switch: `SELECT * FROM agent_controls`
4. Create GitHub issue: https://github.com/jonah-ux/n8n-workflows/issues

---

## License

MIT License - See LICENSE file for details

---

## Version History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0.0   | 2026-01-12 | Initial release                  |

---

**Built with safety, transparency, and continuous improvement in mind.**
