// Northwest Mutual RP: secure, simple change-of-plan requests.
// Customers can change a pending selection immediately; active coverage changes
// are reviewed by staff and applied atomically with the review decision.
import {
  doc, collection, getDoc, getDocs, runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const clean = v => String(v ?? '').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const dollars = value => '$' + Number(value || 0).toLocaleString('en-US',{
  minimumFractionDigits:2,maximumFractionDigits:2
});
const isStaff = s => s.owner || s.profile?.role === 'staff';
const timestamp = t => t && typeof t.toDate === 'function'
  ? t.toDate().toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})
  : '—';
const knownStatuses = ['pending','approved','denied','withdrawn'];
const status = v => {
  const safe=knownStatuses.includes(v)?v:'pending';
  return '<span class="pc-state pc-state-'+safe+'">'+
    clean(safe[0].toUpperCase()+safe.slice(1))+'</span>';
};
const planName = (s,id) => clean(s.planCatalog?.find(p=>p.id===id)?.name || id || 'Unknown');
const planData = (s,id) => s.planCatalog?.find(p=>p.id===id);
function priceDifference(s, from, to) {
  const a=planData(s,from), b=planData(s,to);
  if(!a || !b) return 'The requested plan terms will be confirmed during review.';
  const change=Number(b.price)-Number(a.price);
  const wording=change > 0 ? dollars(change) + ' more per RP month'
    : change < 0 ? dollars(Math.abs(change)) + ' less per RP month'
    : 'No monthly RP premium difference';
  return wording+' · '+b.coverage+'% coverage · '+dollars(b.deductible)+' RP deductible';
}

export async function loadPlanChanges(s,db) {
  s.planChange=null;
  s.planChanges=[];
  if(!s.user) return;
  if(isStaff(s)){
    const all=await getDocs(collection(db,'planChangeRequests'));
    s.planChanges=all.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>{
        if((a.status==='pending') !== (b.status==='pending')) return a.status==='pending'?-1:1;
        return (b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0);
      });
    s.planChange=s.planChanges.find(x=>x.uid===s.user.uid)||null;
  }else{
    const current=await getDoc(doc(db,'planChangeRequests',s.user.uid));
    s.planChange=current.exists()?{id:current.id,...current.data()}:null;
  }
}

export function renderPlanChangePanel(s) {
  const p=s.policy;
  if(!p || !['active','suspended'].includes(p.status)) return '';
  const change=s.planChange;
  const pending=change?.status==='pending';
  const incoming=change&&planName(s,change.toPlan);
  let content='';
  if(pending){
    content='<div class="pc-request-current">'+
      '<div class="pc-request-heading">'+status('pending')+'<strong>Plan change awaiting staff review</strong></div>'+
      '<p>Requested change: <strong>'+planName(s,change.fromPlan)+'</strong> → <strong>'+
      incoming+'</strong>. Your current policy stays on <strong>'+
      planName(s,p.plan)+'</strong> until a staff member approves the request.</p>'+
      (change.note?'<p class="pc-small">Your note: '+clean(change.note)+'</p>':'')+
      '<button class="btn btn-outline btn-small" type="button" data-action="pc-withdraw">Withdraw request</button>'+
      '</div>';
  }else if(change && ['approved','denied','withdrawn'].includes(change.status)){
    content='<div class="pc-last-decision">'+status(change.status)+
      '<span>Your last request: <strong>'+planName(s,change.fromPlan)+'</strong> → <strong>'+
      incoming+'</strong>'+(change.status==='approved'?' · Change applied':'')+'</span>'+
      (change.decisionNote?'<p>Staff note: '+clean(change.decisionNote)+'</p>':'')+
      '</div>';
  }
  const target=s.planChangeTarget&&s.planCatalog?.find(x=>x.id===s.planChangeTarget&&x.active);
  if(target && target.id!==p.plan && !pending){
    content+='<form class="pc-request-form" data-form="pc-request">'+
      '<div class="pc-form-header"><div><span class="eyebrow">REVIEW YOUR REQUEST</span>'+
      '<h3>Request '+clean(target.name)+'</h3>'+
      '<p>Your current plan remains in effect until this change is approved.</p></div>'+
      '<button class="btn btn-outline btn-small" type="button" data-action="pc-cancel-target">Cancel</button></div>'+
      '<div class="pc-compare-pair"><div><span>Current plan</span><strong>'+planName(s,p.plan)+
      '</strong><small>'+(planData(s,p.plan)?dollars(planData(s,p.plan).price):'—')+'/ RP month</small></div>'+
      '<span class="pc-arrow" aria-hidden="true">→</span><div><span>Requested plan</span><strong>'+
      clean(target.name)+'</strong><small>'+dollars(target.price)+'/ RP month</small></div></div>'+
      '<p class="pc-change-detail">'+clean(priceDifference(s,p.plan,target.id))+'</p>'+
      '<label class="label" for="pc-note">Optional reason for changing</label>'+
      '<textarea class="input area" id="pc-note" name="note" maxlength="240" rows="2" placeholder="For example: I need different coverage."></textarea>'+
      '<div class="pc-form-actions"><button class="btn btn-primary" type="submit">Send change request</button>'+
      '<span class="muted small">Staff approval required · No automatic policy replacement</span></div>'+
      '</form>';
  }
  return '<section class="pc-member-panel"><div class="pc-member-head"><div>'+
    '<span class="eyebrow">PLAN FLEXIBILITY</span><h3>Manage your coverage</h3>'+
    '<p>You can ask to move to another medical insurance plan without cancelling your current coverage.</p>'+
    '</div><span class="pc-plan-pill">'+planName(s,p.plan)+'</span></div>'+
    content+(pending?'<p class="pc-small pc-footnote">Only one request may be pending at a time. Withdraw it to select another plan.</p>':
    '<p class="pc-small pc-footnote">Select another plan below to compare it and request a change.</p>')+'</section>';
}

