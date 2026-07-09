import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use(config => {
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);

// Requests
export const getRequests = (params) => api.get('/requests', { params }).then(r => r.data);
export const getRequest = (id) => api.get(`/requests/${id}`).then(r => r.data);
export const createRequest = (data) => api.post('/requests', data).then(r => r.data);
export const updateRequest = (id, data) => api.put(`/requests/${id}`, data).then(r => r.data);
export const cancelRequest = (id) => api.delete(`/requests/${id}`).then(r => r.data);

// Approvals
export const getPendingApprovals = () => api.get('/approvals/pending').then(r => r.data);
export const getApprovalHistory = () => api.get('/approvals/history').then(r => r.data);
export const approvalAction = (id, action, comment) => api.post(`/approvals/${id}/action`, { action, comment }).then(r => r.data);

// Samples
export const getSamples = (params) => api.get('/samples', { params }).then(r => r.data);
export const getSample = (id) => api.get(`/samples/${id}`).then(r => r.data);
export const updateSampleStatus = (id, status, remark, extra = {}) => api.put(`/samples/${id}/status`, { status, remark, ...extra }).then(r => r.data);

// Admin
export const getAdminStats = () => api.get('/admin/stats').then(r => r.data);
export const getUsers = (params) => api.get('/admin/users', { params }).then(r => r.data);
export const createUser = (data) => api.post('/admin/users', data).then(r => r.data);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data).then(r => r.data);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`).then(r => r.data);
export const getDepartments = () => api.get('/admin/departments').then(r => r.data);
export const createDepartment = (data) => api.post('/admin/departments', data).then(r => r.data);
export const getSampleTypes = () => api.get('/admin/sample-types').then(r => r.data);
export const createSampleType = (data) => api.post('/admin/sample-types', data).then(r => r.data);
export const deleteSampleType = (id) => api.delete(`/admin/sample-types/${id}`).then(r => r.data);
export const getWorkflows = () => api.get('/admin/workflows').then(r => r.data);
export const createWorkflow = (data) => api.post('/admin/workflows', data).then(r => r.data);
export const getWorkflowNodes = (id) => api.get(`/admin/workflow-nodes/${id}`).then(r => r.data);
export const getAuditLogs = (params) => api.get('/admin/audit-logs', { params }).then(r => r.data);
export const getSettings = () => api.get('/admin/settings').then(r => r.data);
export const getQuerySettings = () => api.get('/admin/query-settings').then(r => r.data);
export const getFrontSettings = () => api.get('/admin/settings').then(r => r.data);
export const updateFrontSettings = (data) => api.put('/admin/settings', data).then(r => r.data);
export const updateQuerySettings = (data) => api.put('/admin/query-settings', data).then(r => r.data);
export const updateSettings = (data) => api.put('/admin/settings', data).then(r => r.data);
export const getNotifications = () => api.get('/admin/notifications').then(r => r.data);
export const markNotificationRead = (id) => api.put(`/admin/notifications/read/${id}`).then(r => r.data);
export const markAllNotificationsRead = () => api.put('/admin/notifications/read-all').then(r => r.data);

export default api;


// Industries
export const getIndustries = (params = {}) => api.get('/admin/industries', { params }).then(r => r.data);
export const createIndustry = (data) => api.post('/admin/industries', data).then(r => r.data);
export const deleteIndustry = (id) => api.delete(`/admin/industries/${id}`).then(r => r.data);
export const updateIndustry = (id, data) => api.put(`/admin/industries/${id}`, data).then(r => r.data);
export const getDefaultIndustry = () => api.get('/admin/industries/default').then(r => r.data);
export const setDefaultIndustry = (id) => api.post(`/admin/industries/${id}/set-default`).then(r => r.data);


// Industry Field Configs
export const getIndustryFields = (industryId) => api.get(`/admin/industry-fields/${industryId}`).then(r => r.data);
export const createIndustryField = (data) => api.post('/admin/industry-fields', data).then(r => r.data);
export const updateIndustryField = (id, data) => api.put(`/admin/industry-fields/${id}`, data).then(r => r.data);
export const deleteIndustryField = (id) => api.delete(`/admin/industry-fields/${id}`).then(r => r.data);

// Request field values
export const saveRequestFieldValues = (id, fieldValues) => api.put(`/requests/${id}/field-values`, { field_values: fieldValues }).then(r => r.data);

// Upload attachments
export const uploadAttachments = (requestId, files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  return api.post(`/requests/${requestId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

// Batch approval
export const batchApproval = (ids, action, comment) => api.post('/approvals/batch', { ids, action, comment }).then(r => r.data);
// Remind approver
export const remindApproval = (id) => api.post(`/approvals/${id}/remind`).then(r => r.data);
// Export samples
export const exportSamples = (params) => api.get('/samples/export', { params, responseType: 'blob' }).then(r => r.data);
// Request notifications
export const getRequestNotifications = (requestId) => api.get(`/requests/${requestId}/notifications`).then(r => r.data);
