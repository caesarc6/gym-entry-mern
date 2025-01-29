import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://womzcoctdczisvsldmqd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvbXpjb2N0ZGN6aXN2c2xkbXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1MDk2MzAsImV4cCI6MjA0ODA4NTYzMH0.DsOHipOdiyIY4oZG-IFQl2M3rrtiYV5tCkbkc8lxFz4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
