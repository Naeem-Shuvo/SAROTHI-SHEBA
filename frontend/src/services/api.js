const BASE_URL = "http://localhost:4000";
async function api(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.msg || data.message || 'Something went wrong');
    }
    return data;
}
export default api;