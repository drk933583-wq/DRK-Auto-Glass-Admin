export default {
  title: 'مواضع الزجاج', table: 'glass_positions', searchKey: 'name', order: [['display_order', { ascending: true }]],
  columns: [{ key: 'label_ar', label: 'العربي' }, { key: 'label_en', label: 'English' }, { key: 'code', label: 'الكود' },
    { key: 'display_order', label: 'الترتيب' }, { key: 'is_active', label: 'فعّال' }],
  fields: [{ key: 'code', label: 'الكود (فريد، إنجليزي)', required: true }, { key: 'name', label: 'الاسم', required: true },
    { key: 'label_en', label: 'الاسم الإنجليزي' }, { key: 'label_ar', label: 'الاسم العربي' }, { key: 'description', label: 'الوصف', type: 'textarea' },
    { key: 'display_order', label: 'ترتيب العرض', type: 'number', default: 0 }, { key: 'is_active', label: 'فعّال', type: 'checkbox', default: true }],
};
