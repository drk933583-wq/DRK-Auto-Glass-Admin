export default {
  title: 'الأجيال', table: 'generations', select: '*, models(name, brands(name))', searchKey: 'name',
  order: [['name', { ascending: true }]],
  columns: [{ key: 'm', label: 'الموديل', render: r => `${r.models?.brands?.name ?? ''} ${r.models?.name ?? ''}` },
    { key: 'name', label: 'الجيل' }, { key: 'code', label: 'الكود' },
    { key: 'yrs', label: 'السنوات', render: r => `${r.start_year ?? '?'}–${r.end_year ?? '…'}` }, { key: 'is_active', label: 'فعّال' }],
  fields: [{ key: 'model_id', label: 'الموديل', type: 'select', required: true,
      options: { table: 'models', select: 'id,name,brands(name)', label: o => `${o.brands?.name ?? ''} – ${o.name}` } },
    { key: 'name', label: 'اسم الجيل', required: true }, { key: 'code', label: 'كود الجيل' },
    { key: 'start_year', label: 'من سنة', type: 'number' }, { key: 'end_year', label: 'إلى سنة', type: 'number' },
    { key: 'description', label: 'الوصف', type: 'textarea' }, { key: 'is_active', label: 'فعّال', type: 'checkbox', default: true }],
};
