# Phase 1 — Site recon: telnyx.com

**Date of recon:** 2026-08-06
**Method:** two passes.

1. Raw HTTP fetches of the server-rendered HTML, the site's own CSS bundle, and the third-party
   consent configuration.
2. **A real browser.** Headless Chrome 151 driven over the DevTools Protocol from a throwaway Node
   script (Node 24 ships a global `WebSocket`, so this needed no installs). This executed the site's
   JavaScript, so every dynamic assertion below — the consent banner, the Radix menus, the mobile
   hamburger, the responsive breakpoint — is verified against the **rendered** DOM, not the HTML
   source.

Every selector and every expected string below was read out of a live response or a live DOM.
Nothing here is assumed. §9 records the results of the three items that pass 1 could not settle.

---

## 1. Platform facts

| Fact                      | Value                                                                            | Consequence for the suite                                         |
| ------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Stack                     | Next.js (App Router, RSC streaming), server-rendered                             | Content is in the initial HTML → assertions are fast and reliable |
| CDN / WAF                 | Cloudflare (`server: cloudflare`)                                                | See §2                                                            |
| Consent                   | OneTrust, SDK `202605.1.0`, domain script `523bc78b-7e09-4618-b1a4-fd685c71f50e` | See §4                                                            |
| Forms                     | Marketo (`mktoForm_1987`) + **reCAPTCHA**                                        | See §6 — form testing is dropped                                  |
| Docs                      | `developers.telnyx.com` (Vercel, separate origin)                                | See §7 — dropped                                                  |
| `data-testid` / `data-cy` | **Zero occurrences**                                                             | Selector tier 1 unavailable; we use tier 2/3                      |

---

## 2. Bot protection & rate limiting — **not a blocker**

| Probe                                   | Result                                                |
| --------------------------------------- | ----------------------------------------------------- |
| 12 sequential requests to `/pricing`    | `200` × 12 — no rate limiting, no challenge           |
| `User-Agent: HeadlessChrome/131`        | `200`                                                 |
| `User-Agent: …Cypress/15 …Electron/33…` | `200`                                                 |
| No `User-Agent` at all                  | `200`                                                 |
| `robots.txt` for `User-agent: *`        | `Disallow: /md/` only — every path we test is allowed |

Cloudflare is in front of the site but is **not** challenging headless browsers or CI-shaped traffic.
`robots.txt` blocks a list of AI/scraper crawlers (`CCBot`, `GPTBot`, `SemrushBot-BA`, …) — we are
none of those, and we stay off `/md/`.

**Residual risk:** Cloudflare could start challenging GitHub Actions egress IPs at any time. This is
outside our control. Mitigation: CI profile gets `retries: { runMode: 2 }`, and the workflow uploads
screenshots/videos so a challenge page is immediately visible in the artifact.

---

## 3. Verified URLs

Checked with a real browser `User-Agent`, following redirects.

### Good (200)

| Path                      | Final URL                     | `<h1>` (exact)                                   |
| ------------------------- | ----------------------------- | ------------------------------------------------ |
| `/`                       | `https://telnyx.com/`         | `Infrastructure for real-time agents`            |
| `/pricing`                | `https://telnyx.com/pricing`  | `Pricing`                                        |
| `/products`               | `https://telnyx.com/products` | `Everything you need.Nothing you can’t combine.` |
| `/products/voice-api`     | same                          | `Voice API`                                      |
| `/products/sms-api`       | same                          | `SMS API`                                        |
| `/products/sip-trunks`    | same                          | `A global enterprise-grade SIP network`          |
| `/products/iot-sim-card`  | same                          | `IoT eSIM`                                       |
| `/pricing/voice-api`      | same                          | `Voice API pricing`                              |
| `/pricing/messaging`      | same                          | `Messaging API pricing`                          |
| `/pricing/elastic-sip`    | same                          | `SIP Trunking pricing`                           |
| `/pricing/numbers`        | same                          | `Numbers pricing`                                |
| `/pricing/iot-data-plans` | same                          | `IoT SIM Card pricing`                           |
| `/cookie-policy`          | same                          | `Telnyx Cookie Policy`                           |
| `/privacy-policy`         | same                          | `Privacy Policy`                                 |

### Redirects — do **not** hard-code the source path as if it were the destination

| Requested               | Actually lands on        |
| ----------------------- | ------------------------ |
| `/voice`                | `/products/voice-api`    |
| `/messaging`            | `/products/sms-api`      |
| `/sip-trunking`         | `/products/sip-trunks`   |
| `/products/wireless`    | `/products/iot-sim-card` |
| `/global-coverage`      | `/global-communications` |
| `/pricing/call-control` | `/pricing/voice-api`     |

### 404 (useful as negative fixtures)

| Path                             | Status                                        |
| -------------------------------- | --------------------------------------------- |
| `/this-page-does-not-exist-tlnx` | `404`                                         |
| `/wireless`                      | `404` — the URL from the brief does not exist |
| `/products/elastic-sip-trunking` | `404` — the URL from the brief does not exist |
| `/404`                           | **`403`** (Cloudflare) — do not use this path |

> ⚠️ Three URLs named in the brief (`/wireless`, `/sip-trunking` as a landing page,
> `/products/elastic-sip-trunking`) either 404 or redirect. The plan uses the verified real URLs.

**404 page markup** (`/this-page-does-not-exist-tlnx`):

- `<h2>` = `Error 404`
- `<h1>` = `Oops, this page doesn’t exist` — note the **curly apostrophe U+2019**, not `'`
- `<title>` and `<link rel="canonical">` are the **homepage's**, so the 404 page cannot be
  identified by title. We assert on the headings.

---

## 4. Cookie banner — geo risk investigated and **resolved**

The brief flagged "may be geo-dependent (shown in EU, absent in US)". I pulled OneTrust's actual
rule set for the site (`cdn.cookielaw.org/consent/523bc78b-…/523bc78b-….json`):

| Ruleset                                                          | Countries                                | `ShowAlertNotice` |
| ---------------------------------------------------------------- | ---------------------------------------- | ----------------- |
| **Global Audience** (`GENERIC`, `Default: true`, `Global: true`) | **210 countries incl. `us`, `gb`, `ua`** | `"true"`          |
| GDPR Audience                                                    | 39 EU/EEA countries                      | `"true"`          |
| CCPA Audience                                                    | `us` → `ca`                              | `"true"`          |
| LGPD Audience                                                    | `br`                                     | `"true"`          |

