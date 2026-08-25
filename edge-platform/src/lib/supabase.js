 
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://azuymgyyjxusaicgrtxk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dXltZ3l5anh1c2FpY2dydHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTQyOTUsImV4cCI6MjEwMzI3MDI5NX0.xiAwXDGxexfLE1kJOo_tKizo4jhgTxxGc1F_X79UCho'
);