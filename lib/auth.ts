import 'server-only';

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { AdminAuth, verifyAdminPassword } from './adminAuth';
import { NEXTAUTH_SECRET, NEXTAUTH_URL } from './env';

const authBaseUrl = new URL(NEXTAUTH_URL);

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8,
  },
  providers: [
    CredentialsProvider({
      name: 'Sign in',
      credentials: {
        username: { label: 'ユーザー名', type: 'text' },
        password: { label: 'パスワード', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim() ?? '';
        const password = credentials?.password ?? '';

        if (!username || !password) {
          return null;
        }
        if (username !== AdminAuth.username) {
          return null;
        }

        const ok = verifyAdminPassword(password);
        if (!ok) {
          return null;
        }

        return {
          id: 'admin',
          name: 'Administrator',
          role: 'admin',
        };
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    async redirect({ url }) {
      if (url.startsWith('/')) {
        return `${authBaseUrl.origin}${url}`;
      }
      try {
        const target = new URL(url);
        if (target.origin === authBaseUrl.origin) {
          return url;
        }
      } catch {
        // fall through to default
      }
      return authBaseUrl.origin;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? 'admin';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role =
          typeof token.role === 'string' ? token.role : undefined;
      }
      return session;
    },
  },
};
