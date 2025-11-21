import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, FileText } from 'lucide-react';
import { SmartQuestionExtractorNew } from './SmartQuestionExtractorNew';

interface CentralizedTopicQuestionsManagerProps {
  examDomain: string;
  board?: string;
  studentClass?: string;
  subject: string;
  chapterLibraryId: string;
  chapterName: string;
  topicName: string;
  onBack: () => void;
}

export const CentralizedTopicQuestionsManager = ({
  examDomain,
  board,
  studentClass,
  subject,
  chapterLibraryId,
  chapterName,
  topicName,
  onBack
}: CentralizedTopicQuestionsManagerProps) => {
  const handleQuestionsAdded = (questions?: any[]) => {
    const count = questions?.length || 1;
    toast.success(`${count} question${count > 1 ? 's' : ''} saved to centralized bank`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chapter Library
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{examDomain}</span>
            {board && <><span>→</span><span>{board}</span></>}
            {studentClass && <><span>→</span><span>Class {studentClass}</span></>}
            <span>→</span><span>{subject}</span>
            <span>→</span><span>{chapterName}</span>
            <span>→</span><span className="font-medium text-foreground">{topicName}</span>
          </div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {topicName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage questions for this centralized topic - Upload documents, extract questions, and view all in one place
          </p>
        </div>
      </div>

      {/* Main Content - Single Unified Interface */}
      <SmartQuestionExtractorNew
        mode="centralized"
        selectedTopic="dummy-topic-id"
        selectedTopicName={topicName}
        chapterLibraryId={chapterLibraryId}
        centralizedTopicName={topicName}
        applicableClasses={studentClass ? [studentClass] : []}
        applicableExams={[examDomain]}
        selectedSubject={subject}
        selectedChapter={chapterLibraryId}
        selectedExamDomain={examDomain}
        onQuestionsAdded={handleQuestionsAdded}
      />
    </div>
  );
};
