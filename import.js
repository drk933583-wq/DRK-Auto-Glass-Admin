// CSV import: parse -> validate -> PREVIEW -> commit. Nothing is written until the admin confirms.
import { supabase } from './supabase.js';
import { h, slugify } from './crud.js';
import { TEMPLATE, key, parseCSV, buildPlan } from './csv-utils.js';

async function fetchAll(table, select) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(select).order('id').range(from, from + 999);
    if (error) throw error; out.push(...data); if (data.length < 1000) break;
  }
  return out;
}
async function loadExisting() {
  const [b, m, g, v] = await Promise.all([fetchAll('brands', 'id,name'), fetchAll('models', 'id,name,brands(name)'),
    fetchAll('generations', 'id,name,models(name,brands(name))'), fetchAll('vehicle_variants', 'id,name,market,generations(name,models(name,brands(name)))')]);
  return {
    brands: new Set(b.map(x => key(x.name))), models: new Set(m.map(x => key(x.brands?.name, x.name))),
    gens: new Set(g.map(x => key(x.models?.brands?.name, x.models?.name, x.name))),
    variants: new Set(v.map(x => key(x.generations?.models?.brands?.name, x.generations?.models?.name, x.generations?.name, x.name, x.market || ''))),
  };
}
async function insertChunks(table, rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + 200));
    if (error) throw new Error(`${table}: ${error.message} (تم حفظ ${i} سجل من هذا الجدول قبل الخطأ)`);
  }
}
const uniqSlug = (set, base) => { const s = slugify(base) || 'item'; let c = s, n = 2; while (set.has(c)) c = `${s}-${n++}`; set.add(c); return c; };

async function commit(plan, active, say) {
  say('جارٍ حفظ الماركات…');
  const brandSlugs = new Set((await fetchAll('brands', 'id,slug')).map(x => x.slug));
  await insertChunks('brands', [...plan.brands.values()].map(b => ({ name: b.name, name_en: b.name, slug: uniqSlug(brandSlugs, b.name), is_active: active })));
  const brandId = new Map((await fetchAll('brands', 'id,name')).map(x => [key(x.name), x.id]));

  say('جارٍ حفظ الموديلات…');
  const used = new Set((await fetchAll('models', 'id,slug,brand_id')).map(x => x.brand_id + '|' + x.slug));
  await insertChunks('models', [...plan.models.values()].map(m => {
    const bid = brandId.get(key(m.brand));
    return { brand_id: bid, name: m.name, name_en: m.name, is_active: active,
      slug: uniqSlug({ has: s => used.has(bid + '|' + s), add: s => used.add(bid + '|' + s) }, m.name) };
  }));
  const modelId = new Map((await fetchAll('models', 'id,name,brands(name)')).map(x => [key(x.brands?.name, x.name), x.id]));

  say('جارٍ حفظ الأجيال…');
  await insertChunks('generations', [...plan.gens.values()].map(g => ({ model_id: modelId.get(key(g.brand, g.model)), name: g.name, code: g.code,
    start_year: g.start_year, end_year: g.end_year, is_active: active })));
  const genId = new Map((await fetchAll('generations', 'id,name,models(name,brands(name))')).map(x => [key(x.models?.brands?.name, x.models?.name, x.name), x.id]));

  say('جارٍ حفظ الفئات…');
  await insertChunks('vehicle_variants', [...plan.variants.values()].map(v => ({ generation_id: genId.get(key(v.brand, v.model, v.generation)),
    name: v.name, market: v.market, is_active: active })));
}

