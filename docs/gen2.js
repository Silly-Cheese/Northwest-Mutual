import {
  collection, doc, getDocs, addDoc, setDoc, updateDoc, query, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

// Generation 2: medical-only fictional claims, provider and staff workflows.
// Staff/provider roles are granted by the owner, never by public registration.
export const starterPlans = [
  { id: 'basic', name: 'Basic Care', price: 125, coverage: 60, deductible: 750,
    description: 'Simple medical coverage for everyday RP healthcare.', active: true },
  { id: 'standard', name: 'Standard Care', price: 225, coverage: 80, deductible: 350,
    description: 'Balanced fictional coverage for visits and hospital care.', active: true },
  { id: 'premium', name: 'Premium Care', price: 350, coverage: 90, deductible: 100,
    description: 'Higher RP coverage and a smaller deductible.', active: true }
];

const h = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cash = value => '$' + Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});
const date = value => value && typeof value.toDate === 'function'
  ? value.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';
const selected = (a, b) => a === b ? ' selected' : '';
const statusBadge = value => {
  const status = String(value || 'pending').replace(/_/g, ' ');
  const cls = ['active','approved','paid'].includes(value) ? 'active' :
    ['pending','partially_approved','unpaid'].includes(value) ? 'pending' :
    ['denied','suspended'].includes(value) ? 'suspended' : 'cancelled';
  return '<span class="status status-' + cls + '">' + h(status) + '</span>';
};
const staff = s => s.owner || s.profile?.role === 'staff';
const provider = s => s.profile?.role === 'provider';
const title = (heading, detail, tag) =>
  '<div class="section-heading" style="margin-top:0"><div><span class="eyebrow">' + h(tag) +
  '</span><h2>' + h(heading) + '</h2><p class="muted">' + h(detail) + '</p></div></div>';
const when = str => {
  const d = new Date(str);
  return Number.isFinite(+d) && /^\d{4}-\d{2}-\d{2}$/.test(str);
};

export async function loadExtras(s, db) {
  const plans = await getDocs(collection(db, 'plans'));
  s.planCatalog = plans.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
  let result;
  if (staff(s)) result = await getDocs(collection(db, 'claims'));
  else if (provider(s)) result = await getDocs(query(collection(db, 'claims'),
    where('providerUid', '==', s.user.uid)));
  else result = await getDocs(query(collection(db, 'claims'),
    where('customerUid', '==', s.user.uid)));
  s.claims = result.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}
