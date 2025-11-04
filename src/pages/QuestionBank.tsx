import { QuestionBankBuilder } from "@/components/admin/QuestionBankBuilder";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Database } from "lucide-react";
import React from "react";

const QuestionBank = () => {
  const [isInserting, setIsInserting] = React.useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const topicId = searchParams.get('topic');
  const subjectName = searchParams.get('subject');
  const chapterId = searchParams.get('chapter');
  const batchId = searchParams.get('batch');

  const insertSampleQuestions = async () => {
    if (!topicId) {
      alert('Please select a topic first from the URL parameters');
      return;
    }

    setIsInserting(true);
    try {
      const { data: { session } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getSession());
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topic-questions-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'insert_sample_questions',
          topic_id: topicId,
          subject: subjectName || 'Science',
          chapter_id: chapterId,
          batch_id: batchId
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Successfully inserted ${data.count} sample questions!`);
        window.location.reload();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error inserting sample questions:', error);
      alert('Failed to insert sample questions');
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Question Bank</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Question Bank</h1>
            <p className="text-muted-foreground">Build and manage questions for your batches</p>
          </div>
        </div>
        
        {/* Add Sample Questions Button */}
        {topicId && (
          <button
            onClick={insertSampleQuestions}
            disabled={isInserting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isInserting ? '⏳ Adding...' : '➕ Add 8 Sample Questions'}
          </button>
        )}
      </div>

      {/* Question Bank Builder Component */}
      <QuestionBankBuilder />
    </div>
  );
};

export default QuestionBank;
