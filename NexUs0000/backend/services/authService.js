import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import storageService from './storageService.js';

export const authService = {
  getUserById(id) {
    return storageService.getUserById(id);
  },

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

    // Check if user already exists in storage registry
    const existing = storageService.getUserByEmail(normalizedEmail);
    if (existing) {
      const err = new Error('An account with this email already exists. Please log in.');
      err.statusCode = 409;
      throw err;
    }

    let createdUserId = null;

    // 1. If Supabase is connected, attempt to register in Supabase
    if (supabase) {
      // First attempt Supabase Admin API (bypasses email rate limit and confirms email)
      try {
        if (supabase.auth?.admin?.createUser) {
          const { data: adminData, error: adminErr } = await supabase.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: userFullName.trim() },
          });
          if (!adminErr && adminData?.user?.id) {
            createdUserId = adminData.user.id;
            console.log(`[NEXUS Auth] User created in Supabase Auth (Admin): ${createdUserId}`);
          }
        }
      } catch (adminErr) {
        console.warn('[NEXUS Auth] Admin createUser attempt notice:', adminErr.message);
      }

      // If not created via Admin, try public signUp
      if (!createdUserId) {
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
            }
            console.warn('[NEXUS Auth] Supabase signUp notice:', error.message);
          } else if (data?.user?.id) {
            if (data.user.identities && data.user.identities.length === 0) {
              const err = new Error('An account with this email already exists. Please log in.');
              err.statusCode = 409;
              throw err;
            }
            createdUserId = data.user.id;
            console.log(`[NEXUS Auth] User created in Supabase Auth (Public): ${createdUserId}`);
          }
        } catch (err) {
          if (err.statusCode === 409) throw err;
          console.warn('[NEXUS Auth] Supabase signUp error fallback:', err.message);
        }
      }

      // Attempt to upsert to Supabase profiles table
      if (createdUserId) {
        try {
          await supabase.from('profiles').upsert({
            id: createdUserId,
            email: normalizedEmail,
            full_name: userFullName.trim(),
            created_at: new Date().toISOString(),
          });
        } catch (profErr) {
          console.warn('[NEXUS Auth] Profiles upsert notice:', profErr.message);
        }
      }
    }

    // Assign standard UUID if not assigned by Supabase
    if (!createdUserId) {
      createdUserId = crypto.randomUUID();
    }

    const newUser = {
      id: createdUserId,
      email: normalizedEmail,
      name: userFullName.trim(),
      password,
      createdAt: new Date().toISOString(),
    };

    storageService.saveUser(newUser);

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
          const registered = storageService.getUserByEmail(normalizedEmail);
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

    // 2. Direct verified credential login from persistent storage
    const storedUser = storageService.getUserByEmail(normalizedEmail);
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