**Conclusion: the banner shows everywhere.** A US GitHub runner falls into the _Global Audience_
fallback ruleset, which also has `ShowAlertNotice = "true"`. Crucially, the **button label is
identical in both templates**: `Accept all`. So the same test works in the EU and in US CI.

One thing that is **not** identical, and which we therefore must _not_ assert on:

- GENERIC notice text: `…assist in our marketing efforts.` `Read more` (space before "Read")
- GDPR notice text: `…assist in our marketing efforts.Read more` (no space)

**It is not an iframe.** OneTrust renders inline. Verified against the SDK source
(`otBannerSdk.js`, v202605.1.0) — all of these ids exist in the shipped bundle:

| Selector                       | Purpose             |
| ------------------------------ | ------------------- |
| `#onetrust-consent-sdk`        | root container      |
| `#onetrust-banner-sdk`         | the banner itself   |
| `#onetrust-accept-btn-handler` | "Accept all" button |
| `#onetrust-pc-btn-handler`     | "Cookies settings"  |
| `#onetrust-policy-text`        | notice copy         |

Consent is recorded in the `OptanonAlertBoxClosed` cookie (name confirmed in the SDK source, then
observed live alongside `OptanonConsent`). Banner position is `bottom-left` — measured live at
`{x:16, y:650, w:700, h:218}` in a 1440×900 viewport, so **it overlaps the footer**. That is exactly
why cookie handling must be a shared step, not an afterthought: footer link clicks fail while the
banner is up.

### 🚨 The banner copy is localised — never assert on it

Live browser run, same page, two Chrome launches:

| Launch                 | `navigator.language` | Accept button text              |
| ---------------------- | -------------------- | ------------------------------- |
| default (this machine) | `uk-UA`              | **`Прийняти всі файли сookie`** |
| `--lang=en-US`         | `en-US`              | **`Accept all`**                |

The site sets `<html lang="en">`, but OneTrust ignores that and reads `navigator.languages` — it
fetched the `…/uk` template. A US CI runner would get `en-US`; my machine gets `uk-UA`.

**Two consequences, both applied:**

1. `TC-TLNX-007` asserts the **element, the click outcome and the cookie** — never the copy.
2. Both config files pin `--lang=en-US` via `before:browser:launch`, so runs are reproducible and
   failure screenshots are readable regardless of the runner's locale.

---

## 5. Selector inventory (all verified in live HTML)

### Landmarks — consistent across all 9 pages sampled

| Selector             | Notes                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `header#site-header` | exactly 1 per page. **`position: fixed`** — can intercept clicks near the top of the viewport   |
| `footer#site-footer` | exactly 1 per page                                                                              |
| `main`               | 1 per page — **except the homepage, which has 2** (a wrapper and an inner one). Use `.first()`. |
| `h1`                 | exactly 1 per page on all 9 pages sampled                                                       |

> ⚠️ **The brief's example selector `[role="navigation"]` does not exist on this site.** There is
> exactly one `<nav>` in the document and it is `<nav hidden aria-hidden="true">` — an SEO-only link
> list. CSS attribute selectors match literal attributes, not implicit ARIA roles, so
> `cy.get('[role="navigation"]')` finds nothing, and `cy.get('nav')` finds a **hidden** element that
> would fail `.should('be.visible')`. We use `header#site-header` / `footer#site-footer` instead.

### Header

| Selector                                                 | Verified attributes                                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `#main-menu`                                             | `data-state="close"`                                                                                                               |
| `#main-menu-content`                                     | container of the 6 desktop triggers                                                                                                |
| `#main-menu-content button[aria-haspopup="menu"]`        | 6 of them: **Products, Solutions, Pricing, Why Telnyx, Resources, Developers**; each `aria-expanded="false"` `data-state="closed"` |
| `button[aria-controls="main-menu-content"]`              | the hamburger; `aria-expanded="false"`                                                                                             |
| `header#site-header a[href="/"]`                         | logo, with sr-only text `Home`                                                                                                     |
| `header#site-header a[href="https://portal.telnyx.com"]` | `target="_blank"` `rel="noopener noreferrer"` ✅                                                                                   |
| `a[href="/sign-up"]`                                     | Sign up                                                                                                                            |

> ⚠️ **The brief's example `header nav a[href="/pricing"]` does not exist.** "Pricing" in the header
> is a `<button aria-haspopup="menu">`, not a link. Navigation to `/pricing` is done by URL, or by
> opening the menu first.

> ⚠️ "Contact us" and "Log in" each appear **twice** in the header (desktop + mobile copies).
> Any selector for them must be scoped or use `.first()`, or `.should()` will run against 2 elements.

The Radix ids (`radix-_R_12qcivb_`, …) are **generated per build — never select on them.**

### Footer — verified `href`s

`/our-network`, `/global-coverage`, `/release-notes`, `/careers`, `/products/voice-ai-agents`,
`/data-privacy`, `/report-abuse`, `/privacy-policy`, `/cookie-policy`, `/law-enforcement-request`,
`/acceptable-use-policy`, `/country-specific-requirements`, `/terms-and-conditions`,
`/terms-and-conditions-of-service`.

Footer sections: `Social`, `Company`, `Legal`, `Compare`.

External links with **verified** `target="_blank" rel="noopener noreferrer"`:
`https://www.linkedin.com/company/telnyx`, `https://x.com/telnyx`,
`https://www.facebook.com/Telnyx/`.

> ⚠️ Two footer links are `target="_blank"` with **no `rel` at all**: `https://shop.telnyx.com/` and
> `https://trust.telnyx.com`. That is a genuine (minor) defect on their side. We deliberately do
> **not** assert against those two, because the test would be red for a reason we cannot fix.

### Pricing page

`button#category-filter` — `role="combobox"`, `aria-expanded="false"`, `data-state="closed"`.
Stable id, good interaction target.

---

## 6. Responsive breakpoint — **affects Cypress config**

Extracted from the site's own CSS bundle:

```
.max-header-md\:hidden { … }   @media not all and (min-width: 1260px)
```

