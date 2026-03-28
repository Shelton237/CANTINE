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
  // ── Auth ──────────────────────────────────────────────────
  login:          (email, password) => request('POST', '/auth/login', { email, password }),
  me:             ()                => request('GET',  '/auth/me'),
  changePassword: (b)               => request('POST', '/auth/change-password', b),

  // ── Dashboard (DRH) ───────────────────────────────────────
  dashboard:      ()                => request('GET',  '/dashboard'),

  // ── Companies ─────────────────────────────────────────────
  getCompanies:   ()                => request('GET',  '/companies'),
  getCompany:     (id)              => request('GET',  `/companies/${id}`),
  createCompany:  (b)               => request('POST', '/companies', b),
  updateCompany:  (id, b)           => request('PATCH',`/companies/${id}`, b),

  // ── Canteens ──────────────────────────────────────────────
  getCanteens:    (params='')       => request('GET',  `/canteens?${params}`),
  createCanteen:  (b)               => request('POST', '/canteens', b),
  toggleCanteen:  (id)              => request('PATCH',`/canteens/${id}/toggle`),

  // ── Shifts ────────────────────────────────────────────────
  getShifts:      (canteenId)       => request('GET',  `/canteens/${canteenId}/shifts`),
  getAllShifts:    (params='')       => request('GET',  `/shifts?${params}`),
  createShift:    (canteenId, b)    => request('POST', `/canteens/${canteenId}/shifts`, b),
  updateShift:    (id, b)           => request('PATCH',`/shifts/${id}`, b),
  deleteShift:    (id)              => request('DELETE',`/shifts/${id}`),

  // ── Planning rotatif ──────────────────────────────────────
  getSchedules:   (params='')       => request('GET',  `/schedules?${params}`),
  upsertSchedule: (b)               => request('POST', '/schedules', b),
  deleteSchedule: (id)              => request('DELETE',`/schedules/${id}`),

  // ── Employees ─────────────────────────────────────────────
  getEmployees:   (params='')       => request('GET',  `/employees?${params}`),
  getEmployee:    (id)              => request('GET',  `/employees/${id}`),
  createEmployee: (b)               => request('POST', '/employees', b),
  updateEmployee: (id, b)           => request('PATCH',`/employees/${id}`, b),
  deleteEmployee: (id)              => request('DELETE',`/employees/${id}`),
  getMyProfile:   ()                => request('GET',  '/employees/me'),

  // ── Check-ins ─────────────────────────────────────────────
  checkin:        (b)               => request('POST', '/checkins', b),
  getCheckins:    (params='')       => request('GET',  `/checkins?${params}`),
  getMyCheckins:  (params='')       => request('GET',  `/checkins/me?${params}`),
  todayCount:     (canteenId)       => request('GET',  `/checkins/today-count/${canteenId}`),
  getLiveCheckins:(canteenId)       => request('GET',  `/checkins/live/${canteenId}`),
  getMyCheckins:  (params='')       => request('GET',  `/checkins/me?${params}`),

  // ── Alerts ────────────────────────────────────────────────
  getAlerts:      (params='')       => request('GET',  `/alerts?${params}`),
  markAlertRead:  (id)              => request('PATCH',`/alerts/${id}/read`),
  createAlert:    (b)               => request('POST', '/alerts', b),

  // ── Reports ───────────────────────────────────────────────
  monthlyReport:  (params='')       => request('GET',  `/reports/monthly?${params}`),
  platformReport: (params='')       => request('GET',  `/reports/platform?${params}`),
  dgReport:       (params='')       => request('GET',  `/reports/dg?${params}`),
  dafReport:      (params='')       => request('GET',  `/reports/daf?${params}`),

  // ── Invoices (DAF) ────────────────────────────────────────
  getInvoices:    (params='')       => request('GET',  `/invoices?${params}`),
  getInvoice:     (id)              => request('GET',  `/invoices/${id}`),
  validateInvoice:(id, b)           => request('PATCH',`/invoices/${id}/validate`, b),
  contestInvoice: (id, b)           => request('PATCH',`/invoices/${id}/contest`, b),
  generateInvoices:(b)              => request('POST', '/invoices/generate', b),

  // ── Holidays ──────────────────────────────────────────────
  getHolidays:    (year)            => request('GET',  `/holidays?year=${year}`),

  // ── Menus ─────────────────────────────────────────────────
  getMenus:       (params='')       => request('GET',  `/menus?${params}`),
  createMenu:     (b)               => request('POST', '/menus', b),
  updateMenu:     (id, b)           => request('PATCH',`/menus/${id}`, b),
  deleteMenu:     (id)              => request('DELETE',`/menus/${id}`),
  getTodayMenus:  (canteenId)       => request('GET',  `/menus/today/${canteenId}`),
  getWeekMenus:   (canteenId)       => request('GET',  `/menus/week/${canteenId}`),

  // ── Providers ─────────────────────────────────────────────
  getProviders:   ()                => request('GET',  '/providers'),
  myProvider:     ()                => request('GET',  '/providers/my'),
  myCanteens:     ()                => request('GET',  '/providers/my/canteens'),
  myStaff:        ()                => request('GET',  '/providers/my/staff'),
  createStaff:    (b)               => request('POST', '/providers/my/staff', b),
  myOrders:       ()                => request('GET',  '/providers/my/orders'),
  createOrder:    (b)               => request('POST', '/providers/my/orders', b),
};
