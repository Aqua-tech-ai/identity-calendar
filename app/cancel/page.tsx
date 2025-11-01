import { formatInTimeZone } from 'date-fns-tz';
import { cancelBookingByToken } from '../../lib/booking-service';
import { notifyDiscordBooking } from '../../lib/notifications';

const TOKYO_TZ = 'Asia/Tokyo';

type CancelPageProps = {
  searchParams: {
    token?: string;
  };
};

export default async function CancelPage({ searchParams }: CancelPageProps) {
  const token = searchParams.token;

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold text-danger">キャンセル情報が見つかりません</h1>
        <p className="text-slate-600">
          キャンセル用のリンクが正しくありません。恐れ入りますが再度メールをご確認ください。
        </p>
      </main>
    );
  }

  try {
    const { booking, changed } = await cancelBookingByToken(token);
    if (changed) {
      await notifyDiscordBooking('CANCELED', booking, booking.slot);
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-bold text-primary">予約のキャンセルが完了しました</h1>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">
            ご予約者: <span className="font-semibold">{booking.playerName}</span>
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Discord ID: <span className="font-semibold">{booking.discordId ?? '-'}</span>
          </p>
          <p className="mt-4 text-base font-semibold text-slate-800">
            {formatInTimeZone(booking.slot.startAt, TOKYO_TZ, 'yyyy/MM/dd HH:mm')} -{' '}
            {formatInTimeZone(booking.slot.endAt, TOKYO_TZ, 'HH:mm')} (JST)
          </p>
        </div>
        <p className="text-sm text-slate-600">
          {changed
            ? 'Discord へもキャンセル通知を送信しました。'
            : 'すでにキャンセル済みの予約でした。'}
        </p>
        <a
          href="/book"
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 font-medium text-white shadow transition hover:opacity-90"
        >
          予約一覧に戻る
        </a>
      </main>
    );
  } catch (error) {
    console.error(error);
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold text-danger">キャンセル処理に失敗しました</h1>
        <p className="text-slate-600">
          リンクの有効期限が切れている可能性があります。お手数ですが再度お試しください。
        </p>
        <a
          href="/book"
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 font-medium text-white shadow transition hover:opacity-90"
        >
          予約一覧に戻る
        </a>
      </main>
    );
  }
}
