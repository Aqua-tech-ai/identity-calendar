import Image from "next/image";
import Link from "next/link";

import { getAvatarSrc } from "../lib/avatar";

export default function Home() {
  const avatarSrc = getAvatarSrc();

  return (
    <main
      className="
        relative min-h-[calc(100svh-64px)] overflow-hidden
        bg-[conic-gradient(at_110%_-10%,#8fd3fe_0%,#84b6ff_16%,#a78bfa_33%,#60a5fa_50%,#22d3ee_66%,#7dd3fc_83%,#f0f9ff_100%)]
      "
    >
      {/* 背景レイヤーの柔らかなグロー */}
      <div className="pointer-events-none absolute -top-28 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.30)_0%,rgba(59,130,246,0.12)_60%,transparent_70%)] blur-[64px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.28)_0%,rgba(14,165,233,0.12)_60%,transparent_70%)] blur-[72px]" />

      {/* ゆっくり漂う虹色ヴェール（お好みで外せます） */}
      <div
        className="
          pointer-events-none absolute inset-0 opacity-35
          bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(124,58,237,0.15),transparent_60%),radial-gradient(800px_600px_at_-10%_110%,rgba(14,165,233,0.18),transparent_60%)]
          motion-safe:animate-[float_18s_ease-in-out_infinite]
        "
      />
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0px) }
          50%     { transform: translateY(-8px) }
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* ===== Hero ===== */}
        <section className="relative">
          <div
            className="
              relative rounded-2xl bg-white/60 backdrop-blur-2xl shadow-xl p-6 md:p-8
              ring-1 ring-white/40
              before:absolute before:inset-0 before:-z-10 before:rounded-2xl
              before:bg-[conic-gradient(from_180deg_at_50%_50%,#7dd3fc_0%,#a78bfa_40%,#60a5fa_70%,#7dd3fc_100%)]
              before:opacity-30
            "
          >
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              コーチングと練習の予約はここで完結。
            </h1>
            <p className="mt-2 text-slate-700/90">
              コーチングや1on1練習セッションを、空き枠から選んで簡単に予約できます。
            </p>

            <div className="mt-4 flex gap-3">
              <Link
                href="/book"
                className="
                  inline-flex items-center gap-2 rounded-md px-4 py-2 text-white shadow-lg
                  bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600
                  hover:from-sky-500 hover:via-indigo-500 hover:to-fuchsia-500
                  transition
                "
              >
                予約ページへ
              </Link>
              <Link
                href="/admin"
                prefetch={false}
                className="
                  inline-flex items-center gap-2 rounded-md px-4 py-2 text-slate-800
                  bg-white/80 backdrop-blur ring-1 ring-slate-200 hover:bg-white
                  transition
                "
              >
                管理ページ
              </Link>
            </div>

            {/* 右余白に固定した丸アバター */}
            <div
              aria-label="アイコン"
              className="hidden sm:block absolute top-1/2 -translate-y-1/2 right-4 md:right-6 lg:right-8 z-10"
            >
              <div className="relative">
                {/* 発光するグラデーション */}
                <div className="pointer-events-none absolute inset-0 rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,#22d3ee_0%,#a78bfa_40%,#60a5fa_70%,#22d3ee_100%)] opacity-60 blur-[8px]" />
                <div className="relative w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 overflow-hidden rounded-full ring-4 ring-white/70 shadow-2xl bg-white/90 backdrop-blur-md">
                  <Image
                    src={avatarSrc}
                    alt="Narufy icon"
                    fill
                    sizes="(min-width: 1024px) 128px, (min-width: 768px) 112px, 96px"
                    priority
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 3 カード ===== */}
        <section className="relative mt-8">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1 */}
            <article
              className="
                group rounded-xl p-5 bg-white/65 backdrop-blur-xl shadow ring-1 ring-white/50
                hover:shadow-lg transition
              "
            >
              <div className="mb-2 h-[3px] w-12 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 opacity-70 group-hover:opacity-100" />
              <h3 className="font-semibold text-slate-900 mb-2">有料枠について</h3>
              <p className="text-sm leading-7 text-slate-700">
                ・有料枠は一律500円です。（状況により価格を変更させていただく場合があります。ご了承ください。）
              </p>
            </article>

            {/* Card 2 */}
            <article
              className="
                group rounded-xl p-5 bg-white/65 backdrop-blur-xl shadow ring-1 ring-white/50
                hover:shadow-lg transition
              "
            >
              <div className="mb-2 h-[3px] w-12 rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 opacity-70 group-hover:opacity-100" />
              <h3 className="font-semibold text-slate-900 mb-2">1 on 1 を受ける方へ</h3>
              <p className="text-sm leading-7 text-slate-700">
                ・当日にこちらからフレンド申請いたします。予約フォームのメモ欄に、希望する陣営や特定キャラでの練習など
                ご要望があれば記入してください。
              </p>
            </article>

            {/* Card 3 */}
            <article
              className="
                group rounded-xl p-5 bg-white/65 backdrop-blur-xl shadow ring-1 ring-white/50
                hover:shadow-lg transition
              "
            >
              <div className="mb-2 h-[3px] w-12 rounded-full bg-gradient-to-r from-fuchsia-400 via-sky-400 to-emerald-400 opacity-70 group-hover:opacity-100" />
              <h3 className="font-semibold text-slate-900 mb-2">コーチングを受ける方へ</h3>
              <ul className="list-disc pl-5 text-sm leading-7 text-slate-700 space-y-1">
                <li>見てほしい内容（予約フォームのメモ欄に記入してください）。</li>
                <li>見てほしい動画を1つご用意いただき、フレンド申請後にゲーム内で送信してください。</li>
              </ul>
              <p className="mt-2 text-xs text-slate-600">
                ※コーチングでは事前に動画を拝見し、当日にフィードバックできるよう準備します。余裕を持った日程で予約してください。
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
