// Navigation layer for the static Northwest Mutual RP GitHub Pages app.
// The Firestore security rules, not this UI, are the source of authorization.
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);

const shapes = {
  dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  plans:'<path d="m12 22 1.6-.68C18.8 19.1 21 15.5 21 10V5l-9-3-9 3v5c0 5.5 2.2 9.1 7.4 11.32L12 22Z"/><path d="m9 12 2 2 4-4"/>',
  card:'<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9h19M6.5 15h4"/>',
  claims:'<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5H8Z"/><path d="M15 3v5h6M7 13h10M7 17h7"/>',
  staff:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13c6 4 12 4 18 0M10 13h4"/>',
  reports:'<path d="M3 3v18h18M7 17v-5M12 17V8M17 17V5"/>',
  'manage-plans':'<path d="M4 7h16M4 17h16M9 4v6M15 14v6"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  owner:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 1.1 1.9-2.6 2.6-1.9-1.1a8 8 0 0 1-2 .8L13.5 22h-3L10 19.2a8 8 0 0 1-2-.8l-1.9 1.1-2.6-2.6L4.6 15a8 8 0 0 1-.8-2L1 12.5v-3L3.8 9a8 8 0 0 1 .8-2L3.5 5.1l2.6-2.6L8 3.6a8 8 0 0 1 2-.8L10.5 0h3L14 2.8a8 8 0 0 1 2 .8l1.9-1.1 2.6 2.6L19.4 7a8 8 0 0 1 .8 2l2.8.5v3l-2.8.5a8 8 0 0 1-.8 2Z" transform="translate(1 1) scale(.91)"/>',
  account:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  chevron:'<path d="m15 18-6-6 6-6"/>',
  exit:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M11 3h7a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-7"/>',
  arrow:'<path d="M7 17 17 7M8 7h9v9"/>'
};
function icon(name, size=19) {
  return '<svg class="nw-icon" xmlns="http://www.w3.org/2000/svg" width="' + size +
    '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (shapes[name] || shapes.dashboard) + '</svg>';
}
function isOps(state) { return state.owner || state.profile?.role === 'staff'; }
function getRole(state) {
  if (state.owner) return 'Owner';
  if (state.profile?.role === 'staff') return 'Staff';
  if (state.profile?.role === 'provider') return 'Medical provider';
  return 'Customer';
}
export function navigationGroups(state) {
  const groups = [
    {label:'Workspace', items:[['dashboard','Overview','dashboard']]},
    {label:'My insurance', items:[
      ['plans','Insurance plans','plans'],
      ['card','Insurance card','card'],
      ['claims', state.profile?.role === 'provider' ? 'Provider claims' : 'Medical claims','claims']
    ]}
  ];
  if (isOps(state)) groups.push({
    label:'Operations', items:[['staff','Staff Center','staff'],['reports','Reports','reports']]
  });
  if (state.owner) groups.push({
    label:'Administration', items:[['manage-plans','Manage plans','manage-plans'],['owner','Owner Desk','owner']]
  });
  groups.push({label:'Preferences', items:[['account','My account','account']]});
  return groups;
}
export function canNavigate(state, key) {
  return navigationGroups(state).some(group => group.items.some(item => item[0] === key));
}
function navButton(item, state, extraClass='') {
  const [key,label,iconName] = item;
  const active = state.tab === key;
  const pending = key === 'staff' && isOps(state)
    ? (state.claims || []).filter(c => c.status === 'pending').length +
      (state.adminPolicies || []).filter(p => p.status === 'pending').length +
      (state.planChanges || []).filter(c => c.status === 'pending').length
    : key === 'plans' && state.planChange?.status === 'pending' ? 1 : 0;
  return '<button type="button" class="nw-link ' + extraClass + (active ? ' nw-current' : '') +
    '" data-action="tab" data-tab="' + escapeText(key) +
    '" title="' + escapeText(label) + '"' +
    (active ? ' aria-current="page"' : '') + '>' +
    '<span class="nw-link-icon">' + icon(iconName) + '</span>' +
    '<span class="nw-link-text">' + escapeText(label) + '</span>' +
    (pending ? '<span class="nw-link-count" aria-label="' + pending + ' pending claims">' + pending + '</span>' : '') +
    '</button>';
}
function userInitials(name) {
  return (String(name || 'M').trim().split(/\s+/).slice(0,2)
    .map(n => n.charAt(0)).join('').toUpperCase()) || 'M';
}
export function navigationStart(state) {
  const groups = navigationGroups(state);
  const items = groups.flatMap(g => g.items);
  const activeItem = items.find(item => item[0] === state.tab) || items[0];
  const role = getRole(state);
  const name = state.profile?.displayName || state.user?.displayName || state.user?.email || 'Member';
  const policy = state.policy?.status || 'none';
  const policyMessage = state.profile?.role === 'provider'
    ? 'Provider access enabled'
    : policy === 'active' ? 'Coverage active' :
    policy === 'pending' ? 'Coverage pending' :
    policy === 'suspended' ? 'Coverage suspended' : 'Coverage not active';
  const menuItems = groups.map(group =>
    '<div class="nw-nav-group"><div class="nw-nav-caption">' + escapeText(group.label) + '</div>' +
    group.items.map(item => navButton(item,state)).join('') + '</div>'
  ).join('');
  // Keep the four smallest-screen shortcuts relevant to the signed-in role.
  const quickTabs = isOps(state)
    ? [['dashboard','Home','dashboard'], ['staff','Staff','staff'],
       ['reports','Reports','reports'], ['account','Account','account']]
    : state.profile?.role === 'provider'
      ? [['dashboard','Home','dashboard'], ['claims','Claims','claims'],
         ['plans','Plans','plans'], ['account','Account','account']]
      : [['dashboard','Home','dashboard'], ['plans','Plans','plans'],
         ['claims','Claims','claims'], ['card','Card','card']];
  return '<div class="nw-layout' + (state.navCollapsed ? ' nw-compact' : '') +
    (state.navOpen ? ' nw-open' : '') + '">' +
    '<button class="nw-dim" type="button" data-action="nav-close" aria-label="Close navigation menu" tabindex="-1"></button>' +
    '<aside id="nw-primary-navigation" class="nw-sidebar" aria-label="Application navigation">' +
      '<div class="nw-sidebar-top">' +
        '<button class="nw-wordmark" data-action="home" type="button" title="Northwest Mutual overview">' +
          '<span class="nw-logo">✚</span><span class="nw-wordmark-copy">' +
          '<strong>Northwest Mutual</strong><small>MEDICAL INSURANCE RP</small></span></button>' +
        '<button class="nw-icon-button nw-drawer-close" type="button" data-action="nav-close" aria-label="Close menu">' +
          icon('close',21) + '</button>' +
      '</div>' +
      '<div class="nw-sidebar-body"><nav class="nw-navigation" aria-label="Primary">' + menuItems + '</nav></div>' +
      '<div class="nw-sidebar-foot">' +
        '<div class="nw-policy-indicator" title="' + escapeText(policyMessage) + '">' +
          '<span class="nw-policy-dot nw-policy-' + escapeText(policy) + '"></span>' +
          '<span class="nw-policy-text">' + escapeText(policyMessage) + '</span></div>' +
        '<button class="nw-collapse-toggle" data-action="nav-collapse" type="button" aria-label="' +
          (state.navCollapsed ? 'Expand sidebar' : 'Collapse sidebar') +
          '" title="' + (state.navCollapsed ? 'Expand sidebar' : 'Collapse sidebar') + '">' +
          icon('chevron',17) + '<span class="nw-collapse-label">Collapse menu</span></button>' +
        '<button class="nw-sidebar-logout" type="button" data-action="logout">' +
          icon('exit',17) + '<span>Sign out</span></button>' +
      '</div>' +
    '</aside>' +
    '<div class="nw-page-area">' +
      '<header class="nw-page-header">' +
        '<div class="nw-header-left">' +
          '<button class="nw-icon-button nw-menu-toggle" type="button" data-action="nav-toggle"' +
          ' aria-expanded="' + (state.navOpen ? 'true' : 'false') +
          '" aria-controls="nw-primary-navigation" aria-label="Open navigation menu">' +
            icon('menu',22) + '</button>' +
          '<div class="nw-header-mobile-brand"><span class="nw-mobile-mark">✚</span>' +
            '<span>Northwest Mutual</span></div>' +
          '<div class="nw-breadcrumb"><span>Workspace</span><span class="nw-crumb-sep">/</span>' +
          '<strong>' + escapeText(activeItem[1]) + '</strong></div>' +
        '</div>' +
        '<div class="nw-header-right">' +
          '<span class="nw-role-chip">' + escapeText(role) + '</span>' +
          '<button type="button" class="nw-user-button" data-action="tab" data-tab="account" title="Open account settings">' +
            '<span class="nw-avatar">' + escapeText(userInitials(name)) + '</span>' +
            '<span class="nw-user-text"><strong>' + escapeText(name) +
            '</strong><small>Account settings</small></span></button>' +
        '</div>' +
      '</header>' +
      '<nav class="nw-bottom-tabs" aria-label="Quick navigation">' +
        quickTabs.map(item => navButton(item,state,'nw-quick-link')).join('') +
      '</nav>';
}
export function navigationEnd() {
  return '</div></div>';
}
