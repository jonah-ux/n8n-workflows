# Memory System Upgrade Guide

## Overview

This upgrade transforms your agent's memory from a simple log to an active learning system.

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Learning** | Logged "No lesson generated" | LLM extracts actionable lessons |
| **Recall** | Basic vector search | Multi-source: vector + keyword + persistent knowledge |
| **Metacognition** | Empty/default values | Actual intent, tools, confidence tracking |
| **Consolidation** | None | Daily pattern extraction to `memory_items` |
| **Quality Control** | Saved everything | Filters garbage, archives unused lessons |

---

## New Workflows Created

### 1. Smart Lesson Extractor
**File:** `Smart_Lesson_Extractor.n8n.json`
**Purpose:** Actually extracts lessons from interactions instead of just logging them

**Flow:**
```
Input (user_input, agent_output, tools_used, was_successful)
    ↓
IF Worth Learning (filters out garbage like "A" or empty responses)
    ↓
Extract Lesson (GPT-4o-mini) → parses into structured lesson
    ↓
IF Should Save → Create Embedding → Save to learning_examples
```

**What it captures:**
- `lesson_summary` - One sentence lesson
- `detailed_lesson` - Specifics
- `pattern_trigger` - "When user asks about X..."
- `recommended_action` - "Use tool Y with params Z"
- `category` - workflow_building, debugging, etc.
- `tags` - For filtering

---

### 2. Smart Memory Recall (Tool)
**File:** `Smart_Memory_Recall.n8n.json`
**Tool Node:** `Smart_Memory_Recall_Tool_Node.json`
**Purpose:** Better context retrieval for the agent

**Flow:**
```
Query → Create Embedding
    ↓
┌──────────────────────────────────────┐
│ Parallel Search:                      │
│ 1. Vector similarity on lessons       │
│ 2. Keyword matching (fallback)        │
│ 3. Persistent knowledge (memory_items)│
└──────────────────────────────────────┘
    ↓
Merge & Dedupe → Format context_summary → Update reference counts
```

**Returns:**
```json
{
  "context_summary": "Formatted markdown for agent context",
  "lessons": [{ "lesson": "...", "similarity": 0.92, "pattern": "..." }],
  "persistent_knowledge": [{ "key": "...", "value": "..." }]
}
```

---

### 3. Enhanced Reflection
**File:** `Enhanced_Reflection.n8n.json`
**Purpose:** Replace the current broken reflection with one that actually captures data

**Flow:**
```
Input (session_id, user_input, intake_plan, main_agent_output, tools_used)
    ↓
Parse Intake Plan → Extract real intent, confidence, plan
    ↓
Generate Reflection (LLM) → Rate outcome, analyze calibration
    ↓
Save Metacognition (with REAL data)
    ↓
IF Should Create Lesson → Call Smart Lesson Extractor
```

**Captures:**
- `user_intent` - Actual intent from Intake Agent
- `tools_used` - Actual tools list
- `predicted_confidence` - From Intake Agent
- `actual_outcome_score` - LLM-assessed
- `calibration_error` - predicted - actual
- `reflection_notes` - What went well/poorly
- `suggested_improvements` - For next time

---

### 4. Memory Consolidation (Scheduled)
**File:** `Memory_Consolidation.n8n.json`
**Purpose:** Extract patterns from individual lessons, save to persistent knowledge

**Schedule:** Every 24 hours

**Flow:**
```
Every 24 Hours
    ↓
Get Recent Lessons (grouped by category, 3+ lessons per group)
    ↓
Consolidate Patterns (LLM) → Extract high-level insights
    ↓
For each pattern:
  ├── IF new → Insert to memory_items
  └── IF exists → Update with new confidence
    ↓
Cleanup: Archive old unused lessons
    ↓
Log consolidation run
```

**Example Output:**
```
learning_examples (217 individual lessons)
    ↓ consolidation ↓
memory_items:
  - auto_fixer_connection_errors: "When connection errors occur, Auto-Fixer with param X works best"
  - workflow_builder_http_pattern: "Always validate HTTP Request nodes before deployment"
```

---

