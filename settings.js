import { supabase } from './supabase.js';
import { h, uploadImage } from './crud.js';

const FIELDS = [['company_name', 'اسم الشركة', 'text'], ['logo_path', 'الشعار', 'file'], ['contact_phone', 'هاتف التواصل', 'text'],
  ['whatsapp_number', 'رقم واتساب (دولي، أرقام فقط، بدون + أو مسافات)', 'text'], ['email', 'البريد الإلكتروني', 'text'], ['address', 'العنوان', 'text'],
  ['social_links', 'روابط التواصل (JSON)', 'json'], ['welcome_title', 'عنوان الصفحة الرئيسية', 'text'], ['welcome_text', 'وصف الصفحة الرئيسية', 'textarea'],
  ['cta_label', 'نص زر البداية', 'text'], ['services_text', 'وصف الخدمات', 'textarea'], ['footer_text', 'نص الفوتر', 'textarea'],
  ['privacy_policy', 'سياسة الخصوصية', 'textarea'], ['site_available', 'الموقع متاح للزوار', 'checkbox']];

export async function render(root, session) {
  if (!session.roles.includes('admin')) return root.replaceChildren(h('p', { class: 'msg msg--warn' }, 'الإعدادات للمدير فقط.'));
  const { data, error } = await supabase.from('website_settings').select('key,value');
  if (error) return root.replaceChildren(h('p', { class: 'msg msg--error' }, 'تعذّر تحميل الإعدادات: ' + error.message));
  const cur = Object.fromEntries(data.map(r => [r.key, r.value]));
  const inputs = {}, msg = h('p', { class: 'msg', role: 'status' });
  const form = h('form', { class: 'card', novalidate: true }, h('h2', {}, 'إعدادات الموقع'));
  for (const [k, label, type] of FIELDS) {
    const id = 's_' + k, v = cur[k];
    const el = type === 'textarea' ? h('textarea', { id, rows: 3 }, v ?? '')
      : type === 'checkbox' ? h('input', { id, type: 'checkbox', checked: v !== false })
      : type === 'json' ? h('textarea', { id, rows: 3, dir: 'ltr' }, JSON.stringify(v ?? {}))
      : type === 'file' ? h('input', { id, type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml' })
      : h('input', { id, type: 'text', value: v ?? '' });
    inputs[k] = el;
    const prev = type === 'file' && v ? h('img', { class: 'thumb', src: supabase.storage.from('website-assets').getPublicUrl(v).data.publicUrl, alt: '' }) : null;
    form.append(h('div', { class: type === 'checkbox' ? 'row row--check' : 'row' }, h('label', { for: id }, label), el, prev));
  }
  const save = h('button', { class: 'btn', type: 'submit' }, 'حفظ الإعدادات');
  form.append(msg, save);
  form.addEventListener('submit', async e => {
    e.preventDefault(); save.disabled = true; msg.className = 'msg'; msg.textContent = '';
    try {
      const rows = [];
      for (const [k, label, type] of FIELDS) {
        const el = inputs[k]; let value;
        if (type === 'checkbox') value = el.checked;
        else if (type === 'json') { try { value = JSON.parse(el.value || '{}'); } catch { throw new Error(`"${label}" ليس JSON صالحًا.`); } }
        else if (type === 'file') { if (!el.files[0]) continue; value = await uploadImage('website-assets', el.files[0]); }
        else value = el.value.trim();
        if (k === 'whatsapp_number' && value && !/^[0-9]{8,15}$/.test(value)) throw new Error('رقم واتساب يجب أن يكون أرقامًا فقط (8–15 رقم) بالصيغة الدولية بدون +.');
        rows.push({ key: k, value, updated_at: new Date().toISOString() });
      }
      const { error } = await supabase.from('website_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      msg.className = 'msg msg--ok'; msg.textContent = 'تم حفظ الإعدادات.';
    } catch (ex) { msg.className = 'msg msg--error'; msg.textContent = ex.message; } finally { save.disabled = false; }
  });
  root.replaceChildren(form);
}
