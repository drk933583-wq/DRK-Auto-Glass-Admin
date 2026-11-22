// Prices are hidden from the public unless price_visible is ticked (enforced by RLS on product_prices).
export default {
  title: 'الأسعار', table: 'product_prices', pk: 'product_id', upsert: true, select: '*, products(code,name)',
  order: [['updated_at', { ascending: false }]],
  columns: [{ key: 'p', label: 'المنتج', render: r => `${r.products?.code ?? ''} – ${r.products?.name ?? ''}` },
    { key: 'selling_price', label: 'سعر البيع' }, { key: 'promo_price', label: 'سعر العرض' }, { key: 'price_visible', label: 'ظاهر للعامة' }],
  fields: [{ key: 'product_id', label: 'المنتج', type: 'select', required: true, options: { table: 'products', select: 'id,code,name', order: 'code', label: o => `${o.code} – ${o.name}` } },
    { key: 'selling_price', label: 'سعر البيع', type: 'number' }, { key: 'promo_price', label: 'سعر العرض', type: 'number' },
    { key: 'price_visible', label: 'إظهار السعر للعامة', type: 'checkbox', default: false }],
  validate: p => (p.price_visible && p.selling_price == null) ? 'لا يمكن إظهار السعر بدون سعر معتمد.' : (p.selling_price != null && p.selling_price < 0) ? 'السعر غير صالح.' : null,
};
