export const SCHEDULE_TIME_ZONE = 'America/New_York';
export const DAY_MINUTES = 1440;
export const SCHEDULE_STEP = 15;
export type RangeEdit = 'move' | 'start' | 'end';
export interface MinuteRange { startMinute: number; endMinute: number }
export interface SlotInput extends MinuteRange {
  id: string;
  taskId: string;
  date: string;
  expectedRevision: number;
}
export interface DaySlot extends MinuteRange {
  id: string;
  taskId: string;
  date: string;
  revision: number;
}
export interface ScheduleTask { id: string; title: string; projectId: string | null; projectName: string | null; dueDate: string | null }
export type SlotResult = { ok: true; slot?: DaySlot } | { ok: false; error: string };

export function isScheduleDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function dayInScheduleZone(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: SCHEDULE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function minuteLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function parseMinute(value: string): number | null {
  if (value === '24:00') return DAY_MINUTES;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
export function isMinuteRange(value: MinuteRange): boolean {
  return Number.isInteger(value.startMinute) && Number.isInteger(value.endMinute)
    && value.startMinute >= 0 && value.endMinute <= DAY_MINUTES && value.endMinute > value.startMinute
    && value.startMinute % SCHEDULE_STEP === 0 && value.endMinute % SCHEDULE_STEP === 0;
}
export function adjustRange(range: MinuteRange, mode: RangeEdit, deltaMinutes: number): MinuteRange {
  if (!isMinuteRange(range) || !Number.isFinite(deltaMinutes)) throw new Error('Invalid schedule range');
  const delta = Math.round(deltaMinutes / SCHEDULE_STEP) * SCHEDULE_STEP;
  if (mode === 'start') return { startMinute: Math.max(0, Math.min(range.endMinute - SCHEDULE_STEP, range.startMinute + delta)), endMinute: range.endMinute };
  if (mode === 'end') return { startMinute: range.startMinute, endMinute: Math.min(DAY_MINUTES, Math.max(range.startMinute + SCHEDULE_STEP, range.endMinute + delta)) };
  const duration = range.endMinute - range.startMinute;
  const startMinute = Math.max(0, Math.min(DAY_MINUTES - duration, range.startMinute + delta));
  return { startMinute, endMinute: startMinute + duration };
}
export function rangesOverlap(a: MinuteRange, b: MinuteRange): boolean {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function validateSlotInput(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'Invalid schedule request.';
  const input = value as SlotInput;
  if (!isUuid(input.id) || !isUuid(input.taskId) || !isScheduleDate(input.date)) return 'Choose a valid task and date.';
  if (!isMinuteRange(input)) return 'Use 15-minute increments between 00:00 and 24:00, with the end after the start.';
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 || input.expectedRevision > 2147483646) return 'Invalid schedule version. Refresh and try again.';
  return null;
}
