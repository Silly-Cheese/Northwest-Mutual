# Northwest Mutual RP

Simple, fictional, **medical-only insurance**. Separate from Sterling Mutual.

## Hosting and services

| Feature | Service |
|---|---|
| Website | **GitHub Pages only** |
| Accounts | Firebase Authentication, **Email/Password only** |
| Data | Cloud Firestore |
| Access control | Firestore Security Rules + Firebase Auth custom claims |
| Owner bootstrap | One-time **local** Firebase Admin script |
| Firebase Hosting | **Not used** |
| Firebase Functions | **Not used** |

No email verification is required. No Google sign-in. Do not enter real patient data or make actual insurance payments; this app is only for roleplay.

## GitHub Pages setup

The website lives in **docs/** and uses relative links so it works on a GitHub Pages project URL.

1. Visit https://github.com/Silly-Cheese/Northwest-Mutual/settings/pages
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main**, folder **/docs**, and click **Save**.
4. After GitHub Pages reports a successful deployment, open:
   https://silly-cheese.github.io/Northwest-Mutual/

Each subsequent push to main automatically republishes the docs/ website. No build step or GitHub Actions workflow is necessary.

## Firebase configuration

Firebase project ID: **northwest-mutual-59cca**.

1. In Firebase Console > Authentication > Sign-in method, enable **Email/Password**, leave Google disabled.
2. In Firebase Console > Authentication > Settings > Authorized domains, add **silly-cheese.github.io** if missing.
3. Create a Cloud Firestore database if one does not already exist.
4. Install Node.js and Git, then run these PowerShell commands from your normal user folder, NOT C:\Windows\System32.

If this repository has NOT been cloned:
~~~powershell
cd $HOME
git clone https://github.com/Silly-Cheese/Northwest-Mutual.git
cd Northwest-Mutual
~~~

If it already exists, open its folder and update it:
~~~powershell
cd "$HOME\Northwest-Mutual"
git pull
~~~

Then:
~~~powershell
npm.cmd install
npm.cmd install -g firebase-tools
firebase.cmd login
firebase.cmd use northwest-mutual-59cca
firebase.cmd deploy --only "firestore:rules"
~~~

**Do not run** firebase deploy for hosting or functions. Firebase CLI is only needed to upload **Firestore security rules**. The repo's firebase.json deliberately has no hosting or functions configuration.

## One-time owner bootstrap (no cloud function)

Your owner account must be granted an Auth custom claim with Firebase Admin credentials, which only a trusted local script can do safely when email verification is disabled. Simply registering an email address does **not** grant owner access.

1. In Firebase Console > Project Settings > Service Accounts, generate a service-account private key.
2. Save the JSON **outside** this GitHub folder, e.g. C:\private\northwest-service-account.json.
3. Run in the repository's PowerShell:

~~~powershell
npm.cmd run bootstrap:owner -- --email="YOUR_OWNER_EMAIL" --key="C:\private\northwest-service-account.json"
~~~

If the email account does not exist, the script creates it and prints a temporary password. Sign in and use **Reset password** to choose a personal password.

If an account with that email already exists and is not an owner, the script refuses automatic promotion. Confirm the UID is genuinely yours in Firebase Authentication and rerun using **--uid="CONFIRMED_UID"** alongside the email and key arguments. This prevents owner impersonation by someone who registers another person's unverified email address.

After bootstrap, sign in and choose Account > **Refresh access**.

Never upload a service-account JSON key or password to GitHub, to docs/, or to public chat.

## Three generations

- **Generation 1: completed and committed.** Email/password account creation, automatic customer records, three insurance plan tiers, request/approval workflow, owner desk and Firestore security rules.
- **Generation 2: next.** Claims from customers or authorized providers, approval/partial approval/denial, fictional payout records and history.
- **Generation 3: final.** Cleaner reporting, printable cards, mobile refinements, optional Doctor-RP integration.

The front end uses only HTML, CSS and JavaScript with Firebase browser SDKs. The Firebase Admin SDK dependency in package.json is exclusively for the one-time local bootstrap script.
