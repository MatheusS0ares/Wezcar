import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.from("permissions").select("id").limit(1);

  const dbOk = !error;

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      db: dbOk ? "reachable" : error?.message,
      timestamp: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 },
  );
}