**The header switches layout at 1260 px.**

| Viewport  | Behaviour                                                                    |
| --------- | ---------------------------------------------------------------------------- |
| ≥ 1260 px | desktop: `#main-menu-content` visible, hamburger hidden (`header-md:hidden`) |
| < 1260 px | mobile: hamburger visible, `#main-menu` is `-translate-y-full opacity-0`     |

> 🚨 **Cypress's default viewport is 1000 × 660 — below 1260 px.** With defaults, _every desktop
> header test would fail_, because the desktop menu simply isn't rendered. Both config files must
> set `viewportWidth: 1440`. This is the concrete reason the "explicit viewport in both configs"
> rule matters here.

Other breakpoints in the bundle: 430, 720, 1024, 1260, 1440, 1792, 1920.
Chosen viewports: **desktop 1440 × 900**, **mobile 390 × 844**.

---

## 7. Cases I am dropping, and what replaces them

### ❌ Contact form validation → replaced

`/contact-us` renders `<form id="mktoForm_1987">` **empty** in the HTML, with a loading spinner.
Fields are injected client-side by Marketo (`munchkin.marketo.net`), and the page states:

> "This site is protected by reCAPTCHA…"

Three independent reasons to drop it:

1. Third-party client-side injection → slow, non-deterministic, breaks when Marketo is slow.
2. **reCAPTCHA** — driving it automatically is exactly the bot behaviour we were told to avoid on
   someone else's production site.
3. Consent-gating: Marketo may not load at all until cookies are accepted.

**Replacement:** `TC-TLNX-006` (pricing category filter — a real client-side interactive control
with `aria-expanded`, no submit, no third party) and `TC-TLNX-003` (header menu `aria-expanded`).
Both give the "interact and assert on state" coverage without touching a form.

### ❌ Sign-up form → replaced

`/sign-up` ships **zero** `<input>` elements and no `<h1>` server-side; it is a fully client-side
app that talks to the portal. Touching it risks account creation, which is forbidden.
**Replacement:** none needed — covered by the above.

### ❌ Docs search on `developers.telnyx.com` → dropped

Separate origin (would need `cy.origin`), 1.3 MB page, Mintlify-style client-side command palette,
no `<h1>`, no server-rendered search input. High flake for low value.
**Replacement:** `TC-TLNX-013` covers cross-origin _link_ correctness without leaving the origin —
which is the safe way to test external destinations anyway.

### ❌ Homepage AI chat input → dropped

`input[aria-label="Type message here"]` posts to Telnyx's live inference service. Submitting it
would cost them money and is a real transaction. Not touched.

### 🚨 Stated gap: the suite has **no form-validation coverage**, because the site has no safe target

This is a deliberate, reported gap rather than an oversight. I swept four pages in a real browser,
waiting 6 s per page so client-side chunks and Marketo could finish:

| Page                  | `<form>`    | inputs | fields with `required` / `pattern` / `type=email` / `minlength` |
| --------------------- | ----------- | ------ | --------------------------------------------------------------- |
| `/`                   | 1           | 1      | **0**                                                           |
| `/pricing`            | 0           | 0      | **0**                                                           |
| `/products/voice-api` | 0           | 0      | **0**                                                           |
| `/contact-us`         | 1 (Marketo) | many   | **1** — `input#Email`                                           |

The **only** natively-validated field on the entire site is the Marketo contact form's
`input#Email` (`[required][pattern][type=email]`) — and it sits behind reCAPTCHA on a form whose
`noValidate` is `true`, meaning the browser's native validation is switched **off** and Marketo's
own JavaScript does the work. Testing it would mean testing Marketo, through a captcha, on
someone else's production site.

**Conclusion: no safe client-side-validated field exists on telnyx.com.** Recorded as
`OOS-TLNX-005` on the "Out of scope" sheet and repeated in the README's Known limitations.

---

## 8. Toolchain — two version decisions I need you to confirm

Everything below is from `npm view`, run today.

| Package                                   | Latest      | Pinning    | Why                                     |
| ----------------------------------------- | ----------- | ---------- | --------------------------------------- |
| `cypress`                                 | **15.20.0** | `^15.20.0` | latest stable                           |
| `@badeball/cypress-cucumber-preprocessor` | **26.0.0**  | `^26.0.0`  | peer `^15.18.0` ✅ satisfied by 15.20.0 |
| `@bahmutov/cypress-esbuild-preprocessor`  | **2.2.8**   | `^2.2.8`   | peer `esbuild >=0.17` ✅                |
| `esbuild`                                 | **0.28.1**  | `^0.28.1`  |                                         |
| `allure-cypress`                          | **3.10.2**  | `^3.10.2`  | peer `cypress >=12.17.4` ✅             |
| `allure-commandline`                      | **2.43.0**  | `^2.43.0`  | report generator (needs Java)           |
| `eslint`                                  | **10.8.0**  | `^10.8.0`  |                                         |
| `typescript-eslint`                       | **8.66.0**  | `^8.66.0`  |                                         |
| `prettier`                                | **3.9.6**   | `^3.9.6`   |                                         |
| `rimraf`                                  | **6.1.3**   | `^6.1.3`   | cross-platform `clean`                  |

### ✅ Decision 1 — TypeScript 6, not 7 — **CONFIRMED, and verified to work (see §11)**

TypeScript's `latest` is **7.0.2**. But:

```
typescript-eslint@8.66.0  peerDependencies:
  typescript: ">=4.8.4 <6.1.0"
```

There is **no** published `typescript-eslint` that supports TS 7 (latest is 8.66.0; no `next`
tag exists). So TS 7 + working `npm run lint` is currently impossible.

- **TS 6.0.3** (released 2026-04-16) — actively maintained, satisfies the peer range, full typed
  linting works. **← my recommendation**
- TS 7.0.2 — we would have to drop type-aware ESLint rules or install with `--legacy-peer-deps`,
  which trades a real capability for a version number.

TS 6 is not an "outdated major" — Microsoft ships 6.x (JS compiler) and 7.x (native port) in
parallel; 6.0.3 is four months old.

### ✅ Decision 2 — Node 24, not Node 20 — **CONFIRMED: CI pins 24.18.0 to match local**

The brief says "Node 20 LTS, pinned and matching my local version". Those two requirements now
conflict:

