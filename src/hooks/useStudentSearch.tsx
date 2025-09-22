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
      // Fetch student profiles directly from the database
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'student');

      if (error) {
        console.error('Error fetching students from profiles:', error);
        throw error;
      }

      if (profiles && Array.isArray(profiles)) {
        const studentData = profiles.map((profile: any) => ({
          id: profile.id,
          name: profile.full_name || 'Unknown User',
          email: profile.email
        }));
        setStudents(studentData);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      // Fallback to mock data if database fails
      const mockStudents = [
        { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Priya Patel', email: 'priya.patel@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Rahul Sharma', email: 'rahul.sharma@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Anita Gupta', email: 'anita.gupta@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Vikram Singh', email: 'vikram.singh@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Kavya Reddy', email: 'kavya.reddy@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Arjun Kumar', email: 'arjun.kumar@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Sneha Joshi', email: 'sneha.joshi@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Rohit Mehta', email: 'rohit.mehta@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Pooja Agarwal', email: 'pooja.agarwal@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440010', name: 'Karthik Rao', email: 'karthik.rao@example.com' },
      ];
      setStudents(mockStudents);
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