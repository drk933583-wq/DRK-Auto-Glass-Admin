export default {
  title: 'الموديلات', table: 'models', select: '*, brands(name)', searchKey: 'name', slugFrom: ['name_en', 'name'],
  order: [['name', { ascending: true }]],
  columns: [{ key: 'brand', label: 'الماركة', render: r => r.brands?.name }, { key: 'name', label: 'الموديل' },
    { key: 'name_ar', label: 'بالعربي' }, { key: 'is_active', label: 'فعّال' }],
  fields: [{ key: 'brand_id', label: 'الماركة', type: 'select', required: true, options: { table: 'brands', select: 'id,name', label: o => o.name } },
    { key: 'name', label: 'اسم الموديل', required: true }, { key: 'name_en', label: 'الاسم الإنجليزي' }, { key: 'name_ar', label: 'الاسم العربي' },
    { key: 'slug', label: 'Slug (يُولَّد تلقائيًا)' }, { key: 'description', label: 'الوصف', type: 'textarea' },
    { key: 'is_active', label: 'فعّال', type: 'checkbox', default: true }],
};