- Your local Node is **v24.18.0**.
- Node 20 "Iron" last shipped 2026-03-24 and is **end-of-life** — the same problem the brief warns
  about for Node 14/16.
- Node 24 "Krypton" is **Active LTS** (v24.19.0, 2026-08-03).
- `cypress@15.20.0` engines: `^20.1.0 || ^22.0.0 || >=24.0.0`.

**Recommendation: pin Node 24 in CI**, which satisfies the brief's actual intent (pin it, match
local, don't use EOL). Say the word if you want 20 anyway.

---

## 9. The three open items — resolved in a real browser

All three were verified against headless Chrome 151. **All three are now settled.**

### ✅ Item 1 — header menu `aria-expanded` — RESOLVED, with a caveat worth knowing

| Interaction                                           | Result                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `element.click()` (bare `click` event only)           | ❌ stays `aria-expanded="false"`                           |
| Real mouse press/release via CDP                      | ✅ `aria-expanded="true"`, `data-state="open"`             |
| **Full synthetic sequence — what `cy.click()` sends** | ✅ `aria-expanded="true"`, `data-state="open"`             |
| Hover only                                            | ❌ does not open (so it is a click menu, not a hover menu) |

The Radix trigger listens on **`pointerdown`**, not `click`. `cy.click()` dispatches
`pointerover → pointerenter → pointerdown → mousedown → pointerup → mouseup → click`, so
**`cy.click()` works.** TC-003 is safe as written.

Bonus: opening also inserts a panel matching `[role="menu"][data-state="open"]`, giving TC-003 a
second, independent assertion.

### ✅ Item 2 — mobile hamburger — RESOLVED, fully

At 390×844, before the click:
`hamburgerVisible: true`, `aria-expanded: "false"`, `#main-menu` `data-state: "close"`,
`#main-menu-content` **not** visible.
After `cy.click()`-equivalent: `aria-expanded: "true"`, `#main-menu` `data-state: "open"`,
`#main-menu-content` visible.

The inferred `"open"` value **is** correct. All three assertions in TC-014 hold.

### ✅ Item 3 — OneTrust calls are interceptable — RESOLVED

Captured live, in order:

```
Script  https://cdn.cookielaw.org/consent/523bc78b-…/OtAutoBlock.js
Script  https://cdn.cookielaw.org/scripttemplates/otSDKStub.js
XHR     https://cdn.cookielaw.org/consent/523bc78b-…/523bc78b-….js
XHR     https://geolocation.onetrust.com/cookieconsentpub/v1/geo/location
Script  https://cdn.cookielaw.org/scripttemplates/202605.1.0/otBannerSdk.js
Fetch   https://cdn.cookielaw.org/consent/523bc78b-…/019eb8d6-…/uk     <- the locale template
```

`**/geolocation.onetrust.com/**` and `**/cdn.cookielaw.org/consent/**` are both stable, aliasable
glob targets for `cy.intercept` + `cy.wait('@alias')`.

### Other assertions re-verified live (15/15 passed)

All nine Scenario-Outline `h1` values, every canonical URL, the `/pricing` filter toggle, the 404
headings, all four external-link `rel` attributes, the four footer legal hrefs, the SEO metadata,
and the landmark counts. Full log kept during the run; nothing failed.

Two incidental confirmations that change selector design:

- `#site-header a[href="https://portal.telnyx.com"]` matches **2 elements** (desktop + mobile copies)
  → the page object must scope or `.first()` it.
- The homepage has **2 `<main>` elements, nested** → assert on the first only. Logged as a defect.

---

## 10. Defects found on the site

Recorded on the "Defects found" sheet of the workbook. Neither is automated — see §7 and the
"Out of scope" sheet for why.

| ID             | Sev    | Summary                                                                                                                                                                                                 |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEF-TLNX-001` | Medium | `shop.telnyx.com` and `trust.telnyx.com` footer links are `target="_blank"` with **`rel=null`** — reverse-tabnabbing and referrer leak. The other four external links on the same page are correct.     |
| `DEF-TLNX-002` | Low    | The homepage nests a `<main>` inside another `<main>`. Only one `main` landmark is allowed per document. `document.querySelectorAll('main').length === 2` on `/`, `=== 1` on all 8 other pages sampled. |

---

## 11. Toolchain verification results (done, not assumed)

Run in an isolated temp directory — **nothing was installed into this project**.

### ✅ TypeScript 6.0.3 works with the whole stack

`npx tsc --noEmit` with `strict: true`, `moduleResolution: "bundler"` and **`skipLibCheck: false`**
(so every dependency's `.d.ts` is checked too) against real usage of `defineConfig`,
`Cypress.PluginEvents`, `createBundler`, `addCucumberPreprocessorPlugin`, `createEsbuildPlugin`,
`allureCypress`, `Given/When/Then`, `DataTable`, page-object classes and custom-command declarations:

```
EXIT CODE: 0
```

`eslint@10.8.0` + `typescript-eslint@8.66.0` also ran **type-aware** rules successfully against the
TS 6 program. TS 6 is confirmed good.

### ⚠️ One mandatory rule needs an explicit generic to be satisfiable

The brief requires every page-object getter to return `Cypress.Chainable<JQuery<HTMLElement>>`.
For bare tag selectors that **fails to compile**:

```ts
getHeading(): Cypress.Chainable<JQuery<HTMLElement>> { return cy.get('h1'); }
// TS2322: Chainable<JQuery<HTMLHeadingElement>> is not assignable to
//         Chainable<JQuery<HTMLElement>>  — 'align' is missing in HTMLElement
```

Cypress maps known tag names to specific element types, and `Chainable<T>` is **invariant**
(because of `Chainer<T>` on `.and`/`.should`). The fix is the documented generic on `cy.get`
(`get<E extends Node = HTMLElement>`):

```ts
getHeading(): Cypress.Chainable<JQuery<HTMLElement>> { return cy.get<HTMLElement>('h1'); }
// EXIT CODE: 0
```

No `any`, no `@ts-ignore`, no cast. The rule is satisfiable — it just needs this idiom, which
Phase 3 will use consistently.

### ✅ ESLint: **zero globally-disabled rules**

An earlier draft of this document claimed two rules had to be switched off. Re-testing with
_precise_ element types showed that was wrong on both counts.

| Rule                                               | Status                                                                              | Why                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@typescript-eslint/no-namespace`                  | **stays on, zero disables**                                                         | The rule's `allowDefinitionFiles` option defaults to `true`. It only fired in my first probe because that probe used a `.ts` file. The augmentation lives in `cypress/support/index.d.ts`, so the rule never fires. Verified by introspecting the rule's `defaultOptions` and empirically. |
| `@typescript-eslint/no-unnecessary-type-arguments` | **stays on globally**; a few inline `eslint-disable-next-line … -- reason` comments | Using _precise_ element types removes almost every occurrence — see below.                                                                                                                                                                                                                 |

