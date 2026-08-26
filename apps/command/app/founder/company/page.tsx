import { requireSession } from "../../../lib/session";
import { getServerSupabase } from "../../../lib/supabase";
import { getHandoffs } from "../brain/data";
import { AgentCompanyView } from "./_components/agent-company-view";

export const dynamic = "force-dynamic";

export default async function FounderAiCompanyPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const handoffs = supabase ? await getHandoffs(supabase, 200) : [];

  return (
    <AgentCompanyView handoffs={handoffs} dataConnected={Boolean(supabase)} />
  );
}
