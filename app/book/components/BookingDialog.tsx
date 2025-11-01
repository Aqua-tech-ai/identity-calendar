'use client';

import { useMemo, useState } from 'react';

type BookingSuccessPayload = {
  ok: true;
  bookingId: string;
  cancelToken: string;
  status: string;
  isPaidSlot: boolean;
  requiresPayment: boolean;
  paidSlotPrice?: number;
};

type Props = {
  slotId: string;
  open: boolean;
  onClose: () => void;
  onBooked: (result: BookingSuccessPayload & { playerName: string }) => Promise<void> | void;
};

const JP_LABELS = {
  COACHING: 'コーチング',
  PRACTICE: '練習（1on1）',
} as const;

const BOOKING_TYPE_MAP = {
  COACHING: 'COACHING',
  PRACTICE: 'PRACTICE',
  コーチング: 'COACHING',
  練習: 'PRACTICE',
} as const;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_payload: '入力内容を確認してください。',
  discord_required: 'コーチング予約には Discord ID が必要です。',
  slot_not_found: '選択した枠が見つかりませんでした。',
  slot_not_available: 'この枠は予約できません。',
  duplicate_booking: 'この枠はすでに予約されています。',
  server_error: 'サーバーでエラーが発生しました。',
};

const TEXT = {
  heading: '予約フォーム',
  nameLabel: 'お名前',
  namePlaceholder: '例）成歩 遊',
  nameRequired: 'お名前を入力してください。',
  discordLabelRequired: 'Discord ID（必須）',
  discordLabelOptional: 'Discord ID（任意）',
  discordHelp:
    'コーチングの場合はトラブル防止のため Discord ID の入力をお願いします。例）narufy#1234',
  discordPlaceholder: '例）narufy#1234',
  discordRequired: 'Discord ID を入力してください。',
  identityVIdLabel: '第五人格ID（必須）',
  identityVIdPlaceholder: '例）12345678 など',
  identityVIdRequired: '第五人格ID を入力してください。',
  typeLabel: '予約タイプ',
  notesLabel: 'メモ（任意）',
  notesPlaceholder: 'ご希望や注意点があればご記入ください。',
  close: '閉じる',
  submit: '予約する',
  submitting: '送信中…',
  failure: '予約に失敗しました。',
};

const normalizeBookingType = (value: string): 'COACHING' | 'PRACTICE' => {
  if (value in BOOKING_TYPE_MAP) {
    return BOOKING_TYPE_MAP[value as keyof typeof BOOKING_TYPE_MAP];
  }
  return value === 'コーチング' ? 'COACHING' : 'PRACTICE';
};

export default function BookingDialog({ slotId, open, onClose, onBooked }: Props) {
  const [playerName, setPlayerName] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [identityVId, setIdentityVId] = useState('');
  const [identityVIdError, setIdentityVIdError] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<string>('COACHING');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const normalizedBookingType = useMemo(
    () => normalizeBookingType(bookingType),
    [bookingType],
  );
  const discordRequired = useMemo(
    () => normalizedBookingType === 'COACHING',
    [normalizedBookingType],
  );

  if (!open) return null;

  async function submit() {
    setError(null);
    setWarn(null);
    setIdentityVIdError(null);

    const name = playerName.trim();
    const discord = discordId.trim();
    const identity = identityVId.trim();
    const memo = notes.trim();
    const requestType = normalizedBookingType;

    if (!name) {
      setError(TEXT.nameRequired);
      return;
    }

    if (discordRequired && !discord) {
      setError(TEXT.discordRequired);
      return;
    }

    if (!identity) {
      setIdentityVIdError(TEXT.identityVIdRequired);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          playerName: name,
          discordId: discord || null,
          identityVId: identity,
          bookingType: requestType,
          notes: memo || null,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | (BookingSuccessPayload & { code?: undefined; errors?: undefined })
        | { ok?: false; code?: string; message?: string; errors?: unknown }
        | null;

      if (!res.ok) {
        const code =
          data && typeof data === 'object' && data && 'code' in data && data.code
            ? String(data.code)
            : undefined;
        const message =
          data && typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
            ? data.message
            : undefined;
        const mapped = (code && ERROR_MESSAGES[code]) || undefined;
        const finalMessage = message || mapped || TEXT.failure;
        console.error('Booking request failed', { status: res.status, code, response: data });
        setError(finalMessage);
        return;
      }

      if (!data || typeof data !== 'object' || !('ok' in data) || data.ok !== true) {
        setError(TEXT.failure);
        return;
      }

      if (data.webhook?.ok === false) {
        setWarn(`予約は完了しましたが通知失敗: ${data.webhook.reason ?? 'unknown'}`);
      } else {
        setWarn(null);
      }

      await onBooked({ ...data, playerName: name });
      onClose();
      setPlayerName('');
      setDiscordId('');
      setIdentityVId('');
      setIdentityVIdError(null);
      setBookingType('COACHING');
      setNotes('');
    } catch (err) {
      const message = err instanceof Error ? err.message : TEXT.failure;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{TEXT.heading}</h3>

        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor="booking-player-name"
        >
          {TEXT.nameLabel}
        </label>
        <input
          id="booking-player-name"
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder={TEXT.namePlaceholder}
          disabled={submitting}
        />

        <label
          className="mb-1 block text-sm font-medium text-slate-700"
          htmlFor="booking-discord-id"
        >
          {discordRequired ? TEXT.discordLabelRequired : TEXT.discordLabelOptional}
        </label>
        <p className="mb-2 text-xs text-slate-500">{TEXT.discordHelp}</p>
        <input
          id="booking-discord-id"
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={discordId}
          onChange={(event) => setDiscordId(event.target.value)}
          placeholder={TEXT.discordPlaceholder}
          disabled={submitting}
        />

        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="booking-identity-id">
            {TEXT.identityVIdLabel}
          </label>
          <input
            id="booking-identity-id"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            value={identityVId}
            onChange={(event) => {
              setIdentityVId(event.target.value);
              if (identityVIdError) setIdentityVIdError(null);
            }}
            placeholder={TEXT.identityVIdPlaceholder}
            disabled={submitting}
            aria-invalid={identityVIdError ? 'true' : undefined}
            aria-describedby={identityVIdError ? 'booking-identity-id-error' : undefined}
          />
          {identityVIdError ? (
            <p id="booking-identity-id-error" className="mt-1 text-xs text-red-600">
              {identityVIdError}
            </p>
          ) : null}
        </div>

        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="booking-type">
          {TEXT.typeLabel}
        </label>
        <select
          id="booking-type"
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={bookingType}
          onChange={(event) => setBookingType(event.target.value as 'COACHING' | 'PRACTICE')}
          disabled={submitting}
        >
          <option value="COACHING">{JP_LABELS.COACHING}</option>
          <option value="PRACTICE">{JP_LABELS.PRACTICE}</option>
        </select>

        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="booking-notes">
          {TEXT.notesLabel}
        </label>
        <textarea
          id="booking-notes"
          className="mb-4 h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={TEXT.notesPlaceholder}
          disabled={submitting}
        />

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        {warn ? <p className="mb-3 text-sm text-yellow-600">{warn}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            {TEXT.close}
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? TEXT.submitting : TEXT.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