Using the precise DOM interface for each getter, the rule is satisfied without any disable:

| Getter            | Return type                             | `cy.get` call                              | Lint              |
| ----------------- | --------------------------------------- | ------------------------------------------ | ----------------- |
| `getHeading`      | `Chainable<JQuery<HTMLHeadingElement>>` | `cy.get('h1')` — tag overload infers it    | ✅ clean          |
| `getPortalLink`   | `Chainable<JQuery<HTMLAnchorElement>>`  | `cy.get<HTMLAnchorElement>('… a[href=…]')` | ✅ clean          |
| `getMenuTriggers` | `Chainable<JQuery<HTMLButtonElement>>`  | `cy.get<HTMLButtonElement>('… button[…]')` | ✅ clean          |
| `getSiteHeader`   | `Chainable<JQuery<HTMLElement>>`        | `cy.get('header#site-header')`             | ⚠️ **rule fires** |
| `getSiteHeader`   | **`Chainable<JQuery>`**                 | `cy.get('header#site-header')`             | ✅ **clean**      |

#### Where the error actually was — and the fix that reaches zero disables

An intermediate draft blamed the explicit `cy.get<HTMLElement>(…)` generic. **That was wrong.**
Isolating the cases showed the error is reported at the _return-type annotation_, not the call:

```
probe.ts  13:61  error  This is the default value for this type parameter, so it can be omitted
```

Column 61 on line 13 is the `HTMLElement` inside `Cypress.Chainable<JQuery<HTMLElement>>`. The
`cy.get('header#site-header')` call on the next line already carried **no** generic — the
tag-name-map overload only matches a _bare_ tag selector, so `'header#site-header'` falls through
to `get<E extends Node = HTMLElement>` and infers `JQuery<HTMLElement>` on its own. Dropping the
generic was correct, but it was never what the linter was complaining about.

The fix is to write `Cypress.Chainable<JQuery>`. `JQuery`'s own default element type **is**
`HTMLElement`, so this is not a widening — it is the identical type spelled without a redundant
argument. Proven at the type level rather than asserted:

```ts
type Exact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const identical: Exact<Cypress.Chainable<JQuery>, Cypress.Chainable<JQuery<HTMLElement>>> = true;
// tsc --noEmit  ->  exit 0
```

**Result: zero globally-disabled rules AND zero inline disables.** Every getter still carries an
explicit return type, as the brief requires; the three true-`HTMLElement` landmark getters simply
write it as `Cypress.Chainable<JQuery>`.

#### tsconfig `paths` — removed, having been shown unnecessary

An earlier draft carried `"paths": { "*": ["./node_modules/*"] }`. Tested with and without:
**`tsc --noEmit` exits 0 either way.** `moduleResolution: "bundler"` walks `node_modules` natively
from the tsconfig's own directory, which is the project root. The mapping fixed no concrete
resolution failure and a catch-all can mask a real one later, so it is gone. The brief's underlying
requirement — never resolve through `../node_modules` — holds: nothing in this project does.

One rule **option** is set (not a disable): `restrict-template-expressions` is configured with
`{ allowNumber: true }` so viewport numbers can be interpolated into browser launch flags.
Objects, `null`, booleans and `any` remain banned.

### ✅ `npm audit`: 0 vulnerabilities — but only with two `overrides`

Out of the box the tree has **1 high, 1 moderate, 1 low**:

```
@badeball/cypress-cucumber-preprocessor@26.0.0
└─ mocha@11.8.0
   ├─ serialize-javascript@6.0.2   HIGH  (RCE — GHSA-5c6j-r48x-rmvq)
   └─ diff@6.x                     (DoS — GHSA-73rr-hh4g-fpgx)
```

`mocha@11.8.0` is already the latest, so the fix is npm `overrides` in `package.json`:

```json
"overrides": { "serialize-javascript": "^7.0.7", "diff": "^8.0.3" }
```

Re-verified after applying: `{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}`,
and `tsc --noEmit` still exits 0.

#### The `diff` 6 → 8 jump was behaviour-tested, not assumed

`diff` is what mocha uses to render assertion diffs, and neither `tsc` nor `npm audit` would catch
a rendering regression. So it was tested directly: two deliberately failing assertions (a
multi-line string and a nested object), run under mocha with and without the override.

```
       the quick brown fox
      -jumps over
      +vaults over
       the lazy dog
```

**Output is byte-identical between `diff@7` (the version npm resolves without the override) and
`diff@8.0.4` (with it).** Verified with `diff control-diff6.txt test-diff8.txt` → no differences.
The override is safe.

Two things worth recording:

- Without the override npm resolves `diff@7.0.0`, **not** 6.x — and 7.0.0 is still inside the
  advisory's vulnerable range (`6.0.0 – 8.0.2`), so the override is genuinely required.
- The `cypress` npm package does **not** depend on `mocha` or `diff` at all (it bundles its own
  mocha inside the binary). This whole chain comes from
  `@badeball/cypress-cucumber-preprocessor`, so the blast radius is the preprocessor's Node-side
  tooling, not Cypress's in-browser assertion output.

### The two run profiles — how "genuinely different reporters" is satisfied

The brief asks the two profiles to differ on "retries, video, viewport, baseUrl handling,
reporters". Where we landed, and why:

