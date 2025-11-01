'use client';
import { useEffect, useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core';

type Ev = { id: string; start: string; end: string; title: string };

export default function BookingClient() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [rangeStart, rangeEnd] = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
    return [from, to] as const;
  }, []);

  async function load() {
    const qs = new URLSearchParams({
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
    });
    const res = await fetch(`/api/slots?${qs}`, { cache: 'no-store' });
    const j = await res.json();
    setEvents(j.events ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onEventClick(arg: EventClickArg) {
    const slotId = arg.event.id;
    const playerName = prompt('お名前を入力してください');
    if (!playerName) return;
    const discordId = prompt('Discord ID（例: name#1234）を入力してください');
    if (!discordId) return;
    const bookingTypeRaw = prompt('種別を入力: PRACTICE か COACHING');
    if (!bookingTypeRaw) return;
    const bookingType = bookingTypeRaw.toUpperCase();
    if (bookingType !== 'PRACTICE' && bookingType !== 'COACHING') {
      alert('種別が不正です');
      return;
    }

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId, playerName, discordId, bookingType }),
    });
    if (res.ok) {
      alert('予約しました！');
      await load();
    } else {
      const j = await res.json().catch(() => ({}));
      alert('予約に失敗しました: ' + (j.error ?? res.statusText));
    }
  }

  function onSelect(_arg: DateSelectArg) {
    alert('管理者で枠を作成してください（/admin）。この画面では空き枠のみ予約できます。');
  }

  return (
    <div className="p-4">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locales={[jaLocale]}
        locale="ja"
        headerToolbar={{ left: 'prev,next today', center: '', right: 'timeGridWeek,timeGridDay' }}
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        selectable
        select={onSelect}
        eventClick={onEventClick}
        events={events}
        height="auto"
      />
    </div>
  );
}
