import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Zone {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student_count?: number;
  school_count?: number;
}

export const useZones = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch zones with student and school counts
      const { data: zonesData, error: zonesError } = await supabase
        .from('zones')
        .select('*')
        .order('created_at', { ascending: false });

      if (zonesError) throw zonesError;

      // Get counts separately to avoid foreign key issues
      const processedZones = [];
      for (const zone of zonesData || []) {
        const { count: schoolCount } = await supabase
          .from('schools')
          .select('*', { count: 'exact', head: true })
          .eq('zone_id', zone.id);

        const { count: studentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('zone_id', zone.id);

        processedZones.push({
          ...zone,
          school_count: schoolCount || 0,
          student_count: studentCount || 0
        });
      }

      setZones(processedZones);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch zones';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const createZone = async (zoneData: Partial<Zone>) => {
    try {
      setLoading(true);
      
      // Generate next code if not provided
      const nextCode = zoneData.code || String.fromCharCode(65 + zones.length); // A, B, C, etc.
      
      const insertData = {
        name: zoneData.name!,
        code: nextCode,
        description: zoneData.description,
        is_active: zoneData.is_active ?? true
      };

      const { data, error } = await supabase
        .from('zones')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Zone created successfully');
      fetchZones(); // Refresh list
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create zone';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateZone = async (id: string, zoneData: Partial<Zone>) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('zones')
        .update(zoneData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Zone updated successfully');
      fetchZones(); // Refresh list
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update zone';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteZone = async (id: string) => {
    try {
      setLoading(true);

      // First move all students from this zone to Zone A (if it exists)
      const zoneA = zones.find(z => z.code === 'A');
      if (zoneA && zoneA.id !== id) {
        await supabase
          .from('profiles')
          .update({ zone_id: zoneA.id })
          .eq('zone_id', id);
      }

      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Zone deleted successfully');
      fetchZones(); // Refresh list
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete zone';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const assignStudentToZone = async (studentId: string, zoneId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({ zone_id: zoneId })
        .eq('id', studentId);

      if (error) throw error;

      // Recalculate rankings
      const { error: rankingError } = await supabase.rpc('calculate_zone_rankings');
      if (rankingError) console.error('Error recalculating rankings:', rankingError);

      toast.success('Student assigned to zone successfully');
      await fetchZones(); // Refresh list
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to assign student to zone';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();

    // Set up real-time subscriptions
    const zonesSubscription = supabase
      .channel('zones-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, () => {
        fetchZones();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchZones(); // Refresh when student assignments change
      })
      .subscribe();

    return () => {
      zonesSubscription.unsubscribe();
    };
  }, []);

  return {
    zones,
    loading,
    error,
    fetchZones,
    createZone,
    updateZone,
    deleteZone,
    assignStudentToZone,
  };
};