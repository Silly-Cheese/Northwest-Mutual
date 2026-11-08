# Northwest Mutual RP

A lightweight, fictional medical-only insurance roleplay portal, separate from Sterling Mutual.

## Hosting / architecture

- Website hosted ONLY on GitHub Pages, directly from main/docs.
- Firebase Authentication uses email/password only. No Google sign-in. No required email verification.
- Cloud Firestore stores customer profiles, plans, policies, claims, and staff roles.
- Firestore Security Rules enforce staff, owner, and provider access.
- Owner bootstrap runs from a trusted script LOCALLY; it is not a Firebase Function.
- NO Firebase Hosting and NO Firebase Functions.

## Generation 2 features

- Owner can create, edit, activate and retire medical insurance plans.
- Customer accounts automatically get profiles. Customers request a plan; staff can approve or suspend coverage.
- Customers with active coverage submit fictional medical claims.
- Approved provider accounts can submit claims using a member ID supplied by the patient.
- Staff review claims, approve fully or partially, deny claims, add decision notes, and record fictional payouts.
- Owner has a Staff Center role manager, where existing registered accounts can become staff or providers.
- Customers and providers can see their own claim history. Staff see the shared review queue.
- All data is for RP only. Do not enter real patient or insurance data.

## GitHub Pages activation

Go to https://github.com/Silly-Cheese/Northwest-Mutual/settings/pages

Choose Deploy from a branch > main > /docs > Save.

When publishing succeeds, open https://silly-cheese.github.io/Northwest-Mutual/

## Required Firestore security rules deployment

In Firebase Console, enable Authentication > Email/Password. Leave Google disabled.
Under Authentication > Settings > Authorized domains, add silly-cheese.github.io if it is missing.
Create a Firestore database if needed.

Open PowerShell in your local Northwest-Mutual checkout (NOT in Windows System32):

    cd "$HOME\Northwest-Mutual"
    git pull
    npm.cmd install
    firebase.cmd login
    firebase.cmd use northwest-mutual-59cca
    firebase.cmd deploy --only "firestore:rules"

No Hosting or Functions deploy commands are needed. The Firebase CLI is used ONLY to deploy Firestore security rules. The repository firebase.json configures Firestore only.

## One-time owner bootstrap

You can continue using the existing local bootstrap if already done.

Keep the service-account key OUTSIDE your repository. To bootstrap an owner for the first time:

    npm.cmd run bootstrap:owner -- --email="OWNER_EMAIL" --key="C:\path\to\service-account.json"

If no account exists, the script creates an email/password owner account and prints a temporary password. If a regular account already exists with that email, it requires an explicitly confirmed Firebase Authentication UID to avoid privilege escalation based on an unverified email. Use the Account > Refresh access button after bootstrap.

## First use after deploying rules

1. Owner signs in and selects Manage Plans. If none exist, click Create 3 starter plans. You can edit them, retire them, and create new plans later.
2. Customers sign up with email/password, choose a plan, and wait for staff approval.
3. To add staff, have the person sign up normally, then use Staff Center > Staff & provider accounts to set their role to Staff.
4. To add a medical provider, assign their role to Medical Provider instead. Ask them to sign out and back in or use Refresh access.
5. Customers find their fictional Member ID in My Account. They can share it with an approved provider to submit a claim on their behalf.
6. Staff review claims in Staff Center, choose approved/partially approved/denied, and optionally record a simulated payout.

SECURITY: Because email verification is not required, confirm people's identities independently before promoting anyone to Staff or Medical Provider. These roles are securely assigned by the owner, never by self-registration.

## Three generations

Generation 1: medical coverage foundation, accounts, owner bootstrap.
Generation 2: plans, staff/provider roles, claims, and RP payouts.
Generation 3 (future): cards, reporting, mobile refinement, optional Northstar Doctor-RP integration.