export function currentPlan(s, id) {
  return s.planCatalog?.find(p => p.id === id) || starterPlans.find(p => p.id === id);
}
export function renderCatalog(s) {
  const plans = (s.planCatalog || []).filter(p => p.active);
  const policy = s.policy;
  const canRequest = !policy || policy.status === 'pending';
  return title('Medical insurance plans',
    'Choose coverage that works for your fictional medical roleplay.', 'CUSTOMER COVERAGE') +
    (plans.length ? '<div class="grid-3">' + plans.map(p => {
      const chosen = p.id === policy?.plan;
      return '<article class="card plan"><div class="plan-titlebar"><h3>' + h(p.name) +
      '</h3>' + (chosen ? '<span class="pill-note">SELECTED</span>' : '') + '</div>' +
      '<p class="plan-description">' + h(p.description) + '</p><div class="plan-price">' +
      cash(p.price) + '<span> / RP month</span></div>' +
      '<div class="plan-metric"><span>Fictional coverage</span><strong>' + h(p.coverage) +
      '%</strong></div><div class="plan-metric"><span>RP deductible</span><strong>' +
      cash(p.deductible) + '</strong></div><div class="plan-bottom">' +
      '<button class="btn ' + (chosen ? 'btn-secondary' : 'btn-primary') +
      ' btn-full" data-action="choose-plan" data-plan="' + h(p.id) +
      '"' + (!canRequest || chosen ? ' disabled' : '') + '>' +
      (chosen ? 'Selected plan' : canRequest ? 'Request this plan' : 'Plan change needs review') +
      '</button></div></article>';
    }).join('') + '</div>' :
    '<div class="card empty"><div class="empty-icon">✚</div><h3>Insurance plans not configured yet</h3>' +
    '<p class="muted">An owner needs to create or initialize plans before members can enroll.</p></div>') +
    '<div class="inline-tips" style="margin-top:18px">ℹ &nbsp;All terms and dollar values are fictional roleplay examples. Plans require staff review before coverage becomes active.</div>';
}
export function renderPlanManager(s) {
  if (!s.owner) return '<p>Owner access required.</p>';
  const plans = s.planCatalog || [];
  const editing = plans.find(p => p.id === s.editPlanId);
  const rows = plans.map(p => '<tr><td><strong>' + h(p.name) + '</strong><div class="muted small">' +
    h(p.description) + '</div></td><td>' + cash(p.price) + '</td><td>' + h(p.coverage) +
    '%</td><td>' + cash(p.deductible) + '</td><td>' + statusBadge(p.active ? 'active' : 'suspended') +
    '</td><td><div class="table-actions"><button class="btn btn-secondary btn-small" data-action="ex-edit-plan" data-id="' +
    h(p.id) + '">Edit</button><button class="btn btn-outline btn-small" data-action="ex-toggle-plan" data-id="' +
    h(p.id) + '">' + (p.active ? 'Retire' : 'Reactivate') + '</button></div></td></tr>').join('');
  const f = editing || { name:'', price:'', coverage:80, deductible:0, description:'', active:true };
  return title('Plan Management', 'Create, customize, and retire fictional medical insurance plans.', 'OWNER CONTROL') +
    (!plans.length ? '<div class="notice">No plans configured. Use the button below to add the original Basic, Standard, and Premium plans.</div>' +
    '<button class="btn btn-primary" data-action="ex-seed-plans">Create 3 starter plans</button>' : '') +
    '<div class="grid-2" style="margin-top:20px;align-items:start">' +
    '<div class="card card-pad"><h3>' + (editing ? 'Edit ' + h(editing.name) : 'Create new insurance plan') + '</h3>' +
    '<form data-form="ex-save-plan"><div class="field"><label class="label">Plan name</label>' +
    '<input class="input" name="name" required maxlength="70" value="' + h(f.name) + '" placeholder="e.g. Family Care"></div>' +
    '<div class="grid-2 tight"><div class="field"><label class="label">Monthly RP premium ($)</label>' +
    '<input class="input" name="price" type="number" step="0.01" min="0" max="1000000" value="' + h(f.price) + '" required></div>' +
    '<div class="field"><label class="label">Coverage percentage</label>' +
    '<input class="input" name="coverage" type="number" step="1" min="0" max="100" value="' + h(f.coverage) + '" required></div></div>' +
    '<div class="field"><label class="label">RP deductible ($)</label><input class="input" name="deductible" type="number" step="0.01" min="0" max="1000000" value="' +
    h(f.deductible) + '" required></div>' +
    '<div class="field"><label class="label">Description</label><textarea class="input area" name="description" maxlength="400" rows="3">' +
    h(f.description) + '</textarea></div>' +
    '<div class="field"><label><input type="checkbox" name="active" ' + (f.active ? 'checked' : '') +
    '> Available for new enrollment</label></div>' +
    '<div class="table-actions"><button class="btn btn-primary" type="submit">' +
    (editing ? 'Save plan changes' : 'Create plan') + '</button>' +
    (editing ? '<button class="btn btn-outline" type="button" data-action="ex-cancel-edit">Cancel</button>' : '') +
    '</div></form></div><div class="card card-pad"><h3>Keeping plans simple</h3><p class="muted">' +
    'Existing customer policies keep their plan ID. Editing a plan updates the displayed terms. ' +
    'Retiring a plan prevents new requests without deleting existing policies.</p>' +
    '<div class="inline-tips">✚ &nbsp;Only the owner can create or change the insurance plan catalog.</div></div></div>' +
    '<div class="section-heading"><h2>All insurance plans (' + plans.length + ')</h2></div>' +
    '<div class="card card-pad"><div class="table-wrap"><table><thead><tr><th>Plan</th><th>Monthly</th>' +
    '<th>Coverage</th><th>Deductible</th><th>Available</th><th>Actions</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="6">No plans yet.</td></tr>') + '</tbody></table></div></div>';
}
export function renderClaims(s) {
  const isProvider = provider(s);
  const canFile = isProvider || s.policy?.status === 'active';
  const visible = s.claims || [];
  const heading = isProvider ? 'Provider Claim Portal' : 'Medical Claims';
  const userHelp = isProvider
    ? 'Enter the fictional patient member ID supplied by the customer. Providers cannot browse customer account records.'
    : 'Submit your own fictional medical expenses for coverage review. You need an active policy.';
  const field = isProvider
    ? '<div class="field"><label class="label">Patient Member ID</label>' +
      '<input name="customerUid" class="input" maxlength="128" required placeholder="Paste member ID from customer portal"></div>'
    : '';
  return title(heading, userHelp, isProvider ? 'MEDICAL PROVIDER' : 'CLAIMS CENTER') +
    '<div class="grid-2 claim-layout">' +
    '<section class="card card-pad"><h3>Submit a medical claim</h3>' +
    (canFile ? '<form data-form="ex-submit-claim">' + field +
    '<div class="field"><label class="label">Facility name</label><input class="input" name="facility" maxlength="100" required placeholder="e.g. Northstar Medical Center"></div>' +
    '<div class="field"><label class="label">Treatment / service date</label><input class="input" type="date" name="serviceDate" required></div>' +
    '<div class="field"><label class="label">Service type</label><select class="input" name="serviceType">' +
    ['Office Visit','Emergency Care','Hospital Stay','Imaging','Medication','Laboratory','Surgery','Other']
      .map(v => '<option>' + h(v) + '</option>').join('') + '</select></div>' +
    '<div class="field"><label class="label">Medical bill amount (RP $)</label><input class="input" type="number" name="amount" min="0.01" step="0.01" max="1000000" required></div>' +
    '<div class="field"><label class="label">Optional notes</label><textarea class="input area" name="notes" maxlength="500" rows="3" placeholder="Short fictional billing details only"></textarea></div>' +
    '<button class="btn btn-primary btn-full" type="submit">Submit claim for review</button></form>' :
    '<div class="inline-tips">An active medical insurance policy is required to submit a claim. Visit Insurance Plans first.</div>') +
    '</section><section class="card card-pad"><h3>How it works</h3>' +
    '<div class="info-rows"><div class="info-row"><span>1. Submit</span><span>Bill details</span></div>' +
    '<div class="info-row"><span>2. Review</span><span>Staff decision</span></div>' +
    '<div class="info-row"><span>3. Payout</span><span>Simulated payment</span></div></div>' +
    '<p class="muted small" style="margin-top:15px">Claims are fictional and are not real insurance transactions. Do not submit actual patient health information.</p></section></div>' +
    '<div class="section-heading"><h2>' + (isProvider ? 'Claims submitted by you' : 'Your claim history') +
    ' (' + visible.length + ')</h2></div>' + renderClaimsTable(s, visible);
}
export function renderClaimsTable(s, claims) {
  const users = Object.fromEntries((s.adminUsers || []).map(u => [u.id, u]));
  if (!claims.length) return '<div class="card empty"><div class="empty-icon">▣</div>' +
    '<h3>No claims yet</h3><p class="muted">Submitted medical claims will appear here.</p></div>';
  return '<div class="card card-pad"><div class="table-wrap"><table><thead><tr>' +
    '<th>Claim / Patient</th><th>Facility & service</th><th>Requested</th><th>Decision</th><th>RP payout</th></tr></thead><tbody>' +
    claims.map(c => '<tr><td><strong>' + h(users[c.customerUid]?.displayName || 'Member') +
      '</strong><div class="muted small">' + h(c.id.slice(0,10)) + ' • ' + date(c.createdAt) +
      '</div></td><td>' + h(c.facility) + '<div class="muted small">' + h(c.serviceType) +
      ' • ' + h(c.serviceDate) + '</div></td><td>' + cash(c.amount) + '</td><td>' +
      statusBadge(c.status) + (c.decisionNote ? '<div class="muted small">' + h(c.decisionNote) + '</div>' : '') +
      '</td><td>' + cash(c.approvedAmount) + '<div class="muted small">' +
      h(c.payoutStatus === 'paid' ? 'Paid (RP)' : 'Not paid') + '</div></td></tr>').join('') +
    '</tbody></table></div></div>';
}
export function renderStaffCenter(s) {
  if (!staff(s)) return '<p>Staff access required.</p>';
  const users = s.adminUsers || [];
  const policies = s.adminPolicies || [];
  const claims = s.claims || [];
  const pending = claims.filter(c => c.status === 'pending');
  const payables = claims.filter(c => ['approved','partially_approved'].includes(c.status) && c.payoutStatus === 'unpaid');
  const byUid = Object.fromEntries(users.map(u => [u.id, u]));
  const policyRows = policies.map(p => {
    const user = byUid[p.id] || {};
    const buttons = p.status === 'active'
      ? '<button class="btn btn-danger btn-small" data-action="policy-status" data-uid="' + h(p.id) + '" data-status="suspended">Suspend</button>'
      : '<button class="btn btn-primary btn-small" data-action="policy-status" data-uid="' + h(p.id) + '" data-status="active">Activate</button>';
    return '<tr><td>' + h(user.displayName || 'Member') + '<div class="muted small">' +
      h(user.email || p.id) + '</div></td><td>' +
      h(currentPlan(s,p.plan)?.name || p.plan) + '</td><td>' + statusBadge(p.status) +
      '</td><td>' + buttons + '</td></tr>';
  }).join('');
  const reviewCards = pending.map(c => '<article class="card card-pad"><div class="plan-titlebar">' +
    '<div><span class="eyebrow">PENDING CLAIM</span><h3>' + h(byUid[c.customerUid]?.displayName || c.customerUid) +
    '</h3></div>' + statusBadge(c.status) + '</div><p class="muted small">' +
    h(c.facility) + ' • ' + h(c.serviceType) + ' • ' + h(c.serviceDate) +
    (c.providerUid ? ' • Provider submitted' : ' • Customer submitted') + '</p><p><strong>Requested: ' +
    cash(c.amount) + '</strong></p>' +
    (c.notes ? '<p class="muted small">Notes: ' + h(c.notes) + '</p>' : '') +
    '<form data-form="ex-review-claim"><input type="hidden" name="claimId" value="' + h(c.id) + '">' +
    '<div class="grid-2 tight"><div class="field"><label class="label">Decision</label><select name="decision" class="input">' +
    '<option value="approved">Approve in full</option><option value="partially_approved">Partially approve</option>' +
    '<option value="denied">Deny</option></select></div><div class="field"><label class="label">Approved RP amount</label>' +
    '<input class="input" name="approvedAmount" type="number" min="0" step="0.01" max="' + h(c.amount) +
    '" value="' + h(c.amount) + '" required></div></div>' +
    '<div class="field"><label class="label">Decision note (optional)</label>' +
    '<textarea name="decisionNote" class="input area" rows="2" maxlength="500"></textarea></div>' +
    '<button class="btn btn-primary" type="submit">Save claim decision</button></form></article>').join('');
  const payableRows = payables.map(c => '<tr><td>' + h(byUid[c.customerUid]?.displayName || c.customerUid) +
    '<div class="muted small">' + h(c.facility) + '</div></td><td>' + cash(c.approvedAmount) +
    '</td><td>' + statusBadge(c.status) + '</td><td><button class="btn btn-primary btn-small" ' +
    'data-action="ex-pay-claim" data-id="' + h(c.id) + '">Record RP payout</button></td></tr>').join('');
  return '<section class="hero-banner"><span class="eyebrow">STAFF WORKSPACE</span>' +
    '<h1>Staff Center</h1><p>One place for plan approvals, medical claims and fictional payouts.</p></section>' +
    '<div class="section-heading"><h2>Operations overview</h2><button class="btn btn-outline btn-small" data-action="ex-refresh">Refresh</button></div>' +
    '<div class="grid-3"><div class="card stat"><div class="stat-label">Pending claims</div><div class="stat-number">' +
    pending.length + '</div></div><div class="card stat"><div class="stat-label">Waiting for payout</div><div class="stat-number">' +
    payables.length + '</div></div><div class="card stat"><div class="stat-label">Pending policies</div><div class="stat-number">' +
    policies.filter(p=>p.status==='pending').length + '</div></div></div>' +
    '<div class="section-heading"><h2>Claim review queue</h2></div>' +
    (pending.length ? '<div class="grid-2">' + reviewCards + '</div>' :
    '<div class="card empty">All submitted claims have been reviewed.</div>') +
    '<div class="section-heading"><h2>Approved claims awaiting RP payment</h2></div>' +
    (payables.length ? '<div class="card card-pad"><div class="table-wrap"><table><thead><tr><th>Member</th>' +
    '<th>Approved</th><th>Status</th><th>Action</th></tr></thead><tbody>' + payableRows +
    '</tbody></table></div></div>' : '<div class="card empty">No outstanding approved payouts.</div>') +
    '<div class="section-heading"><h2>Policy requests & coverage</h2></div>' +
    '<div class="card card-pad"><div class="table-wrap"><table><thead><tr><th>Member</th><th>Plan</th><th>Status</th><th>Action</th></tr></thead><tbody>' +
    (policyRows || '<tr><td colspan="4">No coverage requests yet.</td></tr>') + '</tbody></table></div></div>' +
    '<div class="section-heading"><h2>All medical claims</h2></div>' +
    renderClaimsTable(s, claims) +
    (s.owner ? renderStaffManagement(s) : '');
}
function renderStaffManagement(s) {
  const rows = (s.adminUsers || []).filter(u => u.id !== s.user.uid).map(u =>
    '<tr><td>' + h(u.displayName || 'Member') + '<div class="muted small">' + h(u.email) +
    '</div></td><td>' + h(u.role || 'customer') + '</td><td>' +
    '<form data-form="ex-change-role" class="inline-form">' +
    '<input name="uid" type="hidden" value="' + h(u.id) + '">' +
    '<select name="role" class="input compact"><option value="customer"' +
    selected(u.role,'customer') + '>Customer</option><option value="staff"' +
    selected(u.role,'staff') + '>Staff</option><option value="provider"' +
    selected(u.role,'provider') + '>Medical provider</option></select>' +
    '<button class="btn btn-secondary btn-small" type="submit">Save role</button></form></td></tr>').join('');
  return '<div class="section-heading"><div><h2>Staff & provider accounts</h2>' +
    '<p class="muted small">Only the owner can assign roles. Staff and providers sign up with email/password first.</p></div></div>' +
    '<div class="card card-pad"><div class="inline-tips" style="margin-bottom:15px">⚠ &nbsp;Because email verification is disabled, confirm who owns the account before granting staff or provider access.</div>' +
    '<div class="table-wrap"><table><thead><tr><th>Account</th><th>Current role</th><th>Change role</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="3">No other accounts yet.</td></tr>') +
    '</tbody></table></div></div>';
}

