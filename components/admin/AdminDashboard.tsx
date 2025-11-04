"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/Modal";

// ===== 管理画面 表示テキスト（集中管理） =====
const T = {
  title: "管理ダッシュボード",
  batchTitle: "連続枠一括作成（曜日×時間帯）",
  batchHelp:
    "開始日と終了日、時間帯、1枠の長さ、対象曜日を指定して複数の空き枠を一括作成できます。時刻は10分刻みを推奨します。",
  startDate: "開始日",
  endDate: "終了日",
  startTime: "開始時刻",
  endTime: "終了時刻",
  slotMinutes: "1枠の長さ（分）",
  weekdays: "対象曜日",
  createPaid: "有料枠として作成（PayPay決済対象）",
  createBulk: "一括作成する",
  singleTitle: "空き枠の作成",
  reload: "再読み込み",
  noData: "空き枠はありません",
  status: "状態",
  ops: "操作",
  detail: "詳細",
  remove: "削除",
  labels: {
    available: "空き枠",
    booked: "予約済み",
    free: "無料枠",
    paid: "有料枠",
  },
  bookingType: (type?: string) => {
    if (!type) return "-";
    const upper = type.toUpperCase();
    if (upper === "COACHING") return "コーチング";
    if (upper === "PRACTICE") return "練習（1on1）";
    return "-";
  },
  slotStatus: (status: "available" | "booked" | string) => {
    if (status === "available") return "空き枠";
    if (status === "booked") return "予約済み";
    return "-";
  },
  paymentBadge: (isPaidSlot?: boolean) =>
    isPaidSlot
      ? { label: "有料枠", className: "admin-badge admin-badge--ok" }
      : { label: "無料枠", className: "admin-badge" },
  paymentStatus: {
    paid: "入金済み",
    pending: "入金待ち",
    cancelled: "キャンセル",
    unknown: "不明",
    none: "支払い不要",
  },
  weekdayOptions: [
    { value: 0, label: "日" },
    { value: 1, label: "月" },
    { value: 2, label: "火" },
    { value: 3, label: "水" },
    { value: 4, label: "木" },
    { value: 5, label: "金" },
    { value: 6, label: "土" },
  ] as const,
} as const;

function toStatusLabel(status?: string): string {
  if (!status) return "—";
  const s = String(status).toUpperCase().trim();
  if (s === "PENDING_PAYMENT") return "入金待ち";
  if (s === "CONFIRMED" || s === "BOOKED") return "予約確定";
  if (s === "CANCELLED") return "キャンセル";
  return status;
}

const toYmd = (value: string) => value.replaceAll("/", "-").trim();

const parseWeekdayValues = (values: Array<number | string>) =>
  values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 6);

const extractErrorDetails = (errors: unknown): string[] | undefined => {
  if (!errors) return undefined;
  if (typeof errors === "string") return [errors];
  if (Array.isArray(errors)) {
    const list = errors
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const issue = item as { message?: unknown; path?: unknown };
          const message = typeof issue.message === "string" ? issue.message : null;
          if (!message) return null;
          if (Array.isArray(issue.path) && issue.path.length > 0) {
            const joined = issue.path.map((segment) => String(segment)).join(".");
            return joined ? `${joined}: ${message}` : message;
          }
          return message;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value));
    return list.length > 0 ? list : undefined;
  }
  return undefined;
};

// ============================================

const MESSAGE = {
  fetchFailed: "一覧の取得に失敗しました。",
  rangeRequired: "開始と終了日時を入力してください。",
  rangeInvalid: "開始と終了日時を正しく入力してください。",
  rangeOrder: "終了日時は開始日時より後にしてください。",
  createFailed: "空き枠の作成に失敗しました。",
  createSuccess: "空き枠を追加しました。",
  bulkDateRequired: "日付範囲を入力してください。",
  bulkDateOrder: "終了日は開始日以降を指定してください。",
  bulkTimeInvalid: "開始時刻と終了時刻を正しく指定してください。",
  bulkDurationInvalid: "枠の長さを正しく入力してください。",
  bulkWeekdayRequired: "作成する曜日を1つ以上選択してください。",
  bulkFailed: "空き枠の一括作成に失敗しました。",
  bulkSuccess: (count: number) =>
    count > 0 ? `空き枠を${count}件作成しました。` : "条件に一致する枠はありませんでした。",
  confirmFailed: "入金確認に失敗しました。",
  confirmSuccess: "入金を確認しました。",
  deleteConfirm: "本当に削除しますか？（予約がある場合は予約も同時に削除されます）",
  deleteFailed: "空き枠の削除に失敗しました。",
  deleteSuccess: "空き枠を削除しました。",
} as const;

