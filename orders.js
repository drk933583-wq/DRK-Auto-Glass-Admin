// Order management: list/filter, details, status workflow, internal notes, prices, assignment, history.
import { supabase } from './supabase.js';
import { h } from './crud.js';

export const STATUS = { new: 'جديد', under_verification: 'قيد التحقق', quotation_sent: 'تم إرسال عرض سعر', awaiting_customer: 'بانتظار العميل',
  confirmed: 'مؤكد', processing: 'قيد التنفيذ', completed: 'مكتمل', cancelled: 'ملغي', unavailable: 'غير متوفر' };
const VAL = { yes: 'نعم', no: 'لا', not_sure: 'غير متأكد', egyptian: 'مصري', imported: 'مستورد', no_preference: 'لا يوجد تفضيل' };
const PAGE = 20, LOST = ['cancelled', 'unavailable'];
const fmt = d => new Date(d).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
const clean = s => (s || '').replace(/[%_,().\\*]/g, ' ').trim();
const vehicleText = o => { const v = o.vehicle_snapshot || {}, parts = [v.brand, v.model, v.generation, v.year, v.variant].filter(Boolean);
  return (parts.length ? parts.join(' ') : (v.manual_text || 'غير محدد')) + (o.needs_manual_verification ? ' (تحقق يدوي)' : ''); };
const SERVICE = { branch: 'فرع', mobile: 'متنقلة' };
const posNames = items => (items || []).map(i => i.position_snapshot?.label_ar || i.position_snapshot?.label_en || '?');
const money = v => (v === '' || v == null) ? null : Number(v);

