import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoardClassSelector } from './BoardClassSelector';
import { RoadmapSelector } from './xp-management/RoadmapSelector';
import { SubjectSelector } from './xp-management/SubjectSelector';
import { ChapterSelector } from './xp-management/ChapterSelector';
import { XPTypeSelector } from './xp-management/XPTypeSelector';
import { DuplicateGameDetector } from './DuplicateGameDetector';
import { useBoardClassHierarchy } from '@/hooks/useBoardClassHierarchy';

export const EnhancedXPManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const hierarchy = useBoardClassHierarchy();

  // Read state from URL
  const selectedDomain = searchParams.get('domain') || null;
  const selectedRoadmapId = searchParams.get('roadmap') || null;
  const selectedSubject = searchParams.get('subject') || null;
  const selectedChapterId = searchParams.get('chapter') || null;
  
  // Local state for full objects
  const [selectedRoadmap, setSelectedRoadmap] = useState<{ id: string; title: string } | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<{ id: string; name: string } | null>(null);
  
  // Restore objects from URL on mount
  useEffect(() => {
    if (selectedRoadmapId && !selectedRoadmap) {
      // Fetch and set roadmap object if needed
      setSelectedRoadmap({ id: selectedRoadmapId, title: 'Loading...' });
    }
    if (selectedChapterId && !selectedChapter) {
      // Fetch and set chapter object if needed
      setSelectedChapter({ id: selectedChapterId, name: 'Loading...' });
    }
  }, [selectedRoadmapId, selectedChapterId]);

  const domains = [
    { code: 'school', name: 'School Education', icon: '🏫', color: 'bg-blue-500' },
    { code: 'jee', name: 'JEE', icon: '🎓', color: 'bg-purple-500' },
    { code: 'neet', name: 'NEET', icon: '⚕️', color: 'bg-green-500' },
    { code: 'competitive', name: 'Competitive Exams', icon: '📚', color: 'bg-orange-500' },
  ];

  const updateURL = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  };

  const handleReset = () => {
    setSearchParams({});
    setSelectedRoadmap(null);
    setSelectedChapter(null);
    hierarchy.reset();
  };

  const handleBackToDomain = () => {
    updateURL({ domain: null, roadmap: null, subject: null, chapter: null });
    setSelectedRoadmap(null);
    setSelectedChapter(null);
    hierarchy.reset();
  };

  const handleRoadmapSelect = (roadmap: { id: string; title: string }) => {
    updateURL({ roadmap: roadmap.id, subject: null, chapter: null });
    setSelectedRoadmap(roadmap);
    setSelectedChapter(null);
  };

  const handleBackToRoadmap = () => {
    updateURL({ roadmap: null, subject: null, chapter: null });
    setSelectedRoadmap(null);
    setSelectedChapter(null);
  };

  const handleBackToSubject = () => {
    updateURL({ subject: null, chapter: null });
    setSelectedChapter(null);
  };

  const handleBackToChapter = () => {
    updateURL({ chapter: null });
    setSelectedChapter(null);
  };

  const handleDomainSelect = (code: string) => {
    updateURL({ domain: code });
    hierarchy.setDomain(code);
  };

  const handleSubjectSelect = (subject: string) => {
    updateURL({ subject });
  };

  const handleChapterSelect = (chapter: { id: string; name: string }) => {
    updateURL({ chapter: chapter.id });
    setSelectedChapter(chapter);
  };

  // Breadcrumbs
  const breadcrumbs = [];
  if (selectedDomain) breadcrumbs.push(domains.find(d => d.code === selectedDomain)?.name || selectedDomain);
  if (hierarchy.selectedBoard) breadcrumbs.push(hierarchy.selectedBoard);
  if (hierarchy.selectedClass) breadcrumbs.push(`Class ${hierarchy.selectedClass}`);
  if (selectedRoadmap) breadcrumbs.push(selectedRoadmap.title);
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
                onClick={() => handleDomainSelect(domain.code)}
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

      {/* Step 3: Roadmap Selection */}
      {((selectedDomain === 'school' && hierarchy.selectedClass) || (selectedDomain !== 'school' && selectedDomain)) && !selectedRoadmap && (
        <div>
          <Button onClick={handleBackToDomain} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {selectedDomain === 'school' ? 'Back to Class' : 'Back to Domain'}
          </Button>
          <RoadmapSelector
            examType={selectedDomain!}
            board={hierarchy.selectedBoard}
            targetClass={hierarchy.selectedClass}
            onRoadmapSelect={handleRoadmapSelect}
          />
        </div>
      )}

      {/* Step 4: Subject Selection */}
      {selectedRoadmap && !selectedSubject && (
        <div>
          <Button onClick={handleBackToRoadmap} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roadmap
          </Button>
          <SubjectSelector
            roadmapId={selectedRoadmap.id}
            onSubjectSelect={handleSubjectSelect}
          />
        </div>
      )}

      {/* Step 5: Chapter Selection */}
      {selectedSubject && !selectedChapter && (
        <div>
          <Button onClick={handleBackToSubject} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Button>
          <ChapterSelector
            roadmapId={selectedRoadmap!.id}
            subject={selectedSubject}
            onChapterSelect={handleChapterSelect}
          />
        </div>
      )}

      {/* Step 6: XP Type Selection (Games vs Tests) + Duplicate Detector */}
      {selectedChapter && (
        <div className="space-y-6">
          <div>
            <Button onClick={handleBackToChapter} variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chapters
            </Button>
            <XPTypeSelector
              roadmapId={selectedRoadmap!.id}
              subject={selectedSubject!}
              chapter={selectedChapter}
            />
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Duplicate Detector</h2>
            <DuplicateGameDetector />
          </div>
        </div>
      )}
    </div>
  );
};
