import Link from 'next/link';
import { memo } from 'react';

const primaryLinkClasses =
  'inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-white font-medium shadow transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const secondaryLinkClasses =
  'inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-slate-900 font-medium shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

function HomeHeroComponent() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="grid items-center gap-10 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur md:grid-cols-2 md:p-12">
        <div>
          <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            ナルフィのゲーム広場
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            コーチングと練習の予約がここで完結。
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
            コーチングや練習（1on1）のセッションを、空き枠から選んで簡単に予約できます。
            目的に合わせて最適な時間をお取りください。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/book" aria-label="予約ページへ" className={primaryLinkClasses}>
              予約ページへ
            </Link>
            <Link href="/admin" aria-label="管理者へ" className={secondaryLinkClasses}>
              管理者へ
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="relative h-56 w-full md:h-full">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-100 via-sky-50 to-emerald-100" />
          <div className="absolute inset-0 rounded-3xl border border-slate-200/70" />
          <div className="absolute inset-y-6 inset-x-6 rounded-3xl bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.3),transparent_55%)] blur-sm" />
          <div className="absolute inset-y-10 inset-x-10 rounded-3xl border border-white/70 bg-white/30 backdrop-blur-sm shadow-[0_20px_60px_-35px_rgba(15,23,42,0.4)]" />
        </div>
      </div>
    </section>
  );
}

export const HomeHero = memo(HomeHeroComponent);
