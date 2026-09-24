'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@ksp/ui';
import { BlueprintCanvas, type BlueprintCanvasPayload } from '@ksp/ui/blueprint-canvas';
import { saveBlueprintCanvas, setBlueprintStatus, deleteBlueprint } from '../../blueprints-actions';
import '@xyflow/react/dist/style.css';

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-warn-tint text-warn' },
  active: { label: 'Active', className: 'bg-good-tint text-good' },
  archived: { label: 'Archived', className: 'bg-surface-2 text-ink-4' }
};

export function BlueprintEditor({
  blueprintId,
  initialCanvas,
  initialStatus,
  initialName
}: {
  blueprintId: string;
  initialCanvas: BlueprintCanvasPayload;
  initialStatus: string;
  initialName: string;
}) {
  const router = useRouter();
  const [canvas, setCanvas] = useState<BlueprintCanvasPayload>(initialCanvas);
  const [viewMode, setViewMode] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [notice, setNotice] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();
  const [statusPending, startStatus] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const initialRef = useRef<BlueprintCanvasPayload>(initialCanvas);

  const dirty = JSON.stringify(canvas) !== JSON.stringify(initialRef.current);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div className="min-w-0 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/blueprints"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 sm:rounded-lg"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          Blueprints
        </Link>

        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_META[status]?.className ?? 'bg-surface-2 text-ink-4'}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
          {STATUS_META[status]?.label ?? status}
        </span>

        <span className="hidden min-w-0 items-center gap-1.5 text-[12.5px] text-ink-3 sm:inline-flex">
          <Icon name="layers" className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate font-medium text-ink-2">{initialName}</span>
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-xl border border-line bg-surface p-0.5 sm:rounded-lg">
            {[
              { value: false, label: 'Edit' },
              { value: true, label: 'View' }
            ].map((mode) => (
              <button
                key={mode.label}
                type="button"
                onClick={() => setViewMode(mode.value)}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-colors duration-fast ${
                  viewMode === mode.value ? 'bg-accent-tint text-brand' : 'text-ink-3 hover:text-ink'
                }`}
              >
                <Icon name={mode.value ? 'eye' : 'edit'} className="h-3.5 w-3.5" />
                {mode.label}
              </button>
            ))}
          </div>

          <label htmlFor="blueprint-status" className="sr-only">Status</label>
          <select
            id="blueprint-status"
            value={status}
            disabled={statusPending}
            onChange={(event) => {
              const next = event.target.value;
              setStatus(next);
              startStatus(() => {
                setBlueprintStatus({ id: blueprintId, status: next }).then((result) => {
                  if (!result.ok) {
                    setStatus(initialStatus);
                    setNotice(result.error);
                  }
                });
              });
            }}
            className="min-h-10 rounded-xl border border-line bg-surface px-3 text-[12.5px] font-medium text-ink focus:border-brand focus:outline-none sm:rounded-lg"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>

          <button
            type="button"
            disabled={!dirty || savePending}
            onClick={() => {
              startSave(() => {
                saveBlueprintCanvas({ id: blueprintId, canvas }).then((result) => {
                  if (result.ok) {
                    initialRef.current = canvas;
                    setNotice('Saved');
                    router.refresh();
                  } else {
                    setNotice(result.error);
                  }
                });
              });
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-3.5 text-[12.5px] font-semibold text-on-brand shadow-card transition-[transform,filter] duration-fast hover:brightness-95 active:scale-[0.98] disabled:opacity-50 sm:rounded-lg"
          >
            <Icon name={savePending ? 'refresh' : 'check'} className={savePending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {savePending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>

          <button
            type="button"
            disabled={deletePending}
            onClick={() => {
              if (!window.confirm(`Delete blueprint "${initialName}"? This cannot be undone.`)) return;
              startDelete(() => {
                deleteBlueprint({ id: blueprintId }).then((result) => {
                  if (!result.ok) setNotice(result.error);
                });
              });
            }}
            aria-label="Delete blueprint"
            title="Delete blueprint"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-4 transition-colors hover:border-risk/30 hover:bg-risk-tint hover:text-risk sm:rounded-lg"
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="animate-fade-in inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-medium text-ink-2">
          <Icon name={notice === 'Saved' ? 'check-circle' : 'info'} className="h-4 w-4 text-brand" />
          {notice}
        </p>
      )}

      <BlueprintCanvas
        canvas={canvas}
        onChange={setCanvas}
        readOnly={viewMode}
        height={640}
      />

      <p className="text-[11.5px] leading-relaxed text-ink-4">
        <Icon name="help" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
        Drag nodes to arrange, drag between the side handles to connect, double-click a label to rename, and press Delete to remove a selection. Zoom with the wheel or the controls.
      </p>
    </div>
  );
}
