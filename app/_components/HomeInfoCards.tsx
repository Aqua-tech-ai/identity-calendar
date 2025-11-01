import { memo } from 'react';

type InfoCard = {
  title: string;
  icon: string;
  description: JSX.Element;
};

const cards: InfoCard[] = [
  {
    title: '有料枠について',
    icon: '💰',
    description: (
      <p className="leading-relaxed">
        ・有料枠は一律５００円になります。（今後、状況により価格を変更させていただく場合がございます。ご了承ください。）
      </p>
    ),
  },
  {
    title: '１on１を受ける方へ',
    icon: '🤝',
    description: (
      <p className="leading-relaxed">
        ・こちらから当日にフレンド申請させていただきます。予約フォームのメモ欄にて、希望陣営や特定マップ、特定キャラでの練習など希望の練習内容をご記入ください。
      </p>
    ),
  },
  {
    title: 'コーチングを受ける方へ',
    icon: '🎓',
    description: (
      <div className="space-y-3 leading-relaxed">
        <p>・こちらから申請させていただきますので、以下の内容を事前にお送りください</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>どういった内容を見てほしいか（予約フォームのメモ欄にて記入）</li>
          <li>見てほしい動画を１つ（フレンド申請後、ゲーム内にて送信）</li>
        </ul>
        <p className="text-sm text-slate-600">
          ※コーチングに関しましては、事前にこちらで動画を拝見し、各ポイント等まとめたうえで当日行えるよう、余裕を持った予約をして頂くようお願いします。
        </p>
      </div>
    ),
  },
];

function HomeInfoCardsComponent() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-within:-translate-y-1 focus-within:shadow-xl"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-2xl">
                <span aria-hidden="true">{card.icon}</span>
                <span className="sr-only">{card.title}</span>
              </span>
              <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            </div>
            <div className="mt-4 text-[15px] text-slate-700">{card.description}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export const HomeInfoCards = memo(HomeInfoCardsComponent);
