/**
 * Generates test-plan/telnyx-test-plan.xlsx from the single source of truth below.
 *
 * Three sheets:
 *   1. "Test Cases"    - the 15 automated cases, 1:1 with the Cucumber scenarios
 *   2. "Out of scope"  - candidate areas we deliberately did NOT automate, with the reason
 *   3. "Defects found" - real defects observed on the site during recon
 *
 * The test PLAN itself is a separate Word document, test-plan/test-plan.docx, which this
 * script does not generate or touch.
 *
 * Deliberately dependency-free: an .xlsx is a ZIP of XML parts, and Node's built-in
 * `zlib` is enough to write one. That keeps the test plan reproducible without adding
 * exceljs/sheetjs to a project whose only real job is running Cypress.
 *
 * Run: npm run test-plan:generate
 */
import { deflateRawSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

const COLUMNS = [
  { header: 'ID', width: 15 },
  { header: 'Module', width: 20 },
  { header: 'Title', width: 52 },
  { header: 'Preconditions', width: 40 },
  { header: 'Steps', width: 60 },
  { header: 'Test Data', width: 42 },
  { header: 'Expected Result', width: 62 },
  { header: 'Priority', width: 10 },
  { header: 'Type', width: 20 },
  { header: 'Automated', width: 11 },
  { header: 'Feature file', width: 42 },
  { header: 'Scenario name', width: 56 },
];

/** @type {string[][]} */
const ROWS = [
  [
    'TC-TLNX-001',
    'Home',
    'Homepage loads with header, main and footer landmarks',
    'Desktop viewport 1440x900.\nCookie banner dismissed by the shared Background step.',
    '1. Open the homepage.\n2. Locate the header landmark.\n3. Locate the main landmark.\n4. Locate the footer landmark.\n5. Read the document title.',
    'baseUrl from the Cypress config (https://telnyx.com).\nExpected title token from fixtures/site.json.',
    'header#site-header is visible.\nThe first main element is visible.\nfooter#site-footer is visible.\nExactly one h1 is present and visible.\nDocument title contains "Telnyx".',
    'High',
    'Positive',
    'Yes',
    'cypress/e2e/features/home.feature',
    'Homepage exposes the primary page landmarks',
  ],
  [
    'TC-TLNX-002',
    'Navigation',
    'Desktop header exposes the six primary menu triggers',
    'Viewport width >= 1260px (the site header breakpoint). Test sets 1440x900.\nCookie banner dismissed.',
    '1. Set the desktop viewport.\n2. Open the homepage.\n3. Read every menu trigger inside #main-menu-content.\n4. Check the hamburger button.',
    'Expected trigger labels from fixtures/navigation.json:\nProducts, Solutions, Pricing, Why Telnyx, Resources, Developers.',
    'Exactly 6 button[aria-haspopup="menu"] triggers are present.\nTheir labels match the expected list in order.\nThe hamburger button[aria-controls="main-menu-content"] is NOT visible at >= 1260px.',
    'High',
    'UI / cross-viewport',
    'Yes',
    'cypress/e2e/features/navigation.feature',
    'Desktop header shows all primary menu triggers',
  ],
  [
    'TC-TLNX-003',
    'Navigation',
    'Opening a header menu updates its ARIA expanded state',
    'Desktop viewport 1440x900.\nCookie banner dismissed.',
    '1. Open the homepage.\n2. Assert the "Products" trigger is collapsed.\n3. Click the "Products" trigger.\n4. Assert the trigger is now expanded.',
    'Menu label "Products" (from the Examples-free scenario body).',
    'Before the click: aria-expanded="false" and data-state="closed".\nAfter the click: aria-expanded="true" and data-state="open".',
    'Medium',
    'Positive',
    'Yes',
    'cypress/e2e/features/navigation.feature',
    'Opening the Products menu marks the trigger as expanded',
  ],
  [
    'TC-TLNX-004',
    'Products',
    'Product landing pages load with the correct heading and canonical URL',
    'Desktop viewport 1440x900.\nCookie banner dismissed.',
    '1. Open the product page under test.\n2. Read the h1 heading.\n3. Read link[rel="canonical"].\n4. Read the browser URL.',
    'Scenario Outline Examples (4 rows):\n/products/voice-api | Voice API\n/products/sms-api | SMS API\n/products/sip-trunks | A global enterprise-grade SIP network\n/products/iot-sim-card | IoT eSIM',
    'The URL ends with the requested path.\nThe single h1 has exactly the expected heading text.\nlink[rel="canonical"] href equals https://telnyx.com + path.',
    'High',
    'Positive',
    'Yes',
    'cypress/e2e/features/products.feature',
    'Product landing page loads correctly (Scenario Outline, 4 examples)',
  ],
  [
    'TC-TLNX-005',
    'Pricing',
    'Product pricing sub-pages load with the correct heading',
    'Desktop viewport 1440x900.\nCookie banner dismissed.',
    '1. Open the pricing sub-page under test.\n2. Read the h1 heading.\n3. Read the browser URL.',
    'Scenario Outline Examples (5 rows):\n/pricing/voice-api | Voice API pricing\n/pricing/messaging | Messaging API pricing\n/pricing/elastic-sip | SIP Trunking pricing\n/pricing/numbers | Numbers pricing\n/pricing/iot-data-plans | IoT SIM Card pricing',
    'The URL ends with the requested path.\nThe single h1 has exactly the expected heading text.',
    'Medium',
    'Positive',
    'Yes',
    'cypress/e2e/features/pricing.feature',
    'Pricing sub-page loads correctly (Scenario Outline, 5 examples)',
  ],
  [
    'TC-TLNX-006',
    'Pricing',
    'Pricing hub renders and its category filter is interactive',
    'Desktop viewport 1440x900.\nCookie banner dismissed.',
    '1. Open /pricing.\n2. Assert the h1.\n3. Assert the category filter is present and collapsed.\n4. Click the category filter.\n5. Assert it is expanded.',
    'Path /pricing.\nExpected heading "Pricing".',
    'h1 has exactly the text "Pricing".\nbutton#category-filter is visible with aria-expanded="false".\nAfter the click aria-expanded="true" and data-state="open".',
    'High',
    'Positive',
    'Yes',
    'cypress/e2e/features/pricing.feature',
    'Pricing hub exposes an interactive category filter',
  ],
  [
    'TC-TLNX-007',
    'Cookie consent',
    'Cookie banner is shown and "Accept all" dismisses it',
    'Cookies cleared (Cypress default between tests).\nThis feature deliberately does NOT dismiss the banner in its Background.',
    '1. Open the homepage.\n2. Assert the OneTrust banner is visible.\n3. Assert the accept button is visible and enabled.\n4. Click the accept button.\n5. Assert the banner is gone and consent is stored.',
    'Selector #onetrust-accept-btn-handler.\nCookie names OptanonAlertBoxClosed and OptanonConsent.\nNOTE: the button LABEL is deliberately not asserted - OneTrust localises it from navigator.language ("Accept all" in en-US, "Прийняти всі файли сookie" in uk-UA). Verified live.',
    '#onetrust-banner-sdk is visible and is NOT inside an iframe.\n#onetrust-accept-btn-handler is visible.\nAfter the click #onetrust-banner-sdk is no longer visible.\nThe OptanonAlertBoxClosed cookie exists.',
    'High',
    'Positive',
    'Yes',
    'cypress/e2e/features/consent.feature',
    'Accepting all cookies dismisses the consent banner',
  ],
  [
    'TC-TLNX-008',
    'Footer',
    'Footer legal links point at the correct policy URLs',
    'Desktop viewport 1440x900.\nCookie banner dismissed (it renders bottom-left and overlaps the footer).',
    '1. Open the homepage.\n2. Scroll the footer into view.\n3. Read the href of each legal link.',
    'Expected label/href pairs from fixtures/footer-links.json:\nPrivacy Policy, Cookie Policy, Acceptable Use, Report Abuse.',
    'footer#site-footer is visible.\nPrivacy Policy -> /privacy-policy\nCookie Policy -> /cookie-policy\nAcceptable Use -> /acceptable-use-policy\nReport Abuse -> /report-abuse',
    'Medium',
    'Positive',
    'Yes',
    'cypress/e2e/features/footer.feature',
    'Footer exposes the expected legal links',
  ],
  [
    'TC-TLNX-009',
    'Footer',
    'Footer Cookie Policy link navigates to the cookie policy page',
    'Desktop viewport 1440x900.\nCookie banner dismissed, otherwise it covers the footer and blocks the click.',
    '1. Open the homepage.\n2. Scroll the footer into view.\n3. Click the "Cookie Policy" link.\n4. Assert the destination.',
    'Link label "Cookie Policy".\nExpected path /cookie-policy.',
    'The URL is https://telnyx.com/cookie-policy.\nThe h1 has exactly the text "Telnyx Cookie Policy".',
    'Medium',
    'Positive',
    'Yes',
    'cypress/e2e/features/footer.feature',
    'Cookie Policy link opens the cookie policy page',
  ],
  [
    'TC-TLNX-010',
    'Error handling',
    'Unknown URL returns HTTP 404 and the branded error page',
    'Desktop viewport 1440x900.\nNo Background navigation; the scenario opens the URL itself.',
    '1. Request the unknown path without failing on a non-2xx status.\n2. Assert the HTTP status is 404.\n3. Visit the same path with failOnStatusCode: false.\n4. Assert the error headings.',
    'Path /this-page-does-not-exist-tlnx.\nNote: /404 must NOT be used - Cloudflare answers it with 403.',
    'The HTTP status is 404.\nThe h2 has exactly the text "Error 404".\nThe h1 has exactly the text "Oops, this page doesn’t exist" (curly apostrophe U+2019).',
    'High',
    'Negative',
    'Yes',
    'cypress/e2e/features/errors.feature',
    'Unknown URL shows the branded 404 page',
  ],
  [
    'TC-TLNX-011',
    'Error handling',
    'Retired product URLs return 404 rather than a soft redirect',
    'Desktop viewport 1440x900.\nNo Background navigation.',
    '1. Request the retired path without failing on a non-2xx status.\n2. Assert the HTTP status.\n3. Visit it with failOnStatusCode: false.\n4. Assert the 404 heading.',
    'Scenario Outline Examples (2 rows):\n/wireless\n/products/elastic-sip-trunking\nBoth were verified as live 404s during recon.',
    'The HTTP status is 404 (not 200, not a 3xx to a marketing page).\nThe h2 has exactly the text "Error 404".',
    'Medium',
    'Negative',
    'Yes',
    'cypress/e2e/features/errors.feature',
    'Retired URL returns 404 (Scenario Outline, 2 examples)',
  ],
  [
    'TC-TLNX-012',
    'Cookie consent',
    'Consent banner does not reappear after it has been accepted',
    'Cookies cleared at the start of the test.\nThis feature does NOT dismiss the banner in its Background.',
    '1. Open the homepage.\n2. Accept all cookies.\n3. Navigate to /pricing.\n4. Assert the banner is not shown again.',
    'Second path /pricing.\nCookie name OptanonAlertBoxClosed.',
    'After navigating, #onetrust-banner-sdk is not visible on the new page.\nThe OptanonAlertBoxClosed cookie is still present.',
    'Medium',
    'Negative',
    'Yes',
    'cypress/e2e/features/consent.feature',
    'Consent banner stays dismissed on the next page',
  ],
  [
    'TC-TLNX-013',
    'Security / external links',
    'External links declare target=_blank with a safe rel and are never clicked',
    'Desktop viewport 1440x900.\nCookie banner dismissed.',
    '1. Open the homepage.\n2. Read the header portal link attributes.\n3. Read the three footer social link attributes.\n4. Assert - never click, Cypress cannot drive a second tab.',
    'Expected links from fixtures/external-links.json:\nhttps://portal.telnyx.com (header)\nhttps://www.linkedin.com/company/telnyx\nhttps://x.com/telnyx\nhttps://www.facebook.com/Telnyx/',
    'Each link has target="_blank".\nEach rel attribute contains both "noopener" and "noreferrer".\nEach href matches exactly.\nNo external link is clicked at any point.',
    'High',
    'Negative',
    'Yes',
    'cypress/e2e/features/footer.feature',
    'External links are marked target blank with a safe rel',
  ],
  [
    'TC-TLNX-014',
    'Responsive',
    'Mobile viewport collapses the header into a working hamburger menu',
    'Mobile viewport 390x844, i.e. below the site header breakpoint of 1260px.\nCookie banner dismissed.',
    '1. Set the mobile viewport.\n2. Open the homepage.\n3. Assert the hamburger is visible and collapsed.\n4. Click the hamburger.\n5. Assert the menu reports itself as open.',
    'Viewport 390x844 from config/shared.ts.\nBreakpoint 1260px was read from the site CSS bundle.',
    'button[aria-controls="main-menu-content"] is visible with aria-expanded="false".\nAfter the click aria-expanded="true".\n#main-menu-content becomes visible.',
    'High',
    'UI / cross-viewport',
    'Yes',
    'cypress/e2e/features/navigation.feature',
    'Mobile header opens the collapsed menu',
  ],
  [
    'TC-TLNX-015',
    'SEO / metadata',
    'Homepage exposes title, meta description, canonical and Open Graph tags',
    'Desktop viewport 1440x900.\nCookie banner dismissed.',
    '1. Open the homepage.\n2. Read the document title.\n3. Read meta[name="description"].\n4. Read link[rel="canonical"].\n5. Read the Open Graph tags.',
    'Expected values from fixtures/site.json.\nThe meta description copy is marketing-owned, so only its presence and a minimum length are asserted.',
    'Document title contains "Telnyx".\nmeta[name="description"] exists with non-empty content of at least 50 characters.\nlink[rel="canonical"] href is https://telnyx.com.\nog:site_name is "Telnyx", og:type is "website", og:url is https://telnyx.com.',
    'Medium',
    'Positive',
    'Yes',
    'cypress/e2e/features/home.feature',
    'Homepage exposes correct SEO metadata',
  ],
];

// ---------------------------------------------------------------------------
// Sheet 2 — Out of scope
// ---------------------------------------------------------------------------

const OOS_COLUMNS = [
  { header: 'ID', width: 16 },
  { header: 'Candidate area', width: 34 },
  { header: 'Why it is NOT automated', width: 72 },
  { header: 'Evidence', width: 68 },
  { header: 'Replaced by', width: 46 },
];

const OOS_ROWS = [
  [
    'OOS-TLNX-001',
    'Contact form validation\n(/contact-us)',
    'The form is injected client-side by Marketo and the page is protected by reCAPTCHA.\nDriving a reCAPTCHA-guarded form on a third party\'s production site is exactly the bot behaviour the brief forbids, and a third-party async form is a permanent flake source.\nThe form also carries noValidate="true", so any "validation" we exercised would be Marketo\'s JavaScript, not Telnyx\'s.',
    'Server HTML contains an EMPTY <form id="mktoForm_1987"> plus a loading spinner.\nPage copy: "This site is protected by reCAPTCHA".\nLoader: munchkin.marketo.net.\nConfirmed live in Chrome after a 6s wait: form.noValidate === true.',
    'TC-TLNX-006 (pricing category filter: real client-side control, aria-expanded, no submit)\nTC-TLNX-003 (header menu aria-expanded)',
  ],
  [
    'OOS-TLNX-002',
    'Sign-up / account creation\n(/sign-up)',
    'Account creation is explicitly forbidden by the brief. Beyond that the page is not testable: it ships zero form controls server-side.',
    'Server HTML for /sign-up contains 0 <input>, 0 <form> and no <h1>. It is a fully client-side app that talks to the Telnyx portal.',
    'Not required - no safe equivalent exists, and none is needed.',
  ],
  [
    'OOS-TLNX-003',
    'Docs search\n(developers.telnyx.com)',
    'Separate origin, so it would need cy.origin. The page is ~1.3 MB, has no <h1>, and search is a client-side command palette with no server-rendered input. High flake for very low value.',
    'https://developers.telnyx.com/ returns 308 -> /docs/overview (Vercel, not Cloudflare).\nDownloaded page: 1,305,882 bytes, zero server-rendered search inputs.',
    'TC-TLNX-013 (verifies cross-origin link correctness without leaving the origin)',
  ],
  [
    'OOS-TLNX-004',
    'Homepage AI chat input',
    "Submitting it posts to Telnyx's live inference service. That is a real, billable transaction on someone else's production system. Not touched.",
    'input[aria-label="Type message here"] inside a form on the homepage. No required/pattern attributes - nothing to validate client-side anyway.',
    'Not required.',
  ],
  [
    'OOS-TLNX-005',
    'ANY client-side form validation\n(coverage gap - see note)',
    'GAP, STATED DELIBERATELY: after dropping the above, the suite has NO form-validation coverage, because the site offers no safe target.\nA full sweep of the homepage, /pricing, /products/voice-api and /contact-us found exactly ONE natively-validated field in the whole site, and it is the Marketo Email field behind reCAPTCHA (see OOS-TLNX-001).\nEvery other input on the site has no required, no pattern, no type=email and no minlength.',
    'Live DOM sweep in Chrome (6s settle per page):\n/ -> 1 form, 1 input, 0 validated fields\n/pricing -> 0 forms, 0 inputs\n/products/voice-api -> 0 forms, 0 inputs\n/contact-us -> 1 form (Marketo), 1 validated field: input#Email [required][pattern][type=email], on a form with noValidate=true',
    'Nothing. This is reported as a known limitation in the README rather than papered over with a flaky test.',
  ],
  [
    'OOS-TLNX-006',
    'Cookie banner copy assertions',
    'The banner text is localised from navigator.language, so any text assertion passes on one machine and fails on another. We assert structure and behaviour instead.',
    'Same page, two Chrome launches:\ndefault locale -> "Прийняти всі файли сookie"\n--lang=en-US -> "Accept all"\nOneTrust fetched the /uk template despite <html lang="en">.',
    'TC-TLNX-007 asserts the element, the click outcome and the cookie - never the copy. Both configs pin --lang=en-US for reproducibility.',
  ],
  [
    'OOS-TLNX-007',
    'shop.telnyx.com / trust.telnyx.com link security',
    'These two footer links genuinely fail the target=_blank + rel safety rule. Asserting on them would make the suite permanently red for a defect we cannot fix.\nLogged on the "Defects found" sheet instead.',
    'Confirmed in static HTML and again in the live DOM: both have target="_blank" and rel === null.',
    'DEF-TLNX-001 on the "Defects found" sheet.\nTC-TLNX-013 covers the four links that ARE correct.',
  ],
];

// ---------------------------------------------------------------------------
// Sheet 3 — Defects found
// ---------------------------------------------------------------------------

const DEF_COLUMNS = [
  { header: 'ID', width: 16 },
  { header: 'Severity', width: 12 },
  { header: 'Area', width: 24 },
  { header: 'Summary', width: 50 },
  { header: 'Steps to reproduce', width: 56 },
  { header: 'Expected', width: 50 },
  { header: 'Actual', width: 50 },
  { header: 'Evidence', width: 56 },
  { header: 'Status', width: 26 },
];

const DEF_ROWS = [
  [
    'DEF-TLNX-001',
    'Medium',
    'Footer / link security',
    'Two footer links open in a new tab with no rel attribute, exposing the site to reverse tabnabbing and leaking the referrer.',
    '1. Open https://telnyx.com/ in Chrome.\n2. Scroll to the footer.\n3. Inspect the "Shop" link and the "Trust Center" link.\n4. Read their target and rel attributes.',
    'Any anchor with target="_blank" carries rel="noopener noreferrer", matching the 4 other external links on the same page (LinkedIn, X, Facebook, portal).',
    'href="https://shop.telnyx.com/"  target="_blank"  rel=null\nhref="https://trust.telnyx.com"  target="_blank"  rel=null',
    'Confirmed twice: (a) raw server HTML, (b) live DOM read in headless Chrome 151.\nContrast: #site-footer a[href*="linkedin"] correctly has rel="noopener noreferrer".',
    'Reported, NOT automated on purpose - see OOS-TLNX-007. Automating it would keep the suite red for a third-party defect.',
  ],
  [
    'DEF-TLNX-002',
    'Low',
    'Homepage / accessibility',
    'The homepage nests a <main> landmark inside another <main>. HTML allows only one main landmark per document, and it must not be nested.',
    '1. Open https://telnyx.com/.\n2. Run document.querySelectorAll("main").length in the console.\n3. Inspect the nesting of the two elements.',
    'Exactly one <main> landmark per document (WHATWG HTML; ARIA landmark guidance).',
    'Two <main> elements, the second nested inside the first.\nOffsets in the server HTML: open@30230, open@32991, close@138880, close@138922.',
    'Live DOM: document.querySelectorAll("main").length === 2 on / (=== 1 on all 8 other pages sampled).',
    'Reported. Worked around in TC-TLNX-001, which asserts the FIRST main only.',
  ],
];

// ---------------------------------------------------------------------------
// Minimal XLSX (SpreadsheetML) writer
// ---------------------------------------------------------------------------

const xmlEscape = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const colName = (i) => {
  let n = i + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

/** style 1 = header, style 2 = body (wrapped, top-aligned) */
const cell = (ref, value, styleIdx) =>
  `<c r="${ref}" t="inlineStr" s="${styleIdx}"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;

/**
 * Build one worksheet XML part.
 *
 * Excel cannot auto-fit a wrapped cell without opening the file, so row height is fixed
 * per sheet and set generously enough for the longest cell.
 */
function buildSheet(columns, rows, { rowHeight, first }) {
  const last = colName(columns.length - 1);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"${first ? ' tabSelected="1"' : ''}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`).join('')}</cols>
