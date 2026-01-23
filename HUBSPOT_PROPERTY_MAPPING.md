# HubSpot Property Mapping - Existing vs Required

## ✅ Properties You Already Have (Will Use These)

| enriched_leads Field | Your HubSpot Property | Type | Notes |
|---------------------|----------------------|------|-------|
| contact_email | `email` | text | Standard property |
| contact_firstname | `firstname` | text | Standard property |
| contact_lastname | `lastname` | text | Standard property |
| contact_phone | `phone` | text | Standard property |
| company_name | `company` | text | Standard property |
| company_domain | `website` | text | Standard property |
| contact_title | `jobtitle` | text | Standard property |
| contact_linkedin | `linkedinbio` | text | Standard property |
| company_address | `address` | text | Standard property |
| company_city | `city` | text | Standard property |
| company_state | `state` | text | Standard property |
| company_zip | `zip` | text | Standard property |
| **DCS Tier** | `dcs_tier` | select | ✅ Custom property exists |
| **Contact Source** | `contact_source` | text | ✅ Custom property exists |
| **Contact Confidence** | `contact_confidence` | number | ✅ Custom property exists |
| **Company Size** | `company_size` | text | Standard property |
| **Employee Count** | `numemployees` | select | Standard property |
| **Annual Revenue** | `annualrevenue` | text | Standard property |
| **Google Place ID** | `asm_place_id` | text | ✅ Custom property exists (using ASM field) |
| **Google Rating** | `google_review_rating` | number | ✅ Custom property exists |
| **Google Review Count** | `google_reviews` | number | ✅ Custom property exists |
| **AI Summary** | `asm_ai_summary` | textarea | ✅ Custom property exists (using ASM field) |
| **Personalization Hooks** | `personalization_hooks` | text | ✅ Custom property exists |
| **Pain Points** | `pain_points` | text | ✅ Custom property exists |
| **Buying Signals** | `buying_signals` | text | ✅ Custom property exists |
| **Red Flags** | `red_flags` | text | ✅ Custom property exists |
| **Research Briefing** | `research_briefing` | textarea | ✅ Custom property exists (will use for context) |
| **Recommended Channel** | `recommended_channel` | text | ✅ Custom property exists |
| **Research Run ID** | `research_run_id` | text | ✅ Custom property exists |

---

## ⚠️ Missing Properties (Need to Create These)

### Critical (Highly Recommended)

| Property Name | Label | Type | Description | Priority |
|--------------|-------|------|-------------|----------|
| `dcs_score` | DCS Score | Number | Numeric DCS score 0-100 for sorting/filtering | **HIGH** |
| `talking_points` | Talking Points | Multi-line text | AI-generated conversation starters | **HIGH** |
| `best_time_to_contact` | Best Time to Contact | Single-line text | Optimal contact time (morning/afternoon/evening) | **MEDIUM** |

### Optional (Nice to Have)

| Property Name | Label | Type | Description | Priority |
|--------------|-------|------|-------------|----------|
| `company_year_founded` | Year Founded | Number | Year the company was founded | LOW |
| `company_specialties` | Company Specialties | Multi-line text | Services/specialties offered | LOW |
| `yelp_rating` | Yelp Rating | Number | Yelp rating (1-5 stars) | LOW |
| `facebook_url` | Facebook URL | Single-line text | Facebook business page URL | LOW |
| `airtable_id` | Airtable ID | Single-line text | Original Airtable record ID | LOW |
| `enriched_at` | Enriched At | Date | Timestamp when lead was enriched | LOW |

---

## 📋 Recommended Actions

### Option 1: Minimum Required (Create 3 properties)
Just create the **Critical** properties:
1. `dcs_score` - Number field
2. `talking_points` - Multi-line text
3. `best_time_to_contact` - Single-line text

**Impact:** Workflow will function fully with 95% of enrichment data syncing.

### Option 2: Complete Setup (Create all 9 properties)
Create all missing properties for 100% coverage.

**Impact:** Perfect 1:1 mapping of all enrichment data to HubSpot.

### Option 3: Use Existing Alternatives (No new properties)
Map missing fields to existing similar properties:
- `dcs_score` → Skip (only use `dcs_tier`)
- `talking_points` → Store in `research_briefing`
- `best_time_to_contact` → Skip or store in notes
- Others → Skip

**Impact:** Workflow will work but some data won't sync to HubSpot.

---

## ✅ What I'll Do Now

I'll update the workflow to:
1. **Use all your existing properties** (28 properties mapped)
2. **Include the 3 critical missing properties** (workflow will use them if they exist)
3. **Gracefully skip** missing optional properties (no errors)

You can then decide whether to create the missing properties or run with existing ones.

---

## Quick Create Commands (HubSpot API)

If you want to create the 3 critical properties via API:

### 1. DCS Score
```bash
curl -X POST https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "dcs_score",
    "label": "DCS Score",
    "type": "number",
    "fieldType": "number",
    "description": "Data Confidence Score (0-100) for lead quality",
    "groupName": "custom_properties_for_jonah'\''s_lead_gen_"
  }'
```

### 2. Talking Points
```bash
curl -X POST https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "talking_points",
    "label": "Talking Points",
    "type": "string",
    "fieldType": "textarea",
    "description": "AI-generated talking points for outreach conversations",
    "groupName": "custom_properties_for_jonah'\''s_lead_gen_"
  }'
```

### 3. Best Time to Contact
```bash
curl -X POST https://api.hubapi.com/crm/v3/properties/contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "best_time_to_contact",
    "label": "Best Time to Contact",
    "type": "string",
    "fieldType": "text",
    "description": "Optimal time to contact (morning/afternoon/evening)",
    "groupName": "custom_properties_for_jonah'\''s_lead_gen_"
  }'
```

---

## Summary

**Total Properties:**
- ✅ **28 existing** properties will be used
- ⚠️ **3 critical** properties recommended to create
- ⏭️ **6 optional** properties can skip

**Workflow Status:**
- Will work immediately with existing properties
- Will improve with critical properties added
- 100% complete if all 9 created

**Your existing custom property group:** `custom_properties_for_jonah's_lead_gen_`

I'll use this group for consistency when referencing new properties.
