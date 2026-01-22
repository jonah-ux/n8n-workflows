# HubSpot AI Agents for n8n

A comprehensive suite of **22 AI-powered HubSpot agents** for n8n, providing complete coverage of the HubSpot API with **350+ tools**.

## Overview

This collection includes specialized agents for every major HubSpot domain, plus a **Master "God Mode" Orchestrator** that can coordinate all agents for complex, multi-domain operations.

## Quick Start

1. Import the `AI_Agent_HubSpot_Master.n8n.json` into n8n
2. Import all specialized agents (the Master agent calls them as sub-workflows)
3. Configure your HubSpot credentials
4. Start asking the Master agent to perform any HubSpot operation

## Architecture

```
                    +---------------------------+
                    |   HubSpot Master Agent    |
                    |      (God Mode)           |
                    |   50 iterations, GPT-4o   |
                    +---------------------------+
                              |
        +---------------------+---------------------+
        |         |         |         |            |
   +--------+ +--------+ +--------+ +--------+ +--------+
   |Contacts| |Companies| | Deals | |Tickets | | Leads  |
   | Agent  | | Agent  | | Agent | | Agent  | | Agent  |
   +--------+ +--------+ +--------+ +--------+ +--------+
        |         |         |         |            |
   +--------+ +--------+ +--------+ +--------+ +--------+
   | Lists  | |Workflows| |  CMS   | |Sequences| |Analytics|
   | Agent  | | Agent  | | Agent | | Agent  | | Agent  |
   +--------+ +--------+ +--------+ +--------+ +--------+
        |         |         |         |            |
   +--------+ +--------+ +--------+ +--------+ +--------+
   | Email  | |Meetings | |Calling | |Commerce| |Billing |
   | Agent  | | Agent  | | Agent | | Agent  | | Agent  |
   +--------+ +--------+ +--------+ +--------+ +--------+
        |         |         |         |            |
   +--------+ +--------+ +--------+ +--------+ +--------+
   |Engage- | | Files  | |Conver- | |Marketing| |Schema |
   | ments  | | Agent  | |sations | | Agent  | | Agent |
   +--------+ +--------+ +--------+ +--------+ +--------+
                              |
                         +--------+
                         |Account |
                         | Agent  |
                         +--------+
```

## Agents & Tools

### Master Agent (God Mode)
**File:** `AI_Agent_HubSpot_Master.n8n.json`

The orchestrator that can call ANY of the 21 specialized agents. Use this for:
- Complex multi-domain operations
- Natural language requests ("Find all deals over $50K and create tasks for the sales team")
- Cross-object workflows

**Configuration:**
- Model: GPT-4o
- Max Iterations: 50
- Context Window: 50
- Max Tokens: 16,384

---

### Contacts Agent (22 tools)
**File:** `AI_Agent_HubSpot_Contacts_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Contact | Retrieve single contact by ID |
| Search Contacts | Search with filters |
| Create Contact | Create new contact |
| Update Contact | Update contact properties |
| Delete Contact | Archive contact |
| Batch Create | Create multiple contacts |
| Batch Update | Update multiple contacts |
| Batch Read | Get multiple contacts by ID |
| Batch Archive | Archive multiple contacts |
| Merge Contacts | Merge duplicate contacts |
| Get Contact Property | Get property metadata |
| Create Contact Property | Create custom property |
| Associate Contact | Link to company/deal/ticket |
| Remove Association | Unlink from object |
| Get Associations | List contact associations |
| List Owners | Get HubSpot users |
| Get Contact by Email | Lookup by email |
| Get Contact Lists | Get lists contact is in |
| Add to List | Add contact to static list |
| Remove from List | Remove contact from list |
| Get Contact Activities | Get activity timeline |
| Call Companies Agent | Cross-agent coordination |

---

### Companies Agent (22 tools)
**File:** `AI_Agent_HubSpot_Companies_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Company | Retrieve single company |
| Search Companies | Search with filters |
| Create Company | Create new company |
| Update Company | Update company properties |
| Delete Company | Archive company |
| Batch Create | Create multiple companies |
| Batch Update | Update multiple companies |
| Batch Read | Get multiple companies by ID |
| Batch Archive | Archive multiple companies |
| Merge Companies | Merge duplicate companies |
| Get Company Property | Get property metadata |
| Create Company Property | Create custom property |
| Associate Company | Link to contact/deal |
| Remove Association | Unlink from object |
| Get Associations | List company associations |
| Get Company by Domain | Lookup by domain |
| Get Child Companies | Get subsidiaries |
| Set Parent Company | Set parent relationship |
| Get Company Contacts | List associated contacts |
| Get Company Deals | List associated deals |
| Get Company Activities | Get activity timeline |
| Call Contacts Agent | Cross-agent coordination |