export async function render(root, session, initialSearch = '') {
  let page = 0, q = initialSearch, status = '';
  const msg = h('p', { class: 'msg', role: 'status' });
  const say = (t, k = 'info') => { msg.textContent = t; msg.className = `msg msg--${k}`; };
  const search = h('input', { type: 'search', placeholder: 'رقم الطلب / الاسم / الموبايل', value: q, 'aria-label': 'بحث' });
  const statusSel = h('select', { 'aria-label': 'الحالة' }, h('option', { value: '' }, 'كل الحالات'), Object.entries(STATUS).map(([k, l]) => h('option', { value: k }, l)));
  const tbl = h('div', { class: 'tablewrap' }), pager = h('div', { class: 'pager' });
  root.replaceChildren(h('div', { class: 'toolbar' }, h('h2', {}, 'الطلبات'), search, statusSel), msg, tbl, pager);
  let timer; search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { q = search.value; page = 0; load(); }, 300); });
  statusSel.addEventListener('change', () => { status = statusSel.value; page = 0; load(); });

  async function load() {
    tbl.replaceChildren(h('p', { class: 'muted' }, 'جارٍ التحميل…'));
    let qb = supabase.from('orders').select('id,reference,status,customer_name,phone,vehicle_snapshot,service_method,created_at,needs_manual_verification,order_items(position_snapshot)', { count: 'exact' });
    if (status) qb = qb.eq('status', status);
    const t = clean(q); if (t) qb = qb.or(`reference.ilike.%${t}%,customer_name.ilike.%${t}%,phone.ilike.%${t}%`);
    const { data, error, count } = await qb.order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) { tbl.replaceChildren(); return say('تعذّر تحميل الطلبات: ' + error.message, 'error'); }
    say('');
    tbl.replaceChildren(!data.length ? h('p', { class: 'muted' }, 'لا توجد طلبات.') : h('table', {}, h('thead', {}, h('tr', {}, ['الرقم', 'العميل', 'الموبايل', 'السيارة', 'الزجاج', 'الخدمة', 'التاريخ', 'الحالة', ''].map(x => h('th', {}, x)))),
      h('tbody', {}, data.map(o => h('tr', {}, h('td', { dir: 'ltr' }, o.reference), h('td', {}, o.customer_name), h('td', { dir: 'ltr' }, o.phone), h('td', {}, vehicleText(o)),
        h('td', {}, posNames(o.order_items).join('، ') || 'لم يُحدَّد'), h('td', {}, SERVICE[o.service_method] || 'غير محدد'), h('td', {}, fmt(o.created_at)),
        h('td', {}, h('span', { class: 'pill pill--' + o.status }, STATUS[o.status] || o.status)),
        h('td', {}, h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => openOrder(o.id) }, 'فتح')))))));
    const pages = Math.max(1, Math.ceil(count / PAGE));
    pager.replaceChildren(h('button', { class: 'btn btn--ghost', type: 'button', disabled: page === 0, onclick: () => { page--; load(); } }, 'السابق'),
      h('span', {}, `صفحة ${page + 1} من ${pages} (${count} طلب)`),
      h('button', { class: 'btn btn--ghost', type: 'button', disabled: page + 1 >= pages, onclick: () => { page++; load(); } }, 'التالي'));
  }

  async function staffOptions() {
    const me = session.user.id; if (!session.roles.includes('admin')) return [{ id: me, name: 'أنا' }];
    const { data: roles } = await supabase.from('user_roles').select('user_id');
    const ids = [...new Set((roles || []).map(r => r.user_id).concat(me))];
    const { data: profs } = await supabase.from('profiles').select('id,full_name').in('id', ids);
    const names = Object.fromEntries((profs || []).map(p => [p.id, p.full_name]));
    return ids.map(id => ({ id, name: id === me ? 'أنا' : names[id] || id.slice(0, 8) }));
  }

  async function openOrder(id) {
    const { data: o, error } = await supabase.from('orders').select('*, order_items(*), order_status_history(*), sales_notes(*)').eq('id', id).single();
    if (error) return say('تعذّر فتح الطلب: ' + error.message, 'error');
    const staff = await staffOptions();
    const dlg = h('dialog', { class: 'dlg dlg--wide' }), err = h('p', { class: 'msg msg--error', role: 'alert' });
    const row = (t, v) => h('div', { class: 'kv' }, h('b', {}, t), h('span', {}, v ?? '—'));
    const specs = Object.values(o.specs_snapshot || {}).map(s => `${s.label}: ${VAL[s.value] || s.value}`);
    const photo = h('span', {}, o.upload_path ? 'جارٍ التحميل…' : '—');
    if (o.upload_path) supabase.storage.from('customer-uploads').createSignedUrl(o.upload_path, 600).then(({ data }) => {
      photo.replaceChildren(data?.signedUrl ? h('a', { href: data.signedUrl, target: '_blank', rel: 'noopener' }, 'عرض الصورة') : 'تعذّر التحميل'); });

    const st = h('select', {}, Object.entries(STATUS).map(([k, l]) => h('option', { value: k, selected: k === o.status }, l)));
    const lost = h('input', { type: 'text', value: o.lost_reason || '', maxlength: 300 }), lostRow = h('label', { class: 'row' }, h('span', {}, 'سبب الإلغاء / عدم التوفر *'), lost);
    const quoted = h('input', { type: 'number', step: 'any', min: 0, value: o.quoted_price ?? '' }), fin = h('input', { type: 'number', step: 'any', min: 0, value: o.final_amount ?? '' });
    const asg = h('select', {}, h('option', { value: '' }, 'غير مُسند'), staff.map(s => h('option', { value: s.id, selected: s.id === o.assigned_to }, s.name)));
    const syncLost = () => { lostRow.hidden = !LOST.includes(st.value); }; st.addEventListener('change', syncLost); syncLost();
    const save = h('button', { class: 'btn', type: 'button' }, 'حفظ التغييرات');
    save.addEventListener('click', async () => {
      err.textContent = '';
      if (LOST.includes(st.value) && !lost.value.trim()) return void (err.textContent = 'اكتب سبب الإلغاء / عدم التوفر.');
      const qv = money(quoted.value), fv = money(fin.value);
      if ([qv, fv].some(n => n != null && (!Number.isFinite(n) || n < 0))) return void (err.textContent = 'المبلغ غير صالح.');
      save.disabled = true;
      const { data, error } = await supabase.from('orders').update({ status: st.value, lost_reason: LOST.includes(st.value) ? lost.value.trim() : null,
        quoted_price: qv, final_amount: fv, assigned_to: asg.value || null }).eq('id', o.id).eq('updated_at', o.updated_at).select('id');   // optimistic lock
      save.disabled = false;
      if (error) return void (err.textContent = 'تعذّر الحفظ: ' + error.message);
      if (!data.length) return void (err.textContent = 'تم تعديل هذا الطلب من مستخدم آخر. أغلق النافذة وأعد فتحه.');
      dlg.close(); say('تم تحديث الطلب.', 'ok'); load();
    });

    const noteIn = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'ملاحظة داخلية (لا يراها العميل)' }), notes = h('ul', { class: 'plain' });
    const drawNotes = list => notes.replaceChildren(...[...list].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(n => h('li', {}, h('small', {}, fmt(n.created_at) + (n.author_id === session.user.id ? ' — أنا' : ' — موظف')), h('div', {}, n.note))));
    drawNotes(o.sales_notes);
    const addNote = h('button', { class: 'btn btn--ghost', type: 'button' }, 'إضافة ملاحظة');
    addNote.addEventListener('click', async () => {
      const t = noteIn.value.trim(); if (!t) return;
      addNote.disabled = true;
      const { data, error } = await supabase.from('sales_notes').insert({ order_id: o.id, author_id: session.user.id, note: t }).select().single();
      addNote.disabled = false;
      if (error) return void (err.textContent = 'تعذّر إضافة الملاحظة: ' + error.message);
      o.sales_notes.push(data); drawNotes(o.sales_notes); noteIn.value = '';
    });
    const hist = [...o.order_status_history].sort((a, b) => b.created_at.localeCompare(a.created_at));

    dlg.append(h('h3', {}, 'الطلب ', h('span', { dir: 'ltr' }, o.reference)),
      h('div', { class: 'kvgrid' }, row('التاريخ', fmt(o.created_at)), row('العميل', o.customer_name), row('الموبايل', h('a', { href: 'tel:' + o.phone, dir: 'ltr' }, o.phone)),
        row('رقم إضافي', o.phone2), row('السيارة', vehicleText(o)), row('رقم الشاسيه', o.vin),
        row('مصدر الزجاج', VAL[o.origin_preference] || o.origin_preference), row('الخدمة', o.service_method === 'branch' ? `فرع: ${o.branch_snapshot?.name ?? 'لم يُحدَّد'} ${o.branch_snapshot?.address ?? ''}` : (SERVICE[o.service_method] || 'غير محدد')),
        row('العنوان', o.address), row('صورة العميل', photo)),
      h('div', { class: 'kv' }, h('b', {}, 'الزجاج المطلوب'), h('ul', { class: 'plain' }, !o.order_items.length ? [h('li', {}, 'لم يُحدَّد: العميل لا يعلم ويحتاج مساعدة')] : o.order_items.map(i => h('li', {}, (i.position_snapshot?.label_ar || '?') + (i.note ? ': ' + i.note : ''))))),
      h('div', { class: 'kv' }, h('b', {}, 'المواصفات'), h('span', {}, specs.length ? specs.join(' • ') : 'لم تُحدَّد')),
      o.customer_notes ? row('ملاحظات العميل', o.customer_notes) : null, h('hr'),
      h('div', { class: 'kvgrid' }, h('label', { class: 'row' }, h('span', {}, 'الحالة'), st), lostRow, h('label', { class: 'row' }, h('span', {}, 'السعر المعروض'), quoted),
        h('label', { class: 'row' }, h('span', {}, 'المبلغ النهائي المتفق عليه'), fin), h('label', { class: 'row' }, h('span', {}, 'مسؤول المبيعات'), asg)),
      err, h('div', { class: 'actions' }, save, h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => dlg.close() }, 'إغلاق')),
      h('hr'), h('h4', {}, 'ملاحظات داخلية'), noteIn, addNote, notes,
      h('h4', {}, 'سجل الحالات'), h('ul', { class: 'plain' }, hist.map(x => h('li', {}, `${fmt(x.created_at)} — ${x.old_status ? (STATUS[x.old_status] || x.old_status) + ' ← ' : ''}${STATUS[x.new_status] || x.new_status}`))));
    dlg.addEventListener('close', () => dlg.remove()); document.body.append(dlg); dlg.showModal();
  }
  load();
}
