# n8n-nodes-biway-messenger

n8n community package of Bi-way (Pocket Communication): the "Bi-way" node, the
"Bi-way Trigger" node and the "Bi-Way API" credential (API key: token + secret, HTTP Basic).
Programmatic style, built on the `npm create @n8n/node` template.

## Rules

- The source of truth for requests and answers is the code of the Bi-Way services
  (`web-biway-services/branches/bi-way-services`, `src/tools/<tool>/class/<Service>.class.php`). The
  PHP samples (`bi-way-sample-php8`) are a catalogue of use cases, not a contract. Never add a field
  or an endpoint that the services do not read or return.
- Do not change the Bi-Way API contract from this repository.
- English only in the node, the credential, the README and the docs in this repository, except
  `docs/integration-n8n-fr.md` and `docs/landing-n8n-updates.md` (French texts for bi-way.fr). Say
  "RCS" explicitly. This repository is public: no contract code nor internal detail in those texts.
- The brand is written "Bi-way" in every label, since 2026-11-02. Two exceptions, forced by the
  official scanner, which requires title case and ignores `eslint-disable`: the credential stays
  named "Bi-Way API" (`cred-class-field-display-name-miscased`), and an option or field name must
  not contain the brand ("From the Gallery"). Quote "Bi-Way API" only where a reader has to
  recognize it on screen. Never rename the technical identifiers (`name` of nodes and credential,
  package name, parameter keys and values): existing workflows depend on them.
- Links: the page presenting the nodes is `N8N_PAGE_URL` (`nodes/Biway/Links.ts`); `homepage` in
  `package.json` repeats it, a JSON file cannot import it. The website shown on n8n.io comes from
  the Creator Portal, not from this package. The codex and the `documentationUrl` of the credential
  stay on the README: n8n requires documentation in English, the page is in French and does not
  detail the operations.
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
- [x] Trusted Publisher configured on npmjs.com (GitHub Actions, `publish.yml`, no environment,
      `npm publish` allowed: `n8n-node release` runs `npm publish`, not `npm stage publish`) and
      `NPM_TOKEN` secret deleted (2026-10-29); the next release is the first one through OIDC
- [x] First-publish token revoked on npmjs.com (2026-10-29)
- [x] `@n8n/scan-community-package` 0.41.1 passes on 0.1.0 (2026-10-29): provenance, source fetched
      from GitHub at `893e9f3`, analysis. On Windows, put the system `tar` first in `PATH`: the Git
      Bash one reads `C:` as a remote host
- [x] Submitted on the n8n Creator Portal (2026-10-29, as author and official representative); review pending
- [x] Automated pre-checks of n8n passed (2026-10-29); next: a demo video (5 minutes at most, no cuts:
      install from npm, credential test, common actions, the node as an AI agent tool)
- [x] 0.1.1 prepared: Send and Broadcast sent cards and carousels as plain text (Bi-Way sends a
      message with a body as text only); found while rehearsing the video, checked on a phone
- [x] Tag `0.1.1` pushed by the maintainer (first publish through the trusted publisher, not staged),
      published with provenance; official scanner passes (2026-10-29)
- [x] Demo video recorded with 0.1.1 (3 min 30, one take) and submitted for manual review (2026-10-29)
- [x] First run of the internal acceptance test (real sendings checked on a phone, 2026-10-29): Send
      with gallery attachments failed (`asset:<id>` is Broadcast's format, messenger/submit reads bare
      IDs), and Create Keyword Reply promised that a typed keyword triggers the reply (only a button
      that carries it does); both fixed in 0.1.2. A keyword reply whose template has no extra crashed
      on the Bi-Way server; fixed there
- [x] Server fix deployed, acceptance test fully passed on the local build; tag `0.1.2` pushed by the
      maintainer, published with provenance (a few minutes before the registry showed it); official
      scanner passes (2026-10-29)
- [x] 0.2.0 prepared (2026-10-29): Bi-Way Trigger › Share Request Received (`EDAPPS_REQUEST`, filters
      Share Actions and Share IDs) and Entry › Get (`GET /file/entry/{type}:{id}`), so that a booking
      or a form sent on a share link can start a workflow and be read back
- [x] Approved for publish by n8n on the Creator Portal, on 0.1.x (2026-10-30)
- [x] Node details saved on the Creator Portal (2026-10-30): logo, author, website, categories, description
- [x] Listed as verified by n8n in 0.1.2, both nodes (public community nodes API, checked 2026-11-02).
      Updates: n8n watches npm, runs a brief check and propagates them on its bi-weekly release cadence,
      with no new submission
- [x] End-to-end test of `EDAPPS_REQUEST` on production (2026-11-02): booking, cancellation, form,
      subscription and list choice received through a tunnel, replayed in the compiled trigger, read back
      with Entry › Get (a cancelled booking included)
- [x] Tag `0.2.0` pushed by hand by the maintainer (`npm run release` would bump past the version
      already in `package.json` and rewrite `CHANGELOG.md` with auto-changelog), published with
      provenance; official scanner passes (2026-11-02)
- [ ] GitHub Release for 0.2.0 with the CHANGELOG section as release notes (maintainer; none exist so
      far)
- [ ] 0.2.0 propagated by n8n to its verified list (0.1.2 on 2026-11-02, right after publishing)
- [ ] Add the share links to the Creator Portal description once 0.2.0 is propagated
- [x] Published 2026-10-31: page presenting the integration on www.bi-way.fr (WordPress block editor and Spectra, like the
      feature pages /messages/, /partages/, /synchronisation/), built from `docs/integration-n8n-fr.md`;
      the page itself is not in this repository

### Post-verification finishing (one commit per item, no tag before the last one)
- [x] Brand written "Bi-way" in the labels, identifiers unchanged, compared before and after (2026-11-02)
- [x] Links: `homepage` and notices to https://www.bi-way.fr/n8n/ (2026-11-02); the website field of the
      Creator Portal is the maintainer's
- [x] Updates of the /n8n/ page, ready to copy (`docs/landing-n8n-updates.md`, 2026-11-02); the choice of
      the access path and the publication are the maintainer's
- [x] Install from the nodes panel followed on a fresh n8n 2.45.4, self-hosted (2026-11-02): the verified
      node shows with its badge, **Install node**, "Package installed". It installed 0.2.0, the latest on
      npm, while the verified list still said 0.1.2: a new tag can reach these users before n8n's check
- [ ] RCS without a launched agent: clear errors, a hint when the API accepts the sending
- [ ] Example workflows up to n8n's template rules (`docs/templates-submission.md`)
- [ ] README and version 0.2.1