---

### Deals Agent (24 tools)
**File:** `AI_Agent_HubSpot_Deals_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Deal | Retrieve single deal |
| Search Deals | Search with filters |
| Create Deal | Create new deal |
| Update Deal | Update deal properties |
| Delete Deal | Archive deal |
| Batch Create | Create multiple deals |
| Batch Update | Update multiple deals |
| Batch Read | Get multiple deals by ID |
| Batch Archive | Archive multiple deals |
| Merge Deals | Merge duplicate deals |
| Get Deal Property | Get property metadata |
| Create Deal Property | Create custom property |
| Associate Deal | Link to contact/company |
| Remove Association | Unlink from object |
| Get Associations | List deal associations |
| Get Association Labels | Get custom association labels |
| List Owners | Get HubSpot users |
| Get Deal Pipeline | Get pipeline details |
| List Pipelines | List all pipelines |
| Get Deal Stage | Get stage info |
| Move Deal Stage | Change deal stage |
| Get Deal Activities | Get activity timeline |
| Calculate Deal Forecast | Forecast calculations |
| Call Tickets Agent | Cross-agent coordination |

---

### Leads Agent (23 tools)
**File:** `AI_Agent_HubSpot_Leads_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Lead | Retrieve single lead |
| Search Leads | Search with filters |
| Create Lead | Create new lead |
| Update Lead | Update lead properties |
| Delete Lead | Archive lead |
| Batch Create | Create multiple leads |
| Batch Update | Update multiple leads |
| Batch Read | Get multiple leads by ID |
| Batch Archive | Archive multiple leads |
| Get Lead Property | Get property metadata |
| Create Lead Property | Create custom property |
| Associate Lead | Link to contact/company |
| Remove Association | Unlink from object |
| Get Associations | List lead associations |
| Convert Lead | Convert to contact/deal |
| Get Lead Score | Get lead scoring |
| Update Lead Score | Modify lead score |
| Get Lead Source | Get attribution |
| List Lead Sources | List all sources |
| Get Lead Activities | Get activity timeline |
| Qualify Lead | Mark as qualified |
| Disqualify Lead | Mark as disqualified |
| Call Contacts Agent | Cross-agent coordination |

---

### Tickets Agent (20 tools)
**File:** `AI_Agent_HubSpot_Tickets_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Ticket | Retrieve single ticket |
| Search Tickets | Search with filters |
| Create Ticket | Create new ticket |
| Update Ticket | Update ticket properties |
| Delete Ticket | Archive ticket |
| Batch Create | Create multiple tickets |
| Batch Update | Update multiple tickets |
| Batch Read | Get multiple tickets by ID |
| Batch Archive | Archive multiple tickets |
| Merge Tickets | Merge duplicate tickets |
| Get Ticket Property | Get property metadata |
| Create Ticket Property | Create custom property |
| Associate Ticket | Link to contact/company |
| Remove Association | Unlink from object |
| Get Associations | List ticket associations |
| Get Ticket Pipeline | Get pipeline details |
| List Pipelines | List all pipelines |
| Move Ticket Stage | Change ticket stage |
| Get Ticket Activities | Get activity timeline |
| Call Deals Agent | Cross-agent coordination |

---

### Lists Agent (17 tools)
**File:** `AI_Agent_HubSpot_Lists_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get List | Retrieve single list |
| Get List by Name | Lookup by name |
| Search Lists | Search with filters |
| Create List | Create new list |
| Update List | Update list properties |
| Delete List | Delete list |
| Restore List | Restore deleted list |
| Get List Filters | Get list filter definition |
| Get All List Members | Get all contacts in list |
| Add Contacts to List | Add contacts to static list |
| Add Contacts from List | Copy contacts from another list |
| Remove Contacts from List | Remove contacts |
| Remove All Contacts | Clear all contacts |
| Check Membership | Check if contact in list |
| Check Contact Lists | Get lists for contact |
| Get List Size | Get member count |
| Call Contacts Agent | Cross-agent coordination |

