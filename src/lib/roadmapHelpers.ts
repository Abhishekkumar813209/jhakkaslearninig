import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves the active roadmap ID for a batch using a robust fallback strategy:
 * 1. First checks if batch has linked_roadmap_id
 * 2. Falls back to querying batch_roadmaps with status='active'
 * 3. Final fallback: queries batch_roadmaps ordered by status and created_at
 */
export async function resolveActiveRoadmapIdForBatch(
  batchId: string,
  linkedRoadmapId?: string | null
): Promise<string | null> {
  // First, use linked_roadmap_id if available
  if (linkedRoadmapId) {
    console.debug('[roadmapHelpers] Using linked_roadmap_id:', linkedRoadmapId);
    return linkedRoadmapId;
  }

  console.debug('[roadmapHelpers] No linked_roadmap_id, querying batch_roadmaps for batch:', batchId);

  // Try to find active roadmap
  const { data: activeRoadmap, error: activeError } = await supabase
    .from('batch_roadmaps')
    .select('id')
    .eq('batch_id', batchId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeError) {
    console.error('[roadmapHelpers] Error querying active roadmap:', activeError);
  }

  if (activeRoadmap) {
    console.debug('[roadmapHelpers] Found active roadmap:', activeRoadmap.id);
    return activeRoadmap.id;
  }

  console.debug('[roadmapHelpers] No active roadmap, trying latest roadmap');

  // Final fallback: get latest roadmap regardless of status
  const { data: latestRoadmap, error: latestError } = await supabase
    .from('batch_roadmaps')
    .select('id, status')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    console.error('[roadmapHelpers] Error querying latest roadmap:', latestError);
    return null;
  }

  if (latestRoadmap) {
    console.debug('[roadmapHelpers] Found latest roadmap:', latestRoadmap.id, 'status:', latestRoadmap.status);
    return latestRoadmap.id;
  }

  console.debug('[roadmapHelpers] No roadmap found for batch:', batchId);
  return null;
}
