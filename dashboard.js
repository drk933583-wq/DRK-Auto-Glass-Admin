import { requireStaff, logout } from './auth.js';
import { renderCrud, h } from './crud.js';

const session = await requireStaff();        // redirects to login.html if not authorised
const routes = {
  brands: () => import('./brands.js'), models: () => import('./models.js'), generations: () => import('./generations.js'),
  dashboard: () => import('./overview.js'), reports: () => import('./reports.js'),
  orders: () => import('./orders.js'), customers: () => import('./customers.js'),
  variants: () => import('./vehicles.js'), glass: () => import('./glass.js'), products: () => import('./products.js'),
  prices: () => import('./prices.js'), fitment: () => import('./fitment.js'), branches: () => import('./branches.js'),
  settings: () => import('./settings.js'), import: () => import('./import.js'),
};
async function route() {
  const [key0, arg] = location.hash.slice(1).split('/'), key = key0 || 'dashboard', view = document.getElementById('view');
  document.querySelectorAll('.sidebar nav a').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + key));
  if (routes[key]) {
    try { const m = await routes[key](); if (m.render) await m.render(view, session, arg ? decodeURIComponent(arg) : ''); else renderCrud(view, m.default, session); }
    catch (e) { console.error(e); view.replaceChildren(h('p', { class: 'msg msg--error' }, 'تعذّر تحميل الصفحة.')); }
  } else view.replaceChildren(h('div', { class: 'card' }, h('h2', {}, key === 'dashboard' ? 'مرحباً' : 'قريبًا'),
    h('p', {}, key === 'dashboard' ? 'تم تسجيل دخولك. اختر قسمًا من القائمة.' : 'هذا القسم يُبنى في مرحلة لاحقة.')));
}
if (session) {
  document.getElementById('user-label').textContent = session.user.email;
  document.getElementById('role-label').textContent = session.roles.includes('admin') ? 'مدير' : 'مبيعات';
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('app').hidden = false;
  addEventListener('hashchange', route); route();
}
