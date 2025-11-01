import { zonedTimeToUtc } from 'date-fns-tz';

const JPN_TZ = 'Asia/Tokyo';

export function jstRangeToUtc(startIso?: string | null, endIso?: string | null) {
  const now = new Date();
  const startJst = startIso ? new Date(startIso) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  let endJst: Date;
  if (endIso) {
    const e = new Date(endIso);
    endJst = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
  } else {
    endJst = new Date(startJst);
    endJst.setDate(endJst.getDate() + 60);
    endJst.setHours(23, 59, 59, 999);
  }

  const utcStart = zonedTimeToUtc(startJst, JPN_TZ);
  const utcEnd = zonedTimeToUtc(endJst, JPN_TZ);

  return { utcStart, utcEnd };
}

