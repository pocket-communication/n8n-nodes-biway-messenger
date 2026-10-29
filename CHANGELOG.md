# Changelog

## 0.1.2

### Fixed

- **Message › Send**: an email with attachments from the gallery failed with "One of the attachments
  was not found". Send now passes the asset IDs as Bi-Way reads them for a single message; Broadcast
  was not affected.
- **RCS Agent › Create Keyword Reply**: the description said that a customer could send the keyword.
  The reply is triggered by a button that carries the keyword (Suggested Reply); a keyword typed in
  the conversation does not trigger it.

## 0.1.1

### Fixed

- **Message › Send and Broadcast**: a card or a carousel written in the node reached the phone as a
  plain text message (the body of the first card), without its title, image or buttons. It is now
  sent without a message body, as the Bi-Way app sends it. Templates were not affected.

## 0.1.0

First public release.

### Bi-Way node

- **Message**: Send (one phone number or email address) and Broadcast (addresses, contacts and
  contact groups; send date, segmentation, status reports, priority, simulation, excluded groups,
  filters). Content: text, card or carousel (2 to 10 cards), written in the node or taken from a
  template, with buttons (Suggested Reply, Open URL, Dial, View Location).
- **Channels**: SMS (text), RCS (text with buttons, card, carousel) and email (a subject, then a text
  with attachments from the gallery, a card or a carousel; the buttons lead to the Bi-Way web chat
  when needed).
- **Fallback SMS of RCS messages** ("If the Phone Is Not RCS-Capable"): the account's fallback SMS,
  an SMS written in the node, or none, so that a workflow decides on the `unsupported` status.
- **Templates, content and channels**: Send and Broadcast only list the templates of the chosen
  content that the chosen channel can carry, and refuse any other template before sending.
- **Template**: Create (subject for email, then text, card or carousel).
- **Asset**: Upload to the Bi-Way gallery.
- **Contact**: Create (columns of the account, existing contact recognized by the column picked in
  Match On Column, the phone number by default: reuse, update or stop), Create Group, Import File
  (in the import formats of the account, XLS by default; run in the background).
- **RCS Agent**: Create Keyword Reply, Get Status (declaration, state at each operator, next step).
- **RCS Scenario**: Create, Get, Get Many, Activate, Deactivate, Delete and Start, with a Simplify
  option on Create, Get and Get Many.
- **No duplicates**: Template › Create, Contact › Create Group, Contact › Create and RCS Agent ›
  Create Keyword Reply reuse the existing item by default ("If … Already Exists").
- Templates, contact groups, scenarios and gallery files are picked from a searchable list or by ID.
- Every known Bi-Way error code is shown as an English message with the way to fix it, naming the
  item when several are processed.
- Usable as a tool by AI agents.

### Bi-Way Trigger

- Events: Message Status Updated (with the `unsupported` and `expired` statuses and the `fallback`
  field), Message Received, Contact Import State Changed, RCS Agent State Changed, RCS Capability
  Check Completed and Account State Changed.
- `keyword` field on received messages, and a Button Keywords option to start only for some RCS
  buttons.
- Adds its webhook URL next to the callback URLs of the account without replacing them, and checks a
  per-webhook token on every call.

### Bi-Way API credential

- API key (token and secret) created in Bi-Way › Settings › Security, sent with HTTP Basic.
