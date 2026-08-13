# telnyx-cypress-cucumber

UI test automation for **[telnyx.com](https://telnyx.com)** — Cypress + Cucumber (Gherkin) +
TypeScript, reported with Allure and run in GitHub Actions.

15 scenarios covering navigation, product and pricing pages, cookie consent, footer and
external-link safety, 404 handling, SEO metadata, and responsive layout at two viewports.

> **This suite tests a third-party production site that we do not own.**
> All traffic is read-only. No account creation, no form submissions, no payment flows, no load
> testing, no parallelism. See [Test scope and constraints](#test-scope-and-constraints).

📊 **Live Allure report:** https://bugalter168.github.io/telnyx-cypress-cucumber/
_(published from the `gh-pages` branch by CI — see [Reports](#reports).)_

---

## Contents

- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Running the suite](#running-the-suite)
- [The two config profiles](#the-two-config-profiles)
- [Reports](#reports)
- [Project layout](#project-layout)
- [Test data and credentials](#test-data-and-credentials)
- [Test scope and constraints](#test-scope-and-constraints)
- [Deviations from Cypress defaults](#deviations-from-cypress-defaults)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)

---

## Prerequisites

| Tool         | Version                   | Why                                                                                                                                                         |
| ------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**  | **24.18.0** (Active LTS)  | Pinned in `.nvmrc` and in CI. Node 20 is EOL and unsupported.                                                                                               |
| **npm**      | 11.x (ships with Node 24) | The lockfile is npm v3 format.                                                                                                                              |
| **Java JDK** | **21** (Temurin)          | **Required by Allure.** The report generator is a Java application — `npm run report:generate` fails without it. This is the hidden dependency people miss. |
| Git          | any recent                |                                                                                                                                                             |

Check all three:

```bash
node --version   # v24.18.0
npm --version    # 11.x
java -version    # openjdk 21.x
```

Java is only needed to **generate** the report. Running the tests does not require it.

---

## Quick start

From zero to a green run:

```bash
git clone https://github.com/bugalter168/telnyx-cypress-cucumber.git
cd telnyx-cypress-cucumber

npm ci                  # installs deps AND downloads the Cypress binary (~750 MB, first time only)
npx cypress verify      # should print: ✔ Verified Cypress!

npm run typecheck       # tsc --noEmit, must be silent
npm run lint            # eslint, must be silent
npm run test:ci         # headless run of all 15 scenarios
```

If `npx cypress verify` fails with `bad option: --smoke-test`, see
[Troubleshooting](#troubleshooting) — it is an environment variable, not a broken install.

---

## Running the suite

| Command                           | What it does                                                        |
| --------------------------------- | ------------------------------------------------------------------- |
| `npm run test:local`              | Headed Chrome, no retries, no video. The everyday development loop. |
| `npm run test:ci`                 | Headless Electron, 2 retries, video + screenshots. What CI runs.    |
| `npm run test:smoke`              | Only `@smoke`-tagged scenarios, headed Chrome.                      |
| `npm run open`                    | Interactive Cypress runner.                                         |
| `npm run typecheck`               | `tsc --noEmit`.                                                     |
| `npm run lint` / `lint:fix`       | ESLint.                                                             |
| `npm run format` / `format:check` | Prettier.                                                           |
| `npm run report:generate`         | Builds the Allure report, preserving trend history. **Needs Java.** |
| `npm run report:open`             | Serves the generated report locally.                                |
| `npm run clean`                   | Removes all generated artefacts (cross-platform, via `rimraf`).     |

### Running a single tag

Tags available: `@smoke`, `@regression`, `@negative`, plus per-area tags
(`@home`, `@navigation`, `@products`, `@pricing`, `@consent`, `@footer`, `@errors`).

```bash
npm run test:smoke

# or any tag expression, passed to the cucumber preprocessor:
npx cypress run --config-file cypress.ci.config.ts --env tags="@negative"
npx cypress run --config-file cypress.ci.config.ts --env tags="@regression and not @consent"
```

### Running a single feature

```bash
npx cypress run --config-file cypress.ci.config.ts --spec "cypress/e2e/features/pricing.feature"
```

---

## The two config profiles

Two separate files at the project root, **not** one file with `if (process.env.CI)` branches.
Each can be read top to bottom and understood on its own.

| Axis            | `cypress.config.ts` (local)   | `cypress.ci.config.ts` (CI)                     |
| --------------- | ----------------------------- | ----------------------------------------------- |
| Browser         | Chrome, **headed**            | Electron, **headless**                          |
| Retries         | `{ runMode: 0, openMode: 0 }` | `{ runMode: 2, openMode: 0 }`                   |
| Video           | off                           | **on**, `videoCompression: false` (see below)   |
| Screenshots     | off                           | **on failure only**                             |
| baseUrl         | fixed shared constant         | `process.env.CYPRESS_BASE_URL ?? shared`        |
| Allure metadata | `Run profile: Local`          | `Run profile: CI` + executor/environment detail |
| **Viewport**    | **1440×900**                  | **1440×900 — identical, deliberately**          |

**When to use which:** `test:local` while writing tests — you can watch the browser and a
failure is immediate rather than retried away. `test:ci` to reproduce what the pipeline does,
or to produce an Allure report locally.

**Why the viewport is deliberately NOT a difference.** telnyx.com switches its header layout at
exactly **1260 px** (read from the site's own CSS bundle). A CI-only viewport would reintroduce
the classic green-locally/red-in-CI split for a reason unrelated to the product. Both profiles
therefore pin the same 1440×900, and the constant carries a warning comment in
`config/viewports.ts`. **Do not lower it below 1260** — Cypress's own default is 1000×660, below
the breakpoint, and every desktop-navigation test would fail with a confusing "element not found".

**Why video compression is off.** Compression writes a temp file and replaces the original, which
races the Allure reporter reading the same file to attach it. On Windows that aborts the whole run
with `EBUSY: resource busy or locked`. Linux CI does not hit it, but `npm run test:ci` is
documented as the way to reproduce CI locally, so it has to work on Windows too. Videos are
uploaded as workflow artefacts either way.

**On reporters.** The mocha reporter binding is `spec` in both profiles, on purpose: a red CI log
should be readable inline. The machine-readable output is **Allure**, and only the CI profile
enriches it with environment metadata. A second reporter (e.g. `junit`) was considered and
rejected — nothing would consume the XML, and the profiles already differ on six substantive axes.

---

## Reports

### Locally

```bash
npm run test:ci          # produces allure-results/
npm run report:generate  # -> allure-report/   (requires Java 21)
npm run report:open      # serves it in a browser
```

`report:generate` copies the previous run's `history/` into the new result set before
generating, so **trend graphs survive across local runs too**, not only in CI.

### Deployed

CI publishes the report to the **`gh-pages` branch** on every push to `main`, including when
the suite fails — a report you can only see when everything passed is worth very little.

The workflow restores `history/` from the previous `gh-pages` deploy before generating, so the
trend graph accumulates run over run instead of resetting to a single point.

Generated artefacts are **never** committed to `main`. There is no `docs/` folder.

**Report URL:** https://bugalter168.github.io/telnyx-cypress-cucumber/

> After the first successful run on `main`, enable Pages in
> **Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` / `(root)`**.

---

## Project layout

```
cypress/
  e2e/features/            *.feature — Gherkin only, zero selectors
  e2e/step_definitions/    *.steps.ts — all assertions live here
  support/pages/           BasePage + page objects (the only place selectors exist)
  support/pages/components/  Header, Footer, ConsentBanner
  support/commands.ts      custom commands
  support/e2e.ts           support entry point
  support/index.d.ts       custom command type declarations
  support/types.ts         fixture interfaces
  fixtures/                test data
config/
  shared.ts                shared config object (NOT a Cypress config file)
  viewports.ts             viewport constants — import-free, safe for browser + Node
  site.ts                  baseUrl — import-free
  allure.ts                Allure environment widget + failure categories
  paths.json               single source of truth for every artefact path
cypress.config.ts          local profile   (must stay at project root)
cypress.ci.config.ts       CI profile      (must stay at project root)
scripts/allure.mjs         report generate / open / clean
test-plan/                 test plan .xlsx + full site recon notes
.github/workflows/e2e.yml  CI + Pages deploy
```

**Why both config files sit at the project root:** Cypress treats the directory containing the
config file as the project root. Moving `cypress.config.ts` into `config/` would silently make
`config/` the root and break resolution of `cypress/`, `fixtures/` and `supportFile`.

**Why `config/viewports.ts` and `config/site.ts` are separate from `config/shared.ts`:**
`shared.ts` imports the Node-side plugin APIs. Step definitions run in the **browser**, and
esbuild bundles whatever they import — a step definition importing `shared.ts` drags `node:fs`
into a browser bundle and the build fails. The constants therefore live in modules with zero
imports, and `shared.ts` re-exports them.

---

## Test data and credentials

**Test data** lives in `cypress/fixtures/`:

| File                  | Contains                                                        |
| --------------------- | --------------------------------------------------------------- |
| `site.json`           | baseUrl, expected title token, canonical URL, OG tags, 404 data |
| `navigation.json`     | the six header menu labels, the 1260 px breakpoint              |
| `footer-links.json`   | footer legal link labels and hrefs                              |
| `external-links.json` | external links and the `rel` tokens they must carry             |

Data that varies per case lives in Gherkin `Examples:` tables instead — see
`products.feature`, `pricing.feature`, `errors.feature`.

**Credentials: there are none, and none are needed.** The suite only reads public pages and
never logs in. If a credential is ever required, it goes in **`cypress.env.json`** at the
project root, which is gitignored. There is deliberately no committed example file — an
example with no keys in it is just scaffolding.

---

## Test scope and constraints

This is somebody else's live production site, so the suite is bound by hard rules:

- **Never**: account creation, form submission, payment flows, load or stress runs, high parallelism.
- **External links are asserted, never clicked** — Cypress cannot drive a second tab, and following
  them would leave the origin.
- **The 404 scenarios use `cy.visit(url, { failOnStatusCode: false })`** — without it Cypress fails
  on the non-2xx response itself and never reaches the assertions.
- Targets were chosen for stability against marketing redesigns: landmarks, navigation ARIA state,
  canonical URLs, legal pages, error pages, link attributes — not hero copy.

Test documentation lives in `test-plan/`:

| File                                                                             | Contents                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[`test-plan.docx`](test-plan/test-plan.docx)**                                 | The test plan — objectives, scope, approach, environment, tools, entry/exit criteria, risks, deliverables                                                                                                                                 |
| **[`telnyx-test-plan.xlsx`](test-plan/telnyx-test-plan.xlsx)**                   | Three sheets: **Test Cases** (the 15 cases, each mapping 1:1 to a named feature file and scenario), **Out of scope** (7 areas deliberately not automated, with reason and evidence), **Defects found** (2 defects observed on telnyx.com) |
| **[`test-plan.pdf`](test-plan/test-plan.pdf)**                                   | The test plan — objectives, scope, approach, environment, entry/exit criteria, risks and the defect log. Opens in the browser; `test-plan.docx` in the same folder is the editable source                                                 |
| **[`site-recon.md`](test-plan/site-recon.md)**                                   | The reconnaissance behind all of it — every selector, URL and timing measured rather than assumed, including where a first diagnosis turned out to be wrong                                                                               |
| The workbook is a versioned deliverable: edit it in Excel and commit the change. |

---

## Deviations from Cypress defaults

Stated explicitly, because each one is a decision rather than an accident:

1. **Specs are `.feature` files**, not `.cy.ts` — `specPattern` points at
   `cypress/e2e/features/**/*.feature`.
2. **Page objects live outside `cypress/e2e/`** so that directory holds only features and steps.
3. **Viewport is 1440×900, not 1000×660** — see [the profiles table](#the-two-config-profiles).
4. **Timeouts are raised** (`defaultCommandTimeout: 10s`, `pageLoadTimeout: 60s`) in config, never
   as per-command `{ timeout }` overrides. The 10 s figure comes from a measurement: the OneTrust
   banner takes 3.2–4.5 s to appear on a cold load.
5. **Chromium launches with `--lang=en-US`** so the localised cookie banner is reproducible.
6. **`uncaught:exception` is filtered, not silenced** — see below.
7. **`allowCypressEnv` is left at its default.** Setting it to `false` to silence a Cypress 15
   deprecation warning breaks every spec, because the cucumber preprocessor itself calls
   `Cypress.env()` in generated code.
8. **`allowScripts` in `package.json`** declares that `cypress` and `esbuild` may run install
   scripts. In npm 11.16 this is **warn-only, not a gate** — measured, not assumed. It is a
   supply-chain policy statement and keeps the install log clean; it is not load-bearing.

### Third-party error filtering

telnyx.com loads Google Tag Manager, Marketo, OneTrust, reCAPTCHA and a tracking pixel. When one
of those throws, Cypress's default is to fail the current test — a red suite for somebody else's
defect.

`cypress/support/e2e.ts` therefore suppresses uncaught exceptions **only** when the stack trace
names a known third-party script, and logs every suppression. **Anything attributable to
first-party code fails the test.** Telnyx's own bundle host is deliberately absent from the
allowlist.

---

## Troubleshooting

### `npx cypress verify` fails with `bad option: --smoke-test`

**The install is fine.** The environment variable `ELECTRON_RUN_AS_NODE=1` is set, which makes
any Electron binary run as plain Node — and Node rejects `--smoke-test` as a bad _node_ option.
It is commonly set by editor/extension host processes and inherited by terminals launched from them.

```bash
echo "$ELECTRON_RUN_AS_NODE"   # should print nothing
unset ELECTRON_RUN_AS_NODE     # then retry
```

GitHub Actions runners do not set it, so CI is unaffected.

### `No version of Cypress is installed`

The binary download was skipped. Re-run:

```bash
npx cypress install --force
```

### `npm run report:generate` fails or hangs

Allure's generator is a **Java** application. Confirm `java -version` prints 21.x.

### The Allure report is empty even though the suite passed

Check how many files landed in `allure-results/`:

```bash
ls allure-results | wc -l
```

**2 files** (`environment.properties` and `categories.json` only) means the **browser-side half
of Allure is missing**. `allureCypress()` in `setupNodeEvents` is only the Node half — it writes
those two files at startup, so the setup looks correct while no test results are ever recorded.
`cypress/support/e2e.ts` must also contain:

```ts
import 'allure-cypress';
```

A healthy full run produces roughly 30+ files. This failure is silent — the suite reports every
test green — so it is worth checking the count after any change to the reporting setup.

### `EBUSY: resource busy or locked, unlink 'cypress\videos\*.mp4'` (Windows)

A previous crashed run left `Cypress.exe` or `ffmpeg.exe` holding the file. Kill the strays and
clear the directory:

```bash
npm run clean
```

If it persists, end any lingering `Cypress` / `ffmpeg` processes in Task Manager first. This does
not occur on the Linux CI runner.

### A scenario fails on the cookie banner

The banner overlaps the footer and takes 3.2–4.5 s to appear. Every scenario that touches the
footer dismisses it first via the shared Background step. If you add a scenario, include
`And I have dismissed the cookie banner if it is shown`.

---

## Known limitations

Consciously accepted trade-offs, each with the risk stated.

1. **No form-validation coverage — and no safe way to add it.**
   A full sweep of the homepage, `/pricing`, `/products/voice-api` and `/contact-us` found exactly
   **one** natively validated field on the entire site: the Marketo contact form's `Email` input.
   That form is **reCAPTCHA-protected**, injected asynchronously by a third party, and carries
   `noValidate="true"` — so its validation is Marketo's JavaScript, not Telnyx's. Automating it
   would mean driving a captcha on someone's production site.
   _Risk: regressions in Telnyx's contact-form validation are invisible to this suite._

2. **The localised cookie banner is never exercised.**
   Both profiles pin `--lang=en-US`, so only the English OneTrust template is tested. This buys
   reproducibility — without it the banner copy and screenshots differ per machine.
   _Risk: if a non-English template broke, the suite would stay green._

3. **Opaque cross-origin script errors are suppressed.**
   A cross-origin script that throws without CORS headers produces the bare string
   `Script error.` with an **empty stack**. There is nothing to attribute it to. Because Telnyx
   serves its own bundle from a CDN origin, such an error _could_ in principle be first-party.
   _Risk: a first-party crash that produces no stack would not fail the suite. Errors that DO
   carry a stack are still held to the allowlist._

4. **Two genuinely broken external links are not asserted.**
   `shop.telnyx.com` and `trust.telnyx.com` are `target="_blank"` with **no `rel`** — logged as
   `DEF-TLNX-001`. Asserting on them would keep the suite permanently red for a defect we cannot fix.
   _Risk: further regressions of the same kind are only caught on the four known-good links._

5. **Cross-origin content is not followed.**
   `developers.telnyx.com` and `portal.telnyx.com` links are asserted, never visited — no
   `cy.origin`.
   _Risk: a broken docs or portal destination is not detected; only the `href` is checked._

6. **The site is outside our control.**
   Marketing copy, URLs and layout can change without notice, and Cloudflare could begin
   challenging CI egress IPs at any time. CI retries twice and uploads screenshots and video so a
   challenge page is immediately visible in the artefacts.

7. **The homepage has two nested `<main>` landmarks** (`DEF-TLNX-002`), so `getMainContent()`
   takes `.first()`. This is a site defect worked around, not a suite feature.
