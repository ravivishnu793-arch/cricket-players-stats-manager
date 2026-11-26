import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Temporary one-off function: sets up the admin account, then is deleted.
Deno.serve(async () => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const email = "admin@cricket.com";
  const password = "CricHlXilgWWlk!9";
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === email);
  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) return new Response(error.message, { status: 500 });
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return new Response(error.message, { status: 500 });
    user = data.user;
  }
  await admin.from("user_roles").upsert({ user_id: user!.id, role: "admin" }, { onConflict: "user_id,role" });
  return new Response("ok");
});
