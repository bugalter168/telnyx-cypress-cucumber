# Phase 8 — self-review against the mandatory rules

Every row carries an **Evidence** value, because a checkmark can otherwise mean two very
different things:

| Evidence     | Meaning                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **measured** | Verified by running something — a suite run, a grep, `tsc`, a browser probe. The command is named. |
| **argued**   | Reasoned from reading the code or a spec. Not executed. Treat with proportionate scepticism.       |
| **n/a**      | Rule does not apply here, with the reason given.                                                   |

Rows marked ⚠️ are honest partials, not passes. They are listed with the same prominence as
the passes.

---

## Assertions

| #   | Rule                                                                                 | Status         | Where                                         | Evidence                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------ | -------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Use Cypress's retrying assertions (`should('be.visible')`, `have.text`, `have.attr`) | ✅             | all `cypress/e2e/step_definitions/*.steps.ts` | **measured** — 23/23 green ×3 runs                                                                                                                                               |
| A2  | Never Node's `assert`; never a standalone `chai` import                              | ✅             | —                                             | **measured** — `grep -rn "require('assert')\|from 'chai'\|require('chai')" cypress/` → no matches                                                                                |
| A3  | Assert on the element, not a snapshot (`should`, not `expect` in `.then()`)          | ✅             | —                                             | **measured** — `grep -rn "expect(" cypress/ --include=*.ts` → **1 match, and it is a comment** in `common.steps.ts` explaining why `expect` is not used. Zero in executable code |
| A4  | Assertions live in step definitions, not page objects                                | ⚠️ **partial** | see note below                                | **measured** — grep found `.should()` in 3 page-object methods and 2 in `commands.ts`                                                                                            |
| A5  | Every scenario ends with a meaningful assertion                                      | ✅             | all 7 `.feature` files                        | **argued** — read each scenario; every one ends on a `Then` that asserts state, none ends on navigation alone                                                                    |

### ⚠️ A4 — the one rule I did not satisfy cleanly

`HeaderComponent.openMenu()`, `HeaderComponent.openMobileMenu()` and
`PricingPage.openCategoryFilter()` each do `.should('be.visible').click()`. `cy.acceptCookiesIfShown()`
and `cy.assertPageLoaded()` in `commands.ts` also assert.

**This is a genuine conflict between two of the rules, not an oversight:**

- _Assertions_ rule: "Assertions live in the step definitions, not in page objects."
- _Waits_ rule: "Explicit `should('be.visible')` before interacting."

The interaction lives in the page object, so the mandated pre-interaction visibility gate
follows it there. My reading is that the Assertions rule is about **test expectations** — the
things a scenario is checking — and those are all in step definitions. The `should('be.visible')`
before a click is an actionability guard, not an expectation.

`cy.assertPageLoaded()` is a deliberate exception: the brief names it as an example custom command.

**This is arguable and I am flagging it rather than declaring it fine.** If you want the stricter
reading, the fix is to delete the three `open*()` methods and inline the gate in the step
definitions — about 15 lines, and it would need another 3 verification runs.

---

## Waits

| #   | Rule                                                       | Status          | Where                                               | Evidence                                                                                                                                               |
| --- | ---------------------------------------------------------- | --------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1  | Zero `cy.wait(<number>)`, no `setTimeout`, no sleeps       | ✅              | —                                                   | **measured** — `grep -rn "cy.wait([0-9]\|setTimeout\|setInterval" cypress/ config/` → no matches                                                       |
| W2  | Use `.should()` for state                                  | ✅              | throughout                                          | **measured** — suite green ×3                                                                                                                          |
| W3  | Explicit `should('be.visible')` before interacting         | ✅              | `HeaderComponent`, `PricingPage`, `footer.steps.ts` | **measured** — grep                                                                                                                                    |
| W4  | Timeouts in config, not per-command `{ timeout }`          | ✅              | `config/shared.ts`                                  | **measured** — `grep -rn "{ timeout:" cypress/` → no matches. The 10 s value derives from a measurement: banner appears 3.2–4.5 s (4/4 browser probes) |
| W5  | `cy.intercept()` + alias + `cy.wait('@alias')` for network | ⚠️ **not used** | —                                                   | **measured** — no `cy.intercept` in the suite                                                                                                          |