type BookingInfo = {
  id: string;
  playerName: string;
  discordId: string | null;
  identityVId?: string;
  bookingType: "COACHING" | "PRACTICE";
  notes: string | null;
  status: string;
  paymentStatus?: string | null;
  isPaid: boolean;
  createdAt: string;
};

type AdminSlot = {
  id: string;
  slotId: string;
  startAt: string;
  endAt: string;
  status: "available" | "booked" | "blocked";
  isPaidSlot: boolean;
  booking: BookingInfo | null;
};

type BulkDeleteSkipped = {
  id?: string;
  reason?: string;
};

type Message = { type: "success" | "error"; text: string; details?: string[] };

const INPUT_STEP_MINUTES = 10;
const DEFAULT_DURATION_MINUTES = 60;

const bookingTypeLabel = T.bookingType;
const dayOptions = T.weekdayOptions;

const slotStatusBadge = (status: AdminSlot["status"]) => {
  if (status === "available") {
    return { label: T.labels.available, badge: "admin-badge admin-badge--ok" };
  }
  if (status === "booked") {
    return { label: T.labels.booked, badge: "admin-badge admin-badge--warn" };
  }
  return { label: "-", badge: "admin-badge admin-badge--error" };
};

const paymentStatusBadge = (slot: AdminSlot) => {
  if (!slot.isPaidSlot) {
    const badge = T.paymentBadge(false);
    return { label: badge.label, badge: badge.className };
  }

  const rawStatus = slot.booking?.paymentStatus?.toUpperCase();
  if (rawStatus === "PAID" || slot.booking?.isPaid) {
    return { label: T.paymentStatus.paid, badge: "admin-badge admin-badge--ok" };
  }
  if (rawStatus === "PENDING" || rawStatus === "PENDING_PAYMENT" || !rawStatus) {
    return { label: T.paymentStatus.pending, badge: "admin-badge admin-badge--warn" };
  }
  if (rawStatus === "CANCELLED") {
    return { label: T.paymentStatus.cancelled, badge: "admin-badge admin-badge--error" };
  }
  return { label: T.paymentStatus.unknown, badge: "admin-badge" };
};

const formatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default function AdminDashboard() {
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AdminSlot | null>(null);
  const [confirmingBookingId, setConfirmingBookingId] = useState<string | null>(null);
  const [bulkDateFrom, setBulkDateFrom] = useState("");
  const [bulkDateTo, setBulkDateTo] = useState("");
  const [bulkStartTime, setBulkStartTime] = useState("10:00");
  const [bulkEndTime, setBulkEndTime] = useState("22:00");
  const [bulkDuration, setBulkDuration] = useState(60);
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bulkIsPaidSlot, setBulkIsPaidSlot] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);

  const selectedCount = selectedIds.size;
  const allIds = useMemo(() => slots.map((slot) => slot.id), [slots]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (allSelected) {
        return new Set<string>();
      }
      return new Set(allIds);
    });
  }, [allIds, allSelected]);

  const selectedSlotPaymentBadge = selectedSlot ? paymentStatusBadge(selectedSlot) : null;

  const didFetch = useRef(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (messageTimer.current) {
        clearTimeout(messageTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (message) {
      if (messageTimer.current) clearTimeout(messageTimer.current);
      messageTimer.current = setTimeout(() => {
        setMessage(null);
        messageTimer.current = null;
      }, 3500);
    }
  }, [message]);

  const applyDefaultRange = useCallback(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    const stepMs = INPUT_STEP_MINUTES * 60 * 1000;
    const start = new Date(Math.ceil(now.getTime() / stepMs) * stepMs);
    const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
    setRangeStart(toDateTimeLocal(start));
    setRangeEnd(toDateTimeLocal(end));
  }, []);

  useEffect(() => {
    if (!rangeStart || !rangeEnd) {
      applyDefaultRange();
    }
  }, [rangeStart, rangeEnd, applyDefaultRange]);

  useEffect(() => {
    if (!bulkDateFrom || !bulkDateTo) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setBulkDateFrom(toDateInput(today));
      setBulkDateTo(toDateInput(nextWeek));
    }
  }, [bulkDateFrom, bulkDateTo]);

  useEffect(() => {
    if (!selectedSlot) return;
    const updated = slots.find((slot) => slot.id === selectedSlot.id);
    if (updated && updated !== selectedSlot) {
      setSelectedSlot(updated);
    }
  }, [slots, selectedSlot]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const valid = new Set(allIds);
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [allIds]);

  const sortAndSetSlots = useCallback((incoming: AdminSlot[]) => {
    const map = new Map<string, AdminSlot>();
    incoming.forEach((slot) => map.set(slot.id, slot));
    const unique = Array.from(map.values()).sort((a, b) => a.startAt.localeCompare(b.startAt));
    setSlots(unique);
  }, []);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setMonth(to.getMonth() + 3);
      to.setHours(23, 59, 59, 999);

      const qs = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
        paidOnly: "false",
      });

      const res = await fetch(`/api/admin/bookings?${qs.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await res.json().catch(() => ({}));
      const data = payload as {
        ok?: boolean;
        slots?: AdminSlot[];
        bookings?: unknown;
        error?: string;
        issues?: unknown;
      };
      if (!res.ok) {
        console.error("bookings fetch failed:", data);
        const message =
          typeof data?.error === "string" && data.error.trim().length > 0
            ? data.error
            : MESSAGE.fetchFailed;
        throw new Error(message);
      }
      if (!data || data?.ok !== true || !Array.isArray(data.slots)) {
        console.error("bookings payload malformed:", data);
        throw new Error(MESSAGE.fetchFailed);
      }
      const normalized = data.slots.map((slot) => ({
        ...slot,
        startAt: typeof slot.startAt === "string" ? slot.startAt : new Date(slot.startAt).toISOString(),
        endAt: typeof slot.endAt === "string" ? slot.endAt : new Date(slot.endAt).toISOString(),
        booking: slot.booking
          ? {
              ...slot.booking,
              discordId: slot.booking.discordId ?? "",
              identityVId: slot.booking.identityVId ?? "",
              notes: slot.booking.notes ?? null,
              createdAt:
                typeof slot.booking.createdAt === "string"
                  ? slot.booking.createdAt
                  : new Date(slot.booking.createdAt).toISOString(),
            }
          : null,
      }));
      sortAndSetSlots(normalized);
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : MESSAGE.fetchFailed,
      });
    } finally {
      setLoading(false);
    }
  }, [sortAndSetSlots]);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    void fetchSlots();
  }, [fetchSlots]);

  const isCreateDisabled = useMemo(
    () => createLoading || !rangeStart || !rangeEnd,
    [createLoading, rangeStart, rangeEnd],
  );

  async function handleCreateSlot() {
    if (!rangeStart || !rangeEnd) {
      setMessage({ type: "error", text: MESSAGE.rangeRequired });
      return;
    }

    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);

    if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
      setMessage({ type: "error", text: MESSAGE.rangeInvalid });
      return;
    }
    if (startDate >= endDate) {
      setMessage({ type: "error", text: MESSAGE.rangeOrder });
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message ?? MESSAGE.createFailed);
      }
      setMessage({ type: "success", text: MESSAGE.createSuccess });
      const nextStart = endDate;
      const nextEnd = new Date(endDate.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
      setRangeStart(toDateTimeLocal(nextStart));
      setRangeEnd(toDateTimeLocal(nextEnd));
      await fetchSlots();
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : MESSAGE.createFailed,
      });
    } finally {
      setCreateLoading(false);
    }
  }

  function toggleBulkWeekday(value: number) {
    setBulkWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return Array.from(next).sort((a, b) => a - b);
    });
  }

  async function handleBulkCreate() {
    if (!bulkDateFrom || !bulkDateTo) {
      setMessage({ type: "error", text: MESSAGE.bulkDateRequired });
      return;
    }
    if (bulkDateFrom > bulkDateTo) {
      setMessage({ type: "error", text: MESSAGE.bulkDateOrder });
      return;
    }
    if (!bulkStartTime || !bulkEndTime || bulkStartTime >= bulkEndTime) {
      setMessage({ type: "error", text: MESSAGE.bulkTimeInvalid });
      return;
    }
    if (!Number.isFinite(bulkDuration) || bulkDuration <= 0) {
      setMessage({ type: "error", text: MESSAGE.bulkDurationInvalid });
      return;
    }
    if (bulkWeekdays.length === 0) {
      setMessage({ type: "error", text: MESSAGE.bulkWeekdayRequired });
      return;
    }

    setBulkCreating(true);
    try {
      const payload = {
        startDate: toYmd(bulkDateFrom),
        endDate: toYmd(bulkDateTo),
        startTime: bulkStartTime.trim(),
        endTime: bulkEndTime.trim(),
        stepMinutes: Number(bulkDuration),
        weekdays: parseWeekdayValues(bulkWeekdays),
        isPaidSlot: Boolean(bulkIsPaidSlot),
      };

      const res = await fetch("/api/admin/slots/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Bulk create failed", { status: res.status, data });
        const details = extractErrorDetails(data?.errors);
        setMessage({
          type: "error",
          text: typeof data?.message === "string" ? data.message : MESSAGE.bulkFailed,
          details,
        });
        return;
      }
      const created = typeof data?.created === "number" ? data.created : 0;
      setMessage({ type: "success", text: MESSAGE.bulkSuccess(created) });
      await fetchSlots();
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : MESSAGE.bulkFailed,
      });
    } finally {
      setBulkCreating(false);
    }
  }

  async function handleConfirmPayment(bookingId: string) {
    if (!bookingId) return;
    setConfirmingBookingId(bookingId);
    try {
      const res = await fetch("/api/admin/bookings/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok !== true) {
        throw new Error(payload?.message ?? MESSAGE.confirmFailed);
      }
      setMessage({ type: "success", text: MESSAGE.confirmSuccess });
      await fetchSlots();
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : MESSAGE.confirmFailed,
      });
    } finally {
      setConfirmingBookingId(null);
    }
  }

  async function handleDeleteSlot(slot: Pick<AdminSlot, "id" | "status">) {
    const hasBooking = slot.status !== "available";
    const ok = confirm(
      hasBooking
        ? "この枠には予約が入っています。予約と枠をまとめて削除します。よろしいですか？"
        : MESSAGE.deleteConfirm,
    );
    if (!ok) {
      return;
    }

    setDeletingId(slot.id);
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? MESSAGE.deleteFailed);
      }
      setMessage({ type: "success", text: MESSAGE.deleteSuccess });
      setSelectedSlot((prev) => (prev?.id === slot.id ? null : prev));
      await fetchSlots();
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : MESSAGE.deleteFailed,
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBulkDelete(force = false) {
    if (selectedIds.size === 0) return;
    const ok = confirm(`${selectedIds.size}件の枠を削除します。よろしいですか？`);
    if (!ok) return;

    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/slots/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slotIds: Array.from(selectedIds), force }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok !== true) {
        console.error("bulk delete failed:", payload);
        setMessage({ type: "error", text: "一括削除に失敗しました。" });
        return;
      }

      const deletedIds = Array.isArray(payload.deletedIds)
        ? (payload.deletedIds as unknown[]).filter((id): id is string => typeof id === "string")
        : [];
      const deletedSet = new Set(deletedIds);
      if (deletedSet.size > 0) {
        setSlots((prev) => prev.filter((slot) => !deletedSet.has(slot.id)));
        setSelectedSlot((prev) => (prev && deletedSet.has(prev.id) ? null : prev));
        setSelectedIds((prev) => {
          if (prev.size === 0) return prev;
          const next = new Set(prev);
          deletedSet.forEach((id) => next.delete(id));
          return next;
        });
      }

      const skippedRaw: BulkDeleteSkipped[] = Array.isArray(payload.skipped)
        ? (payload.skipped as unknown[]).filter((item): item is BulkDeleteSkipped => typeof item === "object" && item !== null)
        : [];
      const skippedDetails = skippedRaw
        .map((item) => {
          if (!item) return null;
          const id = typeof item.id === "string" ? item.id : "(不明なID)";
          const reasonValue = typeof item.reason === "string" ? item.reason : "unknown";
          const reason =
            reasonValue === "has_booking"
              ? "予約ありで削除不可"
              : reasonValue === "not_found"
                ? "見つかりませんでした"
                : "削除できませんでした";
          return `${id}: ${reason}`;
        })
        .filter((value): value is string => Boolean(value));

      if (deletedSet.size > 0) {
        setMessage({
          type: "success",
          text: `枠を${deletedSet.size}件削除しました。`,
          details: skippedDetails.length > 0 ? skippedDetails : undefined,
        });
      } else {
        setMessage({
          type: "error",
          text: "選択した枠を削除できませんでした。",
          details: skippedDetails.length > 0 ? skippedDetails : undefined,
        });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "一括削除に失敗しました。" });
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className={message.type === "success" ? "admin-message-success" : "admin-message-error"}>
          <p>{message.text}</p>
          {message.details && message.details.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {message.details.map((detail, index) => (
                <li key={`${detail}-${index}`}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section className="admin-section space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">{T.batchTitle}</h2>
          <p className="admin-subtle mt-1">{T.batchHelp}</p>
        </header>

        <div className="space-y-4">
          <div className="admin-card-grid">
            <div>
              <label className="admin-subtle mb-1 block" htmlFor="bulk-date-from">
                {T.startDate}
              </label>
              <input
                id="bulk-date-from"
                type="date"
                className="admin-input"
                value={bulkDateFrom}
                onChange={(event) => setBulkDateFrom(event.target.value)}
              />
            </div>
            <div>
              <label className="admin-subtle mb-1 block" htmlFor="bulk-date-to">
                {T.endDate}
              </label>
              <input
                id="bulk-date-to"
                type="date"
                className="admin-input"
                value={bulkDateTo}
                onChange={(event) => setBulkDateTo(event.target.value)}
              />
            </div>
          </div>

          <div className="admin-card-grid">
            <div>
              <label className="admin-subtle mb-1 block" htmlFor="bulk-start-time">
                {T.startTime}
              </label>
              <input
                id="bulk-start-time"
                type="time"
                className="admin-input"
                value={bulkStartTime}
                onChange={(event) => setBulkStartTime(event.target.value)}
              />
            </div>
            <div>
              <label className="admin-subtle mb-1 block" htmlFor="bulk-end-time">
                {T.endTime}
              </label>
              <input
                id="bulk-end-time"
                type="time"
                className="admin-input"
                value={bulkEndTime}
                onChange={(event) => setBulkEndTime(event.target.value)}
              />
            </div>
            <div>
              <label className="admin-subtle mb-1 block" htmlFor="bulk-duration">
                {T.slotMinutes}
              </label>
              <input
                id="bulk-duration"
                type="number"
                min={10}
                step={5}
                className="admin-input"
                value={bulkDuration}
                onChange={(event) => setBulkDuration(Number(event.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <div className="admin-subtle mb-2">{T.weekdays}</div>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day) => {
                const checked = bulkWeekdays.includes(day.value);
                return (
                  <label
                    key={day.value}
                    className={`flex items-center gap-2 rounded border px-3 py-1 text-sm ${
                      checked ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={checked}
                      onChange={() => toggleBulkWeekday(day.value)}
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={bulkIsPaidSlot}
              onChange={(event) => setBulkIsPaidSlot(event.target.checked)}
            />
            {T.createPaid}
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleBulkCreate}
              disabled={bulkCreating}
            >
              {bulkCreating ? "作成中…" : T.createBulk}
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">{T.singleTitle}</h2>
          <p className="admin-subtle mt-1">
            空き枠を1件ずつ登録します。時刻は10分単位を推奨します。
          </p>
        </header>
        <div className="admin-card-grid">
          <div>
            <label className="admin-subtle mb-1 block" htmlFor="admin-slot-start">
              {T.startTime}
            </label>
            <input
              id="admin-slot-start"
              type="datetime-local"
              className="admin-input"
              value={rangeStart}
              onChange={(event) => setRangeStart(event.target.value)}
            />
          </div>
          <div>
            <label className="admin-subtle mb-1 block" htmlFor="admin-slot-end">
              {T.endTime}
            </label>
            <input
              id="admin-slot-end"
              type="datetime-local"
              className="admin-input"
              value={rangeEnd}
              onChange={(event) => setRangeEnd(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={handleCreateSlot}
              disabled={isCreateDisabled}
            >
              {createLoading ? "追加中…" : "空き枠を追加"}
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section space-y-4">
        <header className="admin-header">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{T.title}</h2>
            <p className="admin-subtle">開始時間の昇順で表示します。</p>
          </div>
          <div className="admin-toolbar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchSlots}
              disabled={loading}
            >
              {loading ? "読込中…" : T.reload}
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => handleBulkDelete(false)}
              disabled={selectedCount === 0 || bulkDeleting}
              title="予約がある枠はスキップされます"
            >
              {bulkDeleting ? "削除中…" : "選択した枠を削除"}
            </button>
            <span className="admin-subtle">選択: {selectedCount} 件</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="全選択"
                  />
                </th>
                <th>開始</th>
                <th>終了</th>
                <th>{T.status}</th>
                <th>支払い</th>
                <th className="w-48">{T.ops}</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const status = slotStatusBadge(slot.status);
                const payment = paymentStatusBadge(slot);
                const canConfirmPayment =
                  slot.isPaidSlot &&
                  slot.booking !== null &&
                  slot.booking.status?.toUpperCase() === "PENDING_PAYMENT" &&
                  !slot.booking.isPaid;
                const confirmTargetId = slot.booking?.id ?? "";

                return (
                  <tr key={slot.id}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(slot.id)}
                        onChange={() => toggleOne(slot.id)}
                        aria-label="枠を選択"
                      />
                    </td>
                    <td>{formatLocal(slot.startAt)}</td>
                    <td>{formatLocal(slot.endAt)}</td>
                    <td>
                      <span className={status.badge}>{status.label}</span>
                    </td>
                    <td>
                      <span className={payment.badge}>{payment.label}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {canConfirmPayment && confirmTargetId ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleConfirmPayment(confirmTargetId)}
                            disabled={confirmingBookingId === confirmTargetId}
                          >
                            {confirmingBookingId === confirmTargetId ? "確認中…" : "入金を確認"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {T.detail}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDeleteSlot(slot)}
                          disabled={deletingId === slot.id}
                        >
                          {deletingId === slot.id ? "削除中…" : T.remove}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {slots.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    {T.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={selectedSlot !== null} onClose={() => setSelectedSlot(null)} title="予約詳細">
        {selectedSlot ? (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm text-slate-800">
              <DetailItem label="開始" value={formatLocal(selectedSlot.startAt)} />
              <DetailItem label="終了" value={formatLocal(selectedSlot.endAt)} />
              <DetailItem label="状態" value={T.slotStatus(selectedSlot.status)} />
              <DetailItem
                label="有料枠"
                value={selectedSlot.isPaidSlot ? "はい" : "いいえ"}
              />
              <DetailItem
                label="支払い"
                value={
                  selectedSlot.isPaidSlot
                    ? selectedSlotPaymentBadge?.label ?? T.paymentStatus.unknown
                    : T.paymentStatus.none
                }
              />
              <DetailItem label="お名前" value={selectedSlot.booking?.playerName ?? "-"} />
              <DetailItem label="Discord" value={selectedSlot.booking?.discordId?.trim() || "-"} />
              <DetailItem
                label="第五人格ID"
                value={selectedSlot.booking?.identityVId?.trim() || "-"}
              />
              <DetailItem
                label="種別"
                value={bookingTypeLabel(selectedSlot.booking?.bookingType)}
              />
              <DetailItem
                label="ステータス"
                value={toStatusLabel(selectedSlot.booking?.status)}
              />
              <DetailItem
                label="予約作成日時"
                value={selectedSlot.booking ? formatLocal(selectedSlot.booking.createdAt) : "-"}
              />
            </div>
            <div>
              <div className="admin-subtle mb-1">メモ</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                {selectedSlot.booking?.notes?.trim() || "-"}
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedSlot(null)}
              >
                {"\"閉じる\""}
              </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDeleteSlot(selectedSlot)}
                  data-autofocus
                >
                  T.remove
                </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function formatLocal(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "-";
  return formatter.format(date);
}

function toDateTimeLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <div className="admin-subtle">{label}</div>
      <div className="text-slate-900">{value}</div>
    </div>
  );
}
