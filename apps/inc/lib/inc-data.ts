import type { SupabaseClient } from "@ksp/database";

export type MetricState = {
  label: string;
  value: number | null;
  note: string;
};

export type ListRow = {
  id: string;
  primary: string;
  secondary: string;
  meta?: string;
};

async function safeCount(
  supabase: SupabaseClient,
  table: string,
  note: string,
): Promise<MetricState> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return {
    label: table,
    value: error ? null : (count ?? 0),
    note: error ? `${note} · not promoted in this environment` : note,
  };
}

export async function getOwnerMetrics(supabase: SupabaseClient) {
  const entries = await Promise.all([
    safeCount(supabase, "business_units", "Operating verticals"),
    safeCount(supabase, "projects", "Projects across KSP"),
    safeCount(supabase, "tasks", "Tasks visible to the owner plane"),
    safeCount(supabase, "client_organizations", "Client organizations"),
    safeCount(supabase, "partner_organizations", "Network partner organizations"),
    safeCount(supabase, "profiles", "Known identities"),
  ]);
  return entries;
}

export async function getWorkRows(supabase: SupabaseClient): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,status,due_date,owner_id,project_id")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    primary: row.title ?? "Untitled task",
    secondary: row.status ?? "unknown",
    meta: row.due_date ? `Due ${row.due_date}` : row.project_id ? `Project ${row.project_id}` : "Company task",
  }));
}

export async function getPeopleRows(supabase: SupabaseClient): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("id,profile_id,internal_role,scope,suspended_at,profiles(display_name,email)")
    .not("internal_role", "is", null)
    .order("effective_from", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: String(row.id),
      primary: profile?.display_name ?? profile?.email ?? String(row.profile_id),
      secondary: row.suspended_at ? "Suspended" : String(row.internal_role ?? "Internal"),
      meta: row.scope ? `Scope: ${row.scope}` : undefined,
    };
  });
}

export async function getAccessRows(supabase: SupabaseClient): Promise<ListRow[]> {
  const [unitResult, internalResult, temporaryResult] = await Promise.all([
    supabase
      .from("business_unit_memberships")
      .select("id,profile_id,access_level,business_unit_id,suspended_at")
      .limit(40),
    supabase
      .from("internal_permission_grants")
      .select("id,profile_id,action,resource_type,resource_id,revoked_at")
      .is("revoked_at", null)
      .limit(40),
    supabase
      .from("temporary_access_grants")
      .select("id,profile_id,action,resource_type,resource_id,effective_until,revoked_at")
      .is("revoked_at", null)
      .limit(40),
  ]);

  const rows: ListRow[] = [];
  if (!unitResult.error) {
    for (const row of unitResult.data ?? []) {
      const item: any = row;
      rows.push({
        id: `unit-${item.id}`,
        primary: `Unit · ${item.access_level}`,
        secondary: item.suspended_at ? "Suspended" : `Profile ${item.profile_id}`,
        meta: `Business unit ${item.business_unit_id}`,
      });
    }
  }
  if (!internalResult.error) {
    for (const row of internalResult.data ?? []) {
      const item: any = row;
      rows.push({
        id: `permission-${item.id}`,
        primary: `Permission · ${item.action}`,
        secondary: `Profile ${item.profile_id}`,
        meta: item.resource_type ? `${item.resource_type} ${item.resource_id ?? ""}` : "Organization-wide",
      });
    }
  }
  if (!temporaryResult.error) {
    for (const row of temporaryResult.data ?? []) {
      const item: any = row;
      rows.push({
        id: `temporary-${item.id}`,
        primary: `Temporary · ${item.action}`,
        secondary: `Profile ${item.profile_id}`,
        meta: item.effective_until ? `Until ${item.effective_until}` : "Time-bound grant",
      });
    }
  }
  return rows.slice(0, 80);
}

export async function getClientRows(supabase: SupabaseClient): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("client_organizations")
    .select("id,display_name,legal_name,status,relationship_health")
    .order("display_name")
    .limit(60);
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    primary: row.display_name ?? row.legal_name ?? "Client",
    secondary: row.status ?? "unknown",
    meta: row.relationship_health ? `Health: ${row.relationship_health}` : undefined,
  }));
}

export async function getNetworkRows(supabase: SupabaseClient): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("partner_organizations")
    .select("id,display_name,status,business_unit_id")
    .order("display_name")
    .limit(60);
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    primary: row.display_name ?? "Partner",
    secondary: row.status ?? "unknown",
    meta: row.business_unit_id ? `Unit ${row.business_unit_id}` : "No unit assigned",
  }));
}

export async function getFinanceRows(supabase: SupabaseClient): Promise<ListRow[]> {
  const [invoiceResult, approvalResult, subscriptionResult] = await Promise.all([
    supabase.from("invoices").select("id,status,total_minor,currency,issued_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("approval_requests").select("id,approval_type,status,amount_minor,currency,risk_level").order("created_at", { ascending: false }).limit(30),
    supabase.from("subscriptions").select("id,vendor,product,status,cost_minor,currency").order("renewal_date", { ascending: true }).limit(30),
  ]);
  const rows: ListRow[] = [];
  if (!invoiceResult.error) {
    for (const row of invoiceResult.data ?? []) {
      const item: any = row;
      rows.push({ id: `invoice-${item.id}`, primary: `Invoice · ${item.status}`, secondary: item.currency ?? "", meta: item.total_minor == null ? undefined : `Amount ${item.total_minor}` });
    }
  }
  if (!approvalResult.error) {
    for (const row of approvalResult.data ?? []) {
      const item: any = row;
      rows.push({ id: `approval-${item.id}`, primary: `Approval · ${item.approval_type}`, secondary: item.status ?? "pending", meta: item.risk_level ? `Risk ${item.risk_level}` : undefined });
    }
  }
  if (!subscriptionResult.error) {
    for (const row of subscriptionResult.data ?? []) {
      const item: any = row;
      rows.push({ id: `subscription-${item.id}`, primary: `${item.vendor ?? "Vendor"} · ${item.product ?? "Subscription"}`, secondary: item.status ?? "active", meta: item.cost_minor == null ? undefined : `${item.currency ?? ""} ${item.cost_minor}` });
    }
  }
  return rows.slice(0, 80);
}

export async function getAuditRows(supabase: SupabaseClient): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("audit_events")
    .select("id,action,target_table,target_id,classification,created_at")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    primary: row.action ?? "Audit event",
    secondary: row.target_table ? `${row.target_table}${row.target_id ? ` · ${row.target_id}` : ""}` : "Platform",
    meta: row.created_at ?? row.classification,
  }));
}

export async function getPlatformMetrics(supabase: SupabaseClient) {
  return Promise.all([
    safeCount(supabase, "organization_memberships", "Internal organization memberships"),
    safeCount(supabase, "business_unit_memberships", "Business-unit memberships"),
    safeCount(supabase, "project_access_grants", "Project access grants"),
    safeCount(supabase, "task_access_grants", "Task resource windows"),
    safeCount(supabase, "client_memberships", "Portal memberships"),
    safeCount(supabase, "partner_memberships", "Network memberships"),
    safeCount(supabase, "background_jobs", "Background jobs"),
    safeCount(supabase, "integration_connections", "Integration connections"),
  ]);
}