---

### Workflows Agent (17 tools)
**File:** `AI_Agent_HubSpot_Workflows_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Workflow | Retrieve single workflow |
| Search Workflows | Search with filters |
| List Workflows | List all workflows |
| Create Workflow | Create new workflow |
| Update Workflow | Update workflow |
| Delete Workflow | Delete workflow |
| Clone Workflow | Duplicate workflow |
| Enable Workflow | Activate workflow |
| Disable Workflow | Deactivate workflow |
| Enroll Contact | Enroll in workflow |
| Unenroll Contact | Remove from workflow |
| Batch Enroll Contacts | Enroll multiple contacts |
| Get Workflow History | Get execution history |
| Get Workflow Performance | Get performance metrics |
| Get Workflow Revisions | Get version history |
| Get Workflow Logs | Get execution logs |
| Call Lists Agent | Cross-agent coordination |

---

### CMS Agent (22 tools)
**File:** `AI_Agent_HubSpot_CMS_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| List Pages | List all pages |
| Get Page | Retrieve single page |
| Search Pages | Search pages |
| Create Page | Create new page |
| Update Page | Update page |
| Delete Page | Delete page |
| Publish Page | Publish page |
| Unpublish Page | Unpublish page |
| List Blog Posts | List blog posts |
| Get Blog Post | Retrieve blog post |
| Create Blog Post | Create blog post |
| Update Blog Post | Update blog post |
| Delete Blog Post | Delete blog post |
| Publish Blog Post | Publish blog post |
| List HubDB Tables | List all tables |
| Get HubDB Table | Get table details |
| Get HubDB Rows | Get table rows |
| Create HubDB Row | Create row |
| Update HubDB Row | Update row |
| Delete HubDB Row | Delete row |
| List Domains | List all domains |
| List URL Redirects | List redirects |

---

### Sequences Agent (14 tools)
**File:** `AI_Agent_HubSpot_Sequences_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Sequence | Retrieve single sequence |
| List Sequences | List all sequences |
| Search Sequences | Search with filters |
| Get Sequence Stats | Get performance stats |
| Get Enrollments | Get sequence enrollments |
| Enroll Contact | Enroll in sequence |
| Unenroll Contact | Remove from sequence |
| Pause Enrollment | Pause contact's sequence |
| Resume Enrollment | Resume contact's sequence |
| Get Enrollment Status | Check enrollment status |
| List Sequence Steps | Get sequence steps |
| Get Step Stats | Get step performance |
| Get Sequence Tasks | Get sequence tasks |
| Call Email Agent | Cross-agent coordination |

---

### Analytics Agent (15 tools)
**File:** `AI_Agent_HubSpot_Analytics_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Analytics Report | Get custom report |
| List Reports | List all reports |
| Create Report | Create custom report |
| Get Web Analytics | Get website traffic |
| Get Page Analytics | Get page performance |
| Get Source Analytics | Get traffic sources |
| Get Campaign Analytics | Get campaign performance |
| Get Email Analytics | Get email performance |
| Get Form Analytics | Get form submissions |
| Get Attribution Report | Get attribution data |
| Get Revenue Attribution | Revenue attribution |
| Get Funnel Report | Get funnel metrics |
| Get Event Analytics | Get event data |
| Export Report | Export report data |
| Call Marketing Agent | Cross-agent coordination |

---

