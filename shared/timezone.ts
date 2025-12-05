export const CURRENCY_TIMEZONE_MAP: Record<string, { timezone: string; offset: number; label: string }> = {
  THB: { timezone: 'Asia/Bangkok', offset: 7, label: 'UTC+7 (曼谷)' },
  TWD: { timezone: 'Asia/Taipei', offset: 8, label: 'UTC+8 (台北)' },
  CNY: { timezone: 'Asia/Shanghai', offset: 8, label: 'UTC+8 (北京)' },
  USD: { timezone: 'America/New_York', offset: -5, label: 'UTC-5 (纽约)' },
  IDR: { timezone: 'Asia/Jakarta', offset: 7, label: 'UTC+7 (雅加达)' },
  VND: { timezone: 'Asia/Ho_Chi_Minh', offset: 7, label: 'UTC+7 (胡志明)' },
  MMK: { timezone: 'Asia/Yangon', offset: 6.5, label: 'UTC+6:30 (仰光)' },
};

export function getTimezoneForCurrency(currency: string): { timezone: string; offset: number; label: string } {
  return CURRENCY_TIMEZONE_MAP[currency] || CURRENCY_TIMEZONE_MAP.THB;
}

export function localToUTC(localDateStr: string, offsetHours: number): Date {
  const localDate = new Date(localDateStr);
  const utcTime = localDate.getTime() - (offsetHours * 60 * 60 * 1000);
  return new Date(utcTime);
}

export function utcToLocal(utcDate: Date | string, offsetHours: number): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const localTime = date.getTime() + (offsetHours * 60 * 60 * 1000);
  return new Date(localTime);
}

export function formatLocalDateTime(utcDate: Date | string, offsetHours: number): string {
  const localDate = utcToLocal(utcDate, offsetHours);
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function parseLocalToUTCString(localDateStr: string, offsetHours: number): string {
  const utcDate = localToUTC(localDateStr, offsetHours);
  return utcDate.toISOString();
}
