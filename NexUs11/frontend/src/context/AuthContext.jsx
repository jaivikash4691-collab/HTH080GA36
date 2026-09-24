import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync Supabase Auth session
  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const u = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
          };
          setUser(u);
          localStorage.setItem('nexus_user', JSON.stringify(u));
          localStorage.setItem('nexus_token', session.access_token);
        } else {
          setUser(null);
          localStorage.removeItem('nexus_user');
          localStorage.removeItem('nexus_token');
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const u = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
          };
          setUser(u);
          localStorage.setItem('nexus_user', JSON.stringify(u));
          localStorage.setItem('nexus_token', session.access_token);
        } else {
          setUser(null);
          localStorage.removeItem('nexus_user');
          localStorage.removeItem('nexus_token');
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Real Authentication Login (Email + Password)
  const login = async (email, password) => {
    setAuthError('');
    setAuthSuccess('');
    setLoading(true);

    if (!email || !password) {
      setAuthError('Please fill in both email and password.');
      setLoading(false);
      return false;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try Backend API first
    try {
      const result = await api.post('/auth/login', {
        email: normalizedEmail,
        password,
      });

      if (result && result.success && result.user) {
        const u = {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name || result.user.full_name || normalizedEmail.split('@')[0],
        };
        setUser(u);
        localStorage.setItem('nexus_user', JSON.stringify(u));
        if (result.token) {
          localStorage.setItem('nexus_token', result.token);
        }
        setLoading(false);
        return true;
      }
    } catch (backendErr) {
      const msg = backendErr.message || '';
      // If backend explicitly rejected invalid credentials, return error immediately
      if (
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('incorrect') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('password')
      ) {
        setAuthError(msg || 'Invalid email or password.');
        setLoading(false);
        return false;
      }
    }

    // 2. Direct Supabase Fallback
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setAuthError('Invalid email or password.');
          setLoading(false);
          return false;
        }

        const u = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email.split('@')[0],
        };
        setUser(u);
        localStorage.setItem('nexus_user', JSON.stringify(u));
        if (data.session?.access_token) {
          localStorage.setItem('nexus_token', data.session.access_token);
        }
        setLoading(false);
        return true;
      } else {
        // Fallback for development before Supabase keys are entered:
        const registeredUsers = JSON.parse(localStorage.getItem('nexus_registered_users') || '{}');
        const storedUser = registeredUsers[normalizedEmail];

        if (!storedUser || storedUser.password !== password) {
          setAuthError('Invalid email or password.');
          setLoading(false);
          return false;
        }

        const u = {
          id: storedUser.id,
          email: storedUser.email,
          name: storedUser.name,
        };
        setUser(u);
        localStorage.setItem('nexus_user', JSON.stringify(u));
        localStorage.setItem('nexus_token', 'local_jwt_' + storedUser.id);
        setLoading(false);
        return true;
      }
    } catch {
      setAuthError('Invalid email or password.');
      setLoading(false);
      return false;
    }
  };

  // Real Registration (Full Name, Email, Password, Confirm Password)
  const register = async (fullName, email, password, confirmPassword) => {
    setAuthError('');
    setAuthSuccess('');
    setLoading(true);

    if (!fullName || !email || !password || !confirmPassword) {
      setAuthError('Please complete all fields.');
      setLoading(false);
      return false;
    }

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match. Please verify.');
      setLoading(false);
      return false;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      setLoading(false);
      return false;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try Backend API first
    try {
      const result = await api.post('/auth/register', {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        confirmPassword,
      });

      if (result && result.success) {
        setAuthSuccess(result.message || 'Account created successfully! Please log in with your credentials.');
        setAuthMode('login');
        setLoading(false);
        return true;
      }
    } catch (backendErr) {
      const msg = backendErr.message || '';
      if (msg.toLowerCase().includes('rate limit') || backendErr.statusCode === 429) {
        setAuthError('rate_limit');
        setLoading(false);
        return false;
      } else if (
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('match') ||
        msg.toLowerCase().includes('least 6')
      ) {
        setAuthError(msg);
        setLoading(false);
        return false;
      }
    }

    // 2. Direct Supabase Fallback
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: fullName.trim() },
          },
        });

        if (error) {
          if (
            error.message?.toLowerCase().includes('already registered') ||
            error.message?.toLowerCase().includes('already exists') ||
            error.status === 422
          ) {
            setAuthError('An account with this email already exists. Please log in.');
          } else if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
            setAuthError('rate_limit');
          } else {
            setAuthError(error.message);
          }
          setLoading(false);
          return false;
        }

        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          setAuthError('An account with this email already exists. Please log in.');
          setLoading(false);
          return false;
        }

        if (data?.user) {
          try {
            await supabase.from('profiles').upsert([
              {
                id: data.user.id,
                email: normalizedEmail,
                full_name: fullName.trim(),
              },
            ]);
          } catch {}
        }

        setAuthSuccess('Account created successfully! Please log in with your credentials.');
        setAuthMode('login');
        setLoading(false);
        return true;
      } else {
        const registeredUsers = JSON.parse(localStorage.getItem('nexus_registered_users') || '{}');

        if (registeredUsers[normalizedEmail]) {
          setAuthError('An account with this email already exists. Please log in.');
          setLoading(false);
          return false;
        }

        const newUserId = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        registeredUsers[normalizedEmail] = {
          id: newUserId,
          email: normalizedEmail,
          name: fullName.trim(),
          password,
          createdAt: new Date().toISOString(),
        };

        localStorage.setItem('nexus_registered_users', JSON.stringify(registeredUsers));

        setAuthSuccess('Account created successfully! Please log in with your credentials.');
        setAuthMode('login');
        setLoading(false);
        return true;
      }
    } catch (err) {
      setAuthError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
      return false;
    }
  };

  // Password reset request
  const forgotPassword = async (email) => {
    setAuthError('');
    setAuthSuccess('');

    if (!email) {
      setAuthError('Please enter your email address.');
      return false;
    }

    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setAuthSuccess('Password reset link sent to your email.');
      return true;
    } catch {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
          if (error) {
            setAuthError(error.message);
            return false;
          }
        } catch (err) {
          setAuthError(err.message);
          return false;
        }
      }
      setAuthSuccess('Password reset link sent to your email.');
      return true;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {}
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setUser(null);
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_token');
    setAuthMode('login');
    setAuthError('');
    setAuthSuccess('');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authMode,
        setAuthMode,
        authError,
        setAuthError,
        authSuccess,
        setAuthSuccess,
        loading,
        login,
        register,
        forgotPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
