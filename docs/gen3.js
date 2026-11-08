// Northwest Mutual RP — Generation 3: card printing and staff reports.
// Uses the same GitHub Pages app and Firestore data as Generation 2.
const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);
const dollars = v => '$' + (Number(v)||0).toLocaleString('en-US', {
  minimumFractionDigits:2, maximumFractionDigits:2
});
const stamp = t => t && typeof t.toDate === 'function'
  ? t.toDate().toLocaleDateString('en-US') : '';
const isStaff = s => s.owner || s.profile?.role === 'staff';
const heading = (title, desc, eyebrow) =>
  '<div class="section-heading" style="margin-top:0"><div><span class="eyebrow">' +
  safe(eyebrow) + '</span><h2>' + safe(title) + '</h2><p class="muted">' +
  safe(desc) + '</p></div></div>';

export function renderInsuranceCard(s, lookupPlan) {
  const policy = s.policy;
  const active = policy?.status === 'active';
  const plan = policy ? lookupPlan(s, policy.plan) : null;
  const name = s.profile?.displayName || s.user?.displayName || 'Member';
  const memberId = s.user?.uid || '';
  const note = active
    ? 'Your printable RP insurance card is ready.'
    : 'Activate a medical insurance policy before an insurance card can be issued.';
  const card = active
    ? '<div class="print-sheet">' +
      '<section class="insurance-card" aria-label="Fictional medical insurance member card">' +
      '<div class="insurance-card-head"><div><div class="insurance-card-brand">✚ &nbsp; NORTHWEST MUTUAL</div>' +
      '<div class="insurance-card-sub">MEDICAL INSURANCE · ROLEPLAY</div></div>' +
      '<div class="insurance-card-mark">NM</div></div>' +
      '<div class="insurance-card-rule"></div>' +
      '<div class="insurance-card-main"><div class="insurance-card-field">' +
      '<span>MEMBER NAME</span><strong>' + safe(name) + '</strong></div>' +
      '<div class="insurance-card-field"><span>INSURANCE PLAN</span><strong>' +
      safe(plan?.name || policy.plan) + '</strong></div>' +
      '<div class="insurance-card-field member-wide"><span>MEMBER ID</span><strong class="member-id">' +
      safe(memberId) + '</strong></div>' +
      '<div class="insurance-card-field"><span>RP COVERAGE</span><strong>' +
      safe(plan ? plan.coverage + '%' : 'See policy') + '</strong></div>' +
      '<div class="insurance-card-field"><span>RP DEDUCTIBLE</span><strong>' +
      (plan ? dollars(plan.deductible) : 'See policy') + '</strong></div></div>' +
      '<div class="insurance-card-bottom"><span>ACTIVE POLICY</span>' +
      '<span>FICTIONAL / NOT REAL INSURANCE</span></div></section></div>'
    : '<div class="card empty"><div class="empty-icon">▣</div><h3>No active insurance card</h3>' +
      '<p class="muted">Choose a plan and have staff approve coverage first.</p>' +
      '<button class="btn btn-primary" data-action="tab" data-tab="plans">View plans</button></div>';

  return '<div class="card-print-page">' + heading('Your Insurance Card',note,'MEMBER CARD') +
    (active
      ? '<div class="print-toolbar"><button class="btn btn-primary" data-action="gen3-print-card">Print / Save as PDF</button>' +
        '<span class="muted small">Use your browser print dialog to save a PDF copy.</span></div>'
      : '') + card +
    '<div class="inline-tips" style="margin-top:18px">ℹ &nbsp; This card is for fictional roleplay only. It cannot be used for real healthcare services, claims or insurance identification.</div>' +
    '</div>';
}

