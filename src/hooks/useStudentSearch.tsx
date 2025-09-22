import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  name: string;
  email?: string;
}

export const useStudentSearch = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Step 1: get all student user_ids from user_roles
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
        throw roleError;
      }

      const ids = (roleRows ?? []).map((r: any) => r.user_id);
      if (!ids.length) {
        setStudents([]);
        return;
      }

      // Step 2: fetch profiles for those user ids
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        throw profileError;
      }

      const studentData = (profiles ?? []).map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Unknown User',
        email: p.email,
      })).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

      setStudents(studentData);
    } catch (error) {
      console.error('Error fetching students:', error);
      // Do not show hardcoded data if DB fails; keep empty to avoid confusion
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    
    const query = searchQuery.toLowerCase();
    return students.filter(student => 
      student.name.toLowerCase().includes(query) ||
      (student.email && student.email.toLowerCase().includes(query))
    );
  }, [students, searchQuery]);

  useEffect(() => {
    fetchStudents();
  }, []);

  return {
    students: filteredStudents,
    allStudents: students,
    loading,
    searchQuery,
    setSearchQuery,
    refetch: fetchStudents
  };
};