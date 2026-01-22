# Notion to Google Docs SOP Migration Guide

## Overview

This workflow migrates ALL your Notion pages to Google Docs, automatically:
- Queries your Notion database in batches (100 pages at a time)
- Extracts content from each page
- Creates a formatted Google Doc
- Logs the migration to Postgres

## Workflow: `Notion_to_Google_Docs_SOP_Migrator.n8n.json`

### What It Does

1. **Queries Notion** - Gets all pages from your SOP database
2. **Handles Pagination** - Processes 100 pages at a time, loops through all
3. **Extracts Properties** - Pulls SOP Name, Category, Status, Tags, etc.
4. **Gets Page Content** - Fetches all blocks (text, lists, code, etc.)
5. **Parses Sections** - Identifies Purpose, Steps, Troubleshooting, etc.
6. **Creates Google Docs** - One doc per Notion page
7. **Logs to Database** - Tracks all migrations in `sops` table

### Configuration

Update the `Configuration` node with your values:

```javascript
{
  notionDatabaseId: "5daa56637e0043f0a86f64bc1ed34dfb",  // Your Notion database ID
  batchSize: 100,  // Pages per batch (max 100)
  googleFolderId: "YOUR_GOOGLE_DRIVE_FOLDER_ID",  // Where to create docs
  processAll: true  // Process all pages
}
```

### Notion Database Field Mapping

The workflow automatically maps these Notion properties:

| Notion Property | SOP Field |
|-----------------|-----------|
| `SOP Name` or `Name` or `Title` | sopName |
| `SOP ID` or `ID` | sopId |
| `Category` or `Type` | category |
| `Status` | status |
| `Priority` | priority |
| `Quick Summary` or `Summary` or `Description` | quickSummary |
| `Tags` | tags |
| `Version` | version |
| `Owner` or `Assignee` | owner |
| `Source` | source |

### Content Section Detection

The workflow tries to detect sections in your Notion content:

- **Purpose** - Headers containing "purpose"
- **Scope** - Headers containing "scope"
- **Prerequisites** - Headers containing "prerequisite"
- **Steps** - Headers containing "step" or "procedure"
- **Expected Outcome** - Headers containing "outcome" or "result"
- **Troubleshooting** - Headers containing "troubleshoot" or "issue"
- **Related Workflows** - Headers containing "related" or "workflow"

## Pre-Migration Checklist

1. **Run the database migration first:**
   ```sql
   -- Run migrations/004_sops_table.sql
   ```

2. **Create Google Drive folder:**
   - Create: `Auto Shop Media SOPs`
   - Get the folder ID from the URL

3. **Set up credentials in n8n:**
   - Notion API credential
   - Google Docs OAuth2 credential
   - Postgres credential

4. **Update credential IDs in workflow:**
   - `NOTION_CREDENTIAL_ID`
   - `GOOGLE_DOCS_CREDENTIAL_ID`
   - `POSTGRES_CREDENTIAL_ID`

## Running the Migration

1. **Test with small batch first:**
   - Set `batchSize: 5` in Configuration
   - Run manually
   - Check Google Drive for results

2. **Run full migration:**
   - Set `batchSize: 100`
   - Run manually
   - Monitor execution (may take a while for thousands of pages)

3. **Check results:**
   ```sql
   SELECT COUNT(*) FROM sops;
   SELECT sop_name, google_doc_url, created_at
   FROM sops
   ORDER BY created_at DESC
   LIMIT 20;
   ```

## Estimated Time

- ~2-3 seconds per page (API calls + doc creation)
- 1000 pages ≈ 30-50 minutes
- 2000 pages ≈ 1-2 hours

## Rate Limits

- **Notion API**: 3 requests/second
- **Google Docs API**: 60 requests/minute

The workflow processes sequentially to stay within limits.

## Troubleshooting

### "Notion API rate limit"
- Reduce batch size to 50
- Add a Wait node between pages

### "Google Doc creation failed"
- Check folder permissions
- Verify OAuth2 scopes include `drive.file` and `documents`

### "Missing content"
- Some Notion blocks may not be supported
- Check the "Full Original Content" section in the doc

### "Duplicate SOPs"
- The workflow uses `ON CONFLICT` to update existing records
- Same SOP ID will update, not duplicate

## Post-Migration

After migration completes:

1. **Verify in Google Drive** - Check folder has all docs
2. **Spot check content** - Open a few docs to verify formatting
3. **Query the database:**
   ```sql
   SELECT category, COUNT(*)
   FROM sops
   GROUP BY category;
   ```

4. **Consider archiving Notion** - Once verified, you can archive the Notion database

## Future Syncing

The `Google_Docs_SOP_Publisher.n8n.json` workflow can be used to:
- Create new SOPs directly in Google Docs
- Update existing SOPs by SOP ID
- Works independently of Notion
