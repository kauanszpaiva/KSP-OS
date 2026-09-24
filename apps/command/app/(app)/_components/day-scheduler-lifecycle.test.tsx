import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DayScheduler } from './day-scheduler';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);
const task = { id: '22222222-2222-4222-8222-222222222222', title: 'Completed task', projectId: 'project', projectName: 'Example', dueDate: null, schedulable: false };
const slot = { id: '11111111-1111-4111-8111-111111111111', taskId: task.id, date: '2026-09-23', startMinute: 570, endMinute: 630, revision: 1 };
describe('schedule lifecycle and focused viewport', () => {
  it('keeps completed-task reservations visible for removal, not for new scheduling or editing', () => {
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[slot]} saveSlot={vi.fn()} removeSlot={vi.fn()} />);
    expect(screen.getByTestId(`slot-${slot.id}`)).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Completed task/ })).toBeNull();
    expect((screen.getByRole('button', { name: 'Move Completed task' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Edit times' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Unschedule' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('lets the owner release a completed task reservation without deleting the task', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true });
    render(<DayScheduler date={slot.date} tasks={[task]} initialSlots={[slot]} saveSlot={vi.fn()} removeSlot={remove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unschedule' }));
    await waitFor(() => expect(screen.queryByTestId(`slot-${slot.id}`)).toBeNull());
    expect(remove).toHaveBeenCalledWith(slot.id, slot.revision);
  });
  it('opens the timeline around the first scheduled block instead of hiding it on narrow screens', () => {
    render(<DayScheduler date={slot.date} tasks={[{ ...task, schedulable: true }]} initialSlots={[slot]} saveSlot={vi.fn()} removeSlot={vi.fn()} />);
    const grid = screen.getByLabelText(/Daily Gantt/);
    expect(grid.scrollLeft).toBe(1110);
  });
});