| Axis         | Local (`cypress.config.ts`)   | CI (`cypress.ci.config.ts`)                                                       | Differs?          |
| ------------ | ----------------------------- | --------------------------------------------------------------------------------- | ----------------- |
| Browser      | Chrome, headed                | Electron, headless                                                                | ✅                |
| Retries      | `{ runMode: 0, openMode: 0 }` | `{ runMode: 2, openMode: 0 }`                                                     | ✅                |
| Video        | off                           | on, `videoCompression: 32`                                                        | ✅                |
| Screenshots  | off                           | on failure                                                                        | ✅                |
| baseUrl      | fixed shared constant         | `CYPRESS_BASE_URL ?? shared`                                                      | ✅                |
| Reporting    | `spec` console only           | `spec` + Allure result set enriched with environment/executor/categories metadata | ✅ (see below)    |
| **Viewport** | **1440×900**                  | **1440×900 — deliberately identical**                                             | ❌ **on purpose** |

**Viewport is deliberately NOT a difference.** An earlier draft used 1920×1080 in CI for legible
video. That was a mistake and was reverted: a different CI viewport reintroduces exactly the
failure mode the 1260px finding warns about — a suite that passes locally and fails in CI for a
reason unrelated to the product. Layout-dependent assertions must see the same canvas everywhere.
Artefact legibility does not justify that non-determinism.

**We deliberately did not bolt on a second mocha reporter.** Adding e.g. `junit` purely to make the
word "reporters" plural would be ceremony: nothing consumes the XML, and it would cost a dependency
or a claim about Cypress's bundled reporters that could not be verified without downloading the
binary. The reporting split is real without it — the console binding stays `spec` in both profiles
because a red CI log should be readable inline, while **Allure is the machine-readable output** and
only the CI profile enriches it with environment, executor and category metadata. Combined with
video, screenshots and retries, CI produces a materially different artefact set from local. Six
substantive axes differ; manufacturing a seventh adds nothing.

### npm 11 `allowScripts` — warn-only in 11.16. **Not** a CI blocker.

> **Correction.** An earlier revision of this document claimed the `allowScripts` warning was a
> latent CI failure that would break the first pipeline run. **That claim was wrong.** It was
> reasoning, not measurement. A controlled cold-cache experiment disproved it. The original text is
> replaced rather than quietly edited, because the wrong version was acted on.

`npm install` / `npm ci` on npm 11.16.0 emits:

```
npm warn allow-scripts 2 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   cypress@15.20.0 (postinstall: node dist/index.js --exec install)
npm warn allow-scripts   esbuild@0.28.1  (postinstall: node install.js)
```

Cypress's postinstall is what downloads the ~750 MB browser binary, so the obvious inference is
that a blocked postinstall means no binary in CI. **The inference is wrong: in npm 11.16 this is a
warning, not a gate. The script still runs.**

#### The experiment

The local cache was renamed away (`Cache` → `Cache.bak`) and `node_modules` deleted, so both runs
started genuinely cold.

|                             | `allowScripts` absent (negative control) | `allowScripts` present |
| --------------------------- | ---------------------------------------- | ---------------------- |
| `npm ci` exit code          | `0`                                      | `0`                    |
| Warning emitted             | yes                                      | **no**                 |
| Cypress cache after install | **created, 754.7 MB**                    | created, ~800 MB       |
| `binary_state.json` written | **yes** (17:30:16)                       | yes                    |
| `npx cypress verify`        | **`✔ Verified Cypress!`**                | `✔ Verified Cypress!`  |

**The postinstall ran and downloaded the full binary in both cases.** The only observable
difference is the warning text.

Note the trap in the negative control: `npm ci` exits `0` _and_ the binary downloads, so nothing
about the exit code or the install output distinguishes the two. Had the gate been real, the
failure would have surfaced only later, at `cypress run`.

The original cache was restored afterwards (754.7 MB, `Cache.bak` removed, `verify` green).

#### What we keep, and why

```json
"allowScripts": {
  "cypress": true,
  "esbuild": true
}
```

Verified: `npm approve-scripts --allow-scripts-pending` → `No packages with unreviewed install scripts.`

This is retained as an **explicit supply-chain policy and warning suppression**, not as a fix for a
blocker. It is honest about which two packages are permitted to execute install scripts, and it
keeps a recurring warning out of every CI log. npm is clearly moving toward enforcement (the
command set already includes `npm deny-scripts`), so declaring the policy now costs one object and
avoids a real break later. **It is not load-bearing today** — remove it and everything still works.

Entries are deliberately **unpinned** (`"cypress"`, not `"cypress@15.20.0"`). The committed
lockfile already pins exact versions and `npm ci` refuses to drift from it, so the lockfile is the
pin; a second one would only mean re-approving on every patch bump.

#### `cypress-io/github-action@v6` uses the same path

Read from the action's own bundle (`dist/index.js` at tag `v6`) rather than assumed:

- With a `package-lock.json` and no yarn/pnpm lockfile, it runs **plain `npm ci`** —
  `exec.exec(quote(npmPath), ['ci'], cypressCommandOptions)`.
- It never passes `--ignore-scripts` (zero occurrences in the bundle).
- It caches the binary directory via `CYPRESS_CACHE_FOLDER`, restoring it _before_ install, so on a
  cache hit Cypress's postinstall finds the binary present and exits early.

So the action's install path is exactly the `npm ci` path measured above, and the project's
`allowScripts` policy is read by npm itself regardless of who invokes it. **The cold-cache result
covers the action's path too**, and no extra workflow configuration is needed for it.

### ⚠️ `ELECTRON_RUN_AS_NODE` breaks Cypress — environment, not installation

While diagnosing the above, `npx cypress verify` failed with:

```
Cypress.exe: bad option: --smoke-test
Cypress.exe: bad option: --ping=615
```

That looks like a corrupt binary. It is not. The install was complete and correct —
`Cypress.exe` 196 MB, ProductName `Cypress`, file version `15.20.0`, `resources/app` present,
754 MB cache total.

The cause is the environment variable **`ELECTRON_RUN_AS_NODE=1`**, which makes any Electron binary
run as plain Node — and Node rejects `--smoke-test` as a bad _node_ option. It is set by the
VS Code extension host and inherited by shells spawned from it.

```
with    ELECTRON_RUN_AS_NODE=1   ->  FAILED: bad option: --smoke-test
without ELECTRON_RUN_AS_NODE     ->  √ Verified Cypress!   exit 0
```

Diagnostic to keep, because the symptom points at the wrong cause:

