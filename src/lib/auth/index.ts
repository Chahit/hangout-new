import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error signing out:", error);
  }
} 