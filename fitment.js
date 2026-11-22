// Fitment = which product fits which vehicle generation/variant at which glass position.
// Only rows that are BOTH active AND verified are visible to the public. Verify only real, checked compatibility.
export default {
  title: 'التوافق (Fitment)', table: 'product_fitments',
  select: '*, generations(name, models(name, brands(name))), glass_positions(label_ar,name), products(code,name)',
  order: [['created_at', { ascending: false }]],
  columns: [{ key: 'g', label: 'السيارة', render: r => `${r.generations?.models?.brands?.name ?? ''} ${r.generations?.models?.name ?? ''} ${r.generations?.name ?? ''}` },
    { key: 'pos', label: 'الموضع', render: r => r.glass_positions?.label_ar || r.glass_positions?.name }, { key: 'p', label: 'المنتج', render: r => r.products?.code },
    { key: 'yrs', label: 'السنوات', render: r => r.year_from || r.year_to ? `${r.year_from ?? '?'}–${r.year_to ?? '…'}` : '' },
    { key: 'is_verified', label: 'موثّق' }, { key: 'is_active', label: 'فعّال' }],
  fields: [{ key: 'generation_id', label: 'الجيل', type: 'select', required: true,
      options: { table: 'generations', select: 'id,name,models(name,brands(name))', label: o => `${o.models?.brands?.name ?? ''} ${o.models?.name ?? ''} – ${o.name}` } },
    { key: 'variant_id', label: 'الفئة (اختياري)', type: 'select', options: { table: 'vehicle_variants', select: 'id,name,generations(name)', label: o => `${o.generations?.name ?? ''} – ${o.name}` } },
    { key: 'glass_position_id', label: 'موضع الزجاج', type: 'select', required: true, options: { table: 'glass_positions', select: 'id,label_ar,name', order: 'display_order', label: o => o.label_ar || o.name } },
    { key: 'product_id', label: 'المنتج', type: 'select', required: true, options: { table: 'products', select: 'id,code,name', order: 'code', label: o => `${o.code} – ${o.name}` } },
    { key: 'year_from', label: 'من سنة', type: 'number' }, { key: 'year_to', label: 'إلى سنة', type: 'number' },
    { key: 'required_specs', label: 'اشتراطات المواصفات (JSON)', type: 'json' }, { key: 'notes', label: 'ملاحظات', type: 'textarea' },
    { key: 'is_verified', label: 'موثّق (تم التأكد من التوافق)', type: 'checkbox', default: false }, { key: 'is_active', label: 'فعّال', type: 'checkbox', default: true }],
  validate: p => (p.year_from && p.year_to && p.year_to < p.year_from) ? 'سنة النهاية قبل سنة البداية.' : null,
};
