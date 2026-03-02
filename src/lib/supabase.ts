import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsudtuabcjhjbzlsdzza.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzdWR0dWFiY2poamJ6bHNkenphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTQyNzQsImV4cCI6MjA4NTc3MDI3NH0.Fkng64PpLSip60Pyzv7kHVRlMVCxXTFDP-zNrgE0JCs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