### Email Agent (18 tools)
**File:** `AI_Agent_HubSpot_Email_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Email | Retrieve single email |
| Search Emails | Search with filters |
| Create Email | Create email draft |
| Update Email | Update email |
| Delete Email | Delete email |
| Send Email | Send email |
| Get Email Template | Get template |
| List Email Templates | List all templates |
| Create Email Template | Create template |
| Clone Email Template | Duplicate template |
| Get Email Stats | Get email performance |
| Get Email Events | Get email events |
| Log Email | Log sent email |
| Get Marketing Email | Get marketing email |
| List Marketing Emails | List marketing emails |
| Create Marketing Email | Create marketing email |
| Send Marketing Email | Send marketing email |
| Call Contacts Agent | Cross-agent coordination |

---

### Meetings Agent (12 tools)
**File:** `AI_Agent_HubSpot_Meetings_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Meeting | Retrieve single meeting |
| Search Meetings | Search with filters |
| Create Meeting | Create meeting |
| Update Meeting | Update meeting |
| Delete Meeting | Delete meeting |
| Log Meeting | Log completed meeting |
| Get Meeting Link | Get scheduling link |
| List Meeting Links | List all scheduling links |
| Create Meeting Link | Create scheduling link |
| Get Meeting Types | Get meeting types |
| Get Availability | Check availability |
| Call Contacts Agent | Cross-agent coordination |

---

### Calling Agent (11 tools)
**File:** `AI_Agent_HubSpot_Calling_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Call | Retrieve single call |
| Search Calls | Search with filters |
| Create Call | Log new call |
| Update Call | Update call record |
| Delete Call | Delete call |
| Get Call Recording | Get recording URL |
| Get Call Transcript | Get call transcript |
| Get Calling Settings | Get calling config |
| List Phone Numbers | List available numbers |
| Get Call Disposition | Get disposition options |
| Call Contacts Agent | Cross-agent coordination |

---

### Engagements Agent (20 tools)
**File:** `AI_Agent_HubSpot_Engagements_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Engagement | Retrieve engagement |
| Search Engagements | Search with filters |
| Create Note | Create note |
| Create Task | Create task |
| Create Call | Log call |
| Create Email | Log email |
| Create Meeting | Log meeting |
| Update Engagement | Update engagement |
| Delete Engagement | Delete engagement |
| Get Notes | Get all notes |
| Get Tasks | Get all tasks |
| Complete Task | Mark task complete |
| Get Engagement Types | List engagement types |
| Associate Engagement | Link to object |
| Get Timeline | Get activity timeline |
| Batch Create | Create multiple |
| Batch Update | Update multiple |
| Batch Delete | Delete multiple |
| Get Engagement Counts | Get counts by type |
| Call Contacts Agent | Cross-agent coordination |

---

### Files Agent (14 tools)
**File:** `AI_Agent_HubSpot_Files_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get File | Retrieve single file |
| Search Files | Search with filters |
| Upload File | Upload new file |
| Update File | Update file metadata |
| Delete File | Delete file |
| Get File URL | Get signed URL |
| List Folders | List all folders |
| Create Folder | Create folder |
| Update Folder | Update folder |
| Delete Folder | Delete folder |
| Move File | Move to folder |
| Copy File | Copy file |
| Get File Stats | Get file analytics |
| Call CMS Agent | Cross-agent coordination |

---

### Conversations Agent (13 tools)
**File:** `AI_Agent_HubSpot_Conversations_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Thread | Retrieve conversation |
| Search Threads | Search conversations |
| List Threads | List all threads |
| Get Messages | Get thread messages |
| Send Message | Send message |
| Get Inbox | Get inbox details |
| List Inboxes | List all inboxes |
| Get Channels | List channels |
| Archive Thread | Archive conversation |
| Restore Thread | Restore conversation |
| Assign Thread | Assign to user |
| Update Thread Status | Change status |
| Call Contacts Agent | Cross-agent coordination |

---

### Commerce Agent (22 tools)
**File:** `AI_Agent_HubSpot_Commerce_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Product | Retrieve product |
| Search Products | Search products |
| Create Product | Create product |
| Update Product | Update product |
| Delete Product | Delete product |
| Get Line Item | Get line item |
| Create Line Item | Create line item |
| Update Line Item | Update line item |
| Delete Line Item | Delete line item |
| Get Quote | Retrieve quote |
| Search Quotes | Search quotes |
| Create Quote | Create quote |
| Update Quote | Update quote |
| Delete Quote | Delete quote |
| Publish Quote | Publish quote |
| Get Quote Template | Get template |
| List Quote Templates | List templates |
| Get Order | Retrieve order |
| Search Orders | Search orders |
| Get Cart | Get cart |
| Get Discount | Get discount |
| Call Deals Agent | Cross-agent coordination |

---

### Billing Agent (20 tools)
**File:** `AI_Agent_HubSpot_Billing_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Invoice | Retrieve invoice |
| Search Invoices | Search invoices |
| Create Invoice | Create invoice |
| Update Invoice | Update invoice |
| Delete Invoice | Delete invoice |
| Send Invoice | Send invoice |
| Get Payment | Retrieve payment |
| Search Payments | Search payments |
| Record Payment | Record payment |
| Refund Payment | Process refund |
| Get Subscription | Get subscription |
| Search Subscriptions | Search subscriptions |
| Create Subscription | Create subscription |
| Update Subscription | Update subscription |
| Cancel Subscription | Cancel subscription |
| Get Payment Link | Get payment link |
| Create Payment Link | Create payment link |
| Get Billing Settings | Get settings |
| Get Tax Rate | Get tax rate |
| Call Commerce Agent | Cross-agent coordination |

