# HubSpot Comprehensive Field Mapping

## 🎯 Complete Mapping - v2.1

This document shows **ALL** fields from your enrichment data and how they map to HubSpot.

---

## ✅ Standard Contact Fields (18 fields)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| contact_email | `email` | ✅ Mapped |
| contact_firstname | `firstname` | ✅ Mapped |
| contact_lastname | `lastname` | ✅ Mapped |
| contact_phone | `phone` | ✅ Mapped |
| contact_title | `jobtitle` | ✅ Mapped |
| contact_linkedin | `linkedinbio` | ✅ Mapped |
| company_name | `company` | ✅ Mapped |
| company_domain | `website` | ✅ Mapped |
| company_address | `address` | ✅ Mapped |
| company_city | `city` | ✅ Mapped |
| company_state | `state` | ✅ Mapped |
| company_zip | `zip` | ✅ Mapped |
| company_employee_count | `numemployees` | ✅ Mapped |
| company_revenue | `annualrevenue` | ✅ Mapped |
| company_size | `company_size` | ✅ Mapped |
| - | `hs_lead_status` | ✅ Set to 'NEW' |
| - | `lifecyclestage` | ✅ Set to 'lead' |

---

## ✅ DCS & Quality Scoring (3 fields)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| dcs_tier | `dcs_tier` | ✅ Existing property |
| dcs_score | `dcs_score` | ⚠️ Optional (will sync if created) |
| contact_confidence | `contact_confidence` | ✅ Existing property |
| contact_source | `contact_source` | ✅ Existing property |

---

## ✅ Google Business Data (4 fields)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| google_place_id | `asm_place_id` | ✅ Existing property |
| google_rating | `google_review_rating` | ✅ Existing property |
| google_review_count | `google_reviews` | ✅ Existing property |
| company_city + company_state | `asm_geo_market` | ✅ Existing property (formatted as "City, ST") |

---

## 🆕 Company Specialties & Services (NEWLY MAPPED!)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| **company_specialties** | `asm_services_summary` | ✅ **NOW MAPPED!** |
| context_jsonb.tech_and_metrics.services | `asm_services_summary` (fallback) | ✅ **NOW MAPPED!** |

**Example Value:**
```
"Wheel Alignment, Tire Rotation, Brake Repair, Exhaust & Mufflers, Oil Change, A/C Repair, TPMS Maintenance, Fleet Services, Hybrid Maintenance"
```

---

## 🆕 Technical & Operations Data (NEWLY MAPPED!)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| **hours_of_operation** | `hours_of_operation` | ⚠️ **NEW FIELD** - Create if needed |
| **tech_stack** (from ai_candidates) | `tech_stack` | ⚠️ **NEW FIELD** - Create if needed |
| **certifications** | `certifications` | ⚠️ **NEW FIELD** - Create if needed |
| **shop_type** (from context_jsonb) | `shop_type` | ⚠️ **NEW FIELD** - Create if needed |
| **priority_score** | `priority_score` | ⚠️ **NEW FIELD** - Create if needed |
| **years_in_business** | `years_in_business` | ⚠️ **NEW FIELD** - Create if needed |

**Example Values:**
- `hours_of_operation`: "7:30 AM–5:30 PM (Mon-Fri), 8 AM–2 PM (Sat), Closed (Sun)"
- `tech_stack`: "Computerized Alignment Equipment, Diagnostic Tools for TPMS, Fleet Management Software"
- `certifications`: "ASE Certified, EPA 609 Certified"
- `shop_type`: "Standard Repair Shop"
- `priority_score`: "75"
- `years_in_business`: "15"

---

## 🆕 Hiring Signals (NEWLY MAPPED!)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| **buying_signals** (filtered for hiring) | `active_job_postings` | ✅ **NOW MAPPED!** |
| **buying_signals** (hiring detected) | `asm_hiring_flag` | ✅ **NOW MAPPED!** |
| **ai_candidates.raw_input.active_job_posts** | `active_job_titles` | ✅ **NOW MAPPED!** |

**Logic:**
- Filters `buying_signals` for keywords: "hiring", "job", "technician", "recruiting"
- Sets `asm_hiring_flag` to true if hiring signals detected
- Extracts job titles from structured data if available

**Example Values:**
- `active_job_postings`: "hiring technicians\nhiring 10 technicians across various locations"
- `asm_hiring_flag`: "true"
- `active_job_titles`: "Automotive Technician\nService Advisor\nShop Manager"

---

## ✅ AI Intelligence & Insights (6 fields)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| intel_summary | `asm_ai_summary` | ✅ Existing property |
| context_summary | `research_briefing` | ✅ Existing property |
| personalization_hooks | `personalization_hooks` | ✅ Existing property |
| pain_points | `pain_points` | ✅ Existing property |
| buying_signals | `buying_signals` | ✅ Existing property |
| red_flags | `red_flags` | ✅ Existing property |
| talking_points | `talking_points` | ⚠️ Optional (will sync if created) |

---

## ✅ Outreach Strategy (2 fields)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| recommended_channel | `recommended_channel` | ✅ Existing property |
| best_time_to_contact | `best_time_to_contact` | ⚠️ Optional (will sync if created) |

---

## ✅ Source Tracking (3 fields)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| research_run_id | `research_run_id` | ✅ Existing property |
| airtable_id | `airtable_id` | ⚠️ Optional (will sync if created) |
| enriched_at | `enriched_at` | ⚠️ Optional (will sync if created) |

