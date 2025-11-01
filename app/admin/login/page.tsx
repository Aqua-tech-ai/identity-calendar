'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/admin';

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn('credentials', {
      username,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (res?.error) {
      setError('ユーザー名またはパスワードが正しくありません。');
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl p-6 shadow bg-white/70 backdrop-blur"
      >
        <h1 className="text-xl font-semibold mb-4 text-center">管理者ログイン</h1>

        <label className="block mb-2">
          <span className="text-sm">ユーザー名</span>
          <input
            className="mt-1 w-full border rounded px-3 py-2 outline-none focus:ring"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm">パスワード</span>
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2 outline-none focus:ring"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg py-2 font-medium bg-blue-600 text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'サインイン中…' : 'サインイン'}
        </button>
      </form>
    </div>
  );
}