---

### Marketing Agent (20 tools)
**File:** `AI_Agent_HubSpot_Marketing_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Campaign | Retrieve campaign |
| Search Campaigns | Search campaigns |
| Create Campaign | Create campaign |
| Update Campaign | Update campaign |
| Delete Campaign | Delete campaign |
| Get Form | Retrieve form |
| List Forms | List all forms |
| Get Form Submissions | Get submissions |
| Create Form | Create form |
| Get Landing Page | Get landing page |
| List Landing Pages | List pages |
| Get CTA | Get call-to-action |
| List CTAs | List all CTAs |
| Get Social Post | Get social post |
| Create Social Post | Create post |
| Schedule Social Post | Schedule post |
| Get Ad Campaign | Get ads campaign |
| List Ad Campaigns | List ad campaigns |
| Get Marketing Event | Get event |
| Call Analytics Agent | Cross-agent coordination |

---

### Schema Agent (18 tools)
**File:** `AI_Agent_HubSpot_Schema_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Object Schema | Get object definition |
| List Object Schemas | List all objects |
| Create Custom Object | Create custom object |
| Update Custom Object | Update custom object |
| Delete Custom Object | Delete custom object |
| Get Property | Get property details |
| List Properties | List all properties |
| Create Property | Create property |
| Update Property | Update property |
| Delete Property | Delete property |
| Get Property Group | Get property group |
| List Property Groups | List groups |
| Create Property Group | Create group |
| Get Association Schema | Get association def |
| List Association Types | List association types |
| Create Association Type | Create association type |
| Get Pipeline Schema | Get pipeline def |
| Call Account Agent | Cross-agent coordination |

---

### Account Agent (18 tools)
**File:** `AI_Agent_HubSpot_Account_Enhanced.n8n.json`

| Tool | Description |
|------|-------------|
| Get Account Info | Get portal info |
| Get Account Settings | Get settings |
| Update Account Settings | Update settings |
| Get Users | List users |
| Get User | Get single user |
| Create User | Create user |
| Update User | Update user |
| Delete User | Remove user |
| Get Teams | List teams |
| Get Team | Get single team |
| Create Team | Create team |
| Get Roles | List roles |
| Get Role | Get single role |
| Get Audit Logs | Get audit logs |
| Get API Usage | Get API usage stats |
| Get Feature Flags | Get feature flags |
| Get Integrations | List integrations |
| Call Schema Agent | Cross-agent coordination |

---

## Credentials Required

All agents require a HubSpot Private App credential with appropriate scopes:

```
crm.objects.contacts.read
crm.objects.contacts.write
crm.objects.companies.read
crm.objects.companies.write
crm.objects.deals.read
crm.objects.deals.write
crm.objects.leads.read
crm.objects.leads.write
crm.lists.read
crm.lists.write
automation.workflows.read
automation.workflows.write
content.read
content.write
sales-email-read
conversations.read
conversations.write
files.read
files.write
... (full list depends on which agents you use)
```

## Usage Examples

### Simple Request (Master Agent)
```
"Get all contacts created in the last 7 days"
```

### Cross-Domain Request (Master Agent)
```
"Find all deals over $50,000 in the 'Negotiation' stage,
get their associated contacts, and create a follow-up
task for each contact's owner"
```

### Complex Workflow (Master Agent)
```
"Search for all companies in the 'Technology' industry with
more than 100 employees. For each company, check if they
have any open deals. If not, create a new lead and enroll
them in the 'Enterprise Outreach' sequence."
```

