# 🚀 HubSpot Enhanced Lead Sync v2 — Full Enrichment

## Overview

The **HubSpot Enhanced Lead Sync v2** workflow is a comprehensive solution for syncing enriched lead data from your Postgres database to HubSpot CRM. It implements an intelligent dual-search strategy (email + phone) and maps all enrichment data including AI-generated insights, DCS scores, and outreach strategies.

---

## Key Features

### ✅ Dual Search Strategy
- **Email Search First:** Searches HubSpot by email address
- **Phone Fallback:** If no email match, searches by phone number
- **Deduplication:** Prevents duplicate contacts in HubSpot

### ✅ Comprehensive Data Mapping
- All standard HubSpot contact fields
- 28 custom properties for enrichment data
- DCS (Data Confidence Score) tracking
- AI-generated insights and talking points
- Outreach strategy recommendations

### ✅ Smart Validation
- Handles contacts without names (extracts from email or uses company name)
- Skips leads without email OR phone
- Validates all data before syncing
- Truncates fields to HubSpot limits

### ✅ Multi-Table Tracking
- Updates `enriched_leads` table with HubSpot IDs
- Logs sync status in `hubspot_syncs` table
- Maintains `hubspot_contacts` mirror table for tracking

### ✅ Error Handling
- Continues on individual contact failures
- Provides detailed sync summary
- Tracks failures in database for retry

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER (Every 5 minutes)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│         📥 Get Pending Enriched Leads (with context)             │
│  SELECT from enriched_leads + company_contexts                   │
│  WHERE outreach_ready=true AND outreach_status='pending'         │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│          📋 Prep HubSpot Payload (Property Mapping)              │
│  • Maps 50+ fields to HubSpot properties                         │
│  • Handles missing names (email extraction fallback)             │
│  • Validates email/phone existence                               │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Can Sync? (Validation)                       │
│  ✓ Has email OR phone → Proceed                                 │
│  ✗ No contact method → Skip                                     │
└──────────────┬────────────────────────────────┬─────────────────┘
               ↓                                ↓
          [PROCEED]                        [SKIP]
               │                                │
               ↓                                ↓
┌──────────────────────────────┐    ┌──────────────────────┐
│  🔍 Search by Email           │    │  ⏭️ Skip Lead        │
│  POST /crm/v3/objects/        │    │  Mark as skipped     │
│       contacts/search         │    └──────────────────────┘
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  ⚙️ Extract Email Result     │
│  Found? → Proceed to Upsert  │
│  Not Found? → Try Phone      │
└──────────────┬───────────────┘
               ↓
       ┌──────────────┐
       │ Need Phone   │
       │ Search?      │
       └──┬────────┬──┘
          │        │
     [YES]│        │[NO - Found by email]
          ↓        ↓
┌──────────────────┐  │
│ 🔍 Search by     │  │
│    Phone         │  │
└────────┬─────────┘  │
         │            │
         ↓            │
┌──────────────────┐  │
│ ⚙️ Extract Phone │  │
│    Result        │  │
└────────┬─────────┘  │
         │            │
         └────┬───────┘
              ↓
┌─────────────────────────────┐
│  🤝 Merge Search Results     │
│  Combine email/phone results │
└──────────────┬───────────────┘
               ↓
       ┌───────────────┐
       │ Contact       │
       │ Exists?       │
       └───┬────────┬──┘
           │        │
      [YES]│        │[NO]
           ↓        ↓
┌─────────────────┐  ┌─────────────────┐
│ 📝 Update       │  │ ➕ Create       │
│    Contact      │  │    Contact      │
│ PATCH /crm/v3/  │  │ POST /crm/v3/   │
│ objects/contacts│  │ objects/contacts│
└────────┬────────┘  └────────┬────────┘
         │                     │
         └──────────┬──────────┘
                    ↓
