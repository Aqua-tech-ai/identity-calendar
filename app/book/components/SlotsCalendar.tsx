'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { EventInput, EventClickArg } from '@fullcalendar/core';

const BUTTON_TEXT = {
  today: '今日',
  month: '月',
  week: '週',
  day: '日',
} as const;

type Props = {
  events: EventInput[];
  initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  onEventClick?: (arg: EventClickArg) => void;
  slotDuration?: string;
  allDaySlot?: boolean;
};

export default function SlotsCalendar({
  events,
  initialView = 'dayGridMonth',
  onEventClick,
  slotDuration,
  allDaySlot,
}: Props) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView={initialView}
      locales={[jaLocale]}
      locale="ja"
      events={events}
      eventClick={onEventClick}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      buttonText={BUTTON_TEXT}
      slotDuration={slotDuration}
      allDaySlot={allDaySlot}
      height="auto"
    />
  );
}
