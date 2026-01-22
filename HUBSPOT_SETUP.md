# HubSpot Custom Properties Setup

## ✅ Properties Created Successfully (2026-01-21)

All custom properties have been created via the HubSpot MCP tools. No manual setup required!

## Company Properties (16 total)

| Property Name | Label | Type | Status |
|--------------|-------|------|--------|
| `dcs_score` | DCS Score | Number | ✅ Created |
| `dcs_tier` | DCS Tier | Dropdown (platinum/gold/bronze) | ✅ Created |
| `google_rating` | Google Rating | Number | ✅ Created |
| `google_review_count` | Google Review Count | Number | ✅ Created |
| `google_place_id` | Google Place ID | Single-line text | ✅ Created |
| `intel_summary` | Intel Summary | Multi-line text | ✅ Created |
| `pain_points` | Pain Points | Multi-line text | ✅ Created |
| `buying_signals` | Buying Signals | Multi-line text | ✅ Created |
| `red_flags` | Red Flags | Multi-line text | ✅ Created |
| `personalization_hooks` | Personalization Hooks | Multi-line text | ✅ Created |
| `talking_points` | Talking Points | Multi-line text | ✅ Created |
| `recommended_channel` | Recommended Channel | Dropdown (email/sms/call) | ✅ Created |
| `best_contact_time` | Best Contact Time | Dropdown (morning/afternoon/evening) | ✅ Created |
| `research_run_id` | Research Run ID | Single-line text | ✅ Created |
| `airtable_id` | Airtable ID | Single-line text | ✅ Created |
| `enriched_at` | Enriched At | Date | ✅ Created |

## Contact Properties (3 total)

| Property Name | Label | Type | Status |
|--------------|-------|------|--------|
| `contact_source` | Contact Source | Single-line text | ✅ Created |
| `contact_confidence` | Contact Confidence | Number | ✅ Created |
| `dcs_tier` | DCS Tier | Dropdown (platinum/gold/bronze) | ✅ Already existed |

## Workflow Credential Requirements

The workflow uses OAuth2 authentication:
- Credential ID: `lYfPDbXeRJyLf4I3`
- Credential Name: `HubSpot OAuth account`

Required scopes (all verified present):
- `crm.objects.companies.read` ✅
- `crm.objects.companies.write` ✅
- `crm.objects.contacts.read` ✅
- `crm.objects.contacts.write` ✅

## Workflow Logic Summary

```
[Schedule: Every 5 min]
        ↓
[Query: enriched_leads WHERE outreach_ready=true AND outreach_status='pending']
        ↓
[For each lead]
        ↓
[Search Company by Domain] → [Exists?] → [Update] OR [Create]
        ↓
[Search Contact by Email] → [Exists?] → [Update] OR [Create]
        ↓
[Associate Contact → Company]
        ↓
[Update enriched_leads: outreach_status='synced', hubspot_*_id]
```

## Field Mapping

### Company Fields
| Enriched Leads Column | HubSpot Property |
|----------------------|------------------|
| company_name | name |
| company_domain | domain |
| company_phone | phone |
| company_address | address |
| company_city | city |
| company_state | state |
| company_zip | zip |
| company_employee_count | numberofemployees |
| dcs_score | dcs_score |
| dcs_tier | dcs_tier |
| google_rating | google_rating |
| google_review_count | google_review_count |
| google_place_id | google_place_id |
| intel_summary | intel_summary |
| pain_points | pain_points |
| buying_signals | buying_signals |
| red_flags | red_flags |
| personalization_hooks | personalization_hooks |
| talking_points | talking_points |
| recommended_channel | recommended_channel |
| best_contact_time | best_contact_time |
| research_run_id | research_run_id |
| airtable_id | airtable_id |
| enriched_at | enriched_at |

### Contact Fields
| Enriched Leads Column | HubSpot Property |
|----------------------|------------------|
| contact_email | email |
| contact_firstname | firstname |
| contact_lastname | lastname |
| contact_phone | phone |
| contact_title | jobtitle |
| contact_linkedin | linkedinbio |
| contact_source | contact_source |
| contact_confidence | contact_confidence |
| dcs_tier | dcs_tier |

## HubSpot Portal Info

- **Portal ID:** 48749472
- **UI Domain:** app-na2.hubspot.com
- **Owner:** Jonah Helland (jonah@autoshopmedia.com)
- **Owner ID:** 80962080