┌─────────────────────────────────────────┐
│  🤝 Merge Upsert Result                 │
│  Combine create/update responses        │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  ⚙️ Extract Final Contact ID            │
│  Get HubSpot ID + determine success     │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  🗄️ Update enriched_leads               │
│  SET hubspot_contact_id, status         │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  📊 Track in hubspot_syncs              │
│  INSERT sync record with status         │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  📇 Upsert to hubspot_contacts          │
│  Mirror contact in tracking table       │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  📊 Sync Summary                         │
│  Aggregate results: created, updated,    │
│  failed counts                           │
└─────────────────────────────────────────┘
```

---

## Prerequisites

### 1. HubSpot Setup
- **Custom Properties:** Create all 28 custom properties listed in `HUBSPOT_CUSTOM_PROPERTIES_SETUP.md`
- **API Access:** HubSpot OAuth2 credentials configured in n8n
- **Permissions:** Read/Write access to Contacts object

### 2. Database Tables
- `enriched_leads` - Source table with enriched lead data
- `company_contexts` - Additional company intelligence
- `hubspot_syncs` - Sync status tracking
- `hubspot_contacts` - HubSpot contact mirror

### 3. n8n Configuration
- Postgres credentials configured
- HubSpot OAuth2 credentials configured
- Workflow imported and activated

---

## Configuration

### Schedule Trigger
**Default:** Every 5 minutes

To change:
1. Open the workflow
2. Click on "⏱️ Every 5 Minutes" node
3. Modify the interval
4. Save

### Batch Size
**Default:** 20 leads per run

To change, edit the `LIMIT` in "📥 Get Pending Enriched Leads" node query:
```sql
LIMIT 20; -- Change this number
```

---

## Data Flow

### Input (from Postgres)
The workflow pulls from `enriched_leads` table where:
- `outreach_ready = true`
- `outreach_status = 'pending'`
- `hubspot_contact_id IS NULL`

**Ordered by:** `dcs_score DESC` (highest quality leads first)

### Processing
1. **Payload Preparation:**
   - Maps 50+ fields from `enriched_leads` to HubSpot properties
   - Handles name extraction from email if missing
   - Parses JSON fields (hooks, pain points, signals, etc.)
   - Truncates text to HubSpot limits

2. **Contact Search:**
   - Searches by email first
   - Falls back to phone if no email match
   - Skips if neither email nor phone available

3. **Upsert to HubSpot:**
   - **Update** if contact found
   - **Create** if not found
   - Uses HTTP Request nodes for full control

### Output (to Postgres & HubSpot)
1. **enriched_leads table:**
   - `hubspot_contact_id` = HubSpot contact ID
   - `outreach_status` = 'synced' or 'sync_failed'
   - `outreach_started_at` = NOW()

2. **hubspot_syncs table:**
   - New record with sync status and error details

3. **hubspot_contacts table:**
   - Upserted contact record for tracking

4. **HubSpot CRM:**
   - Contact created/updated with all properties

---

## Field Mapping

### Standard HubSpot Properties
| enriched_leads Field | HubSpot Property |
|---------------------|------------------|
| contact_email | email |
| contact_firstname | firstname |
| contact_lastname | lastname |
| contact_phone | phone |
| company_name | company |
| company_domain | website |
| contact_title | jobtitle |
| contact_linkedin | linkedinbio |
| company_address | address |
| company_city | city |
| company_state | state |
| company_zip | zip |

### Custom Properties
See `HUBSPOT_CUSTOM_PROPERTIES_SETUP.md` for full list of 28 custom properties.

---

## Error Handling

### Contact-Level Errors
- **Continues on Fail:** Enabled for all HubSpot API calls
- **Tracking:** Errors logged to `hubspot_syncs.sync_error`
- **Status:** Lead marked as `sync_failed` in `enriched_leads`

### Workflow-Level Errors
- Individual contact failures don't stop the workflow
- Summary shows counts: synced, created, updated, failed
- Failed leads remain in `pending` status for retry

---

## Monitoring & Debugging

### Check Sync Summary
After each run, check the "📊 Sync Summary" node output:
```json
{
  "success": true,
  "total_processed": 20,
  "synced": 18,
  "created": 15,
  "updated": 3,
  "failed": 2,
  "summary": "HubSpot Sync Complete: 18 synced (15 created, 3 updated), 2 failed"
}
```

### Query Failed Syncs
```sql
SELECT
  el.company_name,
  el.contact_email,
  hs.sync_error,
  hs.created_at
