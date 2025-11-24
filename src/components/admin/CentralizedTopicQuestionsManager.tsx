import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartQuestionExtractor } from './SmartQuestionExtractor';
import { ManualQuestionEntry } from './ManualQuestionEntry';

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
  // Refetch trigger for questions list when manual questions are added
  const [refetchKey, setRefetchKey] = useState(0);

  const handleQuestionsAdded = (questions?: any[]) => {
    // Callback kept for extensibility - SmartQuestionExtractor handles toast
    console.log('✅ Questions saved:', questions?.length || 0);
  };

  const handleManualQuestionComplete = () => {
    // Trigger refetch of View All Questions tab
    setRefetchKey(prev => prev + 1);
    toast.success(`Centralized question added to topic "${topicName}"`);
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

      {/* Main Content - Tabs for View All Questions + Manual Entry */}
      <Tabs defaultValue="view" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="view">View All Questions</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="mt-6">
          <SmartQuestionExtractor
            key={refetchKey}
            mode="question-bank"
            topicId={chapterLibraryId}
            topicName={topicName}
            chapterId={chapterLibraryId}
            chapterName={chapterName}
            subjectName={subject}
            examDomain={examDomain}
            onQuestionsAdded={handleQuestionsAdded}
            onBackClick={onBack}
            // Centralized Question Bank props
            isCentralized={true}
            chapterLibraryId={chapterLibraryId}
            centralizedTopicName={topicName}
            applicableClasses={studentClass ? [studentClass] : []}
            applicableExams={[examDomain]}
          />
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          {/* Manual Entry: Creates centralized questions directly into question_bank */}
          <ManualQuestionEntry
            mode="centralized"
            chapterLibraryId={chapterLibraryId}
            centralizedTopicName={topicName}
            examDomain={examDomain}
            subject={subject}
            applicableClasses={studentClass ? [studentClass] : []}
            applicableExams={[examDomain]}
            onComplete={handleManualQuestionComplete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
