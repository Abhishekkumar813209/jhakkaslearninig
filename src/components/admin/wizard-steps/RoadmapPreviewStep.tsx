import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, X, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Chapter {
  id: string;
  chapter_name: string;
  suggested_days?: number;
  isSelected: boolean;
  importance_score?: number;
  exam_relevance?: string;
  can_skip?: boolean;
}

interface ChaptersBySubject {
  [subjectName: string]: Chapter[];
}

interface RoadmapPreviewStepProps {
  chapters: ChaptersBySubject;
  timeBudget: Record<string, number>;
  intensity: 'full' | 'important' | 'balanced';
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export const RoadmapPreviewStep = ({
  chapters,
  timeBudget,
  intensity,
  onRegenerate,
  isRegenerating
}: RoadmapPreviewStepProps) => {
  // Calculate statistics
  const stats = Object.entries(chapters).reduce((acc, [subject, chapterList]) => {
    const selected = chapterList.filter(c => c.isSelected);
    const budget = timeBudget[subject] || 0;
    const allocated = selected.reduce((sum, c) => sum + (c.suggested_days || 0), 0);
    const included = selected.length;
    const excluded = chapterList.length - selected.length;
    
    const coreIncluded = selected.filter(c => c.exam_relevance === 'core').length;
    const importantIncluded = selected.filter(c => c.exam_relevance === 'important').length;
    const optionalIncluded = selected.filter(c => c.exam_relevance === 'optional').length;
    
    const coreExcluded = chapterList.filter(c => !c.isSelected && c.exam_relevance === 'core').length;
    const importantExcluded = chapterList.filter(c => !c.isSelected && c.exam_relevance === 'important').length;
    
    acc.subjects.push({
      name: subject,
      budget,
      allocated,
      utilization: budget > 0 ? (allocated / budget) * 100 : 0,
      included,
      excluded,
      coreIncluded,
      importantIncluded,
      optionalIncluded,
      coreExcluded,
      importantExcluded
    });
    
    acc.totalBudget += budget;
    acc.totalAllocated += allocated;
    acc.totalIncluded += included;
    acc.totalExcluded += excluded;
    acc.totalCoreIncluded += coreIncluded;
    acc.totalImportantIncluded += importantIncluded;
    acc.totalCoreExcluded += coreExcluded;
    acc.totalImportantExcluded += importantExcluded;
    
    return acc;
  }, {
    subjects: [] as any[],
    totalBudget: 0,
    totalAllocated: 0,
    totalIncluded: 0,
    totalExcluded: 0,
    totalCoreIncluded: 0,
    totalImportantIncluded: 0,
    totalCoreExcluded: 0,
    totalImportantExcluded: 0
  });

  const overallUtilization = stats.totalBudget > 0 
    ? (stats.totalAllocated / stats.totalBudget) * 100 
    : 0;
  
  const hasWarnings = stats.totalCoreExcluded > 0 || overallUtilization < 80 || overallUtilization > 105;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Roadmap Preview</h3>
          <p className="text-sm text-muted-foreground">
            Review budget utilization and chapter coverage
          </p>
        </div>
        <Button
          onClick={onRegenerate}
          disabled={isRegenerating}
          variant="outline"
          size="sm"
        >
          {isRegenerating ? (
            <>
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-2" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      {hasWarnings && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.totalCoreExcluded > 0 && (
              <div>⚠️ {stats.totalCoreExcluded} core chapter(s) excluded!</div>
            )}
            {overallUtilization < 80 && (
              <div>⚠️ Low budget utilization ({overallUtilization.toFixed(0)}%)</div>
            )}
            {overallUtilization > 105 && (
              <div>⚠️ Budget exceeded ({overallUtilization.toFixed(0)}%)</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Overall Budget Utilization</span>
              <Badge variant={overallUtilization >= 95 && overallUtilization <= 105 ? 'default' : 'secondary'}>
                {overallUtilization.toFixed(1)}%
              </Badge>
            </div>
            <Progress value={Math.min(overallUtilization, 100)} className="h-2" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Allocated:</span>{' '}
                <span className="font-medium">{stats.totalAllocated} days</span>
              </div>
              <div>
                <span className="text-muted-foreground">Budget:</span>{' '}
                <span className="font-medium">{stats.totalBudget} days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="font-semibold mb-2">Coverage Summary</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Included: {stats.totalIncluded} chapters</span>
                </div>
                <div className="ml-6 space-y-0.5">
                  <div>🔴 Core: {stats.totalCoreIncluded}</div>
                  <div>🟡 Important: {stats.totalImportantIncluded}</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Excluded: {stats.totalExcluded} chapters</span>
                </div>
                <div className="ml-6 space-y-0.5">
                  {stats.totalCoreExcluded > 0 && (
                    <div className="text-destructive">🔴 Core: {stats.totalCoreExcluded}</div>
                  )}
                  {stats.totalImportantExcluded > 0 && (
                    <div>🟡 Important: {stats.totalImportantExcluded}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Subject Breakdown */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Subject-wise Breakdown</h4>
        {stats.subjects.map((subject) => (
          <Card key={subject.name}>
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{subject.name}</span>
                  <Badge 
                    variant={subject.utilization >= 95 && subject.utilization <= 105 ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {subject.utilization.toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={Math.min(subject.utilization, 100)} className="h-1.5" />
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Allocated:</span>{' '}
                    <span className="font-medium">{subject.allocated}d</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Budget:</span>{' '}
                    <span className="font-medium">{subject.budget}d</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chapters:</span>{' '}
                    <span className="font-medium">{subject.included}/{subject.included + subject.excluded}</span>
                  </div>
                </div>
                {(subject.coreExcluded > 0 || subject.importantExcluded > 0) && (
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    Excluded: 
                    {subject.coreExcluded > 0 && (
                      <span className="text-destructive ml-1">🔴 {subject.coreExcluded} core</span>
                    )}
                    {subject.importantExcluded > 0 && (
                      <span className="ml-1">🟡 {subject.importantExcluded} important</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="text-sm space-y-1">
            <div className="font-semibold">Intensity: {intensity.charAt(0).toUpperCase() + intensity.slice(1)}</div>
            <div className="text-muted-foreground">
              {intensity === 'full' && 'All chapters included with proportional time allocation'}
              {intensity === 'important' && 'Top 70% important chapters with 3-5 days each'}
              {intensity === 'balanced' && 'Core chapters prioritized with balanced coverage'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};