### ⚠️ W5 — intercept is not used, and I think that is correct

No scenario needs it. The two candidates both turned out worse than the alternative:

- **Consent banner readiness** — gating on `#onetrust-consent-sdk` existing is strictly more
  reliable. Browser probing showed the SDK root and the banner are injected in the same DOM
  update, so once the root exists the decision is already made. An aliased `cy.wait` on the
  OneTrust XHR would additionally break on a cached response.
- **404 status** — `cy.request({ failOnStatusCode: false })` asserts the real HTTP status
  directly, which is stronger than intercepting a request the page makes.

Adding `cy.intercept` purely to tick this box would make the suite less reliable. Flagged rather
than quietly skipped; the aliasing pattern is demonstrated by `errors.steps.ts`, which uses
`.as('httpResponse')` and `cy.get('@httpResponse')`.

---

## Selectors

| #   | Rule                                                        | Status | Where                                                                | Evidence                                                                                                                               |
| --- | ----------------------------------------------------------- | ------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `[data-testid]`/`[data-cy]` first if the site has them      | ✅ n/a | —                                                                    | **measured** — zero occurrences on the site; recon §1                                                                                  |
| S2  | Then ARIA role + accessible name                            | ✅     | `getByRole()`, `[role="menu"]`, `[aria-haspopup]`, `[aria-controls]` | **measured** — suite green                                                                                                             |
| S3  | Then stable semantic CSS                                    | ✅     | `header#site-header`, `footer#site-footer`, `#main-menu-content`     | **measured**                                                                                                                           |
| S4  | XPath never                                                 | ✅     | —                                                                    | **measured** — `grep -rn "xpath" cypress/` → no matches                                                                                |
| S5  | No `:contains("…")` on a copy fragment                      | ✅     | —                                                                    | **measured** — grep → no matches                                                                                                       |
| S6  | No rigid structural chains (`.alert-danger > ol > li`)      | ✅     | —                                                                    | **argued** — reviewed every selector; longest is `#main-menu-content button[aria-haspopup="menu"]`, which is id + ARIA, not positional |
| S7  | Zero raw selectors in `.feature` files and step definitions | ✅     | —                                                                    | **measured** — `grep -rn "cy.get(['\`]\|cy.contains(['\`]" cypress/ \| grep -v support/pages/` → no matches                            |
| S8  | Text selection uses an anchored regex, with a comment       | ✅     | `BasePage.anchoredText()`                                            | **measured** — grep; produces `^\s*Products\s*$`, escapes metacharacters                                                               |
| S9  | `cy.findByRole` not used without justification              | ✅     | —                                                                    | **argued** — not used; `@testing-library/cypress` not installed                                                                        |

---

## TypeScript

