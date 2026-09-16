import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';

export async function loadUserAuth(userId) {
  const userRes = await query(
    `SELECT id, username, display_name, is_active, account_status, password_hash
     FROM users WHERE id = $1`,
    [userId],
  );
  const user = userRes.rows[0];
  if (!user || !user.is_active) return null;
  if (user.account_status && user.account_status !== 'ACTIVE') return null;
  if (!user.password_hash) return null;

  const rolesRes = await query(
    `SELECT role_code FROM user_roles WHERE user_id = $1`,
    [userId],
  );
  const roles = rolesRes.rows.map((r) => r.role_code);

  const permsRes = await query(
    `SELECT DISTINCT rp.permission_code
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_code = ur.role_code
     WHERE ur.user_id = $1`,
    [userId],
  );
  const permissions = permsRes.rows.map((r) => r.permission_code);

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    roles,
    permissions,
  };
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'ورود لازم است.' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = {
      userId: payload.sub,
      username: payload.username,
      displayName: payload.displayName,
      roles: payload.roles || [],
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'نشست نامعتبر یا منقضی است.' });
  }
}

export function requirePermission(...needed) {
  return async (req, res, next) => {
    try {
      const full = await loadUserAuth(req.auth.userId);
      if (!full) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'کاربر غیرفعال است.' });
      }
      req.user = full;
      const ok = needed.every((p) => full.permissions.includes(p));
      if (!ok) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'اجازهٔ این عملیات را ندارید.',
          needed,
        });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
