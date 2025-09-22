import { useState, useEffect, useMemo } from 'react';

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
      // First try to fetch from the users API
      const response = await fetch('https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/users-api?role=student');
      const result = await response.json();
      
      if (result.success && Array.isArray(result.users)) {
        const studentData = result.users.map((user: any) => ({
          id: user.id,
          name: user.full_name || user.name || 'Unknown User',
          email: user.email
        }));
        setStudents(studentData);
      } else {
        // Fallback to mock data if API fails
        const mockStudents = [
          { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Priya Patel', email: 'priya@example.com' },
          { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Rahul Sharma', email: 'rahul@example.com' },
          { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Anita Gupta', email: 'anita@example.com' },
          { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Vikram Singh', email: 'vikram@example.com' },
          { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Kavya Reddy', email: 'kavya@example.com' },
          { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Arjun Kumar', email: 'arjun@example.com' },
          { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Sneha Joshi', email: 'sneha@example.com' },
          { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Rohit Mehta', email: 'rohit@example.com' },
          { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Pooja Agarwal', email: 'pooja@example.com' },
          { id: '550e8400-e29b-41d4-a716-446655440010', name: 'Karthik Rao', email: 'karthik@example.com' },
        ];
        setStudents(mockStudents);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      // Fallback to mock data
      const mockStudents = [
        { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Priya Patel', email: 'priya@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Rahul Sharma', email: 'rahul@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Anita Gupta', email: 'anita@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Vikram Singh', email: 'vikram@example.com' },
        { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Kavya Reddy', email: 'kavya@example.com' },
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