```bash
echo "$ELECTRON_RUN_AS_NODE"     # must be empty
unset ELECTRON_RUN_AS_NODE       # then re-run
```

Goes in the README troubleshooting section. GitHub Actions runners do not set it, so CI is
unaffected — this is a local-only trap.

### ✅ Allure report generation and trend history — exercised end to end

Not just configured — run. Two generations with fabricated result sets:

| Run | Results written                       | `history-trend.json` after generate |
| --- | ------------------------------------- | ----------------------------------- |
| 1   | 1 passed, 1 failed                    | 1 data point                        |
| 2   | 2 passed (the failing one now passes) | **2 data points**                   |

`scripts/allure.mjs generate` logged `Restored previous trend history into the result set.` and the
trend graph correctly shows `{failed:1, passed:1}` → `{failed:0, passed:2}`. `clean` was also run
and removed all four artefact directories. Java 21 (Temurin) satisfied the Allure CLI.

---

## 11b. Known limitations — consciously untested paths

These are things the suite deliberately does **not** cover. Each is a trade, not an oversight, and
each is repeated in the README's Known limitations section.

| #   | Untested path                                                                                                                | The trade we made                                                                                                                           | What would break without us noticing                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The localised cookie banner.** Both configs pin `--lang=en-US`, so every run exercises the English OneTrust template only. | Reproducibility beats coverage here: without the pin, banner copy and screenshots differ per machine, and TC-007 would be locale-dependent. | If OneTrust's non-English templates broke — different button ids, a different DOM shape, or the banner failing to render under a GDPR ruleset — the suite would stay green. Real EU/uk/br users could hit a broken banner. |
| 2   | **Any client-side form validation.** No safe target exists (§7).                                                             | Not automating a reCAPTCHA-protected third-party form on production.                                                                        | Regressions in Telnyx's contact-form validation are invisible to this suite.                                                                                                                                               |
| 3   | **The two `rel`-less external links** (`shop.`/`trust.telnyx.com`).                                                          | Not asserting on a third-party defect we cannot fix.                                                                                        | If more links regress the same way, only `DEF-TLNX-001`'s four known-good links are guarded.                                                                                                                               |
| 4   | **Electron's locale.** `--lang=en-US` is a Chromium flag; Electron inherits the OS locale.                                   | Harmless, because we never assert banner copy. GitHub runners are `en-US` anyway.                                                           | A non-English CI runner would produce non-English screenshots. No assertion depends on it.                                                                                                                                 |
| 5   | **Cross-origin content** (`developers.telnyx.com`, `portal.telnyx.com`). Links are asserted, never followed.                 | `cy.origin` complexity and third-party flake for little value.                                                                              | Broken docs/portal destinations would not be caught — only that the `href` is right.                                                                                                                                       |

Limitation 1 is the one worth re-reading: **pinning the locale means the localised banner is never
exercised.** It is the right call for determinism, but it is a genuine coverage hole and is recorded
as such.

---

## 12. Housekeeping

The stray root `index.html` (9 bytes of `feafeafea`) is **gone** — it was already absent when I went
to remove it. The project root is clean.

---

## 13. Carry-forward list for Phase 2+

Concrete things this recon obliges the code to do. Phase 8 checks each one back off.

| #   | Obligation                                                                                                                                                                                                                                                                           | Lands in                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 1   | `viewportWidth: 1440` in **both** configs — identical, not merely both ≥1260 — with a comment naming the 1260 px breakpoint so nobody "tidies" it                                                                                                                                    | `cypress.config.ts`, `cypress.ci.config.ts`, `config/shared.ts` |
| 2   | The 1260 px breakpoint appears in README → Known limitations                                                                                                                                                                                                                         | `README.md`                                                     |
| 3   | `--lang=en-US` pushed in `before:browser:launch` for chromium                                                                                                                                                                                                                        | `config/shared.ts`                                              |
| 4   | `overrides` for `serialize-javascript` and `diff`                                                                                                                                                                                                                                    | `package.json`                                                  |
| 5   | `cy.get<HTMLElement>(…)` idiom in every page-object getter with a bare tag selector                                                                                                                                                                                                  | `cypress/support/pages/**`                                      |
| 6   | **Zero disabled lint rules, global or inline.** Precise element types everywhere; the three true-`HTMLElement` landmark getters return `Cypress.Chainable<JQuery>`                                                                                                                   | `eslint.config.mjs`, `cypress/support/pages/**`                 |
| 7   | Never assert cookie-banner copy; assert element + outcome + cookie                                                                                                                                                                                                                   | `consent.steps.ts`                                              |
| 8   | Scope or `.first()` the duplicated header portal link and the nested homepage `<main>`                                                                                                                                                                                               | `HeaderComponent`, `BasePage`                                   |
| 9   | Never assert on Radix generated ids (`radix-_R_…`) or hashed CSS-module classes                                                                                                                                                                                                      | all page objects                                                |
| 10  | Form-validation gap stated explicitly                                                                                                                                                                                                                                                | `README.md` Known limitations + `OOS-TLNX-005`                  |
| 11  | All five §11b untested paths repeated in README → Known limitations                                                                                                                                                                                                                  | `README.md`                                                     |
| 12  | No `cypress.env.example.json`. One README line: no credentials are required; if any are ever needed they go in `cypress.env.json` (gitignored)                                                                                                                                       | `README.md`, `.gitignore`                                       |
| 13  | **Commit `package-lock.json`**, and verify `npm ci` resolves the two `overrides` to the same versions CI-side that `npm install` produced locally — `npm audit` in CI must also report 0 high/critical. `npm install` and `npm ci` can diverge on overrides if the lockfile is stale | Phase 6: `.github/workflows/e2e.yml`                            |
| 14  | No second mocha reporter; the profile split is justified in §11 instead                                                                                                                                                                                                              | `README.md` config-comparison table                             |
| 15  | `allowScripts` is a supply-chain policy + warning suppression ONLY. **Proven by cold-cache experiment (§11) not to be a CI blocker** — never re-describe it as one                                                                                                                   | `package.json`                                                  |
| 16  | README troubleshooting entry for `ELECTRON_RUN_AS_NODE=1` — it makes a healthy Cypress install look corrupt (`bad option: --smoke-test`)                                                                                                                                             | `README.md`                                                     |
| 17  | `cypress-io/github-action@v6` runs plain `npm ci` and caches `CYPRESS_CACHE_FOLDER`; no extra config needed for install scripts. Verified from the action's own bundle                                                                                                               | Phase 6: `.github/workflows/e2e.yml`                            |

