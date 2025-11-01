'use client';
import Link from 'next/link';

export default function NavBar() {
  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold" aria-label="ナルフィのゲーム広場">
          ナルフィのゲーム広場
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/book" className="text-sm text-blue-600 hover:underline">
            予約ページ
          </Link>
          <Link href="/admin" className="text-sm text-gray-600 hover:underline">
            管理者
          </Link>
        </nav>
      </div>
    </header>
  );
}
