export function startOfUtcMonth(ref = new Date()): Date {
  return new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1, 0, 0, 0, 0),
  );
}

export function endOfUtcMonth(ref = new Date()): Date {
  return new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

export function formatInputDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseInputDateUtc(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}
