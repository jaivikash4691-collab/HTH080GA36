import { supabase } from '../config/supabase.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }

  // 1. If Supabase is connected, verify token against Supabase Auth
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
        };
        return next();
      }
    } catch {
      // Proceed to local token verification if Supabase call failed
    }
  }

  // 2. Decode development token (format: jwt_token_<userId> or local_jwt_<userId>)
  if (token.startsWith('jwt_token_') || token.startsWith('local_jwt_')) {
    const extractedUserId = token.replace(/^(jwt_token_|local_jwt_)/, '');
    req.user = {
      id: extractedUserId,
      email: `${extractedUserId}@nexus.internal`,
      name: `Researcher`,
    };
    return next();
  }

  req.user = null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to access your research records.',
      error: 'Authentication required. Please log in to access your research records.',
      statusCode: 401,
    });
  }
  next();
}

export default authMiddleware;
