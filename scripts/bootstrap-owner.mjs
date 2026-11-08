#!/usr/bin/env node
// One-time trusted local bootstrap. Keep the key outside the repository.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = {};
for (const entry of process.argv.slice(2)) {
  if (!entry.startsWith('--') || !entry.includes('=')) continue;
  const i = entry.indexOf('=');
  args[entry.slice(2, i)] = entry.slice(i + 1);
}
const email = (args.email || process.env.OWNER_EMAIL || '').trim().toLowerCase();
const keyPath = args.key || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const expectedProject = 'northwest-mutual-59cca';
function stop(message) { console.error('\n' + message + '\n'); process.exit(1); }
if (!email || !email.includes('@')) stop('Provide --email=your@email.com');
if (!keyPath) stop('Provide --key=PATH_TO_SERVICE_ACCOUNT_JSON outside the repository.');
let key;
try { key = JSON.parse(readFileSync(resolve(keyPath), 'utf8')); }
catch (error) { stop('Unable to read service-account JSON: ' + error.message); }
if (key.project_id !== expectedProject) stop('Wrong Firebase project. Expected ' + expectedProject + '.');

const app = initializeApp({ credential: cert(key), projectId: expectedProject });
const auth = getAuth(app);
const store = getFirestore(app);
try {
  let user = null;
  let temporaryPassword = null;
  try { user = await auth.getUserByEmail(email); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  if (user) {
    // With unverified emails, existing non-owner accounts must not be auto-promoted.
    if (user.customClaims?.owner !== true && (!args.uid || args.uid !== user.uid)) {
      stop('Account already exists. Inspect the UID in Firebase Authentication and confirm you own it, then rerun with --uid=' + user.uid + '. Never approve an unfamiliar UID.');
    }
    if (args.uid && user.uid !== args.uid) stop('UID does not match that email address.');
  } else {
    temporaryPassword = randomBytes(24).toString('base64url');
    user = await auth.createUser({
      email, password: temporaryPassword, emailVerified: false, displayName: 'Owner'
    });
  }
  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}), owner: true
  });
  const profile = store.doc('users/' + user.uid);
  const prior = await profile.get();
  await profile.set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || prior.data()?.displayName || 'Owner',
    role: 'owner',
    updatedAt: FieldValue.serverTimestamp(),
    ...(!prior.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
  }, { merge: true });
  console.log('\nOwner access activated for ' + user.email);
  console.log('Firebase Auth UID: ' + user.uid);
  if (temporaryPassword) {
    console.log('\nONE-TIME TEMPORARY PASSWORD: ' + temporaryPassword);
    console.log('Sign in, save it privately, then use password reset to change it.');
  } else console.log('Use your existing account password.');
  console.log('If signed in already, press Refresh access or sign out and back in.');
} catch (error) {
  stop('Bootstrap failed: ' + (error?.message || String(error)));
}