export async function render(root, session) {
  if (!session.roles.includes('admin')) return root.replaceChildren(h('p', { class: 'msg msg--warn' }, 'الاستيراد للمدير فقط.'));
  const msg = h('p', { class: 'msg', role: 'status' }), out = h('div', {});
  const say = (t, k = 'info') => { msg.textContent = t; msg.className = `msg msg--${k}`; };
  const file = h('input', { type: 'file', accept: '.csv,text/csv', 'aria-label': 'ملف CSV' });
  const active = h('input', { type: 'checkbox', id: 'act', checked: true });
  const tplBtn = h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => {
    const a = h('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + TEMPLATE], { type: 'text/csv' })), download: 'vehicles-template.csv' }); a.click(); } }, 'تحميل قالب CSV');
  const commitBtn = h('button', { class: 'btn', type: 'button', disabled: true }, 'تأكيد الاستيراد');
  let current = null;

  file.addEventListener('change', async () => {
    out.replaceChildren(); commitBtn.disabled = true; current = null;
    const f = file.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) return say('الملف أكبر من 5MB.', 'error');
    try {
      say('جارٍ فحص الملف…');
      const res = buildPlan(parseCSV(await f.text()), await loadExisting());
      if (res.fatal) return say(res.fatal, 'error');
      const c = k => res.plan[k].size, dup = res.rows.filter(r => r.status === 'dup').length;
      out.append(h('div', { class: 'card' }, h('h3', {}, 'معاينة'),
        h('p', {}, `جديد: ${c('brands')} ماركة، ${c('models')} موديل، ${c('gens')} جيل، ${c('variants')} فئة.`),
        h('p', {}, `سطور موجودة مسبقًا: ${res.rows.filter(r => r.status === 'exists').length} — مكررة داخل الملف: ${dup} — بها أخطاء: ${res.errors.length}.`)));
      if (res.errors.length) out.append(h('ul', { class: 'msg--error' }, res.errors.slice(0, 50).map(e => h('li', {}, e))));
      out.append(h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['سطر', 'ماركة', 'موديل', 'جيل', 'فئة', 'الحالة'].map(t => h('th', {}, t)))),
        h('tbody', {}, res.rows.slice(0, 200).map(r => h('tr', {}, [r.line, r.brand, r.model, r.generation, r.variant,
          { new: 'جديد', exists: 'موجود', dup: 'مكرر', error: 'خطأ' }[r.status]].map(v => h('td', {}, v ?? ''))))))));
      current = res;
      if (res.errors.length) say('أصلح الأخطاء في الملف ثم أعد رفعه. لن يتم حفظ شيء.', 'error');
      else if (!c('brands') + c('models') + c('gens') + c('variants')) say('لا توجد سجلات جديدة للاستيراد.', 'warn');
      else { say('راجع المعاينة ثم اضغط تأكيد الاستيراد.', 'ok'); commitBtn.disabled = false; }
    } catch (e) { console.error(e); say('تعذّر فحص الملف: ' + e.message, 'error'); }
  });
  commitBtn.addEventListener('click', async () => {
    if (!current || !confirm('سيتم حفظ السجلات الجديدة في قاعدة البيانات. متابعة؟')) return;
    commitBtn.disabled = true; file.disabled = true;
    try { await commit(current.plan, active.checked, say); say('تم الاستيراد بنجاح.', 'ok'); out.replaceChildren(); }
    catch (e) { console.error(e); say('توقف الاستيراد: ' + e.message + ' — أعد رفع الملف، السجلات الموجودة لن تتكرر.', 'error'); }
    finally { file.disabled = false; file.value = ''; }
  });
  root.replaceChildren(h('div', { class: 'toolbar' }, h('h2', {}, 'استيراد الكتالوج (CSV)'), tplBtn), 
    h('p', { class: 'muted' }, 'الأعمدة: brand, model, generation, generation_code, start_year, end_year, variant, market. الماركة والموديل مطلوبان. لا تُنشأ بيانات غير موجودة في ملفك.'),
    h('div', { class: 'row row--check' }, active, h('label', { for: 'act' }, 'تفعيل السجلات المستوردة مباشرة (أزل العلامة لمراجعتها أولًا)')),
    file, msg, out, h('div', { class: 'actions' }, commitBtn));
}
