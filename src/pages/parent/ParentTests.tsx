import { ParentAppLayout } from '@/components/parent/ParentAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ChevronRight, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface LinkedStudent {
  student_id: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function ParentTests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLinkedStudents();
    }
  }, [user]);

  const fetchLinkedStudents = async () => {
    try {
      setLoading(true);
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
        .eq('parent_id', user?.id);

      if (error) throw error;
      setLinkedStudents((data || []) as LinkedStudent[]);
    } catch (error) {
      console.error('Error fetching linked students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProgress = (studentId: string) => {
    navigate(`/parent/tests/${studentId}`);
  };

  if (loading) {
    return (
      <ParentAppLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ParentAppLayout>
    );
  }

  return (
    <ParentAppLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle>Tests & Assessments Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Track your child's test performance, scores, and improvement areas.
            </p>

            {linkedStudents.length === 0 ? (
              <div className="text-center p-8">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Students Linked</h3>
                <p className="text-sm text-muted-foreground">
                  No students are linked to your account yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {linkedStudents.map((link) => (
                  <Card
                    key={link.student_id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewProgress(link.student_id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {link.profiles?.full_name || 'Student'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {link.profiles?.email}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <span>View Progress</span>
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ParentAppLayout>
  );
}