function filterClaims(s) {
  const filter = s.reportStatus || 'all';
  const term = String(s.reportQuery || '').toLowerCase().trim();
  return (s.claims || []).filter(c => {
    const statusMatches = filter === 'all' ||
      (filter === 'paid' ? c.payoutStatus === 'paid' : c.status === filter);
    const textMatches = !term || [
      c.invoiceNumber || '', c.facility || '', c.customerUid || '',
      c.serviceType || '', c.id || ''
    ].some(v => String(v).toLowerCase().includes(term));
    return statusMatches && textMatches;
  });
}
const sum = (xs, key) => xs.reduce((a, x) => a + (Number(x[key]) || 0), 0);
function stat(label, value, detail) {
  return '<div class="card stat"><div class="stat-label">' + safe(label) + '</div>' +
    '<div class="stat-number metric-figure">' + safe(value) + '</div>' +
    '<span class="muted small">' + safe(detail) + '</span></div>';
}

export function renderReports(s, lookupPlan) {
  if (!isStaff(s)) return '<p>Staff access required.</p>';
  const rows = filterClaims(s);
  const users = Object.fromEntries((s.adminUsers || []).map(u => [u.id,u]));
  const policies = s.adminPolicies || [];
  const active = policies.filter(p => p.status === 'active');
  const pending = rows.filter(c => c.status === 'pending').length;
  const reviewed = rows.filter(c => c.status !== 'pending');
  const paid = rows.filter(c => c.payoutStatus === 'paid');
  const authorized = reviewed.filter(c => ['approved','partially_approved'].includes(c.status));
  const payable = authorized.filter(c => c.payoutStatus !== 'paid');
  const estPremiums = active.reduce((total,p) =>
    total + Number(lookupPlan(s,p.plan)?.price || 0), 0);
  const planStats = (s.planCatalog || []).map(p => ({
    name:p.name, count:active.filter(a => a.plan === p.id).length
  })).filter(x => x.count);
  const status = s.reportStatus || 'all';
  const options = [
    ['all','All claims'],['pending','Pending'],['approved','Approved'],
    ['partially_approved','Partially approved'],['denied','Denied'],['paid','Recorded paid']
  ];
  const max = Math.max(...planStats.map(x=>x.count),1);
  const tableRows = rows.map(c => '<tr><td><strong>' + safe(c.invoiceNumber || 'Not recorded') +
    '</strong><div class="muted small">Claim ' + safe(c.id.slice(0,10)) +
    '</div></td><td>' + safe(users[c.customerUid]?.displayName || 'Member') +
    '</td><td>' + safe(c.facility) + '</td><td>' + dollars(c.amount) +
    '</td><td>' + safe(c.status.replaceAll('_',' ')) + '</td><td>' +
    dollars(c.approvedAmount) + '</td><td>' +
    safe(c.payoutStatus === 'paid' ? 'Recorded paid' : 'Not paid') + '</td></tr>').join('');
  return heading('Insurance Reports','Monitor fictional claims, payouts and member coverage.','STAFF REPORTS') +
    '<div class="report-summary grid-3">' +
      stat('Claims in view',String(rows.length),pending + ' waiting for review') +
      stat('Billed RP total',dollars(sum(rows,'amount')),'Across filtered claims') +
      stat('Approved RP total',dollars(sum(authorized,'approvedAmount')),authorized.length + ' approved / partially approved') +
      stat('Recorded RP payouts',dollars(sum(paid,'approvedAmount')),paid.length + ' marked paid') +
      stat('Unpaid approved RP',dollars(sum(payable,'approvedAmount')),payable.length + ' waiting for payout') +
      stat('Active policies',String(active.length),dollars(estPremiums) + ' estimated monthly RP premiums') +
    '</div>' +
    '<div class="grid-2 report-sections">' +
      '<section class="card card-pad"><h3>Active policies by plan</h3>' +
      (planStats.length ? planStats.map(p =>
        '<div class="bar-chart-item"><div class="bar-chart-line"><span>' + safe(p.name) +
        '</span><strong>' + p.count + '</strong></div><div class="bar-track"><div class="bar-fill" style="width:' +
        Math.max(2,(p.count / max)*100) + '%"></div></div></div>'
      ).join('') : '<p class="muted">No active policies yet.</p>') + '</section>' +
      '<section class="card card-pad"><h3>Reporting notes</h3>' +
      '<p class="muted">These figures are calculated from Firestore data. RP payouts only count as paid once staff record the payout.</p>' +
      '<p class="muted small">Estimated premiums represent selected plan prices, not actual collected revenue. Claims created before Generation 3 may not have an invoice number.</p>' +
      '</section></div>' +
    '<div class="section-heading"><h2>Claim register</h2></div>' +
    '<div class="card card-pad"><form class="reports-filter" data-form="gen3-filter-report">' +
      '<div class="field"><label class="label" for="report-search">Search invoice #, facility or member ID</label>' +
      '<input id="report-search" class="input" name="search" maxlength="120" placeholder="Search claim references" value="' +
      safe(s.reportQuery || '') + '"></div>' +
      '<div class="field"><label class="label" for="report-status">Status</label>' +
      '<select class="input" id="report-status" name="status">' +
      options.map(([v,label])=>'<option value="' + safe(v) + '"' +
        (v===status?' selected':'') + '>' + safe(label) + '</option>').join('') +
      '</select></div><button type="submit" class="btn btn-primary">Apply filters</button>' +
      '<button type="button" class="btn btn-outline" data-action="gen3-reset-report">Reset</button>' +
      '<button type="button" class="btn btn-secondary" data-action="gen3-export-csv">Export CSV</button></form>' +
      '<div class="muted small" style="margin:12px 0">' + rows.length + ' matching claims</div>' +
      '<div class="table-wrap"><table><thead><tr><th>Invoice #</th><th>Member</th><th>Facility</th>' +
      '<th>Billed</th><th>Status</th><th>Approved</th><th>Payment</th></tr></thead><tbody>' +
      (tableRows || '<tr><td colspan="7">No matching claims.</td></tr>') +
      '</tbody></table></div></div>';
}

