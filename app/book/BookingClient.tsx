'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';

import Modal from '@/components/Modal';
import BookingDialog from './components/BookingDialog';

type PublicEvent = {
  id: string;
  start: string;
  end: string;
  status: 'available' | 'booked' | 'blocked';
  isPaidSlot: boolean;
};

type BookingResult = {
  ok: true;
  bookingId: string;
  cancelToken: string;
  status: string;
  isPaidSlot: boolean;
  requiresPayment: boolean;
  paidSlotPrice?: number;
  playerName: string;
};

type BookingClientProps = {
  paypayLink: string | null;
};

const STATUS_LABEL: Record<PublicEvent['status'], string> = {
  available: '空き枠',
  booked: '予約済み',
  blocked: '選択不可',
};

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const STATUS_LABELS = {
  available: '空き枠',
  booked: '予約済み',
  blocked: '選択不可',
};
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded bg-green-500" /> 空き枠
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded bg-red-500" /> 予約済み
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded bg-slate-400" /> 選択不可
      </span>
    </div>
  );
}

export default function BookingClient({ paypayLink }: BookingClientProps) {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<BookingResult | null>(null);
  const [view, setView] = useState<'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const calendarRef = useRef<FullCalendar | null>(null);
  const didFetch = useRef(false);
  const lastRangeRef = useRef<string | null>(null);

  const fallbackRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 60);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const resolveVisibleRange = useCallback(
    (override?: { start: Date; end: Date }) => {
      if (override) return override;
      const api = calendarRef.current?.getApi();
      if (api) {
        const viewApi = api.view;
        if (viewApi) {
          const start = new Date(viewApi.activeStart);
          const end = new Date(viewApi.activeEnd.getTime() - 1);
          return { start, end };
        }
      }
      return fallbackRange;
    },
    [fallbackRange],
  );

  const load = useCallback(
    async (override?: { start: Date; end: Date }, force = false) => {
      const { start, end } = resolveVisibleRange(override);
      const rangeKey = `${start.toISOString()}::${end.toISOString()}`;
      if (!force && lastRangeRef.current === rangeKey) {
        return;
      }
      lastRangeRef.current = rangeKey;
      const qs = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      const res = await fetch(`/api/slots?${qs}`, { cache: 'no-store' });
      if (!res.ok) {
        console.error('Failed to fetch slots', res.status);
        setEvents([]);
        return;
      }

      const payload = await res.json().catch(() => ({ ok: false }));
      if (!payload || (typeof payload === 'object' && 'ok' in payload && payload.ok === false)) {
        console.error('Failed to fetch slots payload', payload);
        setEvents([]);
        return;
      }
      const list: PublicEvent[] = Array.isArray((payload as any).events) ? (payload as any).events : [];
      const mapped: EventInput[] = list.map((event) => {
        const title = `${STATUS_LABEL[event.status]}${event.isPaidSlot ? ' (有料)' : ''}`;
        return {
          id: event.id,
          start: event.start,
          end: event.end,
          title,
          extendedProps: { status: event.status, isPaidSlot: event.isPaidSlot },
        };
      });

      setEvents(mapped);
    },
    [resolveVisibleRange],
  );

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    void load();
  }, [load]);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const status = arg.event.extendedProps?.status as PublicEvent['status'] | undefined;
    if (status !== 'available') return;
    setActiveSlotId(arg.event.id);
    setDialogOpen(true);
  }, []);

  const handleBooked = useCallback(
    async (result: BookingResult) => {
      await load(undefined, true);
      if (result.requiresPayment) {
        setPaymentInfo(result);
      } else {
        alert('予約が完了しました。');
      }
    },
    [load],
  );

  const handleSelect = useCallback(() => {
    alert('カレンダーから直接の予約はできません。管理者までご連絡ください。');
  }, []);

  const handleViewChange = useCallback(
    (nextView: 'timeGridWeek' | 'timeGridDay') => {
      setView(nextView);
      const api = calendarRef.current?.getApi();
      api?.changeView(nextView);
    },
    [],
  );

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const start = new Date(arg.start);
      const end = new Date(arg.end.getTime() - 1);
      void load({ start, end });
    },
    [load],
  );


  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setActiveSlotId(null);
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold md:text-3xl">予約カレンダー</h1>
          <p className="text-sm text-slate-600">
            空き状況をご確認いただき、空き枠から予約を進めてください。満席の時間帯は選択できません。
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <Legend />
          <div className="flex rounded-lg border bg-white p-1 shadow-sm md:self-end">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ${
                view === 'timeGridWeek'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => handleViewChange('timeGridWeek')}
            >
              週表示
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ${
                view === 'timeGridDay'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => handleViewChange('timeGridDay')}
            >
              日表示
            </button>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView={view}
          locales={[jaLocale]}
          locale="ja"
          customButtons={{
            prevText: {
              text: '‹',
              click: () => {
                const api = calendarRef.current?.getApi();
                api?.prev();
              },
            },
            nextText: {
              text: '›',
              click: () => {
                const api = calendarRef.current?.getApi();
                api?.next();
              },
            },
            todayText: {
              text: '今日',
              click: () => {
                const api = calendarRef.current?.getApi();
                api?.today();
              },
            },
          }}
          headerToolbar={{
            start: 'prevText todayText nextText',
            center: 'title',
            end: '',
          }}
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          height="auto"
          nowIndicator
          selectable
          select={handleSelect}
          events={events}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          eventClassNames={(arg) => {
            const status = arg.event.extendedProps?.status as PublicEvent['status'] | undefined;
            if (status === 'available')
              return ['!bg-green-500', '!border-green-500', '!text-white'];
            if (status === 'booked') return ['!bg-red-500', '!border-red-500', '!text-white'];
            return ['!bg-slate-400', '!border-slate-400', '!text-white'];
          }}
          dayHeaderContent={(arg) =>
            `${arg.date.getMonth() + 1}/${arg.date.getDate()} (${
              WEEKDAY_LABELS[arg.date.getDay()]
            })`
          }
        />
      </section>

      <p className="text-center text-xs text-slate-500">
        有料枠を予約した場合は、下部の案内に従ってお支払いを完了してください。確認ができ次第ステータスを更新します。
      </p>

      <BookingDialog
        slotId={activeSlotId ?? ''}
        open={dialogOpen && activeSlotId !== null}
        onClose={closeDialog}
        onBooked={handleBooked}
      />

      {paymentInfo ? (
        <PaidSlotModal
          info={paymentInfo}
          onClose={() => setPaymentInfo(null)}
          paypayLink={paypayLink ?? ''}
        />
      ) : null}
    </main>
  );
}

