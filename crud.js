// Generic config-driven CRUD view (list + search + pagination + add/edit dialog + activate + safe delete).
// UX only: every write is authorised by RLS (is_admin()) in the database.
import { supabase } from './supabase.js';

export const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
};

const PAGE = 20;
export const slugify = s => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const publicUrl = (bucket, path) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
const friendly = e => e.code === '23505' ? 'السجل موجود بالفعل (تكرار).'
  : e.code === '23503' ? 'لا يمكن تنفيذ العملية لوجود سجلات مرتبطة. عطّل السجل بدلًا من حذفه.'
  : e.code === '42501' ? 'ليست لديك صلاحية لهذه العملية.' : e.message;

export async function uploadImage(bucket, file) {
  const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  if (!ok.includes(file.type)) throw new Error('نوع الملف غير مسموح (PNG/JPG/WebP/SVG فقط).');
  if (file.size > 2 * 1024 * 1024) throw new Error('الحد الأقصى لحجم الصورة 2MB.');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function renderCrud(root, cfg, session) {
  const isAdmin = session.roles.includes('admin'), pk = cfg.pk || 'id', canEdit = isAdmin && !cfg.readOnly;
  let page = 0, q = '';
  const msg = h('p', { class: 'msg', role: 'status' });
  const say = (t, kind = 'info') => { msg.textContent = t; msg.className = `msg msg--${kind}`; };
  const search = h('input', { type: 'search', placeholder: 'بحث…', 'aria-label': 'بحث' });
  const addBtn = h('button', { class: 'btn', type: 'button', onclick: () => openForm(null) }, '+ إضافة');
  addBtn.hidden = !canEdit;
  const tbl = h('div', { class: 'tablewrap' }), pager = h('div', { class: 'pager' });
  root.replaceChildren(h('div', { class: 'toolbar' }, h('h2', {}, cfg.title), search, addBtn), msg, tbl, pager);
  if (!isAdmin && !cfg.readOnly) say('صلاحية عرض فقط. التعديل للمدير.', 'warn');

  let timer; search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { q = search.value.trim(); page = 0; load(); }, 300); });

  async function load() {
    tbl.replaceChildren(h('p', { class: 'muted' }, 'جارٍ التحميل…'));
    let qb = supabase.from(cfg.table).select(cfg.select || '*', { count: 'exact' });
    if (q && cfg.searchKey) qb = qb.ilike(cfg.searchKey, `%${q.replace(/[%_,()]/g, ' ')}%`);
    for (const [col, opts] of cfg.order || [['created_at', { ascending: false }]]) qb = qb.order(col, opts);
    const { data, error, count } = await qb.range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) { tbl.replaceChildren(); return say('تعذّر تحميل البيانات: ' + error.message, 'error'); }
    if (!data.length) tbl.replaceChildren(h('p', { class: 'muted' }, 'لا توجد سجلات.'));
    else tbl.replaceChildren(table(data));
    const pages = Math.max(1, Math.ceil(count / PAGE));
    pager.replaceChildren(
      h('button', { class: 'btn btn--ghost', type: 'button', disabled: page === 0, onclick: () => { page--; load(); } }, 'السابق'),
      h('span', {}, `صفحة ${page + 1} من ${pages} (${count} سجل)`),
      h('button', { class: 'btn btn--ghost', type: 'button', disabled: page + 1 >= pages, onclick: () => { page++; load(); } }, 'التالي'));
  }

  function table(rows) {
    const cell = (c, r) => { const v = c.render ? c.render(r) : r[c.key]; return typeof v === 'boolean' ? (v ? '✓' : '—') : (v ?? ''); };
    return h('table', {}, h('thead', {}, h('tr', {}, cfg.columns.map(c => h('th', {}, c.label)), (canEdit || cfg.rowLink) ? h('th', {}, 'إجراءات') : null)),
      h('tbody', {}, rows.map(r => h('tr', {}, cfg.columns.map(c => h('td', {}, cell(c, r))),
        canEdit ? h('td', { class: 'actions' },
          'is_active' in r ? h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => toggle(r) }, r.is_active ? 'تعطيل' : 'تفعيل') : null,
          h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => openForm(r) }, 'تعديل'),
          h('button', { class: 'btn btn--danger', type: 'button', onclick: () => remove(r) }, 'حذف')) : cfg.rowLink ? h('td', {}, h('a', { class: 'btn btn--ghost', href: cfg.rowLink(r) }, 'الطلبات')) : null))));
  }

  async function toggle(r) {
    const { error } = await supabase.from(cfg.table).update({ is_active: !r.is_active }).eq(pk, r[pk]);
    if (error) return say(friendly(error), 'error');
    say('تم التحديث.', 'ok'); load();
  }
  async function remove(r) {
    if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع.')) return;
    const { error } = await supabase.from(cfg.table).delete().eq(pk, r[pk]);
    if (error) return say(friendly(error), 'error');
    say('تم الحذف.', 'ok'); load();
  }

  async function openForm(row) {
    const optionSets = {};
    for (const f of cfg.fields.filter(f => f.type === 'select')) {
      const { data, error } = await supabase.from(f.options.table).select(f.options.select).order(f.options.order || 'name').limit(1000);
      if (error) return say('تعذّر تحميل الخيارات: ' + error.message, 'error');
      optionSets[f.key] = data;
    }
    const dlg = h('dialog', { class: 'dlg' });
    const err = h('p', { class: 'msg msg--error', role: 'alert' });
    const inputs = {};
    const form = h('form', { novalidate: true }, h('h3', {}, row ? 'تعديل' : 'إضافة'));
    for (const f of cfg.fields) {
      const id = 'f_' + f.key, val = row ? row[f.key] : f.default;
      let input;
      if (f.type === 'textarea') input = h('textarea', { id, rows: 3 }, val ?? '');
      else if (f.type === 'checkbox') input = h('input', { id, type: 'checkbox', checked: val ?? true });
      else if (f.type === 'choice' || f.type === 'tri') {
        const ch = f.type === 'tri' ? [['', 'غير معروف'], ['true', 'نعم'], ['false', 'لا']] : [['', '— اختر —'], ...f.choices];
        input = h('select', { id }, ch.map(([v, l]) => h('option', { value: v, selected: String(val ?? '') === v }, l)));
      }
      else if (f.type === 'json') input = h('textarea', { id, rows: 3, dir: 'ltr' }, val == null ? '' : JSON.stringify(val));
      else if (f.type === 'list') input = h('input', { id, type: 'text', value: (val || []).join(', ') });
      else if (f.type === 'select') input = h('select', { id }, h('option', { value: '' }, '— اختر —'),
        optionSets[f.key].map(o => h('option', { value: o.id, selected: o.id === val }, f.options.label(o))));
      else if (f.type === 'file') input = h('input', { id, type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml' });
      else input = h('input', { id, type: f.type || 'text', value: val ?? '', required: !!f.required, step: f.type === 'number' ? 'any' : null });
      inputs[f.key] = input;
      const preview = f.type === 'file' && val ? h('img', { class: 'thumb', src: publicUrl(f.bucket, val), alt: '' }) : null;
      form.append(h('div', { class: f.type === 'checkbox' ? 'row row--check' : 'row' }, h('label', { for: id }, f.label + (f.required ? ' *' : '')), input, preview));
    }
    const save = h('button', { class: 'btn', type: 'submit' }, 'حفظ');
    form.append(err, h('div', { class: 'actions' }, save, h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => dlg.close() }, 'إلغاء')));
    form.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = ''; save.disabled = true;
      try {
        const p = {};
        for (const f of cfg.fields) {
          const el = inputs[f.key];
          if (f.type === 'checkbox') p[f.key] = el.checked;
          else if (f.type === 'tri') p[f.key] = el.value === '' ? null : el.value === 'true';
          else if (f.type === 'json') { const v = el.value.trim(); try { p[f.key] = v === '' ? {} : JSON.parse(v); } catch { throw new Error(`الحقل "${f.label}" ليس JSON صالحًا.`); } }
          else if (f.type === 'list') p[f.key] = el.value.split(',').map(x => x.trim()).filter(Boolean);
          else if (f.type === 'file') { if (el.files[0]) p[f.key] = await uploadImage(f.bucket, el.files[0]); }
          else { const v = el.value.trim(); p[f.key] = v === '' ? null : (f.type === 'number' ? Number(v) : v); }
          if (f.required && (p[f.key] == null || p[f.key] === '')) throw new Error(`الحقل "${f.label}" مطلوب.`);
        }
        if (cfg.slugFrom && !p.slug) p.slug = slugify(p[cfg.slugFrom[0]] || p[cfg.slugFrom[1]]) || 'item-' + Date.now();
        if (cfg.validate) { const m = cfg.validate(p); if (m) throw new Error(m); }
        const { error } = cfg.upsert ? await supabase.from(cfg.table).upsert(p, { onConflict: pk })
          : row ? await supabase.from(cfg.table).update(p).eq(pk, row[pk]) : await supabase.from(cfg.table).insert(p);
        if (error) throw error;
        dlg.close(); say('تم الحفظ.', 'ok'); load();
      } catch (ex) { err.textContent = friendly(ex); } finally { save.disabled = false; }
    });
    dlg.append(form); dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg); dlg.showModal();
  }
  load();
}
