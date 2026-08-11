# 5-minute walkthrough — video script

**Target length:** 5:00
**Recording setup:** 1920×1080, editor at ~14pt so code is legible at 1080p.
Have these open in tabs before you start, in this order:

1. `test-plan/test-plan.docx` (the plan) and `test-plan/telnyx-test-plan.xlsx` (the cases)
2. VS Code at the project root
3. A terminal, cleared, at the project root
4. A browser on the deployed Allure report
5. The GitHub Actions run summary

> **Tone note.** The strongest material in this project is not "the tests pass" — it is the
> handful of places where a plausible assumption was measured and turned out to be wrong.
> Two of those are scripted below (2:05 and 3:05). Do not cut them for time; cut the
> project-structure tour instead.

---

## 0:00 – 0:25 — What this is

**On screen:** `README.md` header, scrolled to the top.

> "This is a UI automation suite for telnyx.com — Cypress, Cucumber and TypeScript, reported
> with Allure and running in GitHub Actions. Fifteen scenarios.
>
> One thing shapes every decision in it: telnyx.com is **not my site**. It is somebody else's
> live production system. So the whole suite is read-only — no sign-ups, no form submissions,
> no load testing — and I can't add a single `data-testid` to make my life easier."

---

## 0:25 – 1:05 — The test plan

**On screen:** `test-plan.docx`, scrolled to the objectives and then the exit criteria.

> "The plan is a Word document — objectives, scope, approach, environment, entry and exit
> criteria, risks. The bit I'd point at is the exit criteria: 'twenty-three of twenty-three green
> on **three consecutive runs**'. One green run doesn't tell you whether a suite is stable or
> just lucky."

**Switch to the `.xlsx`, on the Test Cases sheet.**

> "The cases are a separate workbook. Fifteen of them, each mapping one-to-one to a real Cucumber
> scenario — the last two columns name the feature file and the scenario, so you can jump straight
> from a row to the code. Nine positive, four negative, two cross-viewport."

**Click the Out of scope tab, then Defects found.**

> "These two sheets are the ones I'd actually read first as a reviewer. **Out of scope** lists
> everything I deliberately did _not_ automate, with the evidence. **Defects found** lists two
> real bugs I hit on Telnyx's site while investigating.
>
> A reviewer should never have to wonder whether something was a decision or an oversight."

**Linger on the Out of scope sheet, row OOS-TLNX-001.**

> "The biggest one: there is no form-validation coverage in this suite, and there can't be.
> I swept four pages in a real browser. The only natively-validated field on the entire site
> is the contact form's email input — and that form is reCAPTCHA-protected, injected by
> Marketo, and carries `noValidate`, so its validation is Marketo's JavaScript, not Telnyx's.
> Automating it would mean driving a captcha on someone's production site. So I wrote down
> why instead."

---

## 1:05 – 2:05 — The code

**On screen:** split view — `cypress/e2e/features/navigation.feature` beside
`cypress/e2e/step_definitions/navigation.steps.ts`.

> "The feature file is plain Gherkin. Zero selectors, zero implementation."

**Scroll to the mobile scenario.**

> "Every assertion lives in the step definitions, and every one is a retrying Cypress
> assertion — `.should()`. There is not a single `expect()` inside a `.then()`, because
> `expect` doesn't retry, and that's the whole point of it."

**Open `cypress/support/pages/components/HeaderComponent.ts`.**

> "Selectors exist in exactly one place: page objects. And on this site that's genuinely hard —
> there are no test IDs at all, the Radix ids are regenerated every build, and the CSS module
> classes are hashed. So these selectors are ARIA state and stable ids."

**Highlight the comment block at the top.**

> "This comment is doing real work. The site's only `<nav>` element is hidden — it's an
> SEO-only link list — so the textbook `cy.get('[role="navigation"]')` matches nothing here.
> And 'Pricing' in the header is a `<button>`, not a link. Both of those were in my original
> plan, and both were wrong until I checked."

**Then `grep` in the terminal:**

```bash
grep -rn "cy.wait([0-9]" cypress/    # no output
```

> "No hard waits anywhere — element state comes from retrying assertions, and the one place I
> need a real HTTP status I use `cy.request` and alias it, rather than intercepting a request
> the page happens to make.
>
> And no, there's no `cy.intercept` in this suite. I looked at both places it could go and the
> alternative was better each time — so I wrote down why rather than adding it to tick a box."

---

## 2:05 – 2:50 — 🔑 The measurement that changed the code

**On screen:** `cypress/support/commands.ts`, on `acceptCookiesIfShown`.

> "This command runs before nearly every scenario, so I measured it rather than guessing.
>
> Three things came out of that, and each one changed the code.
>
> **One:** the cookie banner takes three to four and a half seconds to appear on a cold load.
> That's where the ten-second command timeout comes from — a real number with about 2× headroom,
> not a round number I liked the look of.
>
> **Two:** after you accept, the banner element **is still in the DOM**. It's hidden with
> `display: none`. So asserting `not.exist` would fail — it has to be `not.be.visible`. On a
> page loaded with consent already stored, though, the element is never created at all, so
> _there_ `not.exist` is correct. Two different assertions for two genuinely different states."

