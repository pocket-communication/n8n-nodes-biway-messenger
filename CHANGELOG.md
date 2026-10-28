# Changelog

## 0.1.0

First public release.

### Bi-Way SMS/RCS node

- **Message**: Send (one phone number) and Broadcast (phone numbers, contacts and contact groups;
  send date, segmentation, status reports, priority, simulation, excluded groups, filters). Content:
  text, template or RCS card, with RCS buttons (Suggested Reply, Open URL, Dial, View Location).
- **Fallback SMS of RCS messages** ("If the Phone Is Not RCS-Capable"): the account's fallback SMS,
  an SMS written in the node, or none, so that a workflow decides on the `unsupported` status.
- **Templates and channels**: Send and Broadcast only list the templates the chosen channel can
  carry, and refuse a template that does not fit it before sending.
- **Template**: Create (text, media, RCS card).
- **Asset**: Upload to the Bi-Way gallery.
- **Contact**: Create (columns of the account, existing contact recognized by its phone number:
  reuse, update or stop), Create Group, Import File (CSV, XLS, XLSX, run in the background).
- **RCS Agent**: Create Keyword Reply, Get Status (declaration, state at each operator, next step).
- **RCS Scenario**: Create, Get, Get Many, Activate, Deactivate, Delete and Start, with a Simplify
  option on Create, Get and Get Many.
- **No duplicates**: Template › Create, Contact › Create Group, Contact › Create and RCS Agent ›
  Create Keyword Reply reuse the existing item by default ("If … Already Exists").
- Templates, contact groups, scenarios and gallery images are picked from a searchable list or by ID.
- SMS and RCS only: recipients are phone numbers.
- Every known Bi-Way error code is shown as an English message with the way to fix it, naming the
  item when several are processed.
- Usable as a tool by AI agents.

### Bi-Way SMS/RCS Trigger

- Events: Message Status Updated (with the `unsupported` and `expired` statuses and the `fallback`
  field), Message Received, Contact Import State Changed, RCS Agent State Changed, RCS Capability
  Check Completed and Account State Changed.
- `keyword` field on received messages, and a Button Keywords option to start only for some RCS
  buttons.
- Adds its webhook URL next to the callback URLs of the account without replacing them, and checks a
  per-webhook token on every call.

### Bi-Way API credential

- API key (token and secret) created in Bi-Way › Settings › Security, sent with HTTP Basic.
