"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createBlueprintSchema,
  idParamSchema,
  saveBlueprintCanvasSchema,
  setBlueprintStatusSchema,
} from "@ksp/validation";
import { requireIncOwner } from "../lib/inc-session";
import { getServerSupabase } from "../lib/supabase";

export type BlueprintActionResult = { ok: true; id?: string } | { ok: false; error: string };

function firstIssue(error: { issues?: Array<{ message: string }> }): string {
  return error.issues?.[0]?.message ?? "Invalid request.";
}

export async function createBlueprintForm(
  _prev: { ok: boolean; error?: string },
  form: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const parsed = createBlueprintSchema.safeParse({
    name: form.get("name"),
    description: form.get("description") ?? "",
    kind: form.get("kind") ?? "system",
    projectId: form.get("projectId") === "" ? null : form.get("projectId"),
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { data, error } = await supabase
    .from("blueprints")
    .insert({
      organization_id: ctx.organizationId,
      project_id: parsed.data.projectId ?? null,
      name: parsed.data.name,
      description: parsed.data.description || "",
      kind: parsed.data.kind,
      status: "draft",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Could not create the blueprint." };

  revalidatePath("/blueprints");
  redirect(`/blueprints/${data.id}`);
}

export async function saveBlueprintCanvas(input: {
  id: string;
  canvas: unknown;
}): Promise<BlueprintActionResult> {
  await requireIncOwner();
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const parsed = saveBlueprintCanvasSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase
    .from("blueprints")
    .update({ canvas: parsed.data.canvas })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not save the canvas." };

  revalidatePath(`/blueprints/${parsed.data.id}`);
  revalidatePath("/blueprints");
  return { ok: true, id: parsed.data.id };
}

export async function setBlueprintStatus(input: {
  id: string;
  status: string;
}): Promise<BlueprintActionResult> {
  await requireIncOwner();
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const parsed = setBlueprintStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase
    .from("blueprints")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not update the blueprint status." };

  revalidatePath("/blueprints");
  revalidatePath(`/blueprints/${parsed.data.id}`);
  return { ok: true, id: parsed.data.id };
}

export async function deleteBlueprint(input: { id: string }): Promise<BlueprintActionResult> {
  await requireIncOwner();
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const parsed = idParamSchema.safeParse({ id: input.id });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from("blueprints").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not delete the blueprint." };

  revalidatePath("/blueprints");
  redirect("/blueprints");
}
