export default {
  title: 'الماركات', table: 'brands', searchKey: 'name', slugFrom: ['name_en', 'name'],
  order: [['display_order', { ascending: true }], ['name', { ascending: true }]],
  columns: [{ key: 'name', label: 'الاسم' }, { key: 'name_ar', label: 'بالعربي' }, { key: 'slug', label: 'Slug' },
    { key: 'display_order', label: 'الترتيب' }, { key: 'is_active', label: 'فعّال' }],
  fields: [{ key: 'name', label: 'اسم الماركة', required: true }, { key: 'name_en', label: 'الاسم الإنجليزي' },
    { key: 'name_ar', label: 'الاسم العربي' }, { key: 'slug', label: 'Slug (يُولَّد تلقائيًا)' },
    { key: 'logo_path', label: 'الشعار', type: 'file', bucket: 'brand-logos' },
    { key: 'display_order', label: 'ترتيب العرض', type: 'number', default: 0 }, { key: 'is_active', label: 'فعّال', type: 'checkbox', default: true }],
};
