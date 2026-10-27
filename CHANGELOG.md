# Changelog

## Unreleased

- **Names**: the nodes are now "Bi-Way SMS/RCS" and "Bi-Way SMS/RCS Trigger" (internal names
  unchanged, existing workflows keep working), with search aliases. Descriptions speak of SMS and RCS
  and state that RCS is currently available on French mobile operators only.
- **Fallback SMS of RCS messages**: Message › Send and Broadcast get "If the Phone Is Not RCS-Capable"
  (RCS channel; text, card or template): the account's fallback SMS (default), an SMS written in the
  node, or no SMS at all (`extra.rcs.alternate: false`). With a template, Bi-Way keeps the request's
  `alternate` on top of the template's RCS content (recent Bi-Way services).
- **Attachment Asset IDs** removed from the options of Message › Send and Broadcast.
- **Message Status Updated**: documents the statuses `unsupported` (RCS not possible, no SMS sent) and
  `expired`, and the `fallback` field (`sms`, `none` or `null`), sent by recent Bi-Way services.
- **RCS cards and buttons**: Message › Send and Broadcast get an "RCS Card" content and an
  "RCS Buttons" field, one kind of entry per kind of button so each shows only its own fields
  (Suggested Reply, Open URL, Dial, View Location; sent replies first), shown on RCS channels only;
  Template › Create builds card and
  text templates with buttons. Card images come from the Bi-Way gallery or an HTTPS address.
- **Templates and channels**: Message › Send and Broadcast only list the templates the chosen channel
  can carry, and refuse a template that does not fit the channel before sending (RCS cards and
  buttons only through RCS; no subject or attachment on an SMS). Relies on the `channel` filter of
  `COLLECTION /messenger/template`, ignored by older Bi-Way services.
- **RCS Scenario** resource: Create, Get, Get Many, Activate, Deactivate, Delete and Start.
- **Contact › Create**: maps the contact columns of the account, recognizes an existing contact by
  phone number or email address, and reuses, updates or refuses it.
- **Duplicates**: Template › Create, Contact › Create Group and RCS Agent › Create Keyword Reply reuse
  the item with the same name or keyword by default ("If … Already Exists" field).
- **Bi-Way Trigger**: "Button Keywords" option to start the workflow only for some RCS buttons, and a
  `keyword` field on every received message.
- The "Extra (JSON)" option of messages documents the channel-keyed format Bi-Way expects.

## 0.1.0

First public release.

- **Bi-Way** node: Message (Send, Broadcast), Template (Create), Asset (Upload), Contact (Create Group,
  Import File), RCS (Create Keyword Reply, Get Status).
- **Bi-Way Trigger** node: message status updates, received messages, contact imports, RCS agent state,
  RCS capability checks and account state, with a per-webhook token checked on every call.
- **Bi-Way API** credential: API key (token + secret) created in Bi-Way › Settings › Security.