function escapeCell(value) {
  const raw = String(value ?? '');
  // Mitigate CSV spreadsheet formula injection when staff export untrusted RP text.
  const protectedValue = /^[\s]*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + protectedValue.replaceAll('"','""') + '"';
}
export function reportsAction(action,s) {
  if (action === 'gen3-reset-report') {
    if (!isStaff(s)) throw new Error('Staff access required.');
    s.reportStatus = 'all'; s.reportQuery = '';
    return {message:'Report filters reset.'};
  }
  if (action === 'gen3-print-card') {
    if (s.policy?.status !== 'active') throw new Error('Active coverage required to print the card.');
    document.body.classList.add('printing-card');
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-card'),{once:true});
    window.print();
    return {message:'Use your browser to print or save the card as PDF.'};
  }
  if (action === 'gen3-export-csv') {
    if (!isStaff(s)) throw new Error('Staff access required.');
    const names = Object.fromEntries((s.adminUsers||[]).map(u=>[u.id,u.displayName||'Member']));
    const columns = ['Invoice #','Claim ID','Member','Member ID','Facility','Service','Service date',
      'Billed RP','Claim status','Approved RP','Payout status','Created'];
    const rows = filterClaims(s).map(c=>[
      c.invoiceNumber||'',c.id,names[c.customerUid]||'Member',c.customerUid,
      c.facility,c.serviceType,c.serviceDate,c.amount,c.status,
      c.approvedAmount,c.payoutStatus,stamp(c.createdAt)
    ]);
    const csv = [columns,...rows].map(row=>row.map(escapeCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a');
    a.href=url;
    a.download='northwest-mutual-rp-claims.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    return {message:'Filtered fictional claim report exported to CSV.'};
  }
  throw new Error('Unknown report action.');
}
export function reportsForm(type, data, s) {
  if (type !== 'gen3-filter-report' || !isStaff(s)) throw new Error('Staff access required.');
  const search = String(data.get('search')||'').trim();
  const status = String(data.get('status')||'all');
  if (search.length > 120 || ![
    'all','pending','approved','partially_approved','denied','paid'
  ].includes(status)) throw new Error('Invalid report filter.');
  s.reportQuery=search; s.reportStatus=status;
  return {message:'Report filters applied.'};
}
