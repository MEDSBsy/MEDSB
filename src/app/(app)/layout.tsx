import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell, { type Profile } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return <AppShell profile={profile as Profile}>{children}</AppShell>;
}
