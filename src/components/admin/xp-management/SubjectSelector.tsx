import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface SubjectSelectorProps {
  domain: string;
  board: string | null;
  targetClass: string | null;
  onSubjectSelect: (subject: string) => void;
}

export const SubjectSelector = ({ domain, board, targetClass, onSubjectSelect }: SubjectSelectorProps) => {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, [domain, board, targetClass]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('roadmap_chapters')
        .select(`
          subject,
          batch_roadmaps!inner(exam_type, target_board, target_class)
        `);

      if (domain === 'school') {
        query = query
          .eq('batch_roadmaps.exam_type', domain)
          .eq('batch_roadmaps.target_board', board)
          .eq('batch_roadmaps.target_class', targetClass);
      } else {
        query = query.eq('batch_roadmaps.exam_type', domain);
      }

      const { data, error } = await query;

      if (error) throw error;

      const uniqueSubjects = [...new Set(data?.map(d => d.subject).filter(Boolean))];
      setSubjects(uniqueSubjects as string[]);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const subjectIcons: Record<string, string> = {
    'Science': '🔬',
    'Mathematics': '📐',
    'Math': '📐',
    'English': '📖',
    'Hindi': '📝',
    'Social Science': '🌍',
    'Physics': '⚛️',
    'Chemistry': '🧪',
    'Biology': '🧬',
    'Computer Science': '💻',
    'Economics': '💰',
    'History': '📜',
    'Geography': '🗺️',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No subjects found for this selection</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Select Subject</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {subjects.map((subject) => (
          <Card
            key={subject}
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => onSubjectSelect(subject)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-3xl">{subjectIcons[subject] || '📚'}</span>
                <span className="text-lg">{subject}</span>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};
