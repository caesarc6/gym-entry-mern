import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://womzcoctdczisvsldmqd.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvbXpjb2N0ZGN6aXN2c2xkbXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1MDk2MzAsImV4cCI6MjA0ODA4NTYzMH0.DsOHipOdiyIY4oZG-IFQl2M3rrtiYV5tCkbkc8lxFz4";

export const supabase = createClient(supabaseUrl, supabaseKey);
