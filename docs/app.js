import {
  loadExtras, currentPlan as findPlan, renderCatalog,
  renderPlanManager, renderClaims, renderStaffCenter,
  extraAction, extraForm
} from './gen2.js';
import {
  renderInsuranceCard, renderReports, reportsAction, reportsForm
} from './gen3.js';
import {
  navigationStart, navigationEnd, canNavigate
} from './navigation.js';
import { renderDashboard } from './dashboard.js';
import { planChangeAction, planChangeForm } from './planChanges.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile,
  sendPasswordResetEmail, getIdTokenResult
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc,
  serverTimestamp, runTransaction
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDMwiUgpr2x68jKqZf2GXO5yh3DWwfsPZ0',
  authDomain: 'northwest-mutual-59cca.firebaseapp.com',
  projectId: 'northwest-mutual-59cca',
  storageBucket: 'northwest-mutual-59cca.firebasestorage.app',
  messagingSenderId: '611768574464',
  appId: '1:611768574464:web:448d50728fa2058d076ee5'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const root = document.getElementById('app');

const state = {
  loading: true, user: null, profile: null, policy: null, owner: false,
  tab: 'dashboard', mode: 'login', notice: null, busy: false,
  adminUsers: [], adminPolicies: [], planCatalog: [], claims: [], editPlanId: null,
  reportStatus: 'all', reportQuery: '', navOpen: false, navCollapsed: false,
  planChange: null, planChanges: [], planChangeTarget: null, planChangeError: null
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
function badge(status) {
  const value = ['pending', 'active', 'suspended', 'cancelled'].includes(status) ? status : 'none';
  return '<span class="status status-' + value + '">' +
    esc(value === 'none' ? 'No policy' : value) + '</span>';
}
function dateText(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function noticeMarkup() {
  if (!state.notice) return '';
  return '<div class="notice ' + (state.notice.error ? 'error' : '') +
    '" role="status">' + esc(state.notice.message) + '</div>';
}
function notify(message, error = false) {
  state.notice = { message, error };
  render();
}
function errorMessage(error) {
  const code = String(error?.code || '');
  const mapping = {
    'auth/invalid-credential': 'Incorrect email address or password.',
    'auth/wrong-password': 'Incorrect email address or password.',
    'auth/email-already-in-use': 'An account already uses that email address.',
    'auth/weak-password': 'Please choose a stronger password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'permission-denied': 'Access denied by Firestore security rules.',
    'auth/network-request-failed': 'Network error. Check your connection.'
  };
  return mapping[code] || error?.message || 'Something went wrong. Please try again.';
}
function brand() {
  return '<a href="#" class="brand" data-action="home" aria-label="Northwest Mutual RP home">' +
    '<span class="brand-symbol">✚</span><span><span class="brand-name">Northwest Mutual</span>' +
    '<span class="brand-sub">Medical Insurance RP</span></span></a>';
}
function boot() {
  return '<div class="boot"><div class="spinner"></div><p>Loading your account…</p></div>';
}

function authPage() {
  const isLogin = state.mode === 'login';
  const isRegister = state.mode === 'register';
  const heading = isRegister ? 'Create your account' :
    (isLogin ? 'Welcome back' : 'Reset your password');
  let fields = '';
  if (isRegister) fields += '<div class="field"><label class="label" for="full-name">Your name</label>' +
    '<input class="input" id="full-name" name="name" autocomplete="name" maxlength="80" required placeholder="Full name"></div>';
  fields += '<div class="field"><label class="label" for="email-address">Email address</label>' +
    '<input class="input" id="email-address" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>';
  if (isRegister || isLogin) {
    fields += '<div class="field"><label class="label" for="password">Password</label>' +
      '<input class="input" id="password" name="password" type="password" autocomplete="' +
      (isRegister ? 'new-password' : 'current-password') + '" minlength="8" required placeholder="At least 8 characters"></div>';
  }
  if (isRegister) fields += '<p class="form-help">No email verification. Your customer profile is created automatically.</p>';

  return '<header class="topbar"><div class="shell topbar-inner">' + brand() +
    '<span class="user-chip">Medical coverage, made simple</span></div></header>' +
    '<div class="auth-layout"><section class="auth-left"><div class="auth-story">' +
    '<span class="eyebrow" style="color:#bde7ff">WELCOME TO NORTHWEST MUTUAL RP</span>' +
    '<h1>Medical coverage.<br>Without the complexity.</h1>' +
    '<p>Manage fictional medical insurance plans and requests in one clean, straightforward place.</p>' +
    '<div class="auth-bullets">' +
    '<div class="auth-bullet"><span class="bullet-icon">✓</span>Simple medical-only plans</div>' +
    '<div class="auth-bullet"><span class="bullet-icon">✚</span>Easy, secure customer accounts</div>' +
    '<div class="auth-bullet"><span class="bullet-icon">◈</span>Clear coverage status and approvals</div></div>' +
    '</div></section><section class="auth-right"><div class="auth-form">' +
    '<span class="eyebrow">CUSTOMER PORTAL</span><h2>' + heading + '</h2>' +
    '<p class="muted">' + (isRegister ? 'Get started with email and password.' :
      (isLogin ? 'Access your insurance profile and coverage.' : 'We will email you a password reset link.')) + '</p>' +
    '<div class="auth-switch">' +
    '<button type="button" class="' + (isLogin ? 'selected' : '') + '" data-action="mode" data-mode="login">Sign in</button>' +
    '<button type="button" class="' + (isRegister ? 'selected' : '') + '" data-action="mode" data-mode="register">Create account</button></div>' +
    noticeMarkup() +
    '<form data-form="' + esc(state.mode) + '">' + fields +
    '<button type="submit" class="btn btn-primary btn-full">' +
    (isRegister ? 'Create customer account' : (isLogin ? 'Sign in' : 'Send reset email')) + '</button></form>' +
    (isLogin ? '<button type="button" class="btn btn-ghost btn-full" data-action="mode" data-mode="reset">Forgot password?</button>' : '') +
    '<p class="auth-footer">Roleplay platform only • No actual medical insurance or payments</p>' +
    '</div></section></div>';
}

function navbar() { return navigationStart(state); }

function setNavigationOpen(open) {
  state.navOpen = Boolean(open);
  const layout = root.querySelector('.nw-layout');
  if (layout) layout.classList.toggle('nw-open', state.navOpen);
  document.body.classList.toggle('nw-drawer-visible', state.navOpen);
  const toggle = root.querySelector('[data-action="nav-toggle"]');
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(state.navOpen));
    toggle.setAttribute('aria-label', state.navOpen ? 'Close navigation menu' : 'Open navigation menu');
  }
}
function setSidebarCollapsed(collapsed) {
  state.navCollapsed = Boolean(collapsed);
  const layout = root.querySelector('.nw-layout');
  if (layout) layout.classList.toggle('nw-compact', state.navCollapsed);
  const control = root.querySelector('[data-action="nav-collapse"]');
  if (control) {
    control.setAttribute('aria-label', state.navCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    control.title = state.navCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    const label = control.querySelector('.nw-collapse-label');
    if (label) label.textContent = state.navCollapsed ? 'Expand menu' : 'Collapse menu';
  }
  try { localStorage.setItem('nw-sidebar-collapsed', String(state.navCollapsed)); } catch (_) {}
}
try { state.navCollapsed = localStorage.getItem('nw-sidebar-collapsed') === 'true'; } catch (_) {}

function dashboardPage() {
  return renderDashboard(state, findPlan);
}

function accountPage() {
  return '<div class="section-heading" style="margin-top:0"><div><span class="eyebrow">YOUR PROFILE</span>' +
    '<h2>Account settings</h2><p class="muted">Manage your customer details and sign-in.</p></div></div>' +
    '<div class="grid-2"><div class="card card-pad"><h3>Personal information</h3>' +
    '<form data-form="profile"><div class="field"><label class="label" for="profile-name">Full name</label>' +
    '<input class="input" id="profile-name" name="name" maxlength="80" required value="' + esc(state.profile?.displayName || '') + '"></div>' +
    '<div class="field"><label class="label" for="profile-email">Login email</label>' +
    '<input class="input" id="profile-email" type="email" readonly value="' + esc(state.user?.email || '') + '"></div>' +
    '<button class="btn btn-primary" type="submit">Save profile</button></form></div>' +
    '<div class="card card-pad"><h3>Account security</h3><div class="info-rows">' +
    '<div class="info-row"><span>Sign-in method</span><span>Email + password</span></div>' +
    '<div class="info-row"><span>Email verification</span><span>Not required</span></div>' +
    '<div class="info-row"><span>Account access</span><span>' + (state.owner ? 'Owner' : 'Customer') + '</span></div></div>' +
    '<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:19px">' +
    '<button class="btn btn-secondary" data-action="reset-current">Reset password</button>' +
    '<button class="btn btn-outline" data-action="refresh-access">Refresh access</button></div>' +
    '<p class="muted small" style="margin-top:15px">After owner bootstrap, Refresh access updates your privileges without email verification.</p></div></div>';
}

function ownerPage() {
  const users = state.adminUsers;
  const policies = state.adminPolicies;
  const pending = policies.filter(p => p.status === 'pending');
  const active = policies.filter(p => p.status === 'active');
  const byId = Object.fromEntries(users.map(u => [u.id, u]));
  const rows = policies.length ? policies.map(p => {
    const person = byId[p.id] || {};
    const plan = findPlan(state, p.plan);
    let actions = '';
    if (p.status !== 'active') actions += '<button class="btn btn-primary btn-small" data-action="policy-status" data-uid="' +
      esc(p.id) + '" data-status="active">Activate</button>';
    if (p.status === 'active') actions += '<button class="btn btn-danger btn-small" data-action="policy-status" data-uid="' +
      esc(p.id) + '" data-status="suspended">Suspend</button>';
    return '<tr><td><strong>' + esc(person.displayName || 'Customer') + '</strong><div class="muted small">' +
      esc(person.email || '') + '</div></td><td>' + esc(plan?.name || p.plan) + '</td><td>' +
      badge(p.status) + '</td><td>' + dateText(p.createdAt) +
      '</td><td><div class="table-actions">' + actions + '</div></td></tr>';
  }).join('') : '<tr><td colspan="5" class="muted">No medical plan requests yet.</td></tr>';

  return '<section class="hero-banner"><span class="eyebrow">ADMINISTRATOR ACCESS</span>' +
    '<h1>Owner Desk</h1><p>Review customers and manage medical insurance coverage from one place.</p></section>' +
    '<div class="section-heading"><div><h2>Insurance operations</h2><p class="muted small">Live data from your Firestore project.</p></div>' +
    '<button class="btn btn-outline btn-small" data-action="reload-owner">↻ Refresh records</button></div>' +
    '<div class="grid-3"><div class="card stat"><div class="stat-label">Customer accounts</div>' +
    '<div class="stat-number">' + users.length + '</div></div><div class="card stat"><div class="stat-label">Pending requests</div>' +
    '<div class="stat-number">' + pending.length + '</div></div><div class="card stat"><div class="stat-label">Active policies</div>' +
    '<div class="stat-number">' + active.length + '</div></div></div>' +
    '<div class="section-heading"><div><h2>Medical insurance policies</h2><p class="muted small">Approve and manage customer requests.</p></div></div>' +
    '<div class="card card-pad"><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Plan</th><th>Status</th>' +
    '<th>Requested</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
    '<div class="section-heading"><h2>Customer directory</h2></div>' +
    '<div class="card card-pad"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>' +
    (users.length ? users.map(u => '<tr><td><strong>' + esc(u.displayName || 'Customer') +
    '</strong></td><td>' + esc(u.email || '') + '</td><td>' + esc(u.role || 'customer') +
    '</td><td>' + dateText(u.createdAt) + '</td></tr>').join('') :
    '<tr><td colspan="4" class="muted">No customers found.</td></tr>') +
    '</tbody></table></div></div>';
}
function render() {
  if (state.loading) { root.innerHTML = boot(); return; }
  if (!state.user) { root.innerHTML = authPage(); return; }
  let page = '';
  if (state.tab === 'plans') page = renderCatalog(state);
  else if (state.tab === 'claims') page = renderClaims(state);
  else if (state.tab === 'card') page = renderInsuranceCard(state, findPlan);
  else if (state.tab === 'reports' && (state.owner || state.profile?.role === 'staff'))
    page = renderReports(state, findPlan);
  else if (state.tab === 'staff' && (state.owner || state.profile?.role === 'staff')) page = renderStaffCenter(state);
  else if (state.tab === 'manage-plans' && state.owner) page = renderPlanManager(state);
  else if (state.tab === 'account') page = accountPage() +
    '<div class="card card-pad" style="margin-top:17px"><h3>Your Member ID</h3>' +
    '<p class="muted small">Give this fictional Member ID to an authorized medical provider so they can submit an RP claim on your behalf.</p>' +
    '<div class="member-code">' + esc(state.user.uid) + '</div>' +
    '<button class="btn btn-secondary btn-small" data-action="copy-member">Copy Member ID</button></div>';
  else if (state.tab === 'owner' && state.owner) page = ownerPage();
  else page = dashboardPage();
  root.innerHTML = navbar() + '<main class="nw-main"><div class="shell">' + noticeMarkup() +
    page + '</div></main><footer class="nw-footer">Northwest Mutual RP · Fictional medical insurance platform · No real coverage</footer>' +
    navigationEnd();
  document.body.classList.toggle('nw-drawer-visible', state.navOpen);
}

async function ensureProfile(user) {
  const ref = doc(db, 'users', user.uid);
  await runTransaction(db, async tx => {
    const current = await tx.get(ref);
    if (!current.exists()) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Customer';
      tx.set(ref, {
        uid: user.uid, email: user.email, displayName, role: 'customer',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    }
  });
  const snap = await getDoc(ref);
  state.profile = snap.exists() ? snap.data() : null;
}

async function loadPolicy() {
  if (!auth.currentUser) return;
  const snap = await getDoc(doc(db, 'policies', auth.currentUser.uid));
  state.policy = snap.exists() ? snap.data() : null;
}

async function loadAdmin() {
  if (!state.owner && state.profile?.role !== 'staff') return;
  const [userDocs, policyDocs] = await Promise.all([
    getDocs(collection(db, 'users')), getDocs(collection(db, 'policies'))
  ]);
  state.adminUsers = userDocs.docs.map(d => ({ id: d.id, ...d.data() }));
  state.adminPolicies = policyDocs.docs.map(d => ({ id: d.id, ...d.data() }));
  state.adminPolicies.sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));
}

