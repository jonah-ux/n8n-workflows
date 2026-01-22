# AUTO SHOP MEDIA - OUTREACH SEQUENCES

**SOP ID:** SOP-OUTREACH-001
**Category:** Outreach
**Status:** Active
**Version:** 1.0
**Owner:** Jonah Helland
**Last Updated:** 2026-01-21

---

## QUICK SUMMARY

Standard multi-touch outreach sequences for converting enriched leads. Cadence, messaging, and channel selection based on DCS tier.

---

## THE STANDARD 7-TOUCH SEQUENCE

| Day | Touch | Channel | Purpose |
|-----|-------|---------|---------|
| 0 | Touch 1 | SMS | Introduction, immediate value |
| 1 | Touch 2 | AI Call | Personalized conversation |
| 2 | Touch 3 | Voicemail | Persistence, different medium |
| 3 | Touch 4 | SMS | Follow-up, social proof |
| 5 | Touch 5 | AI Call | Second attempt, new angle |
| 7 | Touch 6 | SMS | Final value-add |
| 10 | Touch 7 | Email | Long-form, last chance |

---

## SMS TEMPLATES

### Touch 1: Introduction (Day 0)
```
Hi {{first_name}}, this is {{sender_name}} with Auto Shop Media.

I noticed {{business_name}} has {{review_count}} reviews with a {{rating}} rating - that's solid!

We help shops like yours turn that reputation into a steady stream of new customers.

Quick question: are you taking on new customers right now?
```

### Touch 4: Social Proof (Day 3)
```
{{first_name}} - following up from my message about {{business_name}}.

Just helped a shop in {{nearby_city}} add 47 new customers last month using their existing reviews.

Worth a quick chat to see if we could do the same for you?
```

### Touch 6: Final Value (Day 7)
```
Last message from me, {{first_name}}.

I put together a quick analysis of {{business_name}}'s online presence - some easy wins you might be missing.

Want me to send it over? No strings attached.
```

---

## AI CALL SCRIPTS (Retell)

### Touch 2: Introduction Call (Day 1)

**Opening:**
> "Hi, is this {{first_name}}? Great! This is {{agent_name}} calling from Auto Shop Media. I saw {{business_name}} online and wanted to reach out. Do you have about 2 minutes?"

**Value Prop:**
> "We work with auto repair shops to help them get more customers using their online reputation. I noticed you have {{review_count}} reviews averaging {{rating}} stars - that's actually really solid for the area."

**Qualifying Question:**
> "Quick question - are you pretty happy with the number of new customers coming in each month, or is that something you're looking to improve?"

**Objection Handlers:**

*"Not interested"*
> "Totally understand. Before I go - can I ask what's working best for you right now to bring in new customers? Always curious what's working for successful shops."

*"We're too busy"*
> "That's a great problem to have! Most shops we work with felt the same way until a slow week hit. We actually help shops stay consistently busy, not just during peaks. Can I send you some info for when things slow down?"

*"Send me information"*
> "Absolutely. What's the best email for you? I'll send over a quick case study of a shop similar to yours. What type of work does {{business_name}} specialize in?"

**Close:**
> "Great talking with you, {{first_name}}. I'll send that over today. If it looks interesting, I'll give you a quick call in a few days to answer any questions. Sound good?"

---

## VOICEMAIL SCRIPT (Touch 3)

```
Hi {{first_name}}, this is {{agent_name}} from Auto Shop Media.

I reached out yesterday about helping {{business_name}} get more customers from your online presence.

I know you're busy, so I'll keep this short - we've helped shops add 30-50 new customers per month using strategies they're probably not using yet.

I'll send a text with my info. If you get a minute, shoot me a reply and we can chat. Thanks!
```

---

## CHANNEL SELECTION BY DCS TIER

### Platinum (85+): Full Omnichannel
- **SMS:** Yes - personalized
- **Calls:** Yes - full script
- **Voicemail:** Yes
- **Email:** Yes - detailed
- **Touches:** All 7

### Gold (70-84): SMS + Email Focus
- **SMS:** Yes - semi-personalized
- **Calls:** Optional (if phone verified)
- **Voicemail:** Skip
- **Email:** Yes - template
- **Touches:** 5 of 7

### Bronze (50-69): Email Only
- **SMS:** Skip (may not have good number)
- **Calls:** Skip
- **Voicemail:** Skip
- **Email:** Yes - generic template
- **Touches:** 3 only

---

## RESPONSE HANDLING

### Positive Responses
**Trigger Words:** "yes", "interested", "tell me more", "sounds good", "let's talk"

**Action:**
1. Mark sequence as `hot_lead`
2. Alert Jonah via SMS (+13204064600)
3. Pause automated sequence
4. Queue for manual follow-up

### Negative Responses
**Trigger Words:** "not interested", "no thanks", "remove me", "stop"

**Action:**
1. Mark sequence as `declined`
2. Send polite acknowledgment
3. Add to do-not-contact for 90 days

### Opt-Out Requests
**Trigger Words:** "stop", "unsubscribe", "opt out", "remove"

**Action:**
1. IMMEDIATELY stop all messages
2. Send confirmation: "You've been removed from our list. Sorry for the inconvenience."
3. Mark contact as `opted_out` in HubSpot
4. Log to compliance table

### Questions/Inquiries
**Handling:** Queue for AI response or human review based on complexity

---

## TIMING RULES

### Best Send Times
| Channel | Best Times | Avoid |
|---------|------------|-------|
| SMS | 10am-12pm, 2pm-4pm | Before 8am, after 8pm |
| Calls | 10am-11am, 2pm-3pm | Lunch (12-1pm), after 5pm |
| Email | 7am-9am, 1pm-3pm | Weekends |

### Timezone Handling
- All times are LOCAL to the lead's timezone
- Timezone detected from address/area code
- Default to Central (CT) if unknown

### Day of Week
- **Best:** Tuesday, Wednesday, Thursday
- **Okay:** Monday (afternoon), Friday (morning)
- **Avoid:** Saturday, Sunday

---

## SEQUENCE STATUS VALUES

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Not started | Start sequence |
| `in_progress` | Actively running | Continue sequence |
| `paused` | Temporarily stopped | Review and resume |
| `hot_lead` | Positive response | Manual follow-up |
| `declined` | Said no | Archive for 90 days |
| `opted_out` | Compliance opt-out | Never contact again |
| `completed` | All touches done | Move to nurture |
| `no_response` | Completed, no reply | Queue for re-engagement (60 days) |

---

## DATABASE TRACKING

```sql
-- Check sequence status distribution
SELECT status, COUNT(*)
FROM outreach_sequences
GROUP BY status;

-- Find hot leads needing follow-up
SELECT s.*, c.business_name, c.phone
FROM outreach_sequences s
JOIN companies c ON s.company_id = c.place_id
WHERE s.status = 'hot_lead'
ORDER BY s.updated_at DESC;

-- Calculate response rates
SELECT
  dcs_tier,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'hot_lead') as hot_leads,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'hot_lead') / COUNT(*), 2) as response_rate
FROM outreach_sequences os
JOIN enriched_leads el ON os.company_id = el.place_id
GROUP BY dcs_tier;
```

---

## COMPLIANCE

### CAN-SPAM / TCPA Requirements
- Include opt-out in every message
- Honor opt-outs within 24 hours
- Identify sender clearly
- No contact before 8am or after 9pm local time
- Maintain suppression list

### Record Keeping
All messages logged to:
- `outreach_messages` table
- HubSpot activity timeline
- Salesmsg conversation history

---

**Sequences are the rhythm of outreach. Follow the cadence, respect the response.**