**Show both step definitions in `consent.steps.ts` side by side.**

> "**Three:** the banner's text is localised from the browser's language. On my machine it
> says 'Прийняти всі файли сookie'. On a US CI runner it says 'Accept all'. So the suite never
> asserts on that text at all — it asserts on the element, the click, and the stored cookie."

---

## 2:50 – 3:35 — 🔑 The diagnosis that was wrong

**On screen:** terminal, then `test-plan/site-recon.md` §11.

> "One more, because I think how you handle being wrong matters more than being right first time.
>
> During setup, npm warned that Cypress's install script wasn't covered by its `allowScripts`
> policy. Cypress's install script is what downloads the browser binary. So I concluded: this
> is a latent CI failure — it works locally because the binary's already cached, but CI has an
> empty cache and the first pipeline run will die.
>
> That was a completely plausible diagnosis. It was also wrong, and I'd written it into the
> docs as fact."

**Show the correction block in `site-recon.md`.**

> "So I ran the experiment: renamed the cache away, deleted `node_modules`, and ran `npm ci`
> twice — once with the policy, once without.
>
> Both downloaded the full 750 megabytes. Both passed `cypress verify`. In npm 11.16 it's a
> **warning, not a gate**. The only difference is the warning text.
>
> I kept the setting, because it's a reasonable supply-chain statement, but I rewrote the
> documentation to say what it actually does — and left the wrong version visible with a
> correction note, because the wrong version is what I'd acted on."

---

## 3:35 – 4:05 — Running it

**On screen:** terminal.

```bash
npm run test:ci
```

**Let it run; cut to the finished summary table (7 specs, 23 tests green).**

> "Two config profiles, two separate files — no `if (process.env.CI)` branching. They differ on
> browser, retries, video, screenshots and baseUrl.
>
> They deliberately do **not** differ on viewport. The site switches its header layout at
> exactly 1260 pixels, and Cypress's default viewport is 1000 — below that. A CI-only viewport
> would give you green locally and red in CI for a reason that has nothing to do with the
> product. So both are pinned to 1440 by 900, with a warning comment so nobody tidies it away."

---

## 4:05 – 4:35 — CI and the report

**On screen:** the GitHub Actions run summary, then the deployed Allure report.

> "The workflow runs on push to main **and** on pull requests — catching a regression after
> merge is too late. It pins Node 24, uses `npm ci`, and uploads results, screenshots and video
> with `if: always()`, so a red run still gives you the evidence. Nothing is masked with
> `continue-on-error`."

**Switch to the Allure report. Click the Trend graph, then Categories, then Environment.**

> "The report deploys to the `gh-pages` branch — never to a `docs/` folder on main.
>
> The trend graph works because the workflow restores the previous run's history before
> generating. Without that step you get a single point every time and the graph is decoration.
>
> Categories bucket failures for triage — is it the network, a third-party script, or a real
> content change? And the Environment widget records the target, the browser and the viewport,
> plus the breakpoint the viewport has to stay above."

---

## 4:35 – 5:00 — Honest close

**On screen:** README → Known limitations.

> "Last thing, and it's the section I'd read first if I were reviewing this: known limitations.
>
> No form-validation coverage, because the site offers no safe target. The localised cookie
> banner is never exercised, because I pin the locale for reproducibility — that's a real gap,
> not a free win. Opaque cross-origin errors get suppressed because they arrive with no stack
> to attribute them to. And two genuinely broken external links on Telnyx's site are reported
> as defects rather than asserted on, because the suite would then be permanently red for
> something I can't fix.
>
> Every one of those is a trade I made on purpose, with the risk written down next to it.
> That's the part I'd want a reviewer to push on."

---

## Timing cheat-sheet

| Time     | Section                     | Must-hit                                                                |
| -------- | --------------------------- | ----------------------------------------------------------------------- |
| 0:00     | What this is                | "not my site" — read-only constraint                                    |
| 0:25     | Test plan                   | the .docx exit criteria; all three xlsx sheets; the form-validation gap |
| 1:05     | Code                        | no selectors in features; no `cy.wait(n)`; hidden `<nav>`               |
| **2:05** | **Consent measurement**     | 3–4.5 s → 10 s timeout; `not.be.visible` vs `not.exist`; localised text |
| **2:50** | **allowScripts correction** | plausible diagnosis → experiment → wrong → corrected in place           |
| 3:35     | Running                     | two profiles; identical viewport and why                                |
| 4:05     | CI + Allure                 | PR trigger; `if: always()`; history restore; gh-pages                   |
| 4:35     | Limitations                 | name at least three, with the risk                                      |

**If you run long, cut:** the project-structure tour and the second half of the CI section.
**Never cut:** 2:05–3:35. Those two segments are the difference between "wrote some tests" and
"engineered a suite against a system I don't control."