## Integration Guide

### Step 1: Deploy Workflows
1. Import `Smart_Lesson_Extractor.n8n.json`
2. Import `Smart_Memory_Recall.n8n.json`
3. Import `Enhanced_Reflection.n8n.json`
4. Import `Memory_Consolidation.n8n.json`
5. Update credential IDs in each workflow

### Step 2: Update Jonah's Best Agent

**Replace current reflection call:**

In the node "Execute Reflection", change the workflow ID to the new Enhanced Reflection workflow ID.

**Pass the required inputs:**
```javascript
{
  session_id: $json.session_id,
  user_input: $('Validate & Extract').item.json.user_message,
  intake_plan: $('Intake Agent').item.json.text,
  main_agent_output: $('Main Agent').item.json.text,
  tools_used: JSON.stringify($('Main Agent').item.json.steps?.map(s => s.tool) || []),
  was_successful: true, // or detect from output
  user_feedback: '' // future: add feedback mechanism
}
```

**Add Smart Memory Recall tool:**

Copy the tool node config from `Smart_Memory_Recall_Tool_Node.json` and add to Main Agent's tools.

Update the workflow ID placeholder with the actual ID after importing.

### Step 3: Update System Prompts

**Add to Main Agent's system prompt:**

```
### MEMORY TOOLS (USE THESE!)
You have access to `recall_memory` - USE IT when:
- You're unsure which tool to use
- The task seems familiar
- You want to check for established patterns

Example: Before building a workflow, call:
recall_memory({ query: "workflow building HTTP Request", category_filter: "workflow_building" })

This returns lessons from past interactions that might help.
```

### Step 4: Activate Memory Consolidation
- Set the schedule trigger (default: every 24 hours)
- Activate the workflow

---

## Database Changes (None Required)

The existing tables are sufficient:
- `learning_examples` - Individual lessons (upgraded quality)
- `memory_items` - Persistent patterns (will be populated by consolidation)
- `agent_metacognition` - Session reflections (will have real data now)

---

## Expected Results

After 1 week:
- **learning_examples:** Quality lessons with real `lesson_summary`
- **memory_items:** 5-20 consolidated patterns
- **agent_metacognition:** Real calibration data

After 1 month:
- Agent recalls relevant lessons for most queries
- Calibration error decreases (agent gets better at confidence)
- memory_items becomes a knowledge base of "how we do things"

---

## Monitoring Queries

```sql
-- Check lesson quality
SELECT
  DATE(created_at) as day,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE lesson_summary != 'No lesson generated') as quality_lessons
FROM learning_examples
GROUP BY DATE(created_at)
ORDER BY day DESC
LIMIT 7;

-- Check consolidation results
SELECT key, value, confidence, created_at
FROM memory_items
WHERE source_type = 'consolidation'
ORDER BY created_at DESC
LIMIT 10;

-- Check metacognition quality
SELECT
  DATE(created_at) as day,
  AVG(predicted_confidence) as avg_predicted,
  AVG(actual_outcome_score) as avg_actual,
  AVG(ABS(calibration_error)) as avg_calibration_error
FROM agent_metacognition
WHERE user_intent != '' AND user_intent IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY day DESC
LIMIT 7;

-- Check memory recall usage
SELECT
  DATE(updated_at) as day,
  SUM(times_referenced) as total_recalls
FROM learning_examples
WHERE times_referenced > 0
GROUP BY DATE(updated_at)
ORDER BY day DESC
LIMIT 7;
```

---

## Files Summary

| File | Type | Purpose |
|------|------|---------|
| `Smart_Lesson_Extractor.n8n.json` | Workflow | Extract lessons from interactions |
| `Smart_Memory_Recall.n8n.json` | Workflow | Multi-source memory retrieval |
| `Smart_Memory_Recall_Tool_Node.json` | Tool Node | Add recall tool to agent |
| `Enhanced_Reflection.n8n.json` | Workflow | Fix metacognition capture |
| `Memory_Consolidation.n8n.json` | Workflow | Daily pattern extraction |
| `Memory_Upgrade_Guide.md` | Guide | This file |
