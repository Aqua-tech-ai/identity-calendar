const TEN_MINUTES = 10;

const LOCAL_DATE_TIME_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const cloneDate = (input: Date): Date => new Date(input.getTime());

export function roundTo10Min(date: Date, mode: 'ceil' | 'floor'): Date {
  const value = cloneDate(date);
  value.setSeconds(0, 0);
  const minutes = value.getMinutes();
  const remainder = minutes % TEN_MINUTES;

  if (remainder === 0) {
    return value;
  }

  if (mode === 'ceil') {
    value.setMinutes(minutes + (TEN_MINUTES - remainder));
    return value;
  }

  value.setMinutes(minutes - remainder);
  return value;
}

export function is10MinStep(local: string): boolean {
  const match = LOCAL_DATE_TIME_REGEX.exec(local);
  if (!match) {
    return false;
  }
  const minutes = Number.parseInt(match[5], 10);
  return !Number.isNaN(minutes) && minutes % TEN_MINUTES === 0;
}

export function parseLocalDateTimeToUTC(local: string): Date {
  const match = LOCAL_DATE_TIME_REGEX.exec(local);
  if (!match) {
    throw new Error('invalid-datetime-format');
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    throw new Error('invalid-datetime-numeric');
  }

  const utcValue = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  return new Date(utcValue);
}