function PaidSlotModal({ info, onClose, paypayLink }: { info: BookingResult; onClose: () => void; paypayLink: string }) {
  const priceText =
    typeof info.paidSlotPrice === 'number' && Number.isFinite(info.paidSlotPrice)
      ? `¥${info.paidSlotPrice.toLocaleString('ja-JP')}`
      : null;

  return (
    <Modal open onClose={onClose} title="有料枠のお支払い">
      <div className="space-y-4 text-sm text-slate-700">
        <p>この枠は有料です。PayPayでのお支払いをお願いいたします。</p>
        {priceText ? (
          <p>
            支払い金額: <span className="font-semibold text-slate-900">{priceText}</span>
          </p>
        ) : null}
        <p>
          予約者: <span className="font-semibold text-slate-900">{info.playerName}</span>
        </p>
        <div className="mt-4">
          <p className="text-sm text-slate-600">
            お支払いが完了したら、下のリンクからPayPayの決済ページを開き、案内に従って手続きを進めてください。
            <span className="text-slate-500">
              ※決済が完了してもステータスが自動で切り替わらない場合は、運営までご連絡ください。
            </span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            支払いのスクリーンショットや取引IDをDiscordで共有いただけると確認がスムーズです。
          </p>

          {paypayLink ? (
            <div className="mt-3 flex justify-center">
              <a
                href={paypayLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-blue-600 px-4 py-2 text-white font-medium shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                PayPayで決済ページを開く
              </a>
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
              PayPayの支払いリンクが未設定です。管理者に連絡して設定を行ってください。
              <div className="mt-1 text-xs">
                環境変数 <code className="font-mono">NEXT_PUBLIC_PAYPAY_LINK</code> を設定してください。
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </Modal>
  );
}
