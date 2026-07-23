import type { ActionResult } from '../../actions';

type ServerAction = (prev: ActionResult, form: FormData) => Promise<ActionResult>;

/** Imperatively invoke a server action with a plain field map (for drag-drop,
 * inline cell edits, etc., where a <form> submit is not the trigger). */
export async function runAction(action: ServerAction, fields: Record<string, string>): Promise<ActionResult> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  try {
    return await action({ ok: false }, fd);
  } catch {
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}
