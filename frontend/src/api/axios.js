import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Set the Clerk session token on every request.
 * Called from App.jsx after Clerk loads.
 */
export function setAuthInterceptor(getToken) {
    api.interceptors.request.use(async (config) => {
        try {
            const token = await getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (err) {
            // silently fail — user might not be signed in
        }
        return config;
    });
}

export default api;
