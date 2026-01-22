# AUTO SHOP MEDIA - DCS SCORING METHODOLOGY

**SOP ID:** SOP-DCS-001
**Category:** Standards
**Status:** Active
**Version:** 1.0
**Owner:** Jonah Helland
**Last Updated:** 2026-01-21

---

## QUICK SUMMARY

The **Data Confidence Score (DCS)** is Auto Shop Media's proprietary lead scoring methodology. It measures how much reliable data we have about a prospect, not just how "good" they are. Higher DCS = more confident outreach.

---

## WHY DCS EXISTS

Traditional lead scoring asks: "Is this a good lead?"
DCS asks: "Do we know enough to have a good conversation?"

A perfect ICP match with no data is worse than a decent match with rich intel. DCS ensures we only reach out when we can be helpful and specific.

---

## DCS TIERS

| Tier | Score Range | Meaning | Outreach Strategy |
|------|-------------|---------|-------------------|
| **Platinum** | 85-100 | Exceptional data quality | Highly personalized, multi-channel |
| **Gold** | 70-84 | Good data quality | Personalized single-channel |
| **Bronze** | 50-69 | Basic data only | Generic template, single touch |
| **Unqualified** | <50 | Insufficient data | Do not outreach, re-enrich later |

---

## SCORING COMPONENTS

### 1. Business Verification (Max 20 points)

| Data Point | Points | Source |
|------------|--------|--------|
| Google Business listing exists | 5 | SerpAPI |
| Website is live and accessible | 5 | Firecrawl |
| Business name matches across sources | 5 | Cross-reference |
| Address is verified | 5 | Google |

### 2. Contact Information (Max 25 points)

| Data Point | Points | Source |
|------------|--------|--------|
| Phone number found | 5 | Website/Google |
| Email found | 5 | Hunter.io |
| Email verified (deliverable) | 5 | Hunter.io |
| Owner/decision maker name | 5 | LinkedIn/Website |
| Multiple contact methods | 5 | Multiple sources |

### 3. Online Presence (Max 20 points)

| Data Point | Points | Source |
|------------|--------|--------|
| Has Google reviews | 5 | Apify |
| 10+ reviews | 3 | Apify |
| 4.0+ rating | 3 | Apify |
| Active social media | 3 | Website |
| Recent online activity | 3 | SerpAPI |
| Website has quality content | 3 | Firecrawl |

### 4. Business Intelligence (Max 20 points)

| Data Point | Points | Source |
|------------|--------|--------|
| Services listed on website | 4 | Firecrawl |
| About page with story/history | 4 | Firecrawl |
| Team/staff information | 4 | Firecrawl |
| Hours of operation clear | 4 | Google/Website |
| Pricing/service menu available | 4 | Website |

### 5. Intent Signals (Max 15 points)

| Data Point | Points | Source |
|------------|--------|--------|
| Currently hiring | 5 | SerpAPI Jobs |
| Running ads | 4 | SerpAPI |
| Recent news/press | 3 | SerpAPI |
| Competitor closed nearby | 3 | Research |

---

## CALCULATION LOGIC

```javascript
// DCS Calculation (used in Outreach Compiler)
function calculateDCS(enrichmentData) {
  let score = 0;

  // Business Verification (20 max)
  if (enrichmentData.google_place_id) score += 5;
  if (enrichmentData.website_accessible) score += 5;
  if (enrichmentData.name_match_score > 0.8) score += 5;
  if (enrichmentData.address_verified) score += 5;

  // Contact Information (25 max)
  if (enrichmentData.phone) score += 5;
  if (enrichmentData.email) score += 5;
  if (enrichmentData.email_verified) score += 5;
  if (enrichmentData.owner_name) score += 5;
  if (enrichmentData.phone && enrichmentData.email) score += 5;

  // Online Presence (20 max)
  if (enrichmentData.review_count > 0) score += 5;
  if (enrichmentData.review_count >= 10) score += 3;
  if (enrichmentData.google_rating >= 4.0) score += 3;
  if (enrichmentData.social_profiles?.length > 0) score += 3;
  if (enrichmentData.website_quality_score > 0.6) score += 6;

  // Business Intelligence (20 max)
  if (enrichmentData.services_listed) score += 4;
  if (enrichmentData.about_content) score += 4;
  if (enrichmentData.team_info) score += 4;
  if (enrichmentData.hours_listed) score += 4;
  if (enrichmentData.pricing_visible) score += 4;

  // Intent Signals (15 max)
  if (enrichmentData.hiring_signals) score += 5;
  if (enrichmentData.running_ads) score += 4;
  if (enrichmentData.recent_news) score += 3;
  if (enrichmentData.market_opportunity) score += 3;

  return Math.min(100, score);
}

function getDCSTier(score) {
  if (score >= 85) return 'Platinum';
  if (score >= 70) return 'Gold';
  if (score >= 50) return 'Bronze';
  return 'Unqualified';
}
```

---

## DCS IN THE PIPELINE

### 1. Enrichment Phase
Each sub-workflow contributes data points:
- **SerpAPI Google Info** → Business verification, intent signals
- **Firecrawl Website** → Business intelligence, contact info
- **Apify Reviews** → Online presence
- **Hunter Email** → Contact information
- **SerpAPI Jobs** → Intent signals

### 2. Intel Analyst Phase
The Intel Analyst AI reviews all data and:
- Validates consistency across sources
- Identifies gaps that lower DCS
- Highlights strongest data points
- Suggests enrichment priorities

### 3. Outreach Compiler Phase
Final DCS calculation happens here:
- All data points aggregated
- Score calculated using formula above
- Tier assigned
- Outreach strategy determined

### 4. HubSpot Sync
DCS flows to HubSpot:
- `dcs_score` → Numeric score (0-100)
- `dcs_tier` → Dropdown (Platinum/Gold/Bronze)

---

## QUALITY CONTROL

### Score Auditing
```sql
-- Check DCS distribution
SELECT
  dcs_tier,
  COUNT(*) as count,
  AVG(dcs_score) as avg_score,
  MIN(dcs_score) as min_score,
  MAX(dcs_score) as max_score
FROM enriched_leads
GROUP BY dcs_tier
ORDER BY avg_score DESC;

-- Find leads that might be mis-scored
SELECT company_name, dcs_score, dcs_tier
FROM enriched_leads
WHERE (dcs_score >= 85 AND dcs_tier != 'Platinum')
   OR (dcs_score < 85 AND dcs_tier = 'Platinum');
```

### Recalibration Triggers
Re-evaluate DCS methodology when:
- Platinum leads have < 30% response rate
- Bronze leads outperform Gold consistently
- New data sources become available
- ICP criteria change

---

## USING DCS IN OUTREACH

### Platinum (85+)
- **Channels:** SMS + Call + Email
- **Personalization:** Highly specific references
- **Timing:** Immediate (within 24 hours)
- **Touches:** Full 7-touch sequence

### Gold (70-84)
- **Channels:** SMS + Email
- **Personalization:** Reference 2-3 specifics
- **Timing:** Within 48 hours
- **Touches:** 5-touch sequence

### Bronze (50-69)
- **Channels:** Email only
- **Personalization:** Category-based
- **Timing:** Batched weekly
- **Touches:** 3-touch sequence

### Unqualified (<50)
- **Action:** Re-queue for enrichment
- **Wait:** 30 days before retry
- **Note:** May indicate bad data source

---

**DCS is the foundation of confident outreach. Trust the score, improve the methodology.**
