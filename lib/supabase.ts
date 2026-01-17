
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ecdojisvjnduhegawtoj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZG9qaXN2am5kdWhlZ2F3dG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MDQ2NTgsImV4cCI6MjA4NDE4MDY1OH0.ueoHSJ45-shxF05PJ_6XCqIWUeqfpYcPXiw6XRyC9x8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
