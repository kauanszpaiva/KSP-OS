"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BlueprintCanvas, type BlueprintCanvasPayload } from "@ksp/ui/blueprint-canvas";
import { saveBlueprintCanvas, setBlueprintStatus, deleteBlueprint } from "../../blueprints-actions";
import "@xyflow/react/dist/style.css";

export function IncBlueprintEditor({
  blueprintId,
  initialCanvas,
  initialStatus,
  initialName,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem" }}>
        <Link className="textButton" href="/blueprints">
          ← Blueprints
        </Link>
        <span className="status" style={{ color: status === "active" ? "var(--success)" : status === "archived" ? "var(--muted)" : "var(--warning)" }}>
          {status}
        </span>
        <strong style={{ color: "var(--ink)" }}>{initialName}</strong>

        <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <div className="controlGrid">
            <button className={viewMode ? "control" : "control active"} type="button" onClick={() => setViewMode(false)}>
              Edit
            </button>
            <button className={viewMode ? "control active" : "control"} type="button" onClick={() => setViewMode(true)}>
              View
            </button>
          </div>

          <select
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
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>

          <button
            className="primaryButton"
            type="button"
            disabled={!dirty || savePending}
            onClick={() => {
              startSave(() => {
                saveBlueprintCanvas({ id: blueprintId, canvas }).then((result) => {
                  if (result.ok) {
                    initialRef.current = canvas;
                    setNotice("Saved");
                    router.refresh();
                  } else {
                    setNotice(result.error);
                  }
                });
              });
            }}
          >
            {savePending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>

          <button
            className="textButton"
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
          >
            Delete
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="notice" style={{ margin: 0 }}>
          {notice}
        </p>
      )}

      <BlueprintCanvas canvas={canvas} onChange={setCanvas} readOnly={viewMode} height={640} />

      <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: 0 }}>
        Drag nodes to arrange, drag between the side handles to connect, double-click a label to rename, and press Delete
        to remove a selection. Zoom with the wheel or the controls.
      </p>
    </div>
  );
}