---

## 14. Phase 4–7 — what the first real runs taught us

Everything in §1–§13 was learned before a single Cypress test executed. This section records
what only showed up once the suite actually ran, because several of these were invisible to
static analysis, `tsc` and ESLint.

### The bundler will happily drag Node into the browser

Symptom:

```
ERROR: Could not resolve "node:path"
ERROR: Could not resolve "node:fs"
```

Cause: a step definition imported viewport constants from `config/shared.ts`, and
`config/shared.ts` imports the Node-side plugin APIs (cucumber preprocessor, esbuild bundler,
Allure reporter). Step definitions run in the **browser** and esbuild bundles whatever they
import, so the whole Node-side plugin graph was pulled into a browser bundle.

Fix: `config/viewports.ts` and `config/site.ts` — modules with **zero imports**, safe for both
sides. `config/shared.ts` re-exports them so the Cypress configs still have one place to look.
This is a structural rule, not a one-off patch: **nothing a step definition imports may
transitively reach a Node API.**

### `cy.log()` inside an event handler is a flake generator

Symptom: scenarios failing at random across unrelated features, with

```
Cypress detected that you returned a promise from a command while also invoking
one or more cy commands in that promise. The command that returned the promise
was: cy.visit(). The cy command you invoked inside the promise was: cy.log()
```

Cause: the `uncaught:exception` handler used `cy.log()`. That handler fires whenever a
third-party script throws — frequently mid-`cy.visit()`. `cy.log()` **enqueues a command**, and
enqueuing mid-flight is illegal. Because it depended on the exact moment a third-party tag
threw, it presented as random flake in whichever scenario happened to be running.

Fix: `Cypress.log()`, which is synchronous and enqueues nothing.

This one is worth remembering generally: **inside a Cypress event handler, use `Cypress.*`, never
`cy.*`.**

### `allowCypressEnv: false` breaks the cucumber preprocessor

Cypress 15 warns on every run that browser-side `Cypress.env()` reads are deprecated. Setting
`allowCypressEnv: false` to silence it killed every spec before its first test:

```
`Cypress.env()` does not work when `allowCypressEnv` is set to `false`.
```

Cause: `@badeball/cypress-cucumber-preprocessor` calls `Cypress.env()` inside the spec code it
generates. The warning is therefore **accepted** until the preprocessor migrates. Recorded
because "silence the deprecation warning" is exactly the kind of tidy-up a future reader will
attempt.

### Video compression + Allure = `EBUSY` on Windows

Symptom, aborting the entire run after a spec passed:

```
EBUSY: resource busy or locked, unlink 'cypress\videos\footer.feature.mp4'
```

Cause: video compression writes a temp file and replaces the original, which races the Allure
reporter reading the same file to attach it. Linux CI does not hit this; Windows does.

Fixes applied: `videoCompression: false` and `videoOnFailOnly: false`. Both were tried in the
other direction first and both crashed. A setting that hard-crashes the suite on the platform
the developer uses is not worth the saved megabytes, especially as videos are uploaded as
workflow artefacts anyway.

**Operational note:** a crashed run can leave `Cypress.exe` and `ffmpeg.exe` processes holding a
handle on the video file, which then jams the _next_ run's asset-trashing step with a
`windows-trash.exe` error. If that happens, kill the stray processes and delete `cypress/videos`.

### The suite caught a defect in its own fixture

`TC-TLNX-015` failed with:

```
+ expected - actual
-'https://telnyx.com'
+'https://telnyx.com/'
```

The fixture said `https://telnyx.com/`. The page's raw attribute is `https://telnyx.com`, with
no trailing slash. The error was mine: during recon I read the canonical via the DOM **property**
`link.href`, which resolves and normalises the URL, whereas `should('have.attr', 'href')` reads
the **raw attribute**. The original HTML capture in §3 was correct all along.

Worth recording as a general trap: **`.href` (property) and `[href]` (attribute) are not the same
string**, and a fixture built from the wrong one produces a test that is confidently wrong.

### Cross-origin errors arrive with no stack

The `uncaught:exception` filter attributes errors by matching script URLs in the stack. Opaque
cross-origin errors defeat that by design: the browser reports the bare string `Script error.`
with an **empty stack**, so there is nothing to attribute.

Handled as its own documented category — suppressed, logged, and listed in the README's Known
limitations with the residual risk stated. Errors that _do_ carry a stack are still held to the
allowlist, so a first-party crash from same-origin code still fails the test.

### Allure was silently producing an empty report

The most dangerous failure found in the whole project, because **nothing about it looks wrong**.

`allureCypress(on, config, …)` in `setupNodeEvents` is only HALF the wiring. Allure also needs a
browser-side import in the support file:

```ts
import 'allure-cypress';
```

Without it:

- the suite runs and reports **23/23 green**
- `allure-results/` is created
- `environment.properties` and `categories.json` are written — because those come from the Node
  half at startup
- …and there are **no test results at all**. Measured: **2 files** in `allure-results` after a
  full green run, versus **30** once the import was added.

So every signal says "reporting is configured" while the generated report would be empty. Only
counting the output files exposes it. Anyone wiring Allure into Cypress should check the file
count after their first green run rather than trusting that the config looks right.

#### A wrong diagnosis on the way, kept for the record

Before finding the missing import, the cause was diagnosed as a plugin-event collision: both
`addCucumberPreprocessorPlugin` and `allureCypress` register `after:spec`, and Cypress permits
only one handler per event. That is a **true fact** about both plugins, and it produced a
plausible story for the missing results — so an explicit `on('after:spec', …)` forwarding call
was added, with a confident comment calling it "load-bearing".

It was not. A control run with the browser import present and the forwarding **removed** still
wrote results (18 files for a single spec). The forwarding was deleted and the comment corrected.

The lesson is the same one as the `allowScripts` episode in §11: a true observation about the
system does not make it the cause of the symptom in front of you. The control run is what
separates the two, and it takes thirty seconds.
