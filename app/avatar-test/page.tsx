import Image from "next/image";

import { getAvatarDebugInfo } from "../../lib/avatar";

export default function AvatarTestPage() {
  const { envRaw, envNormalized, fallback, resolved } = getAvatarDebugInfo();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col gap-8 px-4 py-10 text-slate-800">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Avatar Debug</h1>
        <p className="mt-2 text-sm text-slate-600">
          このページでは <code>NEXT_PUBLIC_HOME_AVATAR</code> の設定とフォールバック画像を確認できます。
        </p>
        <dl className="mt-4 space-y-2 rounded-md border border-slate-200 bg-white/70 p-4 text-sm">
          <div className="flex flex-col">
            <dt className="font-medium text-slate-700">環境変数（raw）</dt>
            <dd className="font-mono text-slate-900">{envRaw ?? "(未設定)"}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="font-medium text-slate-700">環境変数（正規化）</dt>
            <dd className="font-mono text-slate-900">{envNormalized ?? "(未設定)"}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="font-medium text-slate-700">フォールバック</dt>
            <dd className="font-mono text-slate-900">{fallback}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="font-medium text-slate-700">解決済みパス</dt>
            <dd className="font-mono text-slate-900">{resolved}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900">HTML &lt;img&gt;</h2>
          <img
            src={resolved}
            alt="Avatar preview via img"
            width={160}
            height={160}
            className="h-40 w-40 rounded-full border border-slate-200 object-cover shadow-md"
          />
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900">next/image</h2>
          <div className="relative h-40 w-40 overflow-hidden rounded-full border border-slate-200 shadow-md">
            <Image src={resolved} alt="Avatar preview via next/image" fill sizes="160px" className="object-cover" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">直接アクセス</h2>
        <p className="mt-2 text-sm text-slate-700">
          ブラウザで <a className="underline" href={resolved}>{resolved}</a> を開いて 200 が返るか確認してください。
        </p>
      </section>
    </main>
  );
}
