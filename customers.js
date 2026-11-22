// Read-only customer directory (view customers_summary, built from orders). Click "الطلبات" to see a customer's orders.
export default {
  title: 'العملاء', table: 'customers_summary', pk: 'phone', readOnly: true, searchKey: 'customer_name',
  order: [['last_order_at', { ascending: false }]], rowLink: r => '#orders/' + encodeURIComponent(r.phone),
  columns: [{ key: 'customer_name', label: 'الاسم' }, { key: 'phone', label: 'الموبايل' }, { key: 'orders_count', label: 'عدد الطلبات' },
    { key: 'last_order_at', label: 'آخر طلب', render: r => new Date(r.last_order_at).toLocaleDateString('ar-EG') },
    { key: 'total_value', label: 'إجمالي المبيعات المسجلة', render: r => Number(r.total_value) ? Number(r.total_value).toLocaleString('ar-EG') : '—' }],
};
