# n8n-nodes-biway-messenger

n8n community package of Bi-Way (Pocket Communication): the "Bi-Way" node, the
"Bi-Way Trigger" node and the "Bi-Way API" credential (API key: token + secret, HTTP Basic).
Programmatic style, built on the `npm create @n8n/node` template.

## Rules

- The source of truth for requests and answers is the code of the Bi-Way services
  (`web-biway-services/branches/bi-way-services`, `src/tools/<tool>/class/<Service>.class.php`). The
  PHP samples (`bi-way-sample-php8`) are a catalogue of use cases, not a contract. Never add a field
  or an endpoint that the services do not read or return.
- Do not change the Bi-Way API contract from this repository.
- English only in the node, the credential, the README and the docs in this repository, except
  `docs/integration-n8n-fr.md` (French page for bi-way.fr). Say "RCS" explicitly; the brand is
  written "Bi-Way".
- Channels: SMS (text only), RCS and email (`email` needs the account option `mailjet_api`,
  `email_smtp` the option `smtp`). No MMS (no longer supported). Channel conditions live in
  `descriptions/Channels.ts`.
- Messages and templates take a 'Content' (Text, Card, Carousel; SMS channels get a Text-only
  'content' field); messages then a 'Source' (Raw Message or Template). The content also filters the
  templates offered (`templateContent()`: a card template with several `extra.cards` is a carousel).
  Email: a required Subject on every content written in the node (a template brings its own);
  text = HTML body + attachments sent as `"asset:<id>"`; carousels go with format `cards`. Broadcast
  reads typed addresses by channel (email or phone).
- Contact › Create recognizes a contact by the Match On Column, a name of the account's column list
  only: Bi-Way puts it as is in its search condition.
- Card fields follow the card (Image, Title, Body, Buttons), except inside a carousel card: the
  official scanner requires alphabetical order in a fixed collection and ignores `eslint-disable`.
- The channel is the last key of every `show`: n8n displays a field as soon as a `show` condition
  names an expression, skipping the conditions after it and `hide` (`descriptions/Channels.ts`).
- Examples (`examples/*.json`) use the npm node types (`n8n-nodes-biway-messenger.biway`), n8n's
  own nodes in versions available on n8n 1.x as well (Schedule 1.2, Switch 3.2, If 2.2, Set 3.4,
  HTTP Request 4.2, Form 2.2, Google Sheets 4.5), English names, placeholders and sticky notes.
- Single items are picked with resource locators ("From List" / "By ID",
  `descriptions/ResourceLocators.ts`); inside a collection, read them with `locatorValue()`.
- No runtime dependency, no `process.env`, no file system access (verification rules).
- Never publish to npm, push a tag or submit to the Creator Portal: the maintainer does it.

## Commands

- `npm run lint`: rules of the official scanner (strict / cloud config).
- `npm run build`: compiles to `dist/`.
- Local n8n (2.x needs Node 24 or later): link this repository as
  `<N8N_USER_FOLDER>/.n8n/custom/node_modules/n8n-nodes-biway-messenger`, run `npm run build`, start
  n8n. Locally the node types are `CUSTOM.biway` and `CUSTOM.biwayTrigger`; once installed from npm
  they are `n8n-nodes-biway-messenger.biway` and `n8n-nodes-biway-messenger.biwayTrigger` (convert
  example workflows before importing them locally).
- The trigger needs a public HTTPS URL: start n8n with `WEBHOOK_URL` set to a tunnel address.
- CI (`.github/workflows/ci.yml`) runs `npm ci` with the npm of Node LTS: regenerate
  `package-lock.json` with that npm version (`npx npm@<version> install --package-lock-only`).

## Branches

One branch per phase, each started from the previous one (`phase-1-verification`,
`phase-2-readme`, …) and pushed at the end of its phase. CI only runs on `main` and pull requests,
so run `npm run lint` and `npm run build` locally before pushing. Before the release, `main`
fast-forwards to the last phase branch.

## Roadmap publication

Audit details: [docs/verification-checklist.md](docs/verification-checklist.md).

### Phase 1 — Verification audit (branch `phase-1-verification`)
- [x] Official documentation read online (submission, verification guidelines, UX guidelines)
- [x] Checklist written (`docs/verification-checklist.md`)
- [x] Lint and official scanner rules pass on sources and tarball
- [x] UX fixes: operation actions, quoted field names, error wording, `[Item X]`
- [x] Simplify option on RCS Scenario Create, Get and Get Many
- [x] Publish workflow (template, tags `*.*.*`) and secrets documented
- [x] Resource Locators for template, contact group, scenario and gallery image
- [x] SMS and RCS only: no email wording, format or option left in the node (reverted in phase 2:
      email channels are back, see Rules)

### Phase 2 — README and French page
- [x] README in English: pitch, differentiators (trigger for replies and button taps, self-hosted
      n8n), "Get an API key" (sign-up at v3.bi-way.fr/signup), installation, credentials,
      operations, examples, compatibility, API documentation, support
