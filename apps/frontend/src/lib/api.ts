import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh-token queue — prevents multiple simultaneous refresh calls
let isRefreshing = false;
let waitQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const drainQueue = (err: unknown, token: string | null) => {
  waitQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)));
  waitQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
      const newToken = data.data.accessToken;
      localStorage.setItem('access_token', newToken);
      localStorage.setItem('refresh_token', data.data.refreshToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      original.headers.Authorization = `Bearer ${newToken}`;
      drainQueue(null, newToken);
      return api(original);
    } catch (err) {
      drainQueue(err, null);
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