export function renderPlanChangeStaff(s) {
  if(!isStaff(s)) return '';
  const users=Object.fromEntries((s.adminUsers||[]).map(u=>[u.id,u]));
  const pending=(s.planChanges||[]).filter(x=>x.status==='pending');
  const recent=(s.planChanges||[]).filter(x=>x.status!=='pending').slice(0,5);
  const policies=Object.fromEntries((s.adminPolicies||[]).map(p=>[p.id,p]));
  const reviewCards=pending.map(c=>{
    const member=users[c.uid]||{};
    const current=policies[c.uid];
    const outdated=current?.plan!==c.fromPlan || !['active','suspended'].includes(current?.status);
    const target=planData(s,c.toPlan);
    const available=target?.active===true;
    return '<article class="pc-review-card"><div class="pc-review-top"><div>'+
      '<span class="eyebrow">MEMBER PLAN CHANGE</span><h3>'+clean(member.displayName||'Member')+
      '</h3><p>'+clean(member.email||c.uid)+'</p></div>'+status('pending')+'</div>'+
      '<div class="pc-review-comparison"><span>'+planName(s,c.fromPlan)+'</span>'+
      '<span aria-hidden="true">→</span><strong>'+planName(s,c.toPlan)+'</strong></div>'+
      '<p class="pc-review-price">'+clean(priceDifference(s,c.fromPlan,c.toPlan))+'</p>'+
      (c.note?'<p class="pc-request-reason"><strong>Member note:</strong> '+clean(c.note)+'</p>':'')+
      ((!available||outdated)?'<div class="pc-warning">This request needs attention: '+
        (!available?'the requested plan is no longer available. ':'')+
        (outdated?'the current policy has changed or is no longer active/suspended.':'')+
        ' It cannot be approved until these conditions are resolved.</div>':'')+
      '<form data-form="pc-review"><input type="hidden" name="uid" value="'+clean(c.uid)+'">'+
      '<label class="label" for="pc-decision-'+clean(c.uid)+'">Decision</label>'+
      '<select class="input" name="decision" id="pc-decision-'+clean(c.uid)+'">'+
        '<option value="approved"'+(outdated||!available?' disabled':'')+'>Approve and switch plan</option>'+
        '<option value="denied"'+(outdated||!available?' selected':'')+'>Decline request</option>'+
      '</select>'+
      '<label class="label" for="pc-reason-'+clean(c.uid)+'">Optional staff note</label>'+
      '<textarea class="input area" name="decisionNote" id="pc-reason-'+clean(c.uid)+
        '" maxlength="240" rows="2" placeholder="Reason or further instructions"></textarea>'+
      '<button type="submit" class="btn btn-primary">Save decision</button></form></article>';
  }).join('');
  const rows=recent.map(c=>{
    const user=users[c.uid]||{};
    return '<tr><td>'+clean(user.displayName||'Member')+'</td><td>'+planName(s,c.fromPlan)+
      ' → '+planName(s,c.toPlan)+'</td><td>'+status(c.status)+'</td><td>'+
      timestamp(c.updatedAt)+'</td></tr>';
  }).join('');
  return '<section class="pc-staff-queue" id="pc-staff-queue"><div class="section-heading">'+
    '<div><h2>Plan change requests <span class="pc-queue-count">'+pending.length+
    '</span></h2><p class="muted small">Changes need staff approval. Coverage remains in place during review.</p></div>'+
    '</div>'+(pending.length?'<div class="pc-review-grid">'+reviewCards+'</div>':
    '<div class="card pc-empty-queue"><span aria-hidden="true">✓</span>'+
      '<div><strong>No pending plan changes</strong><p>New member requests will appear here.</p></div></div>')+
    (recent.length?'<details class="pc-recent"><summary>Recent request decisions ('+recent.length+
      ')</summary><div class="table-wrap"><table><thead><tr><th>Member</th><th>Change</th>'+
      '<th>Result</th><th>Updated</th></tr></thead><tbody>'+rows+'</tbody></table></div></details>':'')+
    '</section>';
}

