'use client';

import { signOut, useSession } from 'next-auth/react';

import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <main className="admin-container">
        <section className="admin-section mx-auto max-w-md text-center">
          <p className="text-sm text-slate-600">セッションを確認しています…</p>
        </section>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="admin-container">
        <section className="admin-section mx-auto max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold text-slate-900">アクセス権がありません</h1>
          <p className="text-sm text-slate-600">
            もう一度{' '}
            <a href="/admin/login" className="text-blue-600 underline">
              ログイン
            </a>
            してください。
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-container space-y-6">
      <header className="admin-section flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="admin-title">管理ダッシュボード</h1>
          <p className="admin-subtle mt-2">
            空き枠の作成・削除、予約の詳細を確認できます。時刻はユーザーのローカル時刻で表示されます。
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary self-start md:self-auto"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          サインアウト
        </button>
      </header>
      <AdminDashboard />
    </main>
  );
}