FROM enriched_leads el
JOIN hubspot_syncs hs ON el.research_run_id = hs.research_run_id
WHERE hs.sync_status = 'failed'
ORDER BY hs.created_at DESC
LIMIT 10;
```

### Check Sync History
```sql
SELECT
  object_type,
  sync_status,
  COUNT(*) as count,
  MAX(synced_at) as last_sync
FROM hubspot_syncs
WHERE object_type = 'contact'
GROUP BY object_type, sync_status;
```

---

## Retry Failed Syncs

To retry failed syncs, reset the status:
```sql
UPDATE enriched_leads
SET outreach_status = 'pending',
    hubspot_contact_id = NULL
WHERE outreach_status = 'sync_failed'
  AND dcs_score >= 50; -- Only retry decent quality leads
```

---

## Performance Considerations

### API Rate Limits
- **HubSpot:** 100 requests per 10 seconds (per account)
- **Current Load:** ~4 requests per contact (search email, search phone, upsert, optional update)
- **Max Throughput:** ~25 contacts per 10 seconds

With 5-minute intervals and 20 leads per batch:
- **20 leads × 4 requests = 80 requests**
- **Runtime:** ~10-15 seconds
- **Well within limits** ✅

### Database Performance
- Query uses index on `outreach_ready`, `outreach_status`, `hubspot_contact_id`
- Consider adding index if slow:
```sql
CREATE INDEX idx_enriched_leads_sync_status
ON enriched_leads(outreach_ready, outreach_status, hubspot_contact_id)
WHERE outreach_ready = true;
```

---

## Customization

### Adding More Properties
1. Add field to payload in "📋 Prep HubSpot Payload" node
2. Create corresponding custom property in HubSpot
3. Test with single contact

### Changing Search Logic
Edit "🔍 Search HubSpot by Email" or "🔍 Search HubSpot by Phone" nodes to add additional search criteria or filters.

### Modifying Validation Rules
Edit "Can Sync?" node to change which leads are eligible for syncing.

---

## Troubleshooting

### Issue: Properties not syncing
**Solution:**
1. Verify custom properties exist in HubSpot
2. Check property internal names match exactly
3. Review HubSpot API permissions

### Issue: Duplicate contacts created
**Solution:**
1. Check if email/phone formats match between systems
2. Normalize phone numbers before syncing
3. Review search query filters

### Issue: "No contact method" skips
**Solution:**
1. Check `enriched_leads` for missing email AND phone
2. Improve enrichment to capture contact info
3. Review DCS breakdown for contact fields

### Issue: Sync status not updating
**Solution:**
1. Check Postgres credentials
2. Verify `research_run_id` exists in both tables
3. Review database logs for constraint violations

---

## Maintenance

### Weekly
- Review failed sync count
- Check HubSpot API usage
- Monitor database table sizes

### Monthly
- Audit custom property usage in HubSpot
- Clean up old sync records
- Review and update property mappings

### Quarterly
- Optimize batch size based on lead volume
- Review and update validation rules
- Test disaster recovery

---

## Related Files

- `HubSpot_Enhanced_Lead_Sync_v2.n8n.json` - The workflow file
- `HUBSPOT_CUSTOM_PROPERTIES_SETUP.md` - Custom properties documentation
- `Current Supabase SQL Schema` - Database schema reference

---

## Changelog

### v2.0 (2026-01-23)
- ✅ Dual search strategy (email + phone)
- ✅ Comprehensive property mapping (50+ fields)
- ✅ Multi-table tracking (hubspot_syncs + hubspot_contacts)
- ✅ Smart name handling (email extraction fallback)
- ✅ HTTP Request nodes for full control
- ✅ Enhanced error handling and logging

### v1.0
- Basic HubSpot sync with standard properties
- Single search strategy (domain only)
- Limited error handling

---

## Support

For issues or questions:
1. Check n8n workflow execution logs
2. Review `hubspot_syncs` table for error details
3. Consult HubSpot API documentation
4. Check Postgres logs for database errors

---

**Workflow Name:** 🚀 HubSpot Enhanced Lead Sync v2 — Full Enrichment
**Version:** 2.0
**Last Updated:** 2026-01-23
**Author:** Auto Shop Media
