import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, AlertTriangle, Database } from 'lucide-react';

interface MigrationStats {
  totalMCQQuestions: number;
  indexFormatQuestions: number;
  textFormatQuestions: number;
  migrationProgress: number;
}

export const MigrationStatus = () => {
  const [stats, setStats] = useState<MigrationStats>({
    totalMCQQuestions: 0,
    indexFormatQuestions: 0,
    textFormatQuestions: 0,
    migrationProgress: 0
  });
  const [qbStats, setQbStats] = useState<{ total: number; withAnswer: number; needingReview: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      setLoading(true);
      
      // Count total MCQ questions from questions table
      const { data: questions, error } = await supabase
        .from('questions')
        .select('correct_answer')
        .eq('qtype', 'mcq');

      if (error) throw error;

      if (!questions) {
        setLoading(false);
        return;
      }

      // Helper to detect index format
      const isIndexFormat = (value: string): boolean => {
        return /^\d$/.test(value);
      };

      // Count questions by format
      const indexQuestions = questions.filter(q => 
        isIndexFormat(q.correct_answer)
      ).length;

      const totalQuestions = questions.length;
      const textQuestions = totalQuestions - indexQuestions;
      const progress = totalQuestions > 0 ? (indexQuestions / totalQuestions) * 100 : 0;

      setStats({
        totalMCQQuestions: totalQuestions,
        indexFormatQuestions: indexQuestions,
        textFormatQuestions: textQuestions,
        migrationProgress: progress
      });
      
      // Get question_bank MCQ statistics
      const { data: qbQuestions } = await supabase
        .from('question_bank')
        .select('correct_answer, question_type')
        .eq('question_type', 'mcq');
      
      const qbTotal = qbQuestions?.length || 0;
      const qbWithAnswer = qbQuestions?.filter(q => q.correct_answer !== null).length || 0;
      const qbNeedingReview = qbTotal - qbWithAnswer;
      
      setQbStats({
        total: qbTotal,
        withAnswer: qbWithAnswer,
        needingReview: qbNeedingReview
      });
    } catch (error) {
      console.error('Error checking migration status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            MCQ Migration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            Loading migration status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          MCQ Migration Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Questions Table Stats */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Test Questions (questions table)</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Questions Migrated</span>
              <span className="text-sm font-bold">
                {stats.indexFormatQuestions} / {stats.totalMCQQuestions}
              </span>
            </div>
            <Progress value={stats.migrationProgress} className="h-3" />
            <div className="text-xs text-muted-foreground text-right">
              {stats.migrationProgress.toFixed(1)}% complete
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs text-muted-foreground mb-1">New Format (Index)</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.indexFormatQuestions}
              </div>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-xs text-muted-foreground mb-1">Old Format (Text)</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.textFormatQuestions}
              </div>
            </div>
          </div>

          {stats.migrationProgress < 100 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="font-semibold mb-1">Migration in progress</div>
                The system is running in <Badge variant="outline">backward compatibility mode</Badge>.
                Both old (text-based) and new (index-based) answer formats are supported.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                <div className="font-semibold mb-1">✅ Migration complete!</div>
                All MCQ questions now use the index-based format for improved reliability.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Question Bank Stats */}
        {qbStats && (
          <div className="space-y-4 pt-6 border-t">
            <h3 className="font-semibold text-lg">Question Bank (question_bank table)</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Total MCQ</div>
                <div className="text-2xl font-bold">{qbStats.total}</div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-xs text-muted-foreground mb-1">With Answers</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{qbStats.withAnswer}</div>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-xs text-muted-foreground mb-1">Needs Review</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{qbStats.needingReview}</div>
              </div>
            </div>

            {qbStats.needingReview > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <div className="font-semibold mb-1">Admin Action Required</div>
                  {qbStats.needingReview} questions are waiting for correct answers. 
                  Use the <Badge variant="outline">QB Review</Badge> tab to complete these questions.
                </AlertDescription>
              </Alert>
            )}

            {qbStats.needingReview === 0 && qbStats.total > 0 && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                  <div className="font-semibold mb-1">✅ All Questions Ready!</div>
                  All questions in the question bank have correct answers set.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
          <strong>Note:</strong> All question banks now use 0-based indexing (0, 1, 2, 3). 
          The UI displays 1-based labels (1, 2, 3, 4) for better user experience.
        </div>
      </CardContent>
    </Card>
  );
};
