import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DaySlot, SlotInput } from '@ksp/domain';
import { DayScheduler } from './day-scheduler';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const task = { id: '22222222-2222-4222-8222-222222222222', title: 'OBRYX task', projectId: 'project-a', projectName: 'OBRYX', dueDate: '2026-10-01' };
const slot: DaySlot = { id: '11111111-1111-4111-8111-111111111111', taskId: task.id, date: '2026-09-23', startMinute: 540, endMinute: 600, revision: 1 };
function success(input: SlotInput) { return Promise.resolve({ ok: true as const, slot: { id: input.id, taskId: input.taskId, date: input.date, startMinute: input.startMinute, endMinute: input.endMinute, revision: input.expectedRevision + 1 } }); }
beforeEach(() => { refresh.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('personal daily Gantt', () => {
  it('does not invent scheduled blocks for unscheduled tasks', () => {
    const save = vi.fn(success);
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[]} saveSlot={save} removeSlot={vi.fn()} />);
    expect(screen.getByText(/No tasks scheduled for this day/)).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });
  it('schedules the explicitly selected task, not its deadline', async () => {
    const save = vi.fn(success);
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[]} saveSlot={save} removeSlot={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Task to schedule'), { target: { value: task.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule task' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ taskId: task.id, date: slot.date, startMinute: 540, endMinute: 600, expectedRevision: 0 });
    expect(task.dueDate).toBe('2026-10-01');
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Schedule saved/));
  });
  it('moves a block with the keyboard and persists the correct revision', async () => {
    const save = vi.fn(success);
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[slot]} saveSlot={save} removeSlot={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move OBRYX task' }), { key: 'ArrowRight' });
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ startMinute: 555, endMinute: 615, expectedRevision: 1 })));
    await waitFor(() => expect(screen.getByTestId(`slot-${slot.id}`).style.left).toBe('1110px'));
  });
  it('resizes an endpoint with the keyboard', async () => {
    const save = vi.fn(success);
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[slot]} saveSlot={save} removeSlot={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Change end of OBRYX task' }), { key: 'ArrowRight' });
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ startMinute: 540, endMinute: 615 })));
  });
  it('keeps the confirmed slot unchanged after a failed save', async () => {
    const save = vi.fn().mockResolvedValue({ ok: false, error: 'Schedule conflict' });
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[slot]} saveSlot={save} removeSlot={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move OBRYX task' }), { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Schedule conflict'));
    expect(screen.getByTestId(`slot-${slot.id}`).style.left).toBe('1080px');
  });
  it('rejects overlap before calling the server, including other projects', () => {
    const save = vi.fn(success);
    const other = { ...slot, id: '33333333-3333-4333-8333-333333333333', taskId: 'other', startMinute: 600, endMinute: 660 };
    render(<DayScheduler date={slot.date} projectId="project-a" tasks={[task]} initialSlots={[slot, other]} saveSlot={save} removeSlot={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move OBRYX task' }), { key: 'ArrowRight' });
    expect(screen.getByRole('alert').textContent).toMatch(/overlaps another task/);
    expect(save).not.toHaveBeenCalled();
  });
  it('supports time-field editing without dragging', async () => {
    const save = vi.fn(success);
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[slot]} saveSlot={save} removeSlot={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit times' }));
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '09:30' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save times' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: slot.id, startMinute: 570, endMinute: 630, expectedRevision: 1 })));
  });
  it('unschedules a block without calling task deletion', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true });
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[slot]} saveSlot={vi.fn()} removeSlot={remove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unschedule' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(slot.id, 1));
    await waitFor(() => expect(screen.queryByTestId(`slot-${slot.id}`)).toBeNull());
    expect(screen.getByRole('status').textContent).toMatch(/task itself was not deleted/);
  });
  it('disables writes when the persistence layer is unavailable', () => {
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[slot]} unavailable saveSlot={vi.fn()} removeSlot={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Schedule task' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Move OBRYX task' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('moves by pointer delta only on release and cancels interrupted drags', async () => {
    class TestPointer extends MouseEvent {
      pointerId = 1;
      isPrimary = true;
    }
    vi.stubGlobal('PointerEvent', TestPointer);
    const save = vi.fn(success);
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[slot]} saveSlot={save} removeSlot={vi.fn()} />);
    const bar = screen.getByRole('button', { name: 'Move OBRYX task' });
    bar.setPointerCapture = vi.fn(); bar.hasPointerCapture = () => true; bar.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(bar, { clientX: 100, button: 0 });
    fireEvent.pointerMove(bar, { clientX: 130 });
    expect(save).not.toHaveBeenCalled();
    fireEvent.pointerCancel(bar);
    expect(screen.getByTestId(`slot-${slot.id}`).style.left).toBe('1080px');
    fireEvent.pointerDown(bar, { clientX: 100, button: 0 });
    fireEvent.pointerMove(bar, { clientX: 130 });
    fireEvent.pointerUp(bar, { clientX: 130 });
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ startMinute: 555, endMinute: 615 })));
  });
});
