export function localIsoDate(date: Date = new Date()): string {
  // `toISOString()` est en UTC. Pour obtenir YYYY-MM-DD en heure locale,
  // on décale la date de l'offset timezone puis on re-formate en ISO.
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 10);
}

export function parseIsoDateLocal(value: string): Date | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;

  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return null;

  return new Date(year, monthIndex, day);
}
