import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../lib/api';

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationId: string;
  storeId?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('auth_user') || 'null')
    : null,
  accessToken: typeof window !== 'undefined'
    ? localStorage.getItem('access_token')
    : null,
  refreshToken: typeof window !== 'undefined'
    ? localStorage.getItem('refresh_token')
    : null,
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  },
);

export const pinLogin = createAsyncThunk(
  'auth/pinLogin',
  async (payload: { employeeId: string; pin: string; storeId: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/pin-login', payload);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'PIN login failed');
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
    },
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('access_token', action.payload.accessToken);
      localStorage.setItem('refresh_token', action.payload.refreshToken);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const handleLoginPending = (state: AuthState) => {
      state.isLoading = true;
      state.error = null;
    };
    const handleLoginFulfilled = (state: AuthState, action: any) => {
      state.isLoading = false;
      state.user = action.payload.employee;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('access_token', action.payload.accessToken);
      localStorage.setItem('refresh_token', action.payload.refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(action.payload.employee));
    };
    const handleLoginRejected = (state: AuthState, action: any) => {
      state.isLoading = false;
      state.error = action.payload as string;
    };

    builder
      .addCase(login.pending, handleLoginPending)
      .addCase(login.fulfilled, handleLoginFulfilled)
      .addCase(login.rejected, handleLoginRejected)
      .addCase(pinLogin.pending, handleLoginPending)
      .addCase(pinLogin.fulfilled, handleLoginFulfilled)
      .addCase(pinLogin.rejected, handleLoginRejected);
  },
});

export const { logout, setTokens, clearError } = authSlice.actions;
export default authSlice.reducer;
