// Phase 3 – Admin authentication. NOTE: this is UX only. Real protection is RLS (is_admin()/is_staff()) in the database.
import { supabase } from './supabase.js';

/** Returns the user's roles from user_roles (RLS lets a user read only their own rows). */
export async function getRoles(userId) {
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId);
  if (error) throw error;
  return data.map(r => r.role);
}

/** Returns { user, roles } if a valid staff session exists, otherwise null. Throws on network/DB errors. */
export async function getStaffSession() {
  if (!supabase) throw new Error('not_configured');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const roles = await getRoles(session.user.id);
  return roles.some(r => r === 'admin' || r === 'sales') ? { user: session.user, roles } : null;
}

/** Page guard: redirects to login.html when not an authorised staff member. */
export async function requireStaff() {
  try {
    const s = await getStaffSession();
    if (s) return s;
  } catch (e) { console.error('Auth check failed:', e); }
  location.replace('login.html');
  return null;
}

export async function logout() {
  await supabase.auth.signOut();
  location.replace('login.html');
}

// ---- Login page wiring (runs only when the login form exists) ----
const form = document.getElementById('login-form');
if (form) {
  const msg = document.getElementById('msg');
  const btn = form.querySelector('button');
  const fail = t => { msg.textContent = t; msg.style.color = '#C0392B'; };

  (async () => {                                   // already signed in? go straight in
    try { if (await getStaffSession()) location.replace('index.html'); } catch { /* stay on login */ }
  })();

  form.addEventListener('submit', async e => {
    e.preventDefault(); msg.textContent = '';
    const email = form.email.value.trim(), password = form.password.value;
    if (!email || !password) return fail('أدخل البريد الإلكتروني وكلمة المرور.');
    if (!supabase) return fail('لم يتم إعداد Supabase. عدّل admin/js/config.js.');
    btn.disabled = true; btn.textContent = 'جارٍ الدخول…';
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return fail('بيانات الدخول غير صحيحة.');
      const roles = await getRoles(data.user.id);
      if (!roles.some(r => r === 'admin' || r === 'sales')) {
        await supabase.auth.signOut();
        return fail('هذا الحساب غير مصرّح له بدخول لوحة التحكم.');
      }
      location.replace('index.html');
    } catch (err) {
      console.error(err); fail('حدث خطأ أثناء الاتصال. حاول مرة أخرى.');
    } finally { btn.disabled = false; btn.textContent = 'دخول'; }
  });
}
