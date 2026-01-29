import { createClient } from "@supabase/supabase-js";

export const supabaseServer = createClient(
  import.meta.env.SUPABASE_URL!,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const supabaseClient = createClient(
  import.meta.env.SUPABASE_URL!,
  import.meta.env.SUPABASE_ANON_KEY!,
);