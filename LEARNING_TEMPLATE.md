# {Workflow Name} - Learnings

**Original JSON Sent:** {date}
**Working JSON Received:** {date}
**Changes Required:** {count}
**Success Rate:** {percentage}% (fields correct on first try)

---

## Executive Summary

**What worked well:**
- {list 2-3 things that didn't need changes}

**What needed fixes:**
- {list main categories of changes}

**Key Lesson:**
{1-2 sentence summary of the biggest learning}

---

## Detailed Changes

### 1. {Change Category}

**Node:** {node name}
**Field:** {field path}

**Original (Sent):**
```json
{original value}
```

**Working (Received):**
```json
{corrected value}
```

**Lesson Learned:**
{Specific, actionable lesson for future workflows}

**Root Cause:**
- [ ] Outdated documentation
- [ ] Expression syntax error
- [ ] Wrong property name
- [ ] Type mismatch
- [ ] Missing required field
- [ ] API version change
- [ ] Other: {specify}

**Prevention Strategy:**
{How to avoid this in the future}

---

### 2. {Change Category}

{Repeat structure above for each change}

---

## Pattern Analysis

### Recurring Issues
{If this is similar to past learnings, note the pattern}

### Node-Specific Issues
| Node Type | Issue Count | Common Problems |
|-----------|-------------|-----------------|
| {node}    | {count}     | {description}   |

### Expression Syntax Issues
- Total expression errors: {count}
- Most common: {pattern}
- Solution: {fix}

---

## Future Improvements

### Immediate Actions
1. {Specific fix to apply to workflow generator}
2. {Update to CLAUDE.md or skill}
3. {Check to add before sending JSON}

### Template Updates
- [ ] Update {specific node template}
- [ ] Add validation for {specific field}
- [ ] Document {API endpoint/version}

### Learning Examples to Store
```sql
INSERT INTO learning_examples (
  user_input,
  expected_behavior,
  actual_behavior,
  lesson_summary,
  workflow_pattern,
  context
) VALUES (
  '{What Jonah requested}',
  '{What I sent originally}',
  '{What actually worked}',
  '{Key lesson}',
  '{Pattern: sync/webhook/scheduled/etc}',
  '{
    "workflow_name": "{name}",
    "node_types_affected": ["{node1}", "{node2}"],
    "total_changes": {count},
    "categories": {
      "credentials": {count},
      "expressions": {count},
      "properties": {count},
      "api_endpoints": {count}
    }
  }'::jsonb
);
```

---

## Stats

| Metric | Value |
|--------|-------|
| Total Nodes | {count} |
| Nodes Changed | {count} |
| Change Rate | {percentage}% |
| Credential Issues | {count} |
| Expression Errors | {count} |
| Property Errors | {count} |
| API Endpoint Errors | {count} |
| Version Mismatches | {count} |

---

## Related Learnings

**Similar Workflows:**
- [{Workflow Name}]({path/to/learnings.md}) - {brief description of similarity}

**Related Skills:**
- n8n Expression Syntax
- n8n Node Configuration
- {Other relevant skills}

---

## Verification Checklist

Before sending future {workflow_pattern} workflows:

- [ ] Validate all expression syntax with n8n Expression skill
- [ ] Check API endpoint versions
- [ ] Verify property names with get_node tool
- [ ] Include credential structure (even if placeholder)
- [ ] Test webhook data access pattern
- [ ] Verify node typeVersion compatibility
- [ ] Check for deprecated properties
- [ ] Validate SQL parameterization format

---

## Notes

{Any additional context, observations, or patterns noticed}
