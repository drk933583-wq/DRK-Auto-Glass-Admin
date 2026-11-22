// Vehicle variants / trims
export default {
  title: 'الفئات (Variants)', table: 'vehicle_variants', select: '*, generations(name, models(name))', searchKey: 'name',
  order: [['name', { ascending: true }]],
  columns: [{ key: 'g', label: 'الجيل', render: r => `${r.generations?.models?.name ?? ''} ${r.generations?.name ?? ''}` },
    { key: 'name', label: 'الفئة' }, { key: 'market', label: 'السوق' }, { key: 'engine_info', label: 'المحرك/التجهيز' }, { key: 'is_active', label: 'فعّال' }],
  fields: [{ key: 'generation_id', label: 'الجيل', type: 'select', required: true,
      options: { table: 'generations', select: 'id,name,models(name)', label: o => `${o.models?.name ?? ''} – ${o.name}` } },
    { key: 'name', label: 'اسم الفئة', required: true }, { key: 'market', label: 'السوق / المنطقة' },
    { key: 'engine_info', label: 'المحرك أو التجهيز' }, { key: 'is_active', label: 'فعّال', type: 'checkbox', default: true }],
};
