import { addMinutes, differenceInMinutes, parseISO } from 'date-fns';
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';

export const TOKYO_TIMEZONE = 'Asia/Tokyo';

export function toDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

export function toTokyoTime(value: Date | string): Date {
  return utcToZonedTime(toDate(value), TOKYO_TIMEZONE);
}

export function formatTokyo(date: Date | string, format = 'yyyy/MM/dd HH:mm'): string {
  return formatInTimeZone(toDate(date), TOKYO_TIMEZONE, format);
}

export function parseDateRange(start: string, end: string): { start: Date; end: Date } {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid date range');
  }
  return { start: startDate, end: endDate };
}

export function minutesBetween(start: Date, end: Date): number {
  return differenceInMinutes(end, start);
}

export function addMinutesToDate(value: Date, minutes: number): Date {
  return addMinutes(value, minutes);
}

export function buildUtcDateFromTokyo(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+09:00`);
}
