const BASE = '/api';

function getToken() {
  return localStorage.getItem('ct_token');
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  const token = getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export const api = {
  // Auth
  login:          (email, password) => request('POST', '/auth/login', { email, password }),
  me:             ()                => request('GET',  '/auth/me'),
  changePassword: (b)               => request('POST', '/auth/change-password', b),

  // Dashboard
  dashboard:      ()                => request('GET',  '/dashboard'),

  // Companies
  getCompanies:   ()                => request('GET',  '/companies'),
  getCompany:     (id)              => request('GET',  `/companies/${id}`),
  createCompany:  (b)               => request('POST', '/companies', b),
  updateCompany:  (id, b)           => request('PATCH',`/companies/${id}`, b),

  // Canteens
  getCanteens:    (params='')       => request('GET',  `/canteens?${params}`),
  createCanteen:  (b)               => request('POST', '/canteens', b),
  toggleCanteen:  (id)              => request('PATCH',`/canteens/${id}/toggle`),
  getShifts:      (canteenId)       => request('GET',  `/canteens/${canteenId}/shifts`),
  createShift:    (canteenId, b)    => request('POST', `/canteens/${canteenId}/shifts`, b),

  // Employees
  getEmployees:   (params='')       => request('GET',  `/employees?${params}`),
  getEmployee:    (id)              => request('GET',  `/employees/${id}`),
  createEmployee: (b)               => request('POST', '/employees', b),
  updateEmployee: (id, b)           => request('PATCH',`/employees/${id}`, b),
  deleteEmployee: (id)              => request('DELETE',`/employees/${id}`),

  // Check-ins
  checkin:        (b)               => request('POST', '/checkins', b),
  getCheckins:    (params='')       => request('GET',  `/checkins?${params}`),
  todayCount:     (canteenId)       => request('GET',  `/checkins/today-count/${canteenId}`),

  // Reports
  monthlyReport:  (params='')       => request('GET',  `/reports/monthly?${params}`),
  platformReport: (params='')       => request('GET',  `/reports/platform?${params}`),

  // Menus
  getMenus:       (params='')       => request('GET',  `/menus?${params}`),
  createMenu:     (b)               => request('POST', '/menus', b),
  updateMenu:     (id, b)           => request('PATCH',`/menus/${id}`, b),
  deleteMenu:     (id)              => request('DELETE',`/menus/${id}`),

  // Providers
  getProviders:   ()                => request('GET',  '/providers'),
  myProvider:     ()                => request('GET',  '/providers/my'),
  myCanteens:     ()                => request('GET',  '/providers/my/canteens'),
  myStaff:        ()                => request('GET',  '/providers/my/staff'),
  createStaff:    (b)               => request('POST', '/providers/my/staff', b),
  myOrders:       ()                => request('GET',  '/providers/my/orders'),
  createOrder:    (b)               => request('POST', '/providers/my/orders', b),
};
