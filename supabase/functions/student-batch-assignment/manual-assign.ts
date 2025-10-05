// Manual script to assign Anand to SSC batch and roadmap
// Run this once via Supabase Functions invoke

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// Assign Anand to SSC batch
await supabaseAdmin
  .from('profiles')
  .update({ batch_id: 'd616c8c9-1908-49b4-8391-2434dccf11a3' })
  .eq('id', '4f3ef101-0bcb-4671-9fb0-07a6ec197b18')

// Create student roadmap entry
await supabaseAdmin
  .from('student_roadmaps')
  .insert({
    student_id: '4f3ef101-0bcb-4671-9fb0-07a6ec197b18',
    batch_roadmap_id: '7571b684-78fd-4ba0-9343-0c71bb8fa75e',
    current_chapter_index: 0
  })

console.log('Anand assigned to SSC batch and roadmap')