export async function extraAction(action, button, s, db) {
  if (action === 'ex-refresh') return { message: 'Insurance records refreshed.' };
  if (action === 'ex-cancel-edit') { s.editPlanId = null; return { message: 'Editing cancelled.' }; }
  if (action === 'ex-edit-plan') {
    if (!s.owner) throw new Error('Only an owner may edit plans.');
    const plan = s.planCatalog.find(p => p.id === button.dataset.id);
    if (!plan) throw new Error('Plan not found.');
    s.editPlanId = plan.id; return { message: 'Editing ' + plan.name + '.' };
  }
  if (action === 'ex-seed-plans') {
    if (!s.owner) throw new Error('Only the owner can initialize plans.');
    if (s.planCatalog.length) throw new Error('Plans already exist.');
    for (const p of starterPlans) {
      await setDoc(doc(db, 'plans', p.id), {
        name:p.name, price:p.price, coverage:p.coverage, deductible:p.deductible,
        description:p.description, active:true,
        createdAt:serverTimestamp(), updatedAt:serverTimestamp()
      });
    }
    return { message:'Three starter plans created. You can now edit or add more.' };
  }
  if (action === 'ex-toggle-plan') {
    if (!s.owner) throw new Error('Owner access required.');
    const p = s.planCatalog.find(x => x.id === button.dataset.id);
    if (!p) throw new Error('Plan not found.');
    await updateDoc(doc(db, 'plans', p.id), {
      active:!p.active, updatedAt:serverTimestamp()
    });
    return { message:p.active ? 'Plan retired for new enrollments.' : 'Plan available for enrollment.' };
  }
  if (action === 'ex-pay-claim') {
    if (!staff(s)) throw new Error('Staff access required.');
    const claim = s.claims.find(c => c.id === button.dataset.id);
    if (!claim || !['approved','partially_approved'].includes(claim.status) ||
        claim.payoutStatus !== 'unpaid') throw new Error('Claim is not awaiting RP payout.');
    await updateDoc(doc(db, 'claims', claim.id), {
      payoutStatus:'paid', updatedAt:serverTimestamp()
    });
    return { message:'Fictional payout recorded.' };
  }
  throw new Error('Unknown action.');
}
function parseMoney(input, label) {
  const num = Number(input);
  if (!String(input).trim() || !Number.isFinite(num) || num < 0 ||
    num > 1000000 || Math.abs(Math.round(num * 100) - num * 100) > 0.000001)
    throw new Error('Enter a valid ' + label + ' between $0 and $1,000,000.');
  return num;
}
export async function extraForm(type, data, s, db) {
  if (type === 'ex-save-plan') {
    if (!s.owner) throw new Error('Only the owner may manage plans.');
    const name = String(data.get('name') || '').trim();
    const description = String(data.get('description') || '').trim();
    const price = parseMoney(data.get('price'), 'monthly price');
    const deductible = parseMoney(data.get('deductible'), 'deductible');
    const coverage = Number(data.get('coverage'));
    if (!name || name.length > 70 || description.length > 400)
      throw new Error('Check plan name and description length.');
    if (!Number.isInteger(coverage) || coverage < 0 || coverage > 100)
      throw new Error('Coverage must be between 0 and 100%.');
    const value = {
      name,description,price,deductible,coverage,active:data.get('active') === 'on',
      updatedAt:serverTimestamp()
    };
    if (s.editPlanId) {
      await updateDoc(doc(db, 'plans', s.editPlanId), value);
      s.editPlanId = null;
      return { message:'Plan updated successfully.' };
    }
    await addDoc(collection(db, 'plans'), { ...value, createdAt:serverTimestamp() });
    return { message:'New medical insurance plan created.' };
  }
  if (type === 'ex-change-role') {
    if (!s.owner) throw new Error('Only owner can manage staff.');
    const uid = String(data.get('uid') || '');
    const role = String(data.get('role') || '');
    if (uid === s.user.uid || !['customer','staff','provider'].includes(role))
      throw new Error('Invalid account role.');
    const target = s.adminUsers.find(u => u.id === uid);
    if (!target || target.role === 'owner') throw new Error('Account not eligible for role change.');
    await updateDoc(doc(db, 'users', uid), { role, updatedAt:serverTimestamp() });
    return { message:'Account role changed to ' + role + '.' };
  }
  if (type === 'ex-submit-claim') {
    const isProvider = provider(s);
    const customerUid = isProvider ? String(data.get('customerUid') || '').trim() : s.user.uid;
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(customerUid))
      throw new Error('Enter a valid patient Member ID.');
    if (!isProvider && s.policy?.status !== 'active')
      throw new Error('Activate your coverage before submitting a claim.');
    const facility = String(data.get('facility') || '').trim();
    const serviceDate = String(data.get('serviceDate') || '');
    const serviceType = String(data.get('serviceType') || '');
    const notes = String(data.get('notes') || '').trim();
    const amount = parseMoney(data.get('amount'), 'medical bill amount');
    if (amount <= 0 || !when(serviceDate) || !facility || facility.length > 100 ||
      notes.length > 500 || !['Office Visit','Emergency Care','Hospital Stay',
      'Imaging','Medication','Laboratory','Surgery','Other'].includes(serviceType))
      throw new Error('Check your date, service, facility and bill amount.');
    await addDoc(collection(db, 'claims'), {
      customerUid, providerUid:isProvider ? s.user.uid : null, submittedBy:s.user.uid,
      facility,serviceDate,serviceType,notes,amount,
      status:'pending', approvedAmount:0, payoutStatus:'unpaid',
      decisionNote:'', reviewedBy:null,
      createdAt:serverTimestamp(), updatedAt:serverTimestamp()
    });
    return { message:'Medical claim submitted for staff review.' };
  }
  if (type === 'ex-review-claim') {
    if (!staff(s)) throw new Error('Staff access required.');
    const id = String(data.get('claimId') || '');
    const claim = s.claims.find(c => c.id === id);
    if (!claim || claim.status !== 'pending') throw new Error('This claim is no longer pending.');
    const decision = String(data.get('decision') || '');
    let approvedAmount = parseMoney(data.get('approvedAmount'), 'approved amount');
    const decisionNote = String(data.get('decisionNote') || '').trim();
    if (decision === 'denied') approvedAmount = 0;
    if (decision === 'approved') approvedAmount = claim.amount;
    if (!['approved','partially_approved','denied'].includes(decision) ||
      (decision === 'partially_approved' && !(approvedAmount > 0 && approvedAmount < claim.amount)) ||
      decisionNote.length > 500) throw new Error('For partial approval, enter an amount greater than $0 and less than the billed amount.');
    await updateDoc(doc(db, 'claims', id), {
      status:decision,approvedAmount,decisionNote,reviewedBy:s.user.uid,
      payoutStatus:'unpaid',updatedAt:serverTimestamp()
    });
    return { message:'Medical claim decision saved.' };
  }
  throw new Error('Unknown form.');
}
