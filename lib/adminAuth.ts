import bcrypt from 'bcryptjs';

import { Env } from './env';

/** 起動時に使用する admin 資格情報（ハッシュは確実に 1 つに統一） */
const hash =
  Env.ADMIN_PASSWORD_HASH ??
  bcrypt.hashSync(Env.ADMIN_PASSWORD!, Env.ADMIN_BCRYPT_ROUNDS);

export const AdminAuth = {
  username: Env.ADMIN_USERNAME,
  hash,
};

export const verifyAdminPassword = (plain: string) => bcrypt.compareSync(plain, hash);
