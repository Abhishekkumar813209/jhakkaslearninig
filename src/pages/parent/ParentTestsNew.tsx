import { ParentAppLayout } from '@/components/parent/ParentAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ParentTestsNew() {
  const { studentId } = useParams();
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  useEffect(() => {
    fetchLinkedStudents();
  }, []);

  const fetchLinkedStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('parent_student_links')
        .select(`
          student_id,
          profiles!parent_student_links_student_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('parent_id', user.id);

      if (error) throw error;
      setLinkedStudents(data || []);
      
      if (data && data.length > 0 && !selectedStudent) {
        setSelectedStudent(data[0].student_id);
      }
    } catch (error) {
      console.error('Error fetching linked students:', error);
    }
  };

  const currentStudentId = studentId || selectedStudent;

  return (
    <ParentAppLayout>
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle>Tests & Assessments Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Track your child's test performance, scores, and chapter-wise completion.
            </p>

            {linkedStudents.length > 1 && (
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Select Student</label>
                <select
                  className="w-full max-w-xs p-2 border rounded-md"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  {linkedStudents.map(link => {
                    const profile = (link.profiles as any);
                    return (
                      <option key={link.student_id} value={link.student_id}>
                        {profile?.full_name || profile?.email}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {currentStudentId && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>Chapter-wise test progress will be displayed here based on batch-assigned tests.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ParentAppLayout>
  );
}