onAuthStateChanged(auth, async user => {
  state.loading = true;
  state.user = user;
  state.profile = null;
  state.policy = null;
  state.owner = false;
  state.adminUsers = [];
  state.adminPolicies = [];
  state.planCatalog = [];
  state.claims = [];
  state.editPlanId = null;
  state.reportStatus = 'all';
  state.reportQuery = '';
  state.planChange = null;
  state.planChanges = [];
  state.planChangeTarget = null;
  state.planChangeError = null;
  state.navOpen = false;
  document.body.classList.remove('nw-drawer-visible');
  state.tab = 'dashboard';
  state.notice = null;
  render();
  try {
    if (user) {
      const result = await getIdTokenResult(user, true);
      if (auth.currentUser?.uid !== user.uid) return;
      state.owner = result.claims.owner === true;
      await ensureProfile(user);
      await loadPolicy();
      await loadExtras(state, db);
      if (state.owner || state.profile?.role === 'staff') await loadAdmin();
    }
  } catch (error) {
    state.notice = { message: errorMessage(error), error: true };
  } finally {
    state.loading = false;
    render();
  }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'nav-toggle') {
    const opening = !state.navOpen;
    setNavigationOpen(opening);
    if (opening) root.querySelector('.nw-sidebar .nw-link')?.focus();
    return;
  }
  if (action === 'nav-close') {
    setNavigationOpen(false);
    root.querySelector('[data-action="nav-toggle"]')?.focus();
    return;
  }
  if (action === 'nav-collapse') {
    setSidebarCollapsed(!state.navCollapsed);
    return;
  }
  if (state.busy) return;
  if (action === 'mode') {
    state.mode = button.dataset.mode;
    state.notice = null; render(); return;
  }
  if (action === 'home') {
    event.preventDefault();
    setNavigationOpen(false);
    state.tab = 'dashboard'; state.notice = null; render();
    window.scrollTo({top:0,behavior:'auto'});
    return;
  }
  if (action === 'tab') {
    if (!canNavigate(state, button.dataset.tab)) return;
    setNavigationOpen(false);
    state.tab = button.dataset.tab;
    state.notice = null; render();
    window.scrollTo({top:0,behavior:'auto'});
    if (['dashboard', 'account', 'card', 'owner', 'staff', 'claims', 'plans', 'manage-plans', 'reports'].includes(state.tab)) {
      try {
        await loadPolicy();
        await loadExtras(state, db);
        if (state.owner || state.profile?.role === 'staff') await loadAdmin();
        render();
      } catch (error) { notify(errorMessage(error), true); }
    }
    return;
  }

  state.busy = true;
  try {
    if (action === 'logout') {
      await signOut(auth);
      state.mode = 'login';
    } else if (action === 'choose-plan') {
      const plan = button.dataset.plan;
      if (!state.planCatalog.some(p => p.id === plan && p.active))
        throw new Error('That insurance plan is unavailable.');
      if (state.policy && state.policy.status !== 'pending') {
        throw new Error('Only the owner may change an active or suspended policy.');
      }
      const ref = doc(db, 'policies', state.user.uid);
      if (state.policy) await updateDoc(ref, { plan, updatedAt: serverTimestamp() });
      else await setDoc(ref, {
        uid: state.user.uid, plan, status: 'pending',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      await loadPolicy();
      await loadExtras(state, db);
      state.tab = 'dashboard';
      notify('Your medical plan request is saved and awaiting owner approval.');
    } else if (action === 'policy-status') {
      if (!state.owner && state.profile?.role !== 'staff') throw new Error('Staff access required.');
      const uid = button.dataset.uid;
      const status = button.dataset.status;
      if (!uid || !['active', 'suspended'].includes(status)) throw new Error('Invalid policy action.');
      await updateDoc(doc(db, 'policies', uid), {
        status, updatedAt: serverTimestamp()
      });
      await loadAdmin();
      if (uid === state.user.uid) await loadPolicy();
      notify(status === 'active' ? 'Insurance policy activated.' : 'Insurance policy suspended.');
    } else if (action === 'reload-owner') {
      await loadAdmin();
      notify('Customer records and policies refreshed.');
    } else if (action.startsWith('pc-')) {
      const result = await planChangeAction(action, button, state, db);
      if (action !== 'pc-select' && action !== 'pc-cancel-target') {
        await loadPolicy();
        await loadExtras(state, db);
        if (state.owner || state.profile?.role === 'staff') await loadAdmin();
      }
      notify(result.message);
      if (action === 'pc-select') window.scrollTo({top:0,behavior:'smooth'});
    } else if (action.startsWith('gen3-')) {
      const result = reportsAction(action, state);
      notify(result.message);
    } else if (action === 'copy-member') {
      await navigator.clipboard.writeText(state.user.uid);
      notify('Member ID copied.');
    } else if (action.startsWith('ex-')) {
      const result = await extraAction(action, button, state, db);
      await loadExtras(state, db);
      if (state.owner || state.profile?.role === 'staff') await loadAdmin();
      notify(result.message);
    } else if (action === 'reset-current') {
      if (!state.user?.email) throw new Error('You must sign in to reset your password.');
      await sendPasswordResetEmail(auth, state.user.email);
      notify('Password reset email requested. Check your inbox.');
    } else if (action === 'refresh-access') {
      const claims = await getIdTokenResult(auth.currentUser, true);
      state.owner = claims.claims.owner === true;
      await ensureProfile(auth.currentUser);
      await loadPolicy();
      await loadExtras(state, db);
      if (state.owner || state.profile?.role === 'staff') await loadAdmin();
      notify(state.owner ? 'Owner access is enabled.' : 'Account access refreshed.');
    }
  } catch (error) {
    const message = action.startsWith('pc-') && error?.code === 'permission-denied'
      ? 'Plan change blocked by Firestore permissions. The owner must deploy the updated rules, then refresh.'
      : errorMessage(error);
    notify(message, true);
  } finally {
    state.busy = false;
  }
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  if (state.busy) return;
  state.busy = true;
  const data = new FormData(form);
  const formType = form.dataset.form;
  try {
    if (formType === 'login') {
      await signInWithEmailAndPassword(auth,
        String(data.get('email') || '').trim(), String(data.get('password') || ''));
    } else if (formType === 'register') {
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const password = String(data.get('password') || '');
      if (!name || name.length > 80) throw new Error('Enter a name up to 80 characters.');
      if (password.length < 8) throw new Error('Please enter at least 8 password characters.');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await ensureProfile(result.user);
      await updateDoc(doc(db, 'users', result.user.uid), {
        displayName: name, updatedAt: serverTimestamp()
      });
      state.profile.displayName = name;
      notify('Account created! Select a plan to request medical insurance.');
    } else if (formType === 'reset') {
      await sendPasswordResetEmail(auth, String(data.get('email') || '').trim());
      state.mode = 'login';
      notify('If that email is registered, a password reset link has been sent.');
    } else if (formType.startsWith('pc-')) {
      const result = await planChangeForm(formType, data, state, db);
      await loadPolicy();
      await loadExtras(state, db);
      if (state.owner || state.profile?.role === 'staff') await loadAdmin();
      notify(result.message);
    } else if (formType.startsWith('gen3-')) {
      const result = reportsForm(formType, data, state);
      notify(result.message);
    } else if (formType.startsWith('ex-')) {
      const result = await extraForm(formType, data, state, db);
      await loadExtras(state, db);
      if (state.owner || state.profile?.role === 'staff') await loadAdmin();
      notify(result.message);
    } else if (formType === 'profile') {
      const name = String(data.get('name') || '').trim();
      if (!name || name.length > 80) throw new Error('Enter a name up to 80 characters.');
      await updateProfile(auth.currentUser, { displayName: name });
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: name, updatedAt: serverTimestamp()
      });
      state.profile = { ...(state.profile || {}), displayName: name };
      notify('Profile updated successfully.');
    }
  } catch (error) {
    const message = formType.startsWith('pc-') && error?.code === 'permission-denied'
      ? 'Plan change cannot be saved. Ask the owner to deploy the new Firestore rules and try again.'
      : errorMessage(error);
    notify(message, true);
  } finally {
    state.busy = false;
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.navOpen) {
    setNavigationOpen(false);
    root.querySelector('[data-action="nav-toggle"]')?.focus();
  }
});
window.addEventListener('resize', () => {
  if (state.navOpen && window.innerWidth > 920) setNavigationOpen(false);
});
