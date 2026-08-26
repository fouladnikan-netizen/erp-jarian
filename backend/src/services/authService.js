import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { loadUserAuth, signAccessToken } from '../middleware/auth.js';
import { writeAudit } from '../lib/ids.js';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function login(body) {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const err = new Error('شناسه کاربری و رمز عبور الزامی است.');
    err.status = 400;
    err.code = 'VALIDATION';
    throw err;
  }

  const { username, password } = parsed.data;
  const res = await query(
    `SELECT id, password_hash, is_active FROM users WHERE username = $1`,
    [username],
  );
  const row = res.rows[0];
  if (!row || !row.is_active) {
    const err = new Error('نام کاربری یا رمز عبور نادرست است.');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    const err = new Error('نام کاربری یا رمز عبور نادرست است.');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const user = await loadUserAuth(row.id);
  const accessToken = signAccessToken(user);
  await writeAudit({
    actorUserId: user.id,
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
      permissions: user.permissions,
    },
  };
}

export async function me(userId) {
  const user = await loadUserAuth(userId);
  if (!user) {
    const err = new Error('کاربر یافت نشد.');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  return user;
}
