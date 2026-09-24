'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adjustRange, minuteLabel, parseMinute, rangesOverlap, validateSlotInput, type DaySlot, type RangeEdit, type ScheduleTask, type SlotInput, type SlotResult } from '@ksp/domain';

interface Props {
  date: string;
  tasks: ScheduleTask[];
  initialSlots: DaySlot[];
  projectId?: string;
  unavailable?: boolean;
  saveSlot: (input: SlotInput) => Promise<SlotResult>;
  removeSlot: (id: string, revision: number) => Promise<SlotResult>;
}
const field = 'min-h-11 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink';
const button = 'min-h-11 rounded-lg border border-line-2 px-3 py-2 text-sm font-medium text-ink disabled:opacity-50';
const times = Array.from({ length: 97 }, (_, i) => i * 15);
const pxPerMinute = 2;

export function DayScheduler({ date, tasks, initialSlots, projectId, unavailable = false, saveSlot, removeSlot }: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);
  const [editing, setEditing] = useState<DaySlot | null>(null);
  const [preview, setPreview] = useState<DaySlot | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const drag = useRef<{ slot: DaySlot; mode: RangeEdit; x: number; scrollLeft: number; pointerId: number; candidate: DaySlot } | null>(null);
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const scopedTasks = tasks.filter((task) => !projectId || task.projectId === projectId);
  const options = scopedTasks.filter((task) => task.schedulable !== false);
  // Existing reservations stay visible when a task completes, so the owner can
  // remove them. RLS still controls which task metadata is available.
  const visible = slots.filter((slot) => scopedTasks.some((task) => task.id === slot.taskId)).sort((a, b) => a.startMinute - b.startMinute);
  const focusedSlot = visible[0];
  const focusedId = focusedSlot?.id;
  const focusedStart = focusedSlot?.startMinute;

  useEffect(() => { setSlots(initialSlots); }, [initialSlots]);
  useEffect(() => {
    if (scroll.current && focusedStart !== undefined && !drag.current) {
      scroll.current.scrollLeft = Math.max(0, focusedStart - 15) * pxPerMinute;
    }
  }, [date, focusedId, focusedStart]);

  async function persist(candidate: DaySlot, expectedRevision: number) {
    if (busy.current || unavailable) return;
    if (taskById.get(candidate.taskId)?.schedulable === false) {
      setError('This task is no longer active. You can remove its existing time block.');
      return;
    }
    const input = { ...candidate, expectedRevision };
    const invalid = validateSlotInput(input);
    if (invalid) { setError(invalid); return; }
    if (slots.some((slot) => slot.id !== candidate.id && rangesOverlap(slot, candidate))) {
      setError('This time overlaps another task in your day, including other projects. Choose an available time.');
      return;
    }
    busy.current = true;
    setPending(true); setError(''); setMessage('');
    try {
      const result = await saveSlot(input);
      if (!result.ok) { setError(result.error); router.refresh(); return; }
      if (!result.slot) { setError('The server did not confirm this schedule. Refresh before trying again.'); router.refresh(); return; }
      const confirmed = result.slot;
      setSlots((current) => [...current.filter((slot) => slot.id !== confirmed.id), confirmed]);
      setEditing(null);
      setMessage('Schedule saved. The task deadline has not changed.');
    } catch {
      setError('Could not confirm the save. Refresh before trying again.');
      router.refresh();
    } finally {
      busy.current = false; setPending(false);
    }
  }

  async function unschedule(slot: DaySlot) {
    if (busy.current || unavailable) return;
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const result = await removeSlot(slot.id, slot.revision);
      if (!result.ok) { setError(result.error); router.refresh(); return; }
      setSlots((current) => current.filter((item) => item.id !== slot.id));
      setEditing(null); setMessage('Removed from your day. The task itself was not deleted.');
    } catch { setError('Could not confirm the change. Refresh before trying again.'); router.refresh(); }
    finally { busy.current = false; setPending(false); }
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, slot: DaySlot, mode: RangeEdit) {
    if (busy.current || unavailable || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { slot, mode, x: event.clientX, scrollLeft: scroll.current?.scrollLeft ?? 0, pointerId: event.pointerId, candidate: slot };
    setPreview(slot); setError('');
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const delta = (event.clientX - state.x + (scroll.current?.scrollLeft ?? 0) - state.scrollLeft) / pxPerMinute;
    state.candidate = { ...state.slot, ...adjustRange(state.slot, state.mode, delta) };
    setPreview(state.candidate);
  }
  function cancelDrag() { drag.current = null; setPreview(null); }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    moveDrag(event);
    cancelDrag();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (state.candidate.startMinute !== state.slot.startMinute || state.candidate.endMinute !== state.slot.endMinute) {
      void persist(state.candidate, state.slot.revision);
    }
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, slot: DaySlot, mode: RangeEdit) {
    if (event.key === 'Escape') { event.preventDefault(); cancelDrag(); return; }
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || busy.current || unavailable) return;
    event.preventDefault();
    const delta = (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 60 : 15);
    const changed = { ...slot, ...adjustRange(slot, mode, delta) };
    if (changed.startMinute !== slot.startMinute || changed.endMinute !== slot.endMinute) void persist(changed, slot.revision);
  }
  function events(slot: DaySlot, mode: RangeEdit) {
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => startDrag(event, slot, mode),
      onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: cancelDrag, onLostPointerCapture: cancelDrag,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => keyboard(event, slot, mode)
    };
  }

  return <section className="min-w-0 space-y-4" aria-label="My day planner" aria-busy={pending}>
    <div>
      <h2 className="text-lg font-semibold text-ink">My day</h2>
      <p className="mt-1 text-sm text-ink-3">New York time (America/New_York). Drag to move; drag either edge to resize. Arrow keys move 15 minutes, Shift + arrow moves one hour. Escape cancels a drag.</p>
      <p className="mt-1 text-xs text-ink-4">This is your personal work plan, not a change to project deadlines. Use Edit times on mobile or without dragging.</p>
    </div>
    {unavailable && <p role="alert" className="rounded-lg border border-warn/40 p-3 text-sm text-warn">Daily scheduling is not available in this environment yet. No schedule changes will be saved.</p>}
    {error && <p role="alert" className="rounded-lg border border-risk/40 p-3 text-sm text-risk">{error}</p>}
    <p role="status" aria-live="polite" className="text-sm text-ink-3">{pending ? 'Saving schedule...' : message}</p>
    <form key={editing?.id ?? 'new'} className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const startMinute = parseMinute(String(form.get('start')));
      const endMinute = parseMinute(String(form.get('end')));
      if (startMinute === null || endMinute === null) { setError('Choose valid start and end times.'); return; }
      void persist({ id: editing?.id ?? crypto.randomUUID(), taskId: editing?.taskId ?? String(form.get('task')), date, startMinute, endMinute, revision: editing?.revision ?? 0 }, editing?.revision ?? 0);
    }}>
      <label className="block text-xs text-ink-3">Task
        <select name="task" className={field} aria-label="Task to schedule" required disabled={pending || unavailable || !!editing} defaultValue={editing?.taskId ?? ''}>
          <option value="" disabled>Choose a project task</option>
          {options.map((task) => <option key={task.id} value={task.id}>{task.title} - {task.projectName ?? 'Unassigned project'}</option>)}
        </select>
      </label>
      <label className="block text-xs text-ink-3">Start
        <select name="start" className={field} aria-label="Start time" disabled={pending || unavailable} defaultValue={minuteLabel(editing?.startMinute ?? 540)}>
          {times.slice(0, -1).map((minute) => <option key={minute}>{minuteLabel(minute)}</option>)}
        </select>
      </label>
      <label className="block text-xs text-ink-3">End
        <select name="end" className={field} aria-label="End time" disabled={pending || unavailable} defaultValue={minuteLabel(editing?.endMinute ?? 600)}>
          {times.slice(1).map((minute) => <option key={minute}>{minuteLabel(minute)}</option>)}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" className={button} disabled={pending || unavailable || options.length === 0 || (!!editing && taskById.get(editing.taskId)?.schedulable === false)}>{editing ? 'Save times' : 'Schedule task'}</button>
        {editing && <button type="button" className={button} disabled={pending} onClick={() => setEditing(null)}>Cancel</button>}
      </div>
    </form>
    {visible.length === 0 ? <p className="rounded-lg border border-dashed border-line p-5 text-sm text-ink-3">No tasks scheduled for this day and project. Choose a task and times above.</p> : <>
      <div ref={scroll} className="overflow-x-auto rounded-xl border border-line bg-surface" tabIndex={0} aria-label="Daily Gantt. Scroll horizontally to see all hours.">
        <div style={{ width: 180 + 1440 * pxPerMinute }}>
          <div className="flex h-10 border-b border-line">
            <div className="sticky left-0 z-20 w-[180px] shrink-0 bg-surface px-3 py-2 text-xs font-semibold text-ink">Task / project</div>
            <div className="relative" style={{ width: 1440 * pxPerMinute }}>
              {Array.from({ length: 24 }, (_, hour) => <span key={hour} className="absolute top-2 text-xs text-ink-3" style={{ left: hour * 60 * pxPerMinute }}>{minuteLabel(hour * 60)}</span>)}
            </div>
          </div>
          {visible.map((slot) => {
            const task = taskById.get(slot.taskId)!;
            const shown = preview?.id === slot.id ? preview : slot;
            return <div key={slot.id} className="flex min-h-20 border-b border-line last:border-b-0">
              <div className="sticky left-0 z-20 w-[180px] shrink-0 bg-surface px-3 py-2">
                <p className="truncate text-xs font-semibold text-ink" title={task.title}>{task.title}</p>
                <p className="truncate text-[11px] text-ink-3">{task.projectName ?? 'No project'}</p>
                <p className="text-[11px] text-ink-3">{minuteLabel(shown.startMinute)} - {minuteLabel(shown.endMinute)}</p>
              </div>
              <div className="relative min-h-20" style={{ width: 1440 * pxPerMinute }}>
                {Array.from({ length: 24 }, (_, hour) => <span key={hour} aria-hidden className="pointer-events-none absolute inset-y-0 border-l border-line" style={{ left: hour * 60 * pxPerMinute }} />)}
                <div data-testid={`slot-${slot.id}`} className="absolute top-4 flex h-11 rounded-lg bg-brand text-on-brand" style={{ left: shown.startMinute * pxPerMinute, width: (shown.endMinute - shown.startMinute) * pxPerMinute }}>
                  <button type="button" aria-label={`Change start of ${task.title}`} disabled={pending || unavailable || task.schedulable === false} {...events(slot, 'start')} className="w-2 shrink-0 cursor-ew-resize touch-none rounded-l-lg border-r border-white/30 focus-visible:outline focus-visible:outline-2" />
                  <button type="button" aria-label={`Move ${task.title}`} disabled={pending || unavailable || task.schedulable === false} {...events(slot, 'move')} className="min-w-0 flex-1 cursor-grab touch-none truncate px-1 text-xs focus-visible:outline focus-visible:outline-2" title={`${task.title}: ${minuteLabel(shown.startMinute)} - ${minuteLabel(shown.endMinute)}`}>{minuteLabel(shown.startMinute)} - {minuteLabel(shown.endMinute)}</button>
                  <button type="button" aria-label={`Change end of ${task.title}`} disabled={pending || unavailable || task.schedulable === false} {...events(slot, 'end')} className="w-2 shrink-0 cursor-ew-resize touch-none rounded-r-lg border-l border-white/30 focus-visible:outline focus-visible:outline-2" />
                </div>
              </div>
            </div>;
          })}
        </div>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-4">
        {visible.map((slot) => <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="min-w-0"><p className="break-words text-sm font-medium text-ink">{taskById.get(slot.taskId)?.title}</p><p className="text-xs text-ink-3">{minuteLabel(slot.startMinute)} - {minuteLabel(slot.endMinute)} / {taskById.get(slot.taskId)?.projectName ?? 'No project'}</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={pending || unavailable || taskById.get(slot.taskId)?.schedulable === false} onClick={() => { setEditing(slot); setError(''); }}>Edit times</button>
            <button type="button" className={button} disabled={pending || unavailable} onClick={() => void unschedule(slot)}>Unschedule</button>
          </div>
        </li>)}
      </ul>
    </>}
  </section>;
}
