import { formatInTimeZone } from 'date-fns-tz';
import type { BookingType } from '../types/booking';

const TOKYO_TIMEZONE = 'Asia/Tokyo';

interface CsvBookingRow {
  bookingType: BookingType | string;
  playerName: string;
  discordId: string;
  identityVId: string;
  notes?: string | null;
  slotStart: Date;
  slotEnd: Date;
  status: string;
  cancelToken: string;
}

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function bookingsToCsv(rows: CsvBookingRow[]): string {
  const header = [
    'Booking Type',
    'Player Name',
    'Discord ID',
    'Identity V ID',
    'Notes',
    'Start (JST)',
    'End (JST)',
    'Status',
    'Cancel Token',
  ];

  const lines = [
    header.join(','),
    ...rows.map((row) => {
      const values = [
        row.bookingType,
        row.playerName,
        row.discordId,
        row.identityVId,
        row.notes ?? '',
        formatInTimeZone(row.slotStart, TOKYO_TIMEZONE, 'yyyy-MM-dd HH:mm'),
        formatInTimeZone(row.slotEnd, TOKYO_TIMEZONE, 'yyyy-MM-dd HH:mm'),
        row.status,
        row.cancelToken,
      ];

      return values.map((value) => escapeCsv(String(value))).join(',');
    }),
  ];

  return lines.join('\n');
}

export type { CsvBookingRow };
