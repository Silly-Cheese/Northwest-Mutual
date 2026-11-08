# Northwest Mutual RP

A simple **fictional medical insurance** portal, separate from Sterling Mutual.

## Three generations
1. **Foundation (implemented):** email/password-only signup and login, automatic customer records, three medical plans, plan approvals, customer and owner dashboards, secure Firestore rules and owner bootstrap.
2. **Medical claims (next):** customers and approved providers submit claims, staff review decisions, simulated payouts and history.
3. **Final experience:** reporting, printable insurance cards, mobile polish, optional Northstar Medical Center / Doctor-RP integration.

## Firebase setup

Firebase project: **northwest-mutual-59cca**. The public web config is in public/app.js. This is not a secret or service-account credential.

1. Firebase Console > Authentication > Sign-in method: enable **Email/Password**. Disable Google sign-in if enabled.
2. Firebase Console > Firestore Database: create a database (if not already created).
3. Open PowerShell from the repository directory. Run:

    npm.cmd install
    npm.cmd install -g firebase-tools
    firebase.cmd login
    firebase.cmd use northwest-mutual-59cca
    firebase.cmd deploy --only firestore:rules,hosting

4. Use the Firebase Hosting URL printed at the end.

Email verification is **not** required; customers can use email/password immediately. Password-reset emails are supported.

## Secure owner bootstrap

**Keep your service-account key and personal credentials out of this public repository.**

1. Firebase Console > Project Settings > Service Accounts: generate a private key; save it **outside** this folder (example C:\private\northwest-service-account.json).
2. Run locally with your owner email:

    npm.cmd run bootstrap:owner -- --email="you@example.com" --key="C:\private\northwest-service-account.json"

3. If the email has no account, the script creates an **owner email/password account** and prints a random one-time password. Sign in with it; use password reset to choose your own password.
4. If the email already has an account that is not yet owner, the script **refuses automatic promotion**. This is important because email verification is disabled. Inspect Firebase Authentication and confirm the account UID is yours, then rerun:

    npm.cmd run bootstrap:owner -- --email="you@example.com" --uid="THE_CONFIRMED_FIREBASE_UID" --key="C:\private\northwest-service-account.json"

5. Refresh access from the Account tab after bootstrapping an already-signed-in account.

The trusted Firebase Admin script adds an Auth custom claim named owner. Firestore rules check this claim, **not a spoofable email address**.

## Generation 1 workflow

- Customer signs up with email/password. Their customer record is created.
- Customer selects Basic, Standard, or Premium. The request is initially **Pending**.
- Owner selects Owner Desk and approves, suspends or reactivates policies.
- While a request is pending, customers can change plan. Only the owner can change policy status.
- Customers can update profile name, request password reset, and check coverage.

Plan pricing and terms are fictional RP samples. Do not use the app for real insurance, real payments or sensitive patient records.

No Cloud Functions. Public Hosting files are only inside public/. All other Firestore collections are blocked until future generations add explicit rules.
