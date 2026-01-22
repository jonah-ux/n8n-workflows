# AUTO SHOP MEDIA - IDEAL CUSTOMER PROFILE (ICP)

**SOP ID:** SOP-ICP-001
**Category:** Target Market
**Status:** Active
**Version:** 1.0
**Owner:** Jonah Helland
**Last Updated:** 2026-01-21

---

## QUICK SUMMARY

Auto Shop Media targets automotive service businesses with 5-50 employees that need systematic customer acquisition. We focus on shops that have the revenue to invest in marketing but lack the sophistication to do it themselves.

---

## PRIMARY TARGET: AUTOMOTIVE SERVICE BUSINESSES

### Business Types We Serve
| Type | Description | Priority |
|------|-------------|----------|
| **Auto Repair Shops** | General mechanical repair, diagnostics | HIGH |
| **Tire Shops** | Tire sales, rotation, alignment | HIGH |
| **Collision/Body Shops** | Paint, dent repair, insurance work | HIGH |
| **Oil Change/Quick Lube** | Fast service, high volume | MEDIUM |
| **Transmission Shops** | Specialized transmission repair | MEDIUM |
| **Auto Glass** | Windshield repair/replacement | MEDIUM |
| **Performance/Custom** | Modifications, custom work | LOW |
| **Dealership Service** | OEM dealership service departments | LOW |

### Qualifying Criteria

#### MUST HAVE (Deal Breakers)
- [ ] 5+ employees (indicates established business)
- [ ] Physical location (not mobile-only)
- [ ] Been in business 2+ years
- [ ] Has a website (even basic)
- [ ] Located in US or Canada

#### SHOULD HAVE (Strong Signals)
- [ ] Google Business listing with reviews
- [ ] 10+ Google reviews
- [ ] 3.5+ star rating
- [ ] Multiple service bays
- [ ] Accepts credit cards
- [ ] Has social media presence

#### NICE TO HAVE (Bonus Points)
- [ ] Multiple locations
- [ ] Currently advertising (shows marketing awareness)
- [ ] Recently hired (growth mode)
- [ ] Modern website with online booking
- [ ] ASE certified technicians

---

## DCS TIER ALIGNMENT

| DCS Tier | ICP Fit | Action |
|----------|---------|--------|
| **Platinum (85+)** | Perfect ICP match, all criteria met | Priority outreach |
| **Gold (70-84)** | Good fit, minor gaps | Standard outreach |
| **Bronze (<70)** | Partial fit, needs qualification | Qualify before outreach |

---

## GEOGRAPHIC TARGETING

### Primary Markets (Tier 1)
- Major metro areas (500k+ population)
- Suburbs of major cities
- Growing markets (Texas, Florida, Arizona)

### Secondary Markets (Tier 2)
- Mid-size cities (100k-500k)
- Regional hubs
- College towns

### Avoid
- Rural areas (< 25k population)
- Highly saturated markets
- Areas with economic decline

---

## BUYER PERSONAS

### 1. The Owner-Operator
**Who:** Shop owner who works the floor
**Pain Points:**
- No time for marketing
- Doesn't trust agencies
- Wants to see ROI quickly
- Hates long contracts

**How to Reach:** Direct, no-BS messaging about results

### 2. The Growth-Minded Owner
**Who:** Owner focused on scaling
**Pain Points:**
- Has tried marketing, mixed results
- Wants systematic lead generation
- Concerned about quality, not just quantity
- Looking for a partner, not a vendor

**How to Reach:** Case studies, data, proof of scale

### 3. The Multi-Location Operator
**Who:** Owns 3+ shops
**Pain Points:**
- Inconsistent marketing across locations
- Hard to track what's working
- Needs centralized reporting
- Staff turnover affects follow-up

**How to Reach:** Enterprise positioning, efficiency gains

---

## RED FLAGS (DO NOT PURSUE)

- Business has < 3 star Google rating with many complaints
- Owner is combative/rude in reviews or initial contact
- Shop is clearly struggling (closed reviews, outdated info)
- Recent bankruptcy or legal issues
- Mobile-only operation with no fixed location
- Part-time or hobby business
- Currently in a long-term contract with competitor

---

## SIGNALS OF BUYING INTENT

### High Intent
- Currently running Google Ads (visible in SerpAPI)
- Job posting for marketing/sales role
- Recent website redesign
- Asking about marketing in forums/groups
- Competitor nearby closed or struggling

### Medium Intent
- Responding to online reviews actively
- Posting on social media regularly
- Recently expanded services
- Hiring technicians (growth)

### Low Intent
- Static online presence
- No recent activity
- Seasonal business patterns
- Owner nearing retirement

---

## USE IN WORKFLOWS

### Lead Enrichment Orchestrator
The orchestrator uses ICP criteria to calculate DCS scores:
- Check employee count (SerpAPI)
- Verify years in business (website)
- Analyze review quality (Apify)
- Detect hiring activity (SerpAPI Jobs)

### HubSpot Lead Sync
ICP tier is mapped to HubSpot:
- `dcs_tier` property reflects ICP fit
- `buying_signals` captures intent signals
- `red_flags` notes disqualifying factors

### Outreach Orchestrator
Sequences are tailored by persona:
- Owner-Operator: Short, direct messages
- Growth-Minded: Data-heavy, case studies
- Multi-Location: Enterprise pitch

---

## VALIDATION QUERIES

```sql
-- Find leads matching ICP perfectly
SELECT * FROM enriched_leads
WHERE dcs_tier = 'Platinum'
AND outreach_ready = true
ORDER BY dcs_score DESC;

-- Analyze ICP fit distribution
SELECT dcs_tier, COUNT(*) as count
FROM enriched_leads
GROUP BY dcs_tier;

-- Find leads with buying signals
SELECT company_name, buying_signals, dcs_score
FROM enriched_leads
WHERE buying_signals IS NOT NULL
AND buying_signals != ''
ORDER BY dcs_score DESC;
```

---

**This ICP document is the TRUTH for targeting. Update when market understanding evolves.**
