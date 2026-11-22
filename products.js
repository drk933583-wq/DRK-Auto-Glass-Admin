export default {
  title: 'المنتجات', table: 'products', select: '*, glass_positions(label_ar,name)', searchKey: 'name', order: [['created_at', { ascending: false }]],
  columns: [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الاسم' }, { key: 'pos', label: 'الموضع', render: r => r.glass_positions?.label_ar || r.glass_positions?.name },
    { key: 'origin', label: 'المصدر' }, { key: 'rain_sensor', label: 'حساس مطر' }, { key: 'camera', label: 'كاميرا' }, { key: 'is_active', label: 'فعّال' }],
  fields: [{ key: 'code', label: 'كود المنتج (فريد)', required: true }, { key: 'name', label: 'اسم المنتج', required: true }, { key: 'brand', label: 'العلامة' },
    { key: 'image_path', label: 'صورة المنتج', type: 'file', bucket: 'product-images' },
    { key: 'glass_position_id', label: 'موضع الزجاج', type: 'select', options: { table: 'glass_positions', select: 'id,label_ar,name', order: 'display_order', label: o => o.label_ar || o.name } },
    { key: 'manufacturer', label: 'المصنّع' }, { key: 'origin', label: 'المصدر', type: 'choice', choices: [['egyptian', 'مصري'], ['imported', 'مستورد'], ['other', 'آخر']] },
    { key: 'rain_sensor', label: 'متوافق مع حساس مطر', type: 'tri' }, { key: 'camera', label: 'متوافق مع كاميرا', type: 'tri' },
    { key: 'humidity_sensor', label: 'متوافق مع حساس رطوبة', type: 'tri' }, { key: 'mirror_base', label: 'قاعدة مرآة', type: 'tri' },
    { key: 'color', label: 'اللون' }, { key: 'extra_specs', label: 'مواصفات إضافية (JSON)', type: 'json' },
    { key: 'is_active', label: 'فعّال', type: 'checkbox', default: true }],
};
