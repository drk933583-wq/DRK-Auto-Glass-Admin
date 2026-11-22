// Phase 7 – analytics. All numbers come from the analytics_summary() database function (real orders, no fake data).
import { supabase } from './supabase.js';
import { h } from './crud.js';
import { STATUS } from './orders.js';

const nf = n => Number(n || 0).toLocaleString('ar-EG');
const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const iso = (d, plusDays = 0) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + plusDays); return x.toISOString(); };
const ymd = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const SERVICE = { branch: 'فرع', mobile: 'خدمة متنقلة', unspecified: 'غير محدد' };

const kpi = (label, value, hint) => h('div', { class: 'kpi' }, h('small', {}, label), h('strong', {}, value), hint ? h('em', {}, hint) : null);
function bars(title, rows, nameFn = x => x) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return h('div', { class: 'card' }, h('h4', {}, title), !rows.length ? h('p', { class: 'muted' }, 'لا توجد بيانات.')
    : h('div', { class: 'bars' }, rows.map(r => { const fill = h('i', {}); fill.style.width = Math.max(3, r.count / max * 100) + '%';
      return h('div', { class: 'bar-row' }, h('span', {}, nameFn(r.name)), h('div', { class: 'bar' }, fill), h('b', {}, nf(r.count))); })));
}

export async function render(root, session, arg, opts = {}) {
  const overview = !!opts.overview;
  let from = '', to = '';
  if (!overview) { const t = new Date(); to = ymd(t); t.setDate(t.getDate() - 29); from = ymd(t); }
  const out = h('div', {}), msg = h('p', { class: 'msg', role: 'status' });
  const fromIn = h('input', { type: 'date', value: from, 'aria-label': 'من تاريخ' }), toIn = h('input', { type: 'date', value: to, 'aria-label': 'إلى تاريخ' });
  const preset = days => () => { if (days) { const t = new Date(); toIn.value = ymd(t); t.setDate(t.getDate() - days + 1); fromIn.value = ymd(t); } else fromIn.value = toIn.value = ''; load(); };
  const filter = overview ? null : h('div', { class: 'toolbar' }, h('label', {}, 'من ', fromIn), h('label', {}, 'إلى ', toIn),
    h('button', { class: 'btn', type: 'button', onclick: () => load() }, 'تطبيق'),
    [['7 أيام', 7], ['30 يومًا', 30], ['90 يومًا', 90], ['الكل', 0]].map(([l, d]) => h('button', { class: 'btn btn--ghost', type: 'button', onclick: preset(d) }, l)));
  root.replaceChildren(h('div', { class: 'toolbar' }, h('h2', {}, overview ? 'نظرة عامة' : 'التقارير والتحليلات')), filter, msg, out);

  async function load() {
    if (fromIn.value && toIn.value && fromIn.value > toIn.value) return void (msg.textContent = 'تاريخ البداية بعد تاريخ النهاية.');
    msg.textContent = ''; out.replaceChildren(h('p', { class: 'muted' }, 'جارٍ التحميل…'));
    const { data: d, error } = await supabase.rpc('analytics_summary', { p_from: fromIn.value ? iso(fromIn.value) : null, p_to: toIn.value ? iso(toIn.value, 1) : null });
    if (error) { out.replaceChildren(); msg.className = 'msg msg--error'; msg.textContent = 'تعذّر تحميل التحليلات: ' + error.message + ' (تأكد من تشغيل database/analytics.sql)'; return; }
    const st = d.by_status || {}, sections = [];
    sections.push(h('div', { class: 'kpis' },
      kpi('إجمالي الطلبات الواردة (Leads)', nf(d.leads)), kpi('جديدة', nf(st.new)), kpi('مؤكدة', nf(d.confirmed), 'مؤكد + قيد التنفيذ + مكتمل'),
      kpi('مكتملة', nf(d.completed)), kpi('ملغاة', nf(st.cancelled)), kpi('معدل التحويل', pct(d.confirmed, d.leads), 'مؤكدة ÷ الواردة'),
      kpi('الإيراد المسجل', nf(d.revenue), 'من الطلبات المكتملة فقط'), kpi('متوسط قيمة الطلب', nf(d.avg_order_value)),
      kpi('طلبات مفقودة', nf(d.lost), 'ملغي + غير متوفر'), kpi('قيد الإنجاز (مؤكد/تنفيذ)', nf(d.pipeline_value))));
    if (!d.leads) sections.push(h('p', { class: 'muted' }, 'لا توجد طلبات في هذه الفترة.'));
    else {
      sections.push(h('div', { class: 'grid2' }, bars('الماركات الأكثر طلبًا', d.by_brand), bars('مواضع الزجاج الأكثر طلبًا', d.by_position)));
      if (!overview) sections.push(h('div', { class: 'grid2' }, bars('الطلبات حسب الموديل', d.by_model), bars('السيارات الأكثر طلبًا', d.top_vehicles)),
        h('div', { class: 'grid2' }, bars('الطلبات حسب طريقة الخدمة', d.by_service, n => SERVICE[n] || n), bars('الطلبات حسب الحالة', Object.entries(st).map(([name, count]) => ({ name, count })), n => STATUS[n] || n)),
        bars('الطلبات حسب التاريخ', d.by_date.slice(-31)), bars('أسباب الفقد', d.lost_reasons));
    }
    if (overview) {
      const { data: rec } = await supabase.from('orders').select('reference,customer_name,status,created_at').order('created_at', { ascending: false }).limit(5);
      sections.push(h('div', { class: 'card' }, h('h4', {}, 'أحدث الطلبات'), h('ul', { class: 'plain' }, (rec || []).map(o => h('li', {},
        h('a', { href: '#orders/' + encodeURIComponent(o.reference), dir: 'ltr' }, o.reference), ' — ', o.customer_name, ' — ', h('span', { class: 'pill pill--' + o.status }, STATUS[o.status] || o.status))))));
    }
    sections.push(h('p', { class: 'muted' }, 'التعريفات: Lead = أي طلب وارد. المؤكد = مؤكد/قيد التنفيذ/مكتمل. الإيراد = مجموع المبلغ النهائي للمكتمل فقط. لا يُحتسب أي Lead كبيع.'));
    out.replaceChildren(...sections);
  }
  load();
}