- [x] No email in the README (recipients, HTML templates, contact matching)
- [x] Note that an `error` event with `fallback: "sms"` can come before `sent`
- [x] CHANGELOG: "Unreleased" merged into 0.1.0, with the phase 1 changes (resource locators,
      Simplify, SMS/RCS only, contacts matched by phone number, no template attachments)
- [x] `docs/integration-n8n-fr.md` for bi-way.fr
- [x] Content Text / Card / Carousel, then Source Raw Message / Template, on Send, Broadcast and
      Template › Create; templates filtered by content; no 'Subject' and no 'Media' format (MMS
      no longer supported)
- [x] Email channels: text (title, HTML body, attachments), card and carousel; SMS channels
      offer Text only

### Phase 3 — Example workflows (`examples/`)
File names already linked from the README: `appointment-reminder.json`, `appointment-reply.json`,
`review-request.json`, `order-notifications.json`, `inbound-to-team-inbox.json`,
`form-welcome-message.json`, `weezevent-ticket-holders.json`.
- [x] Appointment reminder with quick replies, and the reply workflow (no online rebooking)
- [x] Review request with routing
- [x] E-commerce order notifications (card, tracking button, SMS fallback)
- [x] Inbound reply to team inbox
- [x] Form to welcome message (contact create or update)
- [x] Weezevent ticket holders: Schedule Trigger + HTTP Request on the Weezevent API (partner
      access, `POST /auth/access_token`, `GET /participant/list` with `last_update`; no documented
      webhook), contact in a group, RCS message, or email when no phone number. A participant only has name and email
      (`owner`); a phone number exists only if the organizer adds a question to the registration
      form, read from `GET /participant/{id}/answers` (`answers[]` of `label` / `value`)
- [x] `examples/README.md` with audience (canvas screenshots: TODO, taken in phase 4)
- [x] Every example checked against the node definitions of n8n 2.45.4 (known type and version,
      no dropped parameter, no parameter issue)
- [x] Fix found on the way: a channel given as an expression showed every field (`bc64110`)

### Phase 4 — Validation (branch `phase-4-validation`)
- [x] Nodes renamed "Bi-Way" and "Bi-Way Trigger"; Template › Create asks for a Subject
- [x] Every example imported in local n8n (`n8n import:workflow`, types converted to `CUSTOM.*`) and
      checked against the node definitions: no missing node, no parameter issue
- [x] Every operation run against Bi-Way production with the test account (21 runs: status,
      group, contact create / reuse / update, XLSX import, asset, templates, keyword reply, scenario
      create to delete, Broadcast simulations on SMS, RCS card, carousel, template and group)
- [x] Real sendings, the trigger through a tunnel and the examples, tested by the maintainer as far
      as their accounts allow (2026-10-28)
- [x] Review as a newcomer (two-minute test), findings applied to the README and the examples
- [x] Fixes found: Update It emptied the unmapped columns of a contact; Import File now lists the
      formats of the account (its CSV is tab-separated); refused-message errors no longer speak of
      RCS on SMS
- [x] Canvas screenshots for `examples/README.md` (`examples/images/`), one in the README; taking
      them showed five setup notes too short for their text and two notes overlapping, fixed
- [x] Final recap and release command

### Release (maintainer)
- [x] `{{TRIAL_SIGNUP_URL}}` replaced by https://v3.bi-way.fr/signup (2026-10-28)
- [x] bi-way-services `tools/messenger/class/Template.class.php` deployed on 2026-10-28 (template
      subject for every format, card templates listed for email channels)
- [x] Phases merged into `main`, CI green (2026-10-28)
- [x] `NPM_TOKEN` still valid (expires around 2026-11-03), or replaced
- [x] Tag `0.1.0` pushed (2026-10-29). The first run failed, nothing published: npm only generates
      provenance for a new package whose access is explicitly public → `publishConfig.access`, tag
      moved to that commit
- [x] 0.1.0 approved in **Staged Packages** on npmjs.com (2026-10-29): npm staged the first publish
      behind a `0.0.0-stage` placeholder until a maintainer approved it with 2FA; a later publish
      from CI may land there too
- [ ] Trusted Publisher configured on npmjs.com, `NPM_TOKEN` secret deleted and token revoked
- [x] `@n8n/scan-community-package` 0.41.1 passes on 0.1.0 (2026-10-29): provenance, source fetched
      from GitHub at `893e9f3`, analysis. On Windows, put the system `tar` first in `PATH`: the Git
      Bash one reads `C:` as a remote host
- [ ] Submitted on the n8n Creator Portal
- [ ] Page presenting the integration on www.bi-way.fr (WordPress block editor and Spectra, like the
      feature pages /messages/, /partages/, /synchronisation/), built from `docs/integration-n8n-fr.md`;
      the page itself is not in this repository
