export default {
  title: 'الفروع', table: 'branches', searchKey: 'name', order: [['display_order', { ascending: true }]],
  columns: [{ key: 'name', label: 'الفرع' }, { key: 'address', label: 'العنوان' }, { key: 'phone', label: 'الهاتف' }, { key: 'map_url', label: 'الموقع', render: r => r.map_url ? '✓' : '—' }, { key: 'is_active', label: 'فعّال' }],
  fields: [{ key: 'name', label: 'اسم الفرع', required: true }, { key: 'address', label: 'العنوان' }, { key: 'map_url', label: 'رابط الموقع على Google Maps (https://...)' }, { key: 'phone', label: 'الهاتف' },
    { key: 'image_path', label: 'صورة الفرع', type: 'file', bucket: 'branch-images' }, { key: 'services', label: 'الخدمات (مفصولة بفاصلة)', type: 'list' },
    { key: 'display_order', label: 'ترتيب العرض', type: 'number', default: 0 }, { key: 'is_active', label: 'فعّال', type: 'checkbox', default: true }],
  validate: p => (p.map_url && !/^https:\/\//.test(p.map_url)) ? 'رابط الموقع يجب أن يبدأ بـ https://' : null,
};
