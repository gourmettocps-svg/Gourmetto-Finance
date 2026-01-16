
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wlzczswfbpyqtaowrxhh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsemN6c3dmYnB5cXRhb3dyeGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjUyNzAsImV4cCI6MjA4NDEwMTI3MH0.18tEQ7VwF6al3I2-Kk9sRUnoitQi5mE4zQvNWswhIWM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
