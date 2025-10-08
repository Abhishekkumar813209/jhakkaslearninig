import { useState, useEffect } from 'react';
import { batchAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface Batch {
  id: string;
  name: string;
  description?: string;
  level: string;
  start_date: string;
  end_date?: string;
  max_capacity: number;
  current_strength: number;
  instructor_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student_count?: number;
  avg_score?: number;
  exam_type?: string;
  exam_name?: string;
  target_board?: string;
  target_class?: string;
}

export const useBatches = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [avgPerformance, setAvgPerformance] = useState(0);
  const { toast } = useToast();

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await batchAPI.getBatches();
      setBatches(response.batches as Batch[]);
      setTotalStudents(response.totalStudents || 0);
      setAvgPerformance(response.avgPerformance || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batches';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBatch = async (id: string) => {
    try {
      const response = await batchAPI.getBatch(id);
      return response.batch;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const createBatch = async (batchData: Partial<Batch>) => {
    try {
      const response = await batchAPI.createBatch(batchData);
      
      // Check if response and response.batch exist
      if (response && response.batch) {
        await fetchBatches();
        toast({
          title: "Success",
          description: "Batch created successfully",
        });
        return response.batch;
      } else {
        throw new Error('Invalid response format from batch creation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create batch';
      console.error('Batch creation error:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateBatch = async (id: string, batchData: Partial<Batch>) => {
    try {
      const response = await batchAPI.updateBatch(id, batchData);
      
      // Check if response and response.batch exist
      if (response && response.batch) {
        await fetchBatches();
        toast({
          title: "Success",
          description: "Batch updated successfully",
        });
        return response.batch;
      } else {
        throw new Error('Invalid response format from batch update');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update batch';
      console.error('Batch update error:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteBatch = async (id: string) => {
    try {
      // First check if roadmaps are linked
      const { data: roadmaps } = await supabase
        .from('batch_roadmaps')
        .select('id, title')
        .eq('batch_id', id);
      
      if (roadmaps && roadmaps.length > 0) {
        const roadmapsList = roadmaps.map(r => `• ${r.title}`).join('\n');
        const confirmDelete = window.confirm(
          `⚠️ This batch has ${roadmaps.length} linked roadmap(s):\n\n${roadmapsList}\n\n` +
          `These roadmaps will become "orphaned" and can be reassigned to another batch later.\n\n` +
          `Student progress on these roadmaps will be preserved.\n\n` +
          `Do you want to continue?`
        );
        
        if (!confirmDelete) {
          return;
        }
      }

      await batchAPI.deleteBatch(id);
      await fetchBatches();
      
      const message = roadmaps && roadmaps.length > 0
        ? 'Batch deleted successfully. Linked roadmaps have been preserved.'
        : 'Batch deleted successfully';
      
      toast({
        title: "Success",
        description: message,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete batch';
      console.error('Batch deletion error:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchBatches();

    const channel = supabase
      .channel('profiles-batch-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log('profiles change');
        fetchBatches();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => {
        console.log('batches change');
        fetchBatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    batches,
    loading,
    error,
    totalStudents,
    avgPerformance,
    fetchBatches,
    getBatch,
    createBatch,
    updateBatch,
    deleteBatch,
  };
};