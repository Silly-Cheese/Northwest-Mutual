# Northwest Mutual RP

A small, fictional medical insurance roleplay system, separate from Sterling Mutual.

## Architecture

- WEBSITE: GitHub Pages ONLY. Static files are under docs/ and GitHub serves main /docs.
- SIGN-IN: Firebase Authentication with email + password. No Google sign-in and no mandatory email verification.
- DATA: Firestore for accounts, plans, policies, claims, roles.
- SECURITY: Firestore Security Rules enforce claims ownership, provider access, staff operations and owner plan controls.
- OWNER BOOTSTRAP: a one-time **local** Admin SDK script, not a deployed Firebase Function.
- NO Firebase Hosting and NO Firebase Functions. No real financial transactions.

## All three generations

Generation 1 — customer signup, email/password login, profile, plan requests, policy approvals, owner bootstrap.

Generation 2 — create/edit/retire insurance plans, Staff Center, provider role, claim decisions, fictional payments.

**Generation 3 — invoice-linked claims, printable member insurance cards, reports, and responsive layout.**

### New mandatory invoice number

Every **NEW claim** requires the **Invoice #** from a fictional medical bill. This applies to both customer and provider submissions. The field is mandatory on the form and **required by Firestore security rules**, so a client cannot bypass the UI to create an invoice-less claim.

- Typical format: NMC-2026-0042 (letters, digits, periods, slashes, dashes and internal spaces, 1-64 characters).
- Invoice # is displayed in the claim history, staff review queue, payout queue, and report exports.
- Claims made prior to Generation 3 continue to display; they show **Older claim — not recorded** where an invoice number is missing. No data is deleted or rewritten.
- Invoice number links records manually; it does **NOT** automatically sync with Northstar Medical Center / Doctor-RP. Direct integration would require a separately authorized bridge, not Firebase Functions.

### Insurance card

After staff activate coverage, customers open **Insurance Card** from the navigation. It shows the member's RP name, plan, Member ID, fictional coverage percentage and deductible. Use **Print / Save as PDF** with the browser's print dialog. The card is conspicuously marked **FICTIONAL / NOT REAL INSURANCE**. It is not an actual insurance ID.

### Staff reports

Owner and staff can open **Reports** to view:

- Claim count, total submitted fictional bills, approved totals, recorded fictional payouts and approved unpaid amount.
- Active policy counts and estimated monthly RP plan premiums (NOT actual revenue or collections).
- Active member distribution by insurance plan.
- Filter by claim status; search invoice number, facility, Member ID; export the filtered claim data to CSV.

All amounts are **roleplay only** and not real money.

## GitHub Pages (website hosting only)

1. Open https://github.com/Silly-Cheese/Northwest-Mutual/settings/pages
2. Choose **Deploy from a branch**, then **main** and **/docs**, and Save.
3. After GitHub shows a successful Pages deployment, visit:
   https://silly-cheese.github.io/Northwest-Mutual/

No build step or Firebase Hosting deployment is required. Each push to main publishes the updated static app through GitHub Pages.

## Deploy the updated Firestore security rules (REQUIRED for invoice #)

In PowerShell from your Northwest-Mutual repository folder:

~~~powershell
cd "$HOME\Northwest-Mutual"
git pull
firebase.cmd use northwest-mutual-59cca
firebase.cmd deploy --only "firestore:rules"
~~~

This command deploys **Firestore rules only**. It does not deploy Firebase Hosting or Functions. Run it after pulling Generation 3 so the new claim validation takes effect.

If you haven't yet configured Firebase:
- Firebase Console > Authentication > Sign-in method: Enable **Email/Password**. Leave Google provider off.
- Firebase Console > Authentication > Settings > Authorized domains: add **silly-cheese.github.io** if needed.
- Create a Firestore database.

## One-time owner bootstrap

No need to repeat this if your owner account is already set up.

Use the existing local script from a PowerShell terminal in the repository:

~~~powershell
npm.cmd install
npm.cmd run bootstrap:owner -- --email="YOUR_OWNER_EMAIL" --key="C:\path\to\PRIVATE-service-account.json"
~~~

Keep the private service-account JSON **outside** GitHub and the public docs folder. If the account is already registered as a customer, the bootstrap requires explicit confirmation of its Firebase Auth UID to prevent owner impersonation when verification is disabled.

## RP workflow

1. Owner signs in; uses **Manage Plans** to create or update medical coverage.
2. Customer creates an email/password account and requests a plan.
3. Staff activates their policy.
4. Customer submits a medical claim **with a required Invoice #**. Alternatively an authorized provider submits a claim with the patient's Member ID and the invoice number.
5. Staff reviews, approves/partially approves/denies, and optionally records simulated payout.
6. Customer checks claim status and prints the fictional insurance card; staff uses **Reports** to review activity.

This is a ROLEPLAY service. Use **fictional information** only. Do not submit real patient health records, identity documents, or real insurance claims.


## Navigation refresh

The GitHub Pages site now uses a **responsive application navigation**:

- Desktop: dark, grouped sidebar with active-page styling, pending claim count for staff, collapse/expand, coverage indicator, and quick access to the signed-in account.
- Tablet and mobile: slide-out menu with backdrop and Escape-to-close; the most-used insurance pages are also accessible from a four-item bottom navigation on phones.
- Owner administration and staff operations appear only for the appropriate account roles. Firestore rules still enforce all actual access rights.
- Staff and owner options include Staff Center and Reports; owners additionally see Manage plans and Owner Desk.
- The sidebar collapse preference is stored locally in the browser, not in Firebase.

No Firebase Hosting, Firebase Functions, rules changes, or additional dependencies are required for this navigation update. GitHub Pages publishes it from main/docs.


## Claim submission fixes (November 8, 2026)

- Corrected a browser HTML invoice input pattern that was rejected by the newer JavaScript /v regular expression parser. Invoice # is still required, and JavaScript plus Firestore rules validate it.
- Every provider claim now verifies the **specific patient-supplied Member ID** against an active policy before writing. The provider sees clear errors for an unknown ID, a pending/suspended policy, or missing access.
- Firestore rules allow an approved Medical Provider to **get one policy by its Member ID** for coverage verification. They still cannot list/browse policies or customer profiles.
- Added a relative SVG favicon to reduce missing-icon 404 requests on GitHub Pages. If another 404 appears, inspect its failed URL under DevTools > Network; a 404 may refer to a different asset.
- Existing claims and existing account records remain untouched.

**The updated Firestore rules are REQUIRED.** Pull the repo and redeploy Firestore **rules only**:

~~~powershell
cd "$HOME\Northwest-Mutual"
git pull
firebase.cmd use northwest-mutual-59cca
firebase.cmd deploy --only "firestore:rules"
~~~

If a medical provider still receives "Missing or insufficient permissions":

1. Confirm their email/password account exists, and the owner has assigned **Medical Provider** under Staff Center.
2. Sign out and sign in again or use My Account > Refresh access.
3. Confirm the patient's **Member ID** is correct and the patient's **policy is ACTIVE**. The provider portal checks this before submission.
4. Confirm the Firestore rules deployment succeeded. Hosting is **GitHub Pages only**. No Firebase Functions or Firebase Hosting is needed.

Do not put patient data or real medical insurance details into this fictional RP portal.
