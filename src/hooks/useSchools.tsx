import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface School {
  id: string;
  name: string;
  code: string;
  zone_id: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student_count?: number;
  zone_name?: string;
  exam_type: string;
  allowed_classes?: string[];
}

export const useSchools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch schools with student counts and zone information
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (schoolsError) throw schoolsError;

      // Get counts and zone names separately to avoid foreign key issues
      const processedSchools = [];
      for (const school of schoolsData || []) {
        const { count: studentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id);

        const { data: zoneData } = await supabase
          .from('zones')
          .select('name')
          .eq('id', school.zone_id)
          .single();

        processedSchools.push({
          ...school,
          student_count: studentCount || 0,
          zone_name: zoneData?.name || 'No Zone',
          allowed_classes: Array.isArray(school.allowed_classes)
            ? school.allowed_classes as string[]
            : []
        });
      }

      setSchools(processedSchools);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch schools';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const createSchool = async (schoolData: Partial<School>) => {
    try {
      setLoading(true);

      const insertData = {
        name: schoolData.name!,
        code: schoolData.code!,
        zone_id: schoolData.zone_id!,
        address: schoolData.address,
        is_active: schoolData.is_active ?? true,
        exam_type: schoolData.exam_type || 'school',
        allowed_classes: schoolData.allowed_classes || []
      };

      const { data, error } = await supabase
        .from('schools')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast.success('School created successfully');
      fetchSchools(); // Refresh list
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create school';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSchool = async (id: string, schoolData: Partial<School>) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('schools')
        .update(schoolData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('School updated successfully');
      fetchSchools(); // Refresh list
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update school';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSchool = async (id: string) => {
    try {
      setLoading(true);

      // First move all students from this school to default school
      const defaultSchool = schools.find(s => s.code === 'SCH001');
      if (defaultSchool && defaultSchool.id !== id) {
        await supabase
          .from('profiles')
          .update({ school_id: defaultSchool.id })
          .eq('school_id', id);
      }

      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('School deleted successfully');
      fetchSchools(); // Refresh list
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete school';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const assignStudentToSchool = async (studentId: string, schoolId: string) => {
    try {
      setLoading(true);
      console.log('Assigning student:', studentId, 'to school:', schoolId);

      const { error } = await supabase
        .from('profiles')
        .update({ school_id: schoolId })
        .eq('id', studentId);

      if (error) {
        console.error('Assignment error:', error);
        throw error;
      }

      console.log('Assignment successful');

      // Recalculate rankings
      const { error: rankingError } = await supabase.rpc('calculate_zone_rankings');
      if (rankingError) console.error('Error recalculating rankings:', rankingError);

      toast.success('Student assigned to school successfully');
      await fetchSchools(); // Refresh list
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to assign student to school';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSchoolsByZone = (zoneId: string) => {
    return schools.filter(school => school.zone_id === zoneId);
  };

  const getSchoolsByExamType = (examType: string) => {
    return schools.filter(school => school.exam_type === examType);
  };

  const getSchoolsByClass = (studentClass: string) => {
    return schools.filter(school => 
      school.allowed_classes?.includes(studentClass)
    );
  };

  useEffect(() => {
    fetchSchools();

    // Set up real-time subscriptions
    const schoolsSubscription = supabase
      .channel('schools-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, () => {
        fetchSchools();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchSchools(); // Refresh when student assignments change
      })
      .subscribe();

    return () => {
      schoolsSubscription.unsubscribe();
    };
  }, []);

  return {
    schools,
    loading,
    error,
    fetchSchools,
    createSchool,
    updateSchool,
    deleteSchool,
    assignStudentToSchool,
    getSchoolsByZone,
    getSchoolsByExamType,
    getSchoolsByClass,
  };
};