function planRef(db,id) { return doc(db,'plans',id); }
function policyRef(db,uid) { return doc(db,'policies',uid); }
function requestRef(db,uid) { return doc(db,'planChangeRequests',uid); }
function eligiblePolicy(value) {
  return value && ['active','suspended'].includes(value.status);
}
async function withdrawRequest(s,db) {
  const uid=s.user.uid;
  await runTransaction(db, async tx=>{
    const req=await tx.get(requestRef(db,uid));
    if(!req.exists() || req.data().status!=='pending')
      throw new Error('This request is no longer pending. Refresh the page.');
    tx.update(requestRef(db,uid),{status:'withdrawn',updatedAt:serverTimestamp()});
  });
  s.planChangeTarget=null;
  return {message:'Plan change request withdrawn. Your existing coverage was not changed.'};
}

export async function planChangeAction(action,button,s,db) {
  if(action==='pc-cancel-target'){
    s.planChangeTarget=null;
    return {message:'Plan comparison closed.'};
  }
  if(action==='pc-select'){
    const id=button.dataset.plan;
    if(!s.user || !eligiblePolicy(s.policy)) throw new Error('An active or suspended policy is required to request a plan change.');
    if(s.planChange?.status==='pending') throw new Error('Withdraw your pending plan request before choosing another.');
    if(id===s.policy.plan) throw new Error('You already have this plan.');
    if(!s.planCatalog.some(p=>p.id===id&&p.active)) throw new Error('This plan is no longer available.');
    s.planChangeTarget=id;
    return {message:'Review the plan comparison, then submit your request.'};
  }
  if(action==='pc-withdraw'){
    if(!s.user) throw new Error('Sign in first.');
    return await withdrawRequest(s,db);
  }
  throw new Error('Unknown plan change action.');
}

async function submitPlanChange(data,s,db) {
  const uid=s.user?.uid;
  const note=String(data.get('note')||'').trim();
  const targetId=s.planChangeTarget;
  if(!uid||!targetId)throw new Error('Select a plan before sending a request.');
  if(note.length>240)throw new Error('Keep the note under 240 characters.');
  await runTransaction(db,async tx=>{
    const policySnap=await tx.get(policyRef(db,uid));
    const existing=await tx.get(requestRef(db,uid));
    const requested=await tx.get(planRef(db,targetId));
    if(!policySnap.exists()||!eligiblePolicy(policySnap.data()))
      throw new Error('Your coverage must be active or suspended before you can request a change.');
    if(policySnap.data().plan===targetId)throw new Error('This is already your selected plan.');
    if(!requested.exists()||requested.data().active!==true)
      throw new Error('The requested plan is no longer available.');
    if(existing.exists()&&existing.data().status==='pending')
      throw new Error('You already have a pending request. Withdraw it first.');
    const next={
      uid,fromPlan:policySnap.data().plan,toPlan:targetId,note,
      status:'pending',decisionNote:'',reviewedBy:null,reviewedAt:null,
      createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    };
    tx.set(requestRef(db,uid),next);
  });
  s.planChangeTarget=null;
  return {message:'Plan change request sent. Your existing coverage stays in place until staff approve.'};
}
async function reviewPlanChange(data,s,db) {
  if(!isStaff(s))throw new Error('Staff access required.');
  const uid=String(data.get('uid')||'').trim();
  const decision=String(data.get('decision')||'');
  const decisionNote=String(data.get('decisionNote')||'').trim();
  if(!uid||!['approved','denied'].includes(decision)||decisionNote.length>240)
    throw new Error('Check the decision and staff note.');
  await runTransaction(db,async tx=>{
    const requestSnap=await tx.get(requestRef(db,uid));
    const policySnap=await tx.get(policyRef(db,uid));
    if(!requestSnap.exists()||requestSnap.data().status!=='pending')
      throw new Error('This plan request has already been reviewed.');
    const request=requestSnap.data();
    if(decision==='approved'){
      const targetSnap=await tx.get(planRef(db,request.toPlan));
      if(!policySnap.exists() || !eligiblePolicy(policySnap.data()) ||
        policySnap.data().plan!==request.fromPlan)
        throw new Error('The member’s policy has changed. Decline the old request and ask them to submit a new one.');
      if(!targetSnap.exists()||targetSnap.data().active!==true)
        throw new Error('The requested plan is retired. Decline the request or reactivate the plan.');
      // Both document updates succeed or neither succeeds.
      tx.update(policyRef(db,uid),{plan:request.toPlan,updatedAt:serverTimestamp()});
    }
    tx.update(requestRef(db,uid),{
      status:decision,reviewedBy:s.user.uid,reviewedAt:serverTimestamp(),
      decisionNote,updatedAt:serverTimestamp()
    });
  });
  return {message:decision==='approved'
    ? 'Change approved and member policy updated. The member’s coverage status was preserved.'
    : 'Plan change declined. The member’s current plan remains unchanged.'};
}
export async function planChangeForm(type,data,s,db) {
  if(type==='pc-request')return submitPlanChange(data,s,db);
  if(type==='pc-review')return reviewPlanChange(data,s,db);
  throw new Error('Unknown plan change form.');
}
