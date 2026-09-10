import api from './api';

export const authAPI = {
  verify: (data) => api.post('/auth/verify', data),
  register: (data) => api.post('/auth/register', data),
  emailLogin: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: (data) => api.post('/auth/logout', data),
};

export const donorAPI = {
  getDashboard: () => api.get('/donors/dashboard'),
  getProfile: () => api.get('/donors/profile'),
  updateProfile: (data) => api.patch('/donors/profile', data),
  updateAvailability: (availability) => api.patch('/donors/availability', { availability }),
  getHistory: () => api.get('/donors/history'),
};

export const hospitalAPI = {
  register: (data) => api.post('/hospitals/register', data),
  getProfile: () => api.get('/hospitals/profile'),
  updateProfile: (data) => api.patch('/hospitals/profile', data),
  getDashboard: () => api.get('/hospitals/dashboard'),
};

export const emergencyAPI = {
  create: (data) => api.post('/emergency-requests', data),
  list: () => api.get('/emergency-requests'),
  get: (id) => api.get(`/emergency-requests/${id}`),
  cancel: (id) => api.patch(`/emergency-requests/${id}/cancel`),
  respond: (id, response) => api.post(`/emergency-requests/${id}/respond`, { response }),
  updateDonorStatus: (id, responseId, status) =>
    api.patch(`/emergency-requests/${id}/responses/${responseId}`, { status }),
  getDonorLocation: (id) => api.get(`/emergency-requests/${id}/donor-location`),
};

export const bloodRequestAPI = {
  create: (data) => api.post('/blood-requests', data),
  list: () => api.get('/blood-requests'),
  get: (id) => api.get(`/blood-requests/${id}`),
  cancel: (id) => api.patch(`/blood-requests/${id}/cancel`),
};

export const bloodBankAPI = {
  register: (data) => api.post('/blood-banks/register', data),
  getDashboard: () => api.get('/blood-banks/me/dashboard'),
  getProfile: () => api.get('/blood-banks/me/profile'),
  updateProfile: (data) => api.patch('/blood-banks/me/profile', data),
  list: () => api.get('/blood-banks'),
  get: (id) => api.get(`/blood-banks/${id}`),
  search: (params) => api.get('/blood-banks/search', { params }),
  addInventory: (data) => api.post('/blood-banks/me/inventory', data),
  updateInventory: (id, data) => api.patch(`/blood-banks/me/inventory/${id}`, data),
  recordDonation: (data) => api.post('/blood-banks/me/donations', data),
  getSlots: (id) => api.get(`/blood-banks/${id || 'me'}/slots`),
  createSlot: (data) => api.post('/blood-banks/me/slots', data),
};

export const locationAPI = {
  nearby: (params) => api.get('/locations/nearby', { params }),
};

export const campAPI = {
  list: (params) => api.get('/camps', { params }),
  get: (id) => api.get(`/camps/${id}`),
  register: (id) => api.post(`/camps/${id}/register`),
  create: (data) => api.post('/camps/manage', data),
  registerNGO: (data) => api.post('/camps/ngo/register', data),
  checkIn: (qrCode) => api.post('/camps/check-in', { qrCode }),
};

export const appointmentAPI = {
  book: (data) => api.post('/appointments', data),
  list: () => api.get('/appointments'),
  update: (id, data) => api.patch(`/appointments/${id}`, data),
};

export const notificationAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  registerToken: (data) => api.post('/notifications/device-token', data),
  removeToken: (data) => api.delete('/notifications/device-token', { data }),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data) => api.patch('/notifications/preferences', data),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  getVerifications: () => api.get('/admin/verification'),
  verifyHospital: (id, data) => api.patch(`/admin/hospitals/${id}/verify`, data),
  verifyBloodBank: (id, data) => api.patch(`/admin/blood-banks/${id}/verify`, data),
  verifyNGO: (id, data) => api.patch(`/admin/ngos/${id}/verify`, data),
  approveCamp: (id) => api.patch(`/admin/camps/${id}/approve`),
  getFlaggedEmergencies: () => api.get('/admin/emergencies/flagged'),
  clearEmergencyFlag: (id) => api.patch(`/admin/emergencies/${id}/clear-flag`),
};