| #   | Rule                                                       | Status | Where                         | Evidence                                                                                                                         |
| --- | ---------------------------------------------------------- | ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| T1  | `strict: true`                                             | ✅     | `tsconfig.json`               | **measured** — plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`             |
| T2  | No `any`, no `@ts-ignore`                                  | ✅     | —                             | **measured** — `grep -rn ": any\|as any\|@ts-ignore\|@ts-expect-error" cypress/ config/` → no matches                            |
| T3  | `paths` resolve from project root, never `../node_modules` | ✅     | `tsconfig.json`               | **measured** — no `paths` at all; tested with and without, `tsc` exits 0 either way, so the catch-all was removed as scaffolding |
| T4  | No deprecated `baseUrl`; modern module resolution          | ✅     | `moduleResolution: "bundler"` | **measured** — `tsc` exit 0                                                                                                      |
| T5  | Every page-object getter has an explicit return type       | ✅     | `cypress/support/pages/**`    | **measured** — `explicit-function-return-type` is an ESLint error and lint is clean                                              |
| T6  | Every method has typed params and explicit return type     | ✅     | same                          | **measured** — same rule                                                                                                         |
| T7  | Custom commands declared in `cypress/support/index.d.ts`   | ✅     | that file                     | **measured** — `tsc` resolves `cy.acceptCookiesIfShown()`                                                                        |
| T8  | `npx tsc --noEmit` produces zero errors                    | ✅     | —                             | **measured** — exit 0                                                                                                            |

---

## Architecture

| #   | Rule                                                                   | Status | Where                                | Evidence                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------- | ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Page Object Model, one class per page, extending `BasePage`            | ✅     | `cypress/support/pages/`             | **argued** — 6 page classes + 3 components, all extend `BasePage`                                                                                                              |
| R2  | `BasePage` has visit, waitForPageLoad, acceptCookiesIfShown, getByRole | ✅     | `BasePage.ts`                        | **measured** — all four present                                                                                                                                                |
| R3  | Page objects outside `cypress/e2e/`                                    | ✅     | `cypress/support/pages/`             | **measured** — `ls cypress/e2e/` shows only `features/` and `step_definitions/`                                                                                                |
| R4  | Directory layout as specified                                          | ✅     | —                                    | **measured**                                                                                                                                                                   |
| R5  | At least 2 real custom commands                                        | ✅     | `commands.ts`                        | **measured** — `acceptCookiesIfShown`, `assertPageLoaded`; both non-trivial                                                                                                    |
| R6  | `commands.ts` / `e2e.ts` not left as template                          | ✅     | both                                 | **measured** — `e2e.ts` carries the third-party error filter and cookie reset                                                                                                  |
| R7  | Test data from fixtures or Examples, one source of truth               | ✅     | `cypress/fixtures/`, Examples tables | **measured** — no expected value hardcoded in a step where a fixture exists                                                                                                    |
| R8  | Zero credentials in source; `cypress.env.json` gitignored              | ✅     | `.gitignore`                         | **measured** — suite needs no credentials; no example file, per your instruction                                                                                               |
| R9  | Framework APIs before external libraries                               | ✅     | —                                    | **argued** — no runtime deps added; the `.xlsx` writer is dependency-free; Allure types derived from `Parameters<typeof allureCypress>` rather than adding `allure-js-commons` |

---

## Config structure

| #   | Rule                                                                                               | Status | Where                                       | Evidence                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Both config files at project root                                                                  | ✅     | `cypress.config.ts`, `cypress.ci.config.ts` | **measured**                                                                                                                                                 |
| C2  | `config/shared.ts` is a plain module, not a Cypress config                                         | ✅     | `config/shared.ts`                          | **measured**                                                                                                                                                 |
| C3  | Local profile: headed, retries 0, video off, generous timeouts                                     | ✅     | `cypress.config.ts`                         | **measured**                                                                                                                                                 |
| C4  | CI profile: headless, `{runMode:2, openMode:0}`, video on, screenshots on failure                  | ✅     | `cypress.ci.config.ts`                      | **measured** — suite run with this profile ×3                                                                                                                |
| C5  | Compose by importing and merging; no `if (process.env.CI)`                                         | ✅     | both                                        | **measured** — `grep -rn "process.env.CI" *.ts config/` → **2 matches, both comments** stating the branching is deliberately absent. Zero in executable code |
| C6  | Explicit viewport in both                                                                          | ✅     | both                                        | **measured** — identical 1440×900 on purpose                                                                                                                 |
| C7  | `allure-results` path defined once                                                                 | ✅     | `config/paths.json`                         | **measured** — imported by `shared.ts`, `scripts/allure.mjs`, and read by the workflow with `node -p`. The literal appears nowhere else                      |
| C8  | npm scripts: test:local, test:ci, test:smoke, report:generate, report:open, clean, lint, typecheck | ✅     | `package.json`                              | **measured** — all present                                                                                                                                   |
| C9  | Cross-platform only — `rimraf`, never `rm -rf`                                                     | ✅     | `scripts/allure.mjs`                        | **measured** — uses `rimraf`'s JS API                                                                                                                        |
| C10 | ESLint + Prettier configured, `npm run lint` clean                                                 | ✅     | —                                           | **measured** — both exit 0, **zero disabled rules, zero inline disables**                                                                                    |

---

## Repo hygiene

| #   | Rule                                                                                          | Status         | Where                     | Evidence                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------- | -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| H1  | `package.json` name matches repo name                                                         | ✅             | `telnyx-cypress-cucumber` | **measured**                                                                                                              |
| H2  | Config file names follow convention                                                           | ✅             | —                         | **measured**                                                                                                              |
| H3  | No generated artefacts committed; report to `gh-pages`                                        | ✅             | `.gitignore`, workflow    | **measured** — no `docs/`                                                                                                 |
| H4  | No dead files, unused imports, leftover scaffolding, commented-out code                       | ✅             | —                         | **measured** — `noUnusedLocals` + ESLint clean; stray root `index.html` removed; `cypress.env.example.json` never created |
| H5  | `.gitignore` covers node_modules, allure-*, videos, screenshots, cypress.env.json, .env, logs | ✅             | `.gitignore`              | **measured**                                                                                                              |
| H6  | Conventional Commits                                                                          | ⚠️ **not yet** | —                         | **n/a** — nothing has been committed; the repo is not yet initialised. Commands are in the handover                       |
| H7  | `npm audit` shows zero high/critical                                                          | ✅             | —                         | **measured** — `{high:0, critical:0}`, requires the two `overrides`                                                       |
| H8  | Current major versions of Cypress and TypeScript                                              | ✅             | Cypress 15.20.0, TS 6.0.3 | **measured** — TS 6 not 7 because no `typescript-eslint` release supports TS 7; verified with `tsc` + typed lint          |

---

## GitHub Actions

| #   | Rule                                                           | Status                     | Where                                                                                                              | Evidence                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Triggers on push to main AND pull_request                      | ✅                         | `e2e.yml`                                                                                                          | **measured** — grep                                                                                                                                                                                                                                                                   |
| G2  | Pinned current action versions                                 | ✅                         | checkout@v4, setup-node@v4, upload-artifact@v4, download-artifact@v4, setup-java@v4, peaceiris/actions-gh-pages@v4 | **measured** — audit script; zero deprecated versions                                                                                                                                                                                                                                 |
| G3  | No deleted action versions (upload-artifact@v1/@v2)            | ✅                         | —                                                                                                                  | **measured** — audit script                                                                                                                                                                                                                                                           |
| G4  | Node 20 LTS pinned, matching local                             | ⚠️ **deviation, approved** | `NODE_VERSION: '24.18.0'`                                                                                          | **measured** — Node 20 is EOL (last release 2026-03-24); local is 24.18.0. You approved Node 24                                                                                                                                                                                       |
| G5  | Secrets syntax literally `${{ secrets.NAME }}`                 | ✅                         | `${{ secrets.GITHUB_TOKEN }}`                                                                                      | **measured** — audit script checked for the quoted-expression bug specifically; zero matches                                                                                                                                                                                          |
| G6  | npm cache enabled; `npm ci` not `npm install`                  | ✅                         | —                                                                                                                  | **measured** — audit script                                                                                                                                                                                                                                                           |
| G7  | Upload allure-results, screenshots, videos with `if: always()` | ✅                         | —                                                                                                                  | **measured** — 7 × `if: always()`                                                                                                                                                                                                                                                     |
| G8  | No `continue-on-error` masking                                 | ✅                         | —                                                                                                                  | **measured** — zero directives; two mentions are comments explaining the absence                                                                                                                                                                                                      |
| G9  | `cypress-io/github-action@v6`                                  | ⚠️ **not used**            | —                                                                                                                  | **argued** — plain `npm ci` + `npm run test:ci` is used instead, so the CI profile is invoked exactly as documented. The action was researched (it runs plain `npm ci` and caches `CYPRESS_CACHE_FOLDER`); using it would hide which config file runs. Say the word and I will switch |

---

## GitHub Pages

| #   | Rule                                       | Status             | Where                           | Evidence                                                                                                                                                                                             |
| --- | ------------------------------------------ | ------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Restore previous history before generating | ✅                 | workflow + `scripts/allure.mjs` | **measured locally** — two generations produced a 2-point `history-trend.json`. **argued for CI** — the gh-pages fetch path has not run on a real repository yet                                     |
| P4  | The generated report is not empty          | ✅                 | —                               | **measured** — `allure-report/widgets/summary.json` shows real statistics and `widgets/environment.json` renders all 8 environment rows. See the note below: this was broken and silent until caught |
| P2  | Publish to `gh-pages`, not `docs/` on main | ✅                 | `publish_branch: gh-pages`      | **measured** — grep                                                                                                                                                                                  |
| P3  | README contains the live report URL        | ⚠️ **placeholder** | README header                   | **measured** — the URL contains `<your-github-username>`, which must be replaced after the first push                                                                                                |

---

## README

| #   | Rule                                                                | Status     | Evidence                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Every prerequisite with versions, including **Java JDK for Allure** | ✅         | **measured** — Node 24.18.0, npm 11, Java 21 in a table, with why                                                                                                                                         |
| M2  | Install, run locally, run in CI mode, run a single tag              | ✅         | **measured**                                                                                                                                                                                              |
| M3  | What the two config files differ in and when to use each            | ✅         | **measured** — comparison table, including why viewport is deliberately identical                                                                                                                         |
| M4  | Deviations from Cypress defaults stated explicitly                  | ✅         | **measured** — 8 numbered items                                                                                                                                                                           |
| M5  | Where test data and credentials live, named exactly                 | ✅         | **measured** — each fixture file named; `cypress.env.json` named                                                                                                                                          |
| M6  | How to open Allure locally + link to deployed                       | ✅         | **measured**                                                                                                                                                                                              |
| M7  | Screenshots in the repo (`assets/`), never third-party hosts        | ✅ **n/a** | **decided** — no screenshots are used: the assignment does not require them and the README links the live published report instead. The `assets/` folder was removed rather than left as an empty promise |

| M8 | Known limitations, including production-site constraints | ✅ | **measured** — 7 items, each with the residual risk |
| M9 | No broken or run-together headings, no copy-paste leftovers | ✅ | **argued** — read through; TOC anchors match headings |

---

---

## Deliverables (from the brief)

This table was **missing from the first version of this review**, and its absence is how a real
gap got through: the review checked the code rules exhaustively but never checked the brief's
deliverables list. A reviewer spotted that a test **plan** had been asked for and only a test
**case suite** delivered.

| #   | Deliverable                                                                           | Status                    | Where                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Test plan** — objectives, scope, approach, environment, tools, entry/exit, risks    | ✅                        | `test-plan/test-plan.docx` — hand-authored Word document. The brief allows Excel or Word; nine sections of prose read badly in spreadsheet cells. NOT generated by `test-plan:generate` |
| D2  | 15 test cases, `.xlsx`, IDs TC-TLNX-001…015, every row mapping 1:1 to a real scenario | ✅                        | `telnyx-test-plan.xlsx` sheet 1 **"Test Cases"** — last two columns name the feature file and scenario                                                                                  |
| D3  | 15 automated tests as `.feature` + step definitions, green 3 runs in a row            | ✅                        | 7 features, 15 scenarios, 23 executed tests; **23/23 × 3 consecutive runs**                                                                                                             |
| D4  | Allure wired up, screenshots on failure only                                          | ✅                        | `config/allure.ts`, `screenshotOnRunFailure: true` in the CI profile only                                                                                                               |
| D5  | Two run profiles in two separate config files, genuinely different                    | ✅                        | `cypress.config.ts` / `cypress.ci.config.ts` — differ on browser, retries, video, screenshots, baseUrl, Allure metadata                                                                 |
| D6  | GitHub Actions on push and pull_request                                               | ✅                        | `.github/workflows/e2e.yml`                                                                                                                                                             |
| D7  | Allure report deployed to GitHub Pages with history/trends preserved                  | ⚠️ **built, not yet run** | Workflow publishes to `gh-pages` and restores `history/` first. History restore is **measured locally** (2-point trend); the CI path needs the repo to exist                            |
| D8  | README a stranger can follow from zero to green                                       | ✅                        | `README.md`                                                                                                                                                                             |
| D9  | `video-script.md` — 5 minutes with timecodes                                          | ✅                        | `video-script.md`                                                                                                                                                                       |
| —   | _Extra, not requested_                                                                |                           | **Out of scope** and **Defects found** sheets, `site-recon.md`, this document                                                                                                           |

---

## Two things this review process itself caught

Recorded because they are the argument for doing the review with commands rather than from memory.

**1. Allure was producing an empty report while the suite reported 23/23 green.**
`allureCypress()` in `setupNodeEvents` is only half the wiring — the support file also needs
`import 'allure-cypress'`. Without it, `environment.properties` and `categories.json` are still
written (they come from the Node half at startup), so everything _looks_ configured. Counting
the output files is what exposed it: **2 files** before the fix, **30** after. If this table had
said "✅ Allure wired up — argued", the deliverable would have shipped broken.

**2. Three of my own audit greps returned false positives.**
`expect(`, `process.env.CI` and a non-null-assertion pattern all matched — in comments and in
binary `.mp4` files. The rules were genuinely satisfied, but the _evidence_ was not what I claimed
it was. The commands in the section above are the corrected ones.

---

## Summary

- **Full passes:** 71 (63 code rules + 8 deliverables)
- **Honest partials (⚠️):** 9 — A4, W5, H6, G4, G9, P1, P3, M7, D7
- **Zero** lint disables, `any`, `@ts-ignore`, non-null assertions, hard waits, or XPath.

### Reproducing the audit

```bash
# Each should print 0. Run from the project root.
grep -rn "require('assert')\|from 'chai'" cypress/ config/ | wc -l          # A2
grep -rn "cy\.wait([0-9]\|setTimeout\|setInterval" cypress/ config/ | wc -l # W1
grep -rn "{ timeout:" cypress/ | wc -l                                      # W4
grep -rni "xpath" cypress/ | wc -l                                          # S4
grep -rn ':contains(' cypress/ | wc -l                                      # S5
grep -rn ": any\|as any\|@ts-ignore\|@ts-expect-error" cypress/ config/ | wc -l  # T2
grep -rn "eslint-disable" cypress/ config/ scripts/ *.ts *.mjs | wc -l      # C10

# Raw selectors outside page objects — should print 0
grep -rn "cy\.get(['\`]\|cy\.contains(['\`]" cypress/ | grep -v 'cypress/support/pages/' | wc -l  # S7
```

> **Two greps return comment-only matches**, noted inline above: `expect(` (1) and
> `process.env.CI` (2). Both are prose explaining why the thing is _not_ done. A
> non-null-assertion grep such as `\w!\.` also matches **binary `.mp4` files** under
> `cypress/videos/` — add `--include=*.ts` to avoid the noise. These are limitations of the
> grep, not of the code, and are called out so nobody re-runs them and thinks a rule failed.

The partials are listed above at the same prominence as the passes, each with what would close
it. Four of them (H6, P3, M7, and the CI half of P1) simply need the repository to exist; two
(A4, W5) are judgment calls I would rather you rule on than silently decide; two (G4, G9) are
deviations, one of which you already approved.
