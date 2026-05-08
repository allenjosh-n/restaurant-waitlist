import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL
  : window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://restaurant-waitlist-nv21.onrender.com';

const api = axios.create({ baseURL: BASE_URL });
export const createToken    = (data) => api.post('/token', data);
export const getQueue       = ()     => api.get('/queue');
export const getTables      = ()     => api.get('/tables');
export const deleteToken    = (id)   => api.delete(`/token/${id}`);
export const seatCustomer   = (id)   => api.patch(`/token/${id}/seat`);
export const cancelToken    = (id)   => api.patch(`/token/${id}/cancel`);
export const getAnalytics   = ()     => api.get('/analytics');
export const suggestSeating = ()     => api.get('/suggest-seating');
export const getHistory     = ()     => api.get('/history');
export const freeTable      = (id)   => api.patch(`/tables/${id}/free`);
export const reserveTable   = (id)   => api.patch(`/tables/${id}/reserve`);
export const unreserveTable = (id)   => api.patch(`/tables/${id}/unreserve`);
export const freeAllTables  = ()     => api.patch('/tables/free-all');
export const exportCSV      = ()     => `${BASE_URL}/export/csv`;
export default api;
