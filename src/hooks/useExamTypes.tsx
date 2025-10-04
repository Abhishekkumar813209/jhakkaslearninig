import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExamType {
  id: string;
  code: string;
  display_name: string;
  category: string;
  icon_name?: string;
  color_class?: string;
  available_exams?: string[];
  requires_class: boolean;
  requires_board: boolean;
  is_active: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export const useExamTypes = () => {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamTypes = async (includeInactive = false) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('exam_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform available_exams from Json to string[]
      const transformedData = (data || []).map(item => ({
        ...item,
        available_exams: Array.isArray(item.available_exams) 
          ? item.available_exams as string[] 
          : [],
      }));

      setExamTypes(transformedData);
    } catch (err: any) {
      console.error('Error fetching exam types:', err);
      setError(err.message);
      toast.error('Failed to load exam types');
    } finally {
      setLoading(false);
    }
  };

  const createExamType = async (examTypeData: Partial<ExamType>) => {
    try {
      const { data, error } = await supabase
        .from('exam_types')
        .insert([examTypeData as any])
        .select()
        .single();

      if (error) throw error;

      toast.success('Exam type created successfully');
      await fetchExamTypes(true);
      return data;
    } catch (err: any) {
      console.error('Error creating exam type:', err);
      toast.error('Failed to create exam type');
      throw err;
    }
  };

  const updateExamType = async (id: string, examTypeData: Partial<ExamType>) => {
    try {
      const { error } = await supabase
        .from('exam_types')
        .update(examTypeData as any)
        .eq('id', id);

      if (error) throw error;

      toast.success('Exam type updated successfully');
      await fetchExamTypes(true);
    } catch (err: any) {
      console.error('Error updating exam type:', err);
      toast.error('Failed to update exam type');
      throw err;
    }
  };

  const deleteExamType = async (id: string) => {
    try {
      const { error } = await supabase
        .from('exam_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Exam type deleted successfully');
      await fetchExamTypes(true);
    } catch (err: any) {
      console.error('Error deleting exam type:', err);
      toast.error('Failed to delete exam type');
      throw err;
    }
  };

  const reorderExamTypes = async (reorderedTypes: { id: string; display_order: number }[]) => {
    try {
      const updates = reorderedTypes.map(({ id, display_order }) =>
        supabase
          .from('exam_types')
          .update({ display_order })
          .eq('id', id)
      );

      await Promise.all(updates);

      toast.success('Exam types reordered successfully');
      await fetchExamTypes(true);
    } catch (err: any) {
      console.error('Error reordering exam types:', err);
      toast.error('Failed to reorder exam types');
      throw err;
    }
  };

  useEffect(() => {
    fetchExamTypes();

    const channel = supabase
      .channel('exam_types_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_types' }, () => {
        fetchExamTypes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    examTypes,
    loading,
    error,
    fetchExamTypes,
    createExamType,
    updateExamType,
    deleteExamType,
    reorderExamTypes,
  };
};