---

## ✅ Social Proof (2 fields)

| enriched_leads Field | HubSpot Property | Status |
|---------------------|------------------|--------|
| yelp_rating | `yelp_rating` | ⚠️ Optional (will sync if created) |
| facebook_url | `facebook_url` | ⚠️ Optional (will sync if created) |

---

## 📊 Summary Statistics

### Currently Mapped to Existing Properties:
- **Standard fields:** 18
- **DCS/Quality:** 3
- **Google data:** 4
- **AI insights:** 6
- **Outreach:** 1
- **Source tracking:** 1
- **🆕 Services/Specialties:** 1
- **🆕 Hiring signals:** 3
- **🆕 Geo market:** 1

**Total: 38 fields mapped to existing properties** ✅

### New Fields Being Synced (if you create them):
- `dcs_score`
- `hours_of_operation`
- `tech_stack`
- `certifications`
- `shop_type`
- `priority_score`
- `years_in_business`
- `talking_points`
- `best_time_to_contact`
- `airtable_id`
- `enriched_at`
- `yelp_rating`
- `facebook_url`

**Total: 13 optional fields** ⚠️

---

## 🎯 What's New in v2.1

### Major Additions:
1. ✅ **Company Specialties** → `asm_services_summary`
   - Maps array of services to readable string
   - Fallback to context_jsonb services
   - Up to 20 services included

2. ✅ **Hiring Intelligence** → `active_job_postings`, `asm_hiring_flag`, `active_job_titles`
   - Automatically detects hiring signals
   - Sets hiring flag for automation triggers
   - Extracts specific job titles

3. ✅ **Geo Market** → `asm_geo_market`
   - Formats city and state for routing
   - Used for timezone/quiet hours logic

4. ⚠️ **Operations Data** → New optional fields
   - Hours of operation
   - Tech stack
   - Certifications
   - Shop type
   - Priority score
   - Years in business

---

## 🚀 Recommended Next Steps

### Priority 1: Use Existing Mappings (Ready Now!)
Your workflow now maps **38 fields** to existing HubSpot properties. No changes needed!

### Priority 2: Create 6 High-Value Fields
Create these properties in HubSpot for maximum benefit:

1. **`hours_of_operation`** (Text) - Important for timing outreach
2. **`tech_stack`** (Multi-line text) - Technical conversation starters
3. **`certifications`** (Multi-line text) - Qualification proof
4. **`dcs_score`** (Number) - Sortable quality score
5. **`talking_points`** (Multi-line text) - Conversation starters
6. **`priority_score`** (Number) - AI-calculated priority

### Priority 3: Create Remaining Optional Fields
If you want 100% coverage, create the remaining 7 fields.

---

## API Commands to Create High-Value Fields

### 1. Hours of Operation
```bash
curl -X POST https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "hours_of_operation",
    "label": "Hours of Operation",
    "type": "string",
    "fieldType": "text",
    "description": "Business operating hours for timing outreach",
    "groupName": "custom_properties_for_jonah'\''s_lead_gen_"
  }'
```

### 2. Tech Stack
```bash
curl -X POST https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "tech_stack",
    "label": "Tech Stack",
    "type": "string",
    "fieldType": "textarea",
    "description": "Technologies and equipment used by the shop",
    "groupName": "custom_properties_for_jonah'\''s_lead_gen_"
  }'
```

### 3. Certifications
```bash
curl -X POST https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "certifications",
    "label": "Certifications",
    "type": "string",
    "fieldType": "textarea",
    "description": "Professional certifications held by the shop",
    "groupName": "custom_properties_for_jonah'\''s_lead_gen_"
  }'
```

### 4. DCS Score
```bash
curl -X POST https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "dcs_score",
    "label": "DCS Score",
    "type": "number",
    "fieldType": "number",
    "description": "Data Confidence Score (0-100) for lead quality sorting",
    "groupName": "custom_properties_for_jonah'\''s_lead_gen_"
  }'
```

### 5. Talking Points
```bash
curl -X POST https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "talking_points",
    "label": "Talking Points",
    "type": "string",
    "fieldType": "textarea",
    "description": "AI-generated conversation starters for outreach calls",
    "groupName": "custom_properties_for_jonah'\''s_lead_gen_"
  }'
```

### 6. Priority Score
```bash
curl -X POST https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "priority_score",
    "label": "Priority Score",
    "type": "number",
    "fieldType": "number",
    "description": "AI-calculated priority score for lead sequencing",
    "groupName": "custom_properties_for_jonah'\''s_lead_gen_"
  }'
```

---

## Testing the New Mappings

Run the workflow on a test lead (like the Meineke example) and verify:

### Should See in HubSpot:
- ✅ `asm_services_summary`: "Wheel Alignment, Tire Rotation, Brake Repair..."
- ✅ `asm_geo_market`: "Jacksonville, FL"
- ✅ `active_job_postings`: "hiring technicians" (if buying signals contain hiring)
- ✅ `asm_hiring_flag`: "true" (if hiring detected)

### Won't See (Unless Properties Created):
- ⚠️ `hours_of_operation`
- ⚠️ `tech_stack`
- ⚠️ `certifications`
- ⚠️ `dcs_score`
- ⚠️ `talking_points`
- ⚠️ `priority_score`

---

**Version:** 2.1
**Date:** 2026-01-23
**Status:** Production Ready - 38 fields mapped, 13 optional
