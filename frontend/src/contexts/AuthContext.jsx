import { createContext, useContext, useEffect, useReducer } from 'react';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

const initialState = {
  user:    JSON.parse(localStorage.getItem('unfazed_user') || 'null'),
  token:   localStorage.getItem('unfazed_token') || null,
  loading: true,
  error:   null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'LOGIN_SUCCESS':
      localStorage.setItem('unfazed_token', action.payload.token);
      localStorage.setItem('unfazed_user', JSON.stringify(action.payload.user));
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
    case 'LOGOUT':
      localStorage.removeItem('unfazed_token');
      localStorage.removeItem('unfazed_user');
      return { ...state, user: null, token: null, loading: false };
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
    case 'UPDATE_USER': {
      const updated = { ...state.user, ...action.payload };
      localStorage.setItem('unfazed_user', JSON.stringify(updated));
      return { ...state, user: updated };
    }
    default: return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verify token on mount by calling /auth/me
  useEffect(() => {
    const verify = async () => {
      if (!state.token && !document.cookie.includes('token')) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      try {
        const res = await authApi.me();
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: res.data.data.user, token: state.token },
        });
      } catch {
        dispatch({ type: 'LOGOUT' });
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await authApi.login({ email, password, role: 'therapist' });
      const { user, token } = res.data.data;
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: msg });
      return { success: false, message: msg };
    }
  };

  const register = async (data) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await authApi.register(data);
      const { therapist, token } = res.data.data;
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: therapist, token } });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: msg });
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