<sheetData>
<row r="1" ht="30" customHeight="1">${columns.map((c, i) => cell(`${colName(i)}1`, c.header, 1)).join('')}</row>
${rows
  .map(
    (row, r) =>
      `<row r="${r + 2}" ht="${rowHeight}" customHeight="1">${row
        .map((v, i) => cell(`${colName(i)}${r + 2}`, v, 2))
        .join('')}</row>`,
  )
  .join('\n')}
</sheetData>
<autoFilter ref="A1:${last}${rows.length + 1}"/>
</worksheet>`;
}

const SHEETS = [
  { name: 'Test Cases', xml: buildSheet(COLUMNS, ROWS, { rowHeight: 150, first: true }) },
  {
    name: 'Out of scope',
    xml: buildSheet(OOS_COLUMNS, OOS_ROWS, { rowHeight: 170, first: false }),
  },
  {
    name: 'Defects found',
    xml: buildSheet(DEF_COLUMNS, DEF_ROWS, { rowHeight: 150, first: false }),
  },
];

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
</styleSheet>`;

const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${SHEETS.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`;

const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${SHEETS.map(
  (_s, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
).join('\n')}
<Relationship Id="rId${SHEETS.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${SHEETS.map(
  (_s, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
).join('\n')}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

// ---------------------------------------------------------------------------
// Minimal ZIP writer (deflate + CRC32)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0 ^ -1;
  for (const byte of buf) c = (c >>> 8) ^ CRC_TABLE[(c ^ byte) & 0xff];
  return (c ^ -1) >>> 0;
};

/** @param {{name: string, data: string}[]} files */
function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  // Fixed DOS timestamp keeps the output byte-identical between runs.
  const dosTime = 0; // 00:00:00
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1; // 2026-01-01

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const raw = Buffer.from(file.data, 'utf8');
    const deflated = deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBuf, deflated);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(dosTime, 12);
    cd.writeUInt16LE(dosDate, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(deflated.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra len
    cd.writeUInt16LE(0, 32); // comment len
    cd.writeUInt16LE(0, 34); // disk start
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE(0, 38); // external attrs
    cd.writeUInt32LE(offset, 42);

    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + deflated.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuf, eocd]);
}

const out = join(HERE, 'telnyx-test-plan.xlsx');
writeFileSync(
  out,
  zip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
    { name: 'xl/styles.xml', data: stylesXml },
    ...SHEETS.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml })),
  ]),
);

console.log(`Wrote ${out}`);
console.log(`  Sheet 1 "Test Cases"    ${ROWS.length} cases x ${COLUMNS.length} columns`);
console.log(`  Sheet 2 "Out of scope"  ${OOS_ROWS.length} entries`);
console.log(`  Sheet 3 "Defects found" ${DEF_ROWS.length} defects`);
