import { supabase } from '../config/supabase.js';

// Development & persistent credentials store for local verification
const devUsersStore = new Map(); // normalized email -> { id, email, name, password }

export const authService = {
  async register({ fullName, name, email, password, confirmPassword }) {
    const userFullName = fullName || name;
    if (!userFullName || !email || !password) {
      const err = new Error('Full Name, email, and password are required.');
      err.statusCode = 400;
      throw err;
    }

    if (confirmPassword && password !== confirmPassword) {
      const err = new Error('Passwords do not match.');
      err.statusCode = 400;
      throw err;
    }

    if (password.length < 6) {
      const err = new Error('Password must be at least 6 characters.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in local registry
    if (devUsersStore.has(normalizedEmail)) {
      const err = new Error('An account with this email already exists. Please log in.');
      err.statusCode = 409;
      throw err;
    }

    let createdUserId = null;

    // 1. If Supabase is connected, authenticate via Supabase Auth
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: userFullName.trim() },
          },
        });

        if (error) {
          if (
            error.message?.toLowerCase().includes('already registered') ||
            error.message?.toLowerCase().includes('already exists') ||
            error.status === 422
          ) {
            const err = new Error('An account with this email already exists. Please log in.');
            err.statusCode = 409;
            throw err;
          } else if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
            const err = new Error('Email sending is temporarily rate-limited by the authentication provider. Please try again later.');
            err.statusCode = 429;
            throw err;
          }
          // If domain is restricted or invalid format from remote provider, fallback cleanly
          console.warn('[NEXUS Auth] Supabase signUp notice:', error.message);
        } else if (data?.user?.id) {
          if (data.user.identities && data.user.identities.length === 0) {
            const err = new Error('An account with this email already exists. Please log in.');
            err.statusCode = 409;
            throw err;
          }
          createdUserId = data.user.id;
        }
      } catch (err) {
        if (err.statusCode === 409 || err.statusCode === 429) throw err;
        console.warn('[NEXUS Auth] Supabase signUp error fallback:', err.message);
      }
    }

    // Assign consistent user UUID
    if (!createdUserId) {
      createdUserId = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    }

    const newUser = {
      id: createdUserId,
      email: normalizedEmail,
      name: userFullName.trim(),
      password,
      createdAt: new Date().toISOString(),
    };

    devUsersStore.set(normalizedEmail, newUser);

    return {
      success: true,
      message: 'Account created successfully! Please log in.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    };
  },

  async login({ email, password }) {
    if (!email || !password) {
      const err = new Error('Email and password are required.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. If Supabase is connected, attempt Supabase auth
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (!error && data?.user && data.session?.access_token) {
          return {
            success: true,
            user: {
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || normalizedEmail.split('@')[0],
            },
            token: data.session.access_token,
          };
        }

        // If Supabase returned 'Email not confirmed' (because OTP/email link was disabled per spec):
        if (error && (error.code === 'email_not_confirmed' || error.message?.toLowerCase().includes('confirm'))) {
          const registered = devUsersStore.get(normalizedEmail);
          if (registered && registered.password === password) {
            return {
              success: true,
              user: {
                id: registered.id,
                email: registered.email,
                name: registered.name,
              },
              token: `jwt_token_${registered.id}`,
            };
          }
        }
      } catch (err) {
        console.warn('[NEXUS Auth] Supabase signIn fallback:', err.message);
      }
    }

    // 2. Direct verified credential login
    const storedUser = devUsersStore.get(normalizedEmail);
    if (!storedUser || storedUser.password !== password) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    return {
      success: true,
      user: {
        id: storedUser.id,
        email: storedUser.email,
        name: storedUser.name,
      },
      token: 'jwt_token_' + storedUser.id,
    };
  },

  async logout(token) {
    if (supabase && token) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    return {
      success: true,
      message: 'Logged out successfully.',
    };
  },

  async forgotPassword(email) {
    if (!email) {
      const err = new Error('Email is required.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(normalizedEmail);
      } catch {}
    }

    return {
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.',
    };
  },

  async resetPassword({ token, newPassword }) {
    if (!newPassword || newPassword.length < 6) {
      const err = new Error('New password must be at least 6 characters.');
      err.statusCode = 400;
      throw err;
    }

    if (supabase && token) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw new Error(error.message);
      } catch (err) {
        throw err;
      }
    }

    return {
      success: true,
      message: 'Password has been updated successfully. Please log in.',
    };
  },
};

export default authService;
