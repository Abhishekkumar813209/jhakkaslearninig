import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useExamTypes } from '@/hooks/useExamTypes';
import { useBoards } from '@/hooks/useBoards';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Database, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DocumentUploader } from './DocumentUploader';

export const CentralizedQuestionExtractor = () => {
  const { examTypes } = useExamTypes();
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  
  const { boards, requiresBoard, requiresClass } = useBoards(selectedDomain);
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  
  const [applicableClasses, setApplicableClasses] = useState<string[]>([]);
  const [applicableExams, setApplicableExams] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);

  // Fetch classes
  useEffect(() => {
    if (selectedDomain) {
      const examType = examTypes.find(e => e.code === selectedDomain);
      if (examType?.requires_class) {
        setClasses(['11', '12']);
      } else {
        setClasses([]);
      }
    }
  }, [selectedDomain, examTypes]);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedDomain) return;
      
      const query = supabase
        .from('exam_templates')
        .select('standard_subjects')
        .eq('exam_type', selectedDomain)
        .eq('is_active', true);

      if (requiresBoard && selectedBoard) query.eq('board', selectedBoard);
      if (requiresClass && selectedClass) query.eq('student_class', selectedClass);

      const { data } = await query.maybeSingle();
      
      if (data?.standard_subjects) {
        const subjectList = Array.isArray(data.standard_subjects) 
          ? (data.standard_subjects as string[]) 
          : [];
        setSubjects(subjectList);
      }
    };

    fetchSubjects();
  }, [selectedDomain, selectedBoard, selectedClass, requiresBoard, requiresClass]);

  // Fetch chapters
  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedDomain || !selectedSubject) return;

      const { data } = await supabase
        .from('chapter_library')
        .select('id, exam_type, subject, class_level, chapter_name, suggested_days, entry_source, topics_generated, full_topics, is_active, created_at, updated_at')
        .eq('exam_type', selectedDomain)
        .eq('subject', selectedSubject)
        .eq('is_active', true)
        .order('chapter_name');

      setChapters(data || []);
    };

    fetchChapters();
  }, [selectedDomain, selectedSubject]);

  // Fetch topics from selected chapter
  useEffect(() => {
    if (selectedChapter) {
      const chapter = chapters.find(c => c.id === selectedChapter);
      if (chapter?.full_topics && Array.isArray(chapter.full_topics)) {
        setTopics(chapter.full_topics);
      } else {
        setTopics([]);
      }
    } else {
      setTopics([]);
    }
  }, [selectedChapter, chapters]);

  const handleExtractQuestions = async (file: File) => {
    if (!selectedChapter || !selectedTopic) {
      toast.error('Please select chapter and topic');
      return;
    }

    if (applicableClasses.length === 0 || applicableExams.length === 0) {
      toast.error('Please select applicable classes and exams');
      return;
    }

    setExtracting(true);
    const toastId = toast.loading('Extracting questions from document...');

    try {
      // Upload file to Supabase Storage
      const fileName = `centralized/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('question-sources')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('question-sources')
        .getPublicUrl(fileName);

      // Create content source record
      const { data: sourceData, error: sourceError } = await supabase
        .from('content_sources')
        .insert({
          source_type: 'pdf',
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size
        })
        .select()
        .single();

      if (sourceError) throw sourceError;

      // Extract questions using AI
      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        'ai-extract-all-questions-chunked',
        {
          body: {
            file_url: publicUrl,
            source_id: sourceData.id,
            chapter_library_id: selectedChapter,
            centralized_topic_name: selectedTopic,
            subject: selectedSubject,
            is_centralized: true
          }
        }
      );

      if (extractError) throw extractError;

      const questions = extractData.questions || [];

      // Save all questions to question_bank with centralized flag
      const insertPromises = questions.map((q: any) =>
        supabase.functions.invoke('topic-questions-api', {
          body: {
            action: 'save_centralized_question',
            chapter_library_id: selectedChapter,
            centralized_topic_name: selectedTopic,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options || null,
            correct_answer: q.correct_answer,
            explanation: q.explanation || null,
            difficulty: q.difficulty || 'medium',
            marks: q.marks || 1,
            subject: selectedSubject,
            applicable_classes: applicableClasses,
            applicable_exams: applicableExams,
            question_data: q.question_data || {},
            answer_data: q.answer_data || {}
          }
        })
      );

      await Promise.all(insertPromises);

      toast.success(`Extracted and saved ${questions.length} centralized questions!`, { id: toastId });
    } catch (error: any) {
      console.error('Error extracting questions:', error);
      toast.error(error.message || 'Failed to extract questions', { id: toastId });
    } finally {
      setExtracting(false);
    }
  };

  const selectedTopicObj = topics.find(t => t.topic_name === selectedTopic);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Centralized Question Extractor
          </CardTitle>
          <CardDescription>
            Extract questions to centralized bank for cross-batch, cross-exam assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Exam Domain</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes.map((exam) => (
                    <SelectItem key={exam.id} value={exam.code}>
                      {exam.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresBoard && (
              <div>
                <Label>Board</Label>
                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board} value={board}>{board}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Chapter</Label>
              <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.chapter_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Topic</Label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={topics.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic, idx) => (
                    <SelectItem key={idx} value={topic.topic_name}>
                      {topic.topic_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTopicObj && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{selectedTopicObj.difficulty}</Badge>
                  <Badge variant="outline">Weightage: {selectedTopicObj.weightage}/10</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applicable Classes */}
          <div>
            <Label>Applicable Classes (select all that apply)</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {['11', '12'].map((cls) => (
                <div key={cls} className="flex items-center space-x-2">
                  <Checkbox
                    id={`class-${cls}`}
                    checked={applicableClasses.includes(cls)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setApplicableClasses([...applicableClasses, cls]);
                      } else {
                        setApplicableClasses(applicableClasses.filter(c => c !== cls));
                      }
                    }}
                  />
                  <label htmlFor={`class-${cls}`} className="text-sm font-medium cursor-pointer">
                    Class {cls}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Applicable Exams */}
          <div>
            <Label>Applicable Exams (select all that apply)</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {examTypes.map((exam) => (
                <div key={exam.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`exam-${exam.code}`}
                    checked={applicableExams.includes(exam.code)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setApplicableExams([...applicableExams, exam.code]);
                      } else {
                        setApplicableExams(applicableExams.filter(e => e !== exam.code));
                      }
                    }}
                  />
                  <label htmlFor={`exam-${exam.code}`} className="text-sm font-medium cursor-pointer">
                    {exam.display_name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Document Uploader */}
          <div>
            <Label>Upload Document</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleExtractQuestions(file);
              }}
              disabled={!selectedChapter || !selectedTopic || applicableClasses.length === 0 || applicableExams.length === 0 || extracting}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
