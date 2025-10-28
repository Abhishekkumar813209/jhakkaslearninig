import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoardClassSelector } from './BoardClassSelector';
import { SubjectSelector } from './xp-management/SubjectSelector';
import { ChapterSelector } from './xp-management/ChapterSelector';
import { XPTypeSelector } from './xp-management/XPTypeSelector';
import { useBoardClassHierarchy } from '@/hooks/useBoardClassHierarchy';

export const EnhancedXPManagement = () => {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<{ id: string; name: string } | null>(null);
  
  const hierarchy = useBoardClassHierarchy();

  const domains = [
    { code: 'school', name: 'School Education', icon: '🏫', color: 'bg-blue-500' },
    { code: 'jee', name: 'JEE', icon: '🎓', color: 'bg-purple-500' },
    { code: 'neet', name: 'NEET', icon: '⚕️', color: 'bg-green-500' },
    { code: 'competitive', name: 'Competitive Exams', icon: '📚', color: 'bg-orange-500' },
  ];

  const handleReset = () => {
    setSelectedDomain(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    hierarchy.reset();
  };

  const handleBackToDomain = () => {
    setSelectedDomain(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    hierarchy.reset();
  };

  const handleBackToSubject = () => {
    setSelectedSubject(null);
    setSelectedChapter(null);
  };

  const handleBackToChapter = () => {
    setSelectedChapter(null);
  };

  // Breadcrumbs
  const breadcrumbs = [];
  if (selectedDomain) breadcrumbs.push(domains.find(d => d.code === selectedDomain)?.name || selectedDomain);
  if (hierarchy.selectedBoard) breadcrumbs.push(hierarchy.selectedBoard);
  if (hierarchy.selectedClass) breadcrumbs.push(`Class ${hierarchy.selectedClass}`);
  if (selectedSubject) breadcrumbs.push(selectedSubject);
  if (selectedChapter) breadcrumbs.push(selectedChapter.name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            XP Management System
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage XP rewards for games and tests across all content
          </p>
        </div>
        {breadcrumbs.length > 0 && (
          <Button onClick={handleReset} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        )}
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="font-medium">{crumb}</span>
              {index < breadcrumbs.length - 1 && <span>/</span>}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Domain Selection */}
      {!selectedDomain && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Exam Domain</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {domains.map((domain) => (
              <Card
                key={domain.code}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setSelectedDomain(domain.code);
                  hierarchy.setDomain(domain.code);
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-3xl">{domain.icon}</span>
                    {domain.name}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Board/Class Selection (for School domain) */}
      {selectedDomain === 'school' && !hierarchy.selectedClass && (
        <div>
          <Button onClick={handleBackToDomain} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Domain
          </Button>
          <BoardClassSelector
            examType={selectedDomain}
            selectedBoard={hierarchy.selectedBoard}
            selectedClass={hierarchy.selectedClass}
            onBoardSelect={hierarchy.setBoard}
            onClassSelect={hierarchy.setClass}
            onReset={handleReset}
          />
        </div>
      )}

      {/* Step 3: Subject Selection */}
      {((selectedDomain === 'school' && hierarchy.selectedClass) || (selectedDomain !== 'school' && selectedDomain)) && !selectedSubject && (
        <div>
          <Button onClick={handleBackToDomain} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {selectedDomain === 'school' ? 'Back to Class' : 'Back to Domain'}
          </Button>
          <SubjectSelector
            domain={selectedDomain!}
            board={hierarchy.selectedBoard}
            targetClass={hierarchy.selectedClass}
            onSubjectSelect={setSelectedSubject}
          />
        </div>
      )}

      {/* Step 4: Chapter Selection */}
      {selectedSubject && !selectedChapter && (
        <div>
          <Button onClick={handleBackToSubject} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Button>
          <ChapterSelector
            domain={selectedDomain!}
            board={hierarchy.selectedBoard}
            targetClass={hierarchy.selectedClass}
            subject={selectedSubject}
            onChapterSelect={setSelectedChapter}
          />
        </div>
      )}

      {/* Step 5: XP Type Selection (Games vs Tests) */}
      {selectedChapter && (
        <div>
          <Button onClick={handleBackToChapter} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chapters
          </Button>
          <XPTypeSelector
            domain={selectedDomain!}
            board={hierarchy.selectedBoard}
            targetClass={hierarchy.selectedClass}
            subject={selectedSubject!}
            chapter={selectedChapter}
          />
        </div>
      )}
    </div>
  );
};
