const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  updatePassword: (data) => request('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),

  // Products
  getProducts: () => request('/products'),
  getProductByBarcode: (barcode) => request(`/products/barcode/${barcode}`),
  upsertProduct: (product) => request('/products', { method: 'POST', body: JSON.stringify(product) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request('/categories'),
  addCategory: (name) => request('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: () => request('/customers'),
  addCustomer: (customer) => request('/customers', { method: 'POST', body: JSON.stringify(customer) }),
  updateCustomer: (id, customer) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(customer) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  processCustomerPayment: (id, amount, cashierId) => request(`/customers/${id}/payments`, { method: 'POST', body: JSON.stringify({ amount, cashierId }) }),

  // Sales
  processSale: (saleData) => request('/sales', { method: 'POST', body: JSON.stringify(saleData) }),

  // Reports
  getSalesReport: ({ period }) => request(`/reports/sales?period=${period}`),
  getSalesHistory: ({ month, year } = {}) => {
    let url = '/reports/history';
    if (month && year) {
      url += `?month=${month}&year=${year}`;
    }
    return request(url);
  },

  getAnalyticsSummary: () => request('/reports/analytics/summary'),
  getBestSellers: () => request('/reports/best-sellers'),

  // Receipts
  printReceipt: (saleData) => request('/receipts/print', { method: 'POST', body: JSON.stringify(saleData) }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // Alerts
  getLowStockAlerts: () => request('/alerts/low-stock'),
  getExpiringAlerts: () => request('/alerts/expiring'),
  getOverdueDebts: () => request('/alerts/overdue-debts'),

  // Stats
  getStats: () => request('/stats/summary'),

  // Aliases to match what some components use
  getDashboardStats: () => request('/stats/summary'),
  getExpiringProducts: () => request('/alerts/expiring'),
};

export default api;
