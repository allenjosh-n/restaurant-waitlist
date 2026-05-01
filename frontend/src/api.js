import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:8000' });
export const createToken  = (data) => api.post('/token', data);
export const getQueue     = ()     => api.get('/queue');
export const getTables    = ()     => api.get('/tables');
export const deleteToken  = (id)   => api.delete(`/token/${id}`);
export const seatCustomer = (id)   => api.patch(`/token/${id}/seat`);
export default api;
