type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const body = await req.json();
  const { error, data } = await supabase
    .from("notes")
    .update({ content_html: body.content_html, title: body.title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, title, content_html, created_at, updated_at")
    .single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
} 