### Direct Agent Usage
You can also use individual agents directly for domain-specific tasks:
```
"List all sequences with more than 50% reply rate" → Sequences Agent
"Get all blog posts published this month" → CMS Agent
"Show me invoice aging report" → Billing Agent
```

## Configuration

### Master Agent Settings
| Setting | Value | Purpose |
|---------|-------|---------|
| Model | gpt-4o | Best reasoning capability |
| Max Iterations | 50 | Complex multi-step operations |
| Context Window | 50 | Full conversation history |
| Max Tokens | 16,384 | Detailed responses |

### Individual Agent Settings
| Setting | Value | Purpose |
|---------|-------|---------|
| Model | gpt-4o | Consistent quality |
| Max Iterations | 20 | Domain-specific tasks |
| Context Window | 20 | Sufficient for single domain |
| Max Tokens | 8,192 | Balanced responses |

## Installation

1. **Import Master Agent First**
   - Go to n8n → Workflows → Import from File
   - Select `AI_Agent_HubSpot_Master.n8n.json`

2. **Import All Specialized Agents**
   - Import each `AI_Agent_HubSpot_*_Enhanced.n8n.json` file
   - The Master agent references these by workflow ID

3. **Update Workflow IDs**
   - After importing, note the new workflow IDs
   - Update the Master agent's toolWorkflow nodes with correct IDs

4. **Configure Credentials**
   - Set up HubSpot Private App credential
   - Set up OpenAI credential for GPT-4o
   - Apply credentials to all agents

5. **Test**
   - Run the Master agent with a simple request
   - Verify it can call sub-agents successfully

## File Summary

| File | Size | Tools |
|------|------|-------|
| AI_Agent_HubSpot_Master.n8n.json | 42 KB | 21 sub-agents |
| AI_Agent_HubSpot_Contacts_Enhanced.n8n.json | 46 KB | 22 tools |
| AI_Agent_HubSpot_Companies_Enhanced.n8n.json | 48 KB | 22 tools |
| AI_Agent_HubSpot_Deals_Enhanced.n8n.json | 25 KB | 24 tools |
| AI_Agent_HubSpot_Leads_Enhanced.n8n.json | 42 KB | 23 tools |
| AI_Agent_HubSpot_Tickets_Enhanced.n8n.json | 34 KB | 20 tools |
| AI_Agent_HubSpot_Lists_Enhanced.n8n.json | 19 KB | 17 tools |
| AI_Agent_HubSpot_Workflows_Enhanced.n8n.json | 19 KB | 17 tools |
| AI_Agent_HubSpot_CMS_Enhanced.n8n.json | 22 KB | 22 tools |
| AI_Agent_HubSpot_Sequences_Enhanced.n8n.json | 16 KB | 14 tools |
| AI_Agent_HubSpot_Analytics_Enhanced.n8n.json | 17 KB | 15 tools |
| AI_Agent_HubSpot_Email_Enhanced.n8n.json | 24 KB | 18 tools |
| AI_Agent_HubSpot_Meetings_Enhanced.n8n.json | 15 KB | 12 tools |
| AI_Agent_HubSpot_Calling_Enhanced.n8n.json | 14 KB | 11 tools |
| AI_Agent_HubSpot_Engagements_Enhanced.n8n.json | 36 KB | 20 tools |
| AI_Agent_HubSpot_Files_Enhanced.n8n.json | 20 KB | 14 tools |
| AI_Agent_HubSpot_Conversations_Enhanced.n8n.json | 18 KB | 13 tools |
| AI_Agent_HubSpot_Commerce_Enhanced.n8n.json | 40 KB | 22 tools |
| AI_Agent_HubSpot_Billing_Enhanced.n8n.json | 37 KB | 20 tools |
| AI_Agent_HubSpot_Marketing_Enhanced.n8n.json | 34 KB | 20 tools |
| AI_Agent_HubSpot_Schema_Enhanced.n8n.json | 37 KB | 18 tools |
| AI_Agent_HubSpot_Account_Enhanced.n8n.json | 34 KB | 18 tools |

**Total: 22 agents with 350+ tools**

## License

These workflows are provided as-is for use with n8n and HubSpot.

## Support

For issues or feature requests, please open an issue in the repository.
