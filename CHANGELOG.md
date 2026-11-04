# Changelog

## Unreleased

### Changed

- **Examples › Weezevent ticket holders**: Weezevent API v3, with the participants and their form
  answers in one call. The API key and a persistent access token go in an n8n Custom Auth credential,
  instead of the login, password and key in parameters. The participants already handled are
  remembered, so none gets the message twice, and the contact group of the event is chosen in
  **Save the participant**.

## 0.3.0

### Added

- **RCS agent not launched**: Message › Send, Message › Broadcast and RCS Scenario › Start show a
  warning when your RCS agent is not launched yet, and their output carries `warnings`. Bi-way accepts
  such a message: it goes out as the fallback SMS if there is one, otherwise it is not delivered and
  nothing is debited. The warning never stops the workflow.
- **Bi-way Trigger › Message Status Updated**: `fallback_reason` tells why an RCS message was replaced
  or not sent: `agent_not_launched`, `not_rcs_capable` or `rcs_send_failed`.
- **Not enough credits**: Bi-way now refuses a sending when the credits of a prepaid account do not cover
  it, and the error tells where to order some.

### Changed

- **Fallback SMS written in the node**: **Add Chat Link** is now on by default, like the fallback SMS of
  the account. With the STOP mention, 114 characters are left for the text: a longer text now stops with
  an error telling what to do, so check your workflows that use *Send This SMS*.
- **RCS without an RCS agent**: the error now says that the account has no RCS agent, with what to do:
  check it with RCS Agent › Get Status, send by SMS in the meantime, or read the requirements.
- **RCS Agent › Get Status**: `nextStep` suggests sending by SMS while the RCS agent is not launched.
- **Message › Send**: the notice says that sign-up includes API access, and the Channel field that RCS
  appears once your RCS agent is created.
- **RCS not in your plan**: the error leads to Bi-way instead of the sign-up page, which would create
  a second account.
- **Brand**: the nodes, notices, messages and documentation now write **Bi-way**. Existing workflows
  are not affected: node types, parameter names and values stay the same. The credential keeps the
  name **Bi-Way API**, as n8n requires title case for credential names.
- **Image of a card**: the option *From the Bi-Way Gallery* is now *From the Gallery*.
- **Links**: the npm page and the notices of Message › Send and of the RCS Agent operations lead to
  the [Bi-way page for n8n](https://www.bi-way.fr/n8n/), in French. The documentation links of the
  nodes and of the credential still lead to the README, in English.

### Fixed

- **Cards without a gallery image**: a card with no image, or with an image from a URL, stopped with
  *Could not find property*, on Message › Send, Message › Broadcast and Template › Create. Cards with
  an image from the gallery were not affected.
- **Fallback SMS written in the node**: a text that fit in 160 characters but not once the STOP mention
  and the chat link were added was accepted, then the SMS was not sent. The node now refuses it, with
  the room left for the text.

### Examples

- **Appointment reminder** and **Appointment reply** are now one workflow with two entry points:
  `appointment-reply.json` is gone. Nothing changes in the nodes.
- **Review request**: everyone who answers now gets the link to your Google reviews, a 1 or 2 also gets
  an apology and your team an email. Google does not allow asking only happy customers for a review. If
  you imported this example, send the link on every branch too.
- **Daily sends** (reminder, review request, Weezevent card and email): a refused number no longer stops
  the numbers after it.
- **Notes** follow n8n's template rules: how it works, limits, setup, customization; white notes over the
  nodes. Screenshots taken again.

### Documentation

- **README**: the nodes are verified by n8n and install from the nodes panel, on n8n Cloud and
  self-hosted; a new section explains how to declare your RCS agent and what happens until it is
  launched; sign-up includes API access; links to the Bi-way page for n8n.
- **README**: events of the Bi-way Trigger are not sent again if your n8n cannot be reached; the `data`
  of a share request is not a reference, read its `entry` with **Entry › Get**.
- **Templates**: `docs/templates-submission.md` prepares the submission to the n8n template library.

## 0.2.0

### Added

- **Bi-Way Trigger › Share Request Received**: starts the workflow when a visitor of one of your share
  links books, cancels a booking, sends a form, chooses an item of a list, answers a questionnaire or
  updates their details. The item carries the action, the share link, the visitor, the values left,
  and `entry`, the record of the request. **Share Actions** and **Share IDs** options narrow it down.
- **Entry › Get**: returns a record of your account from its type and ID, such as the `entry` of a
  share request (a booking, a contact…).

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
