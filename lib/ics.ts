import { createEvent } from 'ics';

interface IcsOptions {
  startAt: Date;
  endAt: Date;
  summary: string;
  description?: string;
  url?: string;
}

function toUtcComponents(date: Date): [number, number, number, number, number] {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ];
}

export function generateIcs(options: IcsOptions): string {
  const event = {
    start: toUtcComponents(options.startAt),
    end: toUtcComponents(options.endAt),
    title: options.summary,
    description: options.description,
    url: options.url,
    startInputType: 'utc',
    endInputType: 'utc',
  };

  const { error, value } = createEvent(event);
  if (error || !value) {
    throw error || new Error('Failed to create ICS');
  }

  return value;
}
