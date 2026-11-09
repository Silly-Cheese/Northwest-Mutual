// Northwest Mutual RP — role-aware home dashboard.
// Reads the same Firebase state already loaded by the main app; no extra services.
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);
const money = value => '$' + Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});
const fmtDate = ts => ts && typeof ts.toDate === 'function'
  ? ts.toDate().toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})
  : '—';
const statuses = ['active','pending','suspended','cancelled','approved','partially_approved','denied','paid','unpaid'];
const status = value => {
  const v = statuses.includes(value) ? value : 'none';
  return '<span class="dash-status dash-status-' + v + '">' +
    e(v === 'none' ? 'Not enrolled' : v.replaceAll('_',' ')) + '</span>';
};
const action = (tab,label,style='secondary') =>
  '<button class="btn dash-button btn-' + style + '" type="button" data-action="tab" data-tab="' +
  e(tab) + '">' + e(label) + '<span aria-hidden="true">↗</span></button>';
const greeting = s => e((s.profile?.displayName || s.user?.displayName || 'there').trim().split(/\s+/)[0]);
function hero(s,eyebrow,headline,desc,buttons,note) {
  return '<section class="dash-hero"><div class="dash-hero-main"><span class="dash-eyebrow">' +
    e(eyebrow) + '</span><h1>' + headline + '</h1><p>' + e(desc) + '</p>' +
    '<div class="dash-hero-actions">' + buttons + '</div></div>' +
    '<div class="dash-hero-aside"><span class="dash-aside-top">NORTHWEST MUTUAL</span>' +
    '<span class="dash-aside-mark">✚</span><span class="dash-aside-bottom">' +
    e(note) + '</span></div></section>';
}
function metric(label,value,caption,style) {
  return '<article class="dash-metric"><span class="dash-metric-label">' + e(label) +
    '</span><strong class="dash-metric-value">' + e(value) + '</strong>' +
    '<span class="dash-metric-caption' + (style?' dash-metric-accent':'') + '">' +
    e(caption) + '</span></article>';
}
function heading(title,sub,tab,button) {
  return '<div class="dash-section-heading"><div><h2>' + e(title) + '</h2>' +
    (sub?'<p>' + e(sub) + '</p>':'') + '</div>' +
    (tab?'<button class="dash-text-link" type="button" data-action="tab" data-tab="' +
    e(tab) + '">' + e(button || 'View all') + ' <span aria-hidden="true">→</span></button>':'') +
    '</div>';
}
function recentClaims(s,claims,headingText,emptyMessage,showMember=false) {
  const users = Object.fromEntries((s.adminUsers || []).map(u => [u.id,u]));
  return '<section class="dash-panel dash-activity"><div class="dash-panel-top">' +
    heading(headingText,'Latest fictional medical claim activity','claims','Open claims') +
    '</div>' +
    (claims.length?'<div class="dash-claim-list">' + claims.slice(0,5).map(c =>
      '<div class="dash-claim-row"><span class="dash-claim-icon" aria-hidden="true">▤</span>' +
      '<div class="dash-claim-main"><div class="dash-claim-name">' +
        e(c.facility || 'Medical service') + '</div>' +
        '<div class="dash-claim-meta">Invoice ' + e(c.invoiceNumber || 'not recorded') +
        ' · ' + e(c.serviceType || 'Medical service') +
        (showMember?' · ' + e(users[c.customerUid]?.displayName || 'Member'):'') +
        '</div></div><div class="dash-claim-end"><strong>' + money(c.amount) +
        '</strong>' + status(c.status) + '</div></div>'
    ).join('') + '</div>' :
    '<div class="dash-empty"><div class="dash-empty-symbol">▤</div><h3>No claims yet</h3>' +
    '<p>' + e(emptyMessage) + '</p></div>') + '</section>';
}
function customer(s,plan) {
  const p = s.policy;
  const active = p?.status === 'active';
  const submitted = s.claims || [];
  const pending = submitted.filter(c => c.status === 'pending').length;
  const buttons = active
    ? action('claims','Submit a claim','primary') + action('card','View insurance card','outline')
    : action('plans',p?'View insurance plans':'Choose a plan','primary') +
      action('claims','My claims','outline');
  const heroText = active ? 'Your medical coverage is active. Keep track of your claims and plan in one place.'
    : p?.status === 'pending' ? 'Your insurance request is awaiting approval. You can review your plan in the meantime.'
    : p?.status === 'suspended' ? 'Your coverage is suspended. Contact staff before submitting any new medical claims.'
    : 'Pick a fictional medical insurance plan to get started.';
  const coverage = p
    ? '<section class="dash-panel dash-coverage"><div class="dash-panel-top">' +
        heading('My coverage','Current plan and coverage terms','plans','View plans') +
        '</div><div class="dash-cover-header"><div><span class="dash-mini-label">INSURANCE PLAN</span>' +
        '<h3>' + e(plan?.name || p.plan) + '</h3></div>' + status(p.status) + '</div>' +
        '<div class="dash-cover-grid">' +
        '<div><span>Coverage rate</span><strong>' + (plan?e(plan.coverage)+'%':'—') + '</strong></div>' +
        '<div><span>Monthly RP premium</span><strong>' + (plan?money(plan.price):'—') + '</strong></div>' +
        '<div><span>RP deductible</span><strong>' + (plan?money(plan.deductible):'—') + '</strong></div>' +
        '<div><span>Requested</span><strong>' + fmtDate(p.createdAt) + '</strong></div></div>' +
        '<div class="dash-panel-actions">' + (active?action('card','Insurance card','secondary'):'') +
        action('plans','Plan details','outline') + '</div></section>'
    : '<section class="dash-panel dash-coverage"><div class="dash-empty">' +
        '<div class="dash-empty-symbol">✚</div><h3>No insurance plan selected</h3>' +
        '<p>Select a medical plan to request fictional coverage. You do not need a policy number to start.</p>' +
        action('plans','Explore plans','primary') + '</div></section>';
  return hero(s,'MY INSURANCE','Welcome back, ' + greeting(s) + '.',
      heroText,buttons,'CUSTOMER PORTAL') +
    '<div class="dash-metrics dash-metrics-three">' +
      metric('Coverage status',active?'Active':p?.status ? p.status[0].toUpperCase()+p.status.slice(1) : 'Not enrolled',
        active?'Your policy is available for RP claims':'Review your policy details',active) +
      metric('Total claims',String(submitted.length),'Medical claims submitted') +
      metric('Awaiting review',String(pending),pending===1?'1 claim needs staff review':'Claims pending a decision') +
    '</div>' +
    '<div class="dash-content-grid">' + coverage +
      recentClaims(s,submitted,'Recent claims',
        active?'Submit your first medical claim to track it here.':'Your claim history will appear here once you have active coverage.') +
    '</div>';
}
function provider(s) {
  const claims=s.claims || [];
  const pending=claims.filter(c=>c.status==='pending').length;
  const approved=claims.filter(c=>['approved','partially_approved'].includes(c.status)).length;
  const paid=claims.filter(c=>c.payoutStatus==='paid').length;
  return hero(s,'MEDICAL PROVIDER PORTAL','Welcome back, ' + greeting(s) + '.',
    'Submit fictional medical bills using the patient’s Member ID and required Invoice #, then follow each decision.',
    action('claims','Submit a medical claim','primary') + action('account','My account','outline'),
    'PROVIDER WORKSPACE') +
    '<div class="dash-metrics">' +
      metric('Claims submitted',String(claims.length),'Claims filed by your provider account') +
      metric('Pending review',String(pending),'Waiting for insurance staff') +
      metric('Approved',String(approved),'Full and partial approvals') +
      metric('Recorded payouts',String(paid),'Fictional payments recorded') +
    '</div><div class="dash-content-grid dash-provider-grid">' +
      recentClaims(s,claims,'Recent submissions','Submit a fictional invoice to see its progress here.') +
      '<section class="dash-panel dash-help"><div class="dash-panel-top">' +
        heading('Submit in three steps','Only fictional RP bills should be used') +
      '</div><div class="dash-steps">' +
        '<div><span>01</span><p>Ask the patient for their <strong>Member ID</strong>.</p></div>' +
        '<div><span>02</span><p>Enter the required <strong>Invoice #</strong> and bill details.</p></div>' +
        '<div><span>03</span><p>Follow the claim status after staff review.</p></div>' +
      '</div><div class="dash-panel-actions">' +
        action('claims','Open provider claims','secondary') + '</div></section></div>';
}
function operations(s,plan) {
  const claims=s.claims || [];
  const policies=s.adminPolicies || [];
  const users=Object.fromEntries((s.adminUsers||[]).map(u=>[u.id,u]));
  const pendingClaims=claims.filter(c=>c.status==='pending');
  const pendingPolicies=policies.filter(p=>p.status==='pending');
  const activePolicies=policies.filter(p=>p.status==='active');
  const unpaid=claims.filter(c=>['approved','partially_approved'].includes(c.status)&&c.payoutStatus==='unpaid');
  const count=pendingClaims.length+pendingPolicies.length+unpaid.length;
  const tasks=[
    ...pendingClaims.slice(0,4).map(c=>({
      label:'Claim review', detail:e(c.invoiceNumber || 'Invoice not recorded')+' · '+e(c.facility||'Medical facility'),
      name:users[c.customerUid]?.displayName||'Member',tag:'Review claim'
    })),
    ...pendingPolicies.slice(0,3).map(p=>({
      label:'Coverage request',detail:e(plan(s,p.plan)?.name || p.plan),name:users[p.id]?.displayName||'Member',tag:'Review policy'
    })),
    ...unpaid.slice(0,2).map(c=>({
      label:'RP payout',detail:e(c.invoiceNumber || 'Older claim')+' · '+money(c.approvedAmount),
      name:users[c.customerUid]?.displayName||'Member',tag:'Record payout'
    }))
  ];
  const tasksHtml=tasks.length
    ? '<div class="dash-task-list">' + tasks.slice(0,6).map(t=>
        '<div class="dash-task-row"><div><span class="dash-mini-label">' + e(t.label) + '</span>' +
          '<strong>' + e(t.name) + '</strong><p>' + t.detail + '</p></div>' +
          '<span class="dash-task-tag">' + e(t.tag) + '</span></div>'
      ).join('') + '</div>'
    : '<div class="dash-empty"><div class="dash-empty-symbol">✓</div><h3>All caught up</h3>' +
      '<p>New policy requests and medical claims will appear here.</p></div>';
  return hero(s,s.owner?'OWNER WORKSPACE':'STAFF WORKSPACE',
      'Good to see you, ' + greeting(s) + '.',
      count ? count+' insurance item'+(count===1?' needs':'s need')+' attention in your fictional medical insurance workspace.'
        : 'Everything is up to date. Your insurance operations are ready.',
      action('staff','Open Staff Center','primary')+
      action('reports','View reports','outline')+
      (s.owner?action('manage-plans','Manage plans','outline'):''),
      s.owner?'OWNER PORTAL':'STAFF PORTAL') +
    '<div class="dash-metrics">' +
      metric('Claims to review',String(pendingClaims.length),'Awaiting a decision') +
      metric('Policy requests',String(pendingPolicies.length),'Awaiting activation') +
      metric('Active policies',String(activePolicies.length),'Currently enrolled') +
      metric('RP payouts due',String(unpaid.length),'Approved, not yet recorded') +
    '</div><div class="dash-content-grid">' +
      '<section class="dash-panel dash-attention"><div class="dash-panel-top">' +
        heading('Needs attention','Prioritized claim and policy tasks','staff','Open work queue') +
      '</div>'+tasksHtml+'</section>' +
      '<section class="dash-panel dash-updates"><div class="dash-panel-top">' +
        heading('Insurance snapshot','Your current operations at a glance','reports','View reports') +
      '</div><div class="dash-ops-summary">' +
        '<div><span>Filed claims</span><strong>'+claims.length+'</strong></div>' +
        '<div><span>Total requested RP amount</span><strong>'+
          money(claims.reduce((a,c)=>a+(Number(c.amount)||0),0))+'</strong></div>' +
        '<div><span>Active insurance plans</span><strong>'+
          (s.planCatalog||[]).filter(p=>p.active).length+'</strong></div>' +
        '<div><span>Registered accounts</span><strong>'+(s.adminUsers||[]).length+'</strong></div>' +
      '</div><div class="dash-panel-actions">' + action('reports','Detailed reports','secondary') +
        (s.owner?action('manage-plans','Manage insurance plans','outline'):'') +
      '</div></section></div>' +
    '<div class="dash-followup">' + heading('Latest claim activity',
      'A quick view of medical claims in your RP system','staff','Review claims') +
      '<div class="dash-claim-grid">' + claims.slice(0,3).map(c=>
        '<div class="dash-claim-mini"><div class="dash-claim-mini-head"><span>Invoice '+
          e(c.invoiceNumber||'not recorded')+'</span>'+status(c.status)+'</div>'+
          '<strong>'+e(c.facility||'Medical facility')+'</strong>'+
          '<p>'+e(users[c.customerUid]?.displayName||'Member')+' · '+money(c.amount)+'</p></div>'
      ).join('')+(claims.length?'':'<p class="dash-no-claims">No claims have been filed yet.</p>')+
      '</div></div>';
}
export function renderDashboard(s,lookupPlan) {
  if (s.owner || s.profile?.role === 'staff') return operations(s,lookupPlan);
  if (s.profile?.role === 'provider') return provider(s);
  const plan=s.policy?lookupPlan(s,s.policy.plan):null;
  return customer(s,plan);
}
