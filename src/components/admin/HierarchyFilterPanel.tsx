import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

interface HierarchyFilters {
  boardId?: string;
  classId?: string;
  subjectId?: string;
  chapterId?: string;
  batchId?: string;
  domainId?: string;
}

interface HierarchyFilterPanelProps {
  onFiltersChange: (filters: HierarchyFilters) => void;
}

export function HierarchyFilterPanel({ onFiltersChange }: HierarchyFilterPanelProps) {
  const [filters, setFilters] = useState<HierarchyFilters>({});
  const [boards, setBoards] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);

  useEffect(() => {
    fetchBoards();
    fetchBatches();
    fetchDomains();
  }, []);

  useEffect(() => {
    if (filters.boardId) {
      fetchClasses(filters.boardId);
    }
  }, [filters.boardId]);

  useEffect(() => {
    if (filters.classId) {
      fetchSubjects(filters.classId);
    }
  }, [filters.classId]);

  useEffect(() => {
    if (filters.subjectId) {
      fetchChapters(filters.subjectId);
    }
  }, [filters.subjectId]);

  const fetchBoards = async () => {
    const { data } = await (supabase as any).from('boards').select('id, board_name').order('board_name');
    setBoards(data || []);
  };

  const fetchClasses = async (boardId: string) => {
    const { data } = await (supabase as any)
      .from('classes')
      .select('id, class_name')
      .eq('board_id', boardId)
      .order('class_name');
    setClasses(data || []);
  };

  const fetchSubjects = async (classId: string) => {
    const { data } = await (supabase as any)
      .from('subjects')
      .select('id, subject_name')
      .eq('class_id', classId)
      .order('subject_name');
    setSubjects(data || []);
  };

  const fetchChapters = async (subjectId: string) => {
    const { data } = await (supabase as any)
      .from('chapters')
      .select('id, chapter_name')
      .eq('subject_id', subjectId)
      .order('chapter_name');
    setChapters(data || []);
  };

  const fetchBatches = async () => {
    const { data } = await (supabase as any).from('batches').select('id, batch_name').order('batch_name');
    setBatches(data || []);
  };

  const fetchDomains = async () => {
    const { data } = await (supabase as any).from('exam_types').select('id, exam_name').order('exam_name');
    setDomains(data || []);
  };

  const updateFilter = (key: keyof HierarchyFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value };
    
    // Clear dependent filters
    if (key === 'boardId') {
      newFilters.classId = undefined;
      newFilters.subjectId = undefined;
      newFilters.chapterId = undefined;
      setClasses([]);
      setSubjects([]);
      setChapters([]);
    } else if (key === 'classId') {
      newFilters.subjectId = undefined;
      newFilters.chapterId = undefined;
      setSubjects([]);
      setChapters([]);
    } else if (key === 'subjectId') {
      newFilters.chapterId = undefined;
      setChapters([]);
    }
    
    setFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(filters);
  };

  const clearFilters = () => {
    setFilters({});
    setClasses([]);
    setSubjects([]);
    setChapters([]);
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div className="p-4 space-y-4 bg-muted/30 border-b">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Board Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Board</Label>
          <Select value={filters.boardId} onValueChange={(v) => updateFilter('boardId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Board" />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.board_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Class Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Class</Label>
          <Select 
            value={filters.classId} 
            onValueChange={(v) => updateFilter('classId', v)}
            disabled={!filters.boardId || classes.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Subject</Label>
          <Select 
            value={filters.subjectId} 
            onValueChange={(v) => updateFilter('subjectId', v)}
            disabled={!filters.classId || subjects.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.subject_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chapter Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Chapter</Label>
          <Select 
            value={filters.chapterId} 
            onValueChange={(v) => updateFilter('chapterId', v)}
            disabled={!filters.subjectId || chapters.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Chapter" />
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

        {/* Batch Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Batch</Label>
          <Select value={filters.batchId} onValueChange={(v) => updateFilter('batchId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.batch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Domain Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Domain</Label>
          <Select value={filters.domainId} onValueChange={(v) => updateFilter('domainId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Domain" />
            </SelectTrigger>
            <SelectContent>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.exam_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
        <Button 
          size="sm"
          onClick={applyFilters}
          disabled={!hasActiveFilters}
        >
          <Filter className="h-4 w-4 mr-2" />
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
