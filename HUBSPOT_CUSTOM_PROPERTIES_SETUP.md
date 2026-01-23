# HubSpot Custom Properties Setup Guide

This document lists all the custom properties that need to be created in HubSpot for the **Enhanced Lead Sync v2** workflow to function properly.

## Overview

The Enhanced Lead Sync workflow maps enriched lead data from your Postgres database to HubSpot contacts. Many of these fields require custom properties to be created in HubSpot first.

---

## Required Custom Properties

### 🎯 DCS (Data Confidence Score) Properties

| Internal Name | Label | Field Type | Description |
|--------------|-------|------------|-------------|
| `dcs_score` | DCS Score | Number | Data Confidence Score (0-100) indicating lead quality |
| `dcs_tier` | DCS Tier | Single-line text | Lead tier: platinum, gold, or bronze |

**Purpose:** Track the quality and completeness of enrichment data for prioritization.

---

### 👤 Contact Tracking Properties

| Internal Name | Label | Field Type | Description |
|--------------|-------|------------|-------------|
| `contact_source` | Contact Source | Single-line text | Where the contact info was found (e.g., website, hunter, linkedin) |
| `contact_confidence` | Contact Confidence | Number | Confidence score for contact accuracy (0-100) |

**Purpose:** Track data provenance and reliability for each contact.

---

### 🏢 Company Enrichment Properties

| Internal Name | Label | Field Type | Description |
|--------------|-------|------------|-------------|
| `company_rating` | Company Rating | Number | Overall company rating (1-5 stars) |
| `company_review_count` | Company Review Count | Number | Total number of reviews |
| `company_employee_count` | Employee Count | Number | Estimated number of employees |
| `company_year_founded` | Year Founded | Number | Year the company was founded |

**Purpose:** Store firmographic data for company insights.

---

### ⭐ Google Business Properties

| Internal Name | Label | Field Type | Description |
|--------------|-------|------------|-------------|
| `google_place_id` | Google Place ID | Single-line text | Google My Business place identifier |
| `google_rating` | Google Rating | Number | Google My Business rating (1-5 stars) |
| `google_review_count` | Google Review Count | Number | Number of Google reviews |

**Purpose:** Track Google Business Profile metrics for social proof.

---

### 📱 Social Proof Properties

| Internal Name | Label | Field Type | Description |
|--------------|-------|------------|-------------|
| `yelp_rating` | Yelp Rating | Number | Yelp rating (1-5 stars) |
| `facebook_url` | Facebook URL | Single-line text | Link to Facebook business page |

**Purpose:** Additional social proof and verification channels.

---

### 🧠 AI Intelligence Properties

| Internal Name | Label | Field Type | Description |
|--------------|-------|------------|-------------|
| `intel_summary` | Intelligence Summary | Multi-line text | AI-generated lead profile and summary |
| `personalization_hooks` | Personalization Hooks | Multi-line text | Specific talking points for personalized outreach |
| `pain_points` | Pain Points | Multi-line text | Identified business challenges |
| `buying_signals` | Buying Signals | Multi-line text | Indicators the lead is ready to buy |
| `red_flags` | Red Flags | Multi-line text | Concerns or reasons to deprioritize |
| `talking_points` | Talking Points | Multi-line text | Key topics to discuss during outreach |

**Purpose:** Store AI-generated insights from enrichment analysis.

---

### 📞 Outreach Strategy Properties

| Internal Name | Label | Field Type | Description |
|--------------|-------|------------|-------------|
| `recommended_channel` | Recommended Channel | Dropdown | Best channel for outreach (email, sms, call) |
| `best_time_to_contact` | Best Time to Contact | Dropdown | Optimal time window (morning, afternoon, evening) |

**Dropdown Values:**
- `recommended_channel`: email, sms, call
- `best_time_to_contact`: morning, afternoon, evening

**Purpose:** AI-recommended outreach timing and channel selection.

---

### 🔍 Source Tracking Properties

| Internal Name | Label | Field Type | Description |
|--------------|-------|------------|-------------|
| `research_run_id` | Research Run ID | Single-line text | Unique ID of the enrichment run |
| `airtable_id` | Airtable ID | Single-line text | Original Airtable record ID |
| `enriched_at` | Enriched At | Date picker | Timestamp when lead was enriched |
| `context_summary` | Context Summary | Multi-line text | Summary of all enrichment context |

**Purpose:** Track data lineage and enrichment history.

---

## How to Create Custom Properties in HubSpot

### Option 1: Via HubSpot UI

1. Go to **Settings** → **Properties** in your HubSpot account
2. Select **Contact Properties**
3. Click **Create property**
4. Fill in:
   - **Label:** Use the "Label" from the table above
   - **Internal name:** Use the "Internal Name" from the table above
   - **Field type:** Use the "Field Type" from the table above
   - **Description:** Copy from the "Description" column
5. Click **Create**

### Option 2: Via HubSpot API (Bulk Creation)

You can use the HubSpot Properties API to create these programmatically. Here's an example for one property:

```bash
curl -X POST \
  https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "dcs_score",
    "label": "DCS Score",
    "type": "number",
    "fieldType": "number",
    "description": "Data Confidence Score (0-100) indicating lead quality",
    "groupName": "contactinformation"
  }'
```

---

## Property Groups (Optional but Recommended)

Consider creating custom property groups to organize these fields:

### **Lead Enrichment** Group
- DCS Score
- DCS Tier
- Contact Source
- Contact Confidence
- Enriched At
- Research Run ID

### **Company Intelligence** Group
- Company Rating
- Company Review Count
- Employee Count
- Year Founded
- Google Rating
- Google Review Count
- Yelp Rating

### **AI Insights** Group
- Intelligence Summary
- Personalization Hooks
- Pain Points
- Buying Signals
- Red Flags
- Talking Points

### **Outreach Strategy** Group
- Recommended Channel
- Best Time to Contact
- Context Summary

---

## Validation Checklist

After creating all properties, verify:

- [ ] All 28 custom properties are created
- [ ] Property internal names match exactly (case-sensitive)
- [ ] Dropdown properties have correct values set
- [ ] Number properties allow decimals where needed
- [ ] Multi-line text properties have no character limits
- [ ] Properties are assigned to the "Contacts" object

---

## Testing

1. Run the Enhanced Lead Sync workflow manually
2. Check a synced contact in HubSpot
3. Verify all custom fields are populated with data
4. Review the sync summary for any errors

---

## Troubleshooting

### Property not syncing:
- Verify the property internal name matches exactly
- Check that the property is set for the Contacts object
- Ensure your HubSpot API credentials have write permissions

### Data truncated:
- Some HubSpot text fields have limits (65,536 characters for multi-line text)
- The workflow automatically truncates data to fit

### Missing properties:
- Run this query to check which properties already exist:
```bash
curl https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

---

## Notes

- Standard HubSpot properties (firstname, lastname, email, phone, company, etc.) don't need to be created
- The workflow will continue even if some custom properties don't exist, but data will be lost
- Consider setting up property permissions if you have multiple users

---

## Support

If you encounter issues:
1. Check the n8n workflow execution logs
2. Review the `hubspot_syncs` table in Postgres for error details
3. Verify HubSpot API rate limits aren't being hit

---

**Last Updated:** 2026-01-23
**Workflow:** HubSpot Enhanced Lead Sync v2
**Related Files:** `HubSpot_Enhanced_Lead_Sync_v2.n8n.json`
