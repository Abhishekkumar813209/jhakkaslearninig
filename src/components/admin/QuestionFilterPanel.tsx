import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { X, FilterX } from "lucide-react";

interface FilterValues {
  exam_domain?: string;
  batch_id?: string;
  subject?: string;
  chapter_id?: string;
  topic_id?: string;
  answer_status?: 'all' | 'unanswered' | 'answered' | 'reviewed';
}

interface QuestionFilterPanelProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
}

export const QuestionFilterPanel = ({ filters, onFiltersChange }: QuestionFilterPanelProps) => {
  const [domains, setDomains] = useState<string[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load domains
  useEffect(() => {
    loadDomains();
  }, []);

  // Load batches when domain changes
  useEffect(() => {
    if (filters.exam_domain) {
      loadBatches(filters.exam_domain);
    } else {
      setBatches([]);
      onFiltersChange({ ...filters, batch_id: undefined });
    }
  }, [filters.exam_domain]);

  // Load subjects when batch changes
  useEffect(() => {
    if (filters.batch_id) {
      loadSubjects(filters.batch_id);
    } else {
      setSubjects([]);
      onFiltersChange({ ...filters, subject: undefined });
    }
  }, [filters.batch_id]);

  // Load chapters when subject changes
  useEffect(() => {
    if (filters.batch_id && filters.subject) {
      loadChapters(filters.batch_id, filters.subject);
    } else {
      setChapters([]);
      onFiltersChange({ ...filters, chapter_id: undefined });
    }
  }, [filters.subject]);

  // Load topics when chapter changes
  useEffect(() => {
    if (filters.chapter_id) {
      loadTopics(filters.chapter_id);
    } else {
      setTopics([]);
      onFiltersChange({ ...filters, topic_id: undefined });
    }
  }, [filters.chapter_id]);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('exam_domain')
        .not('exam_domain', 'is', null);
      
      if (!error && data) {
        const uniqueDomains = [...new Set(data.map(d => d.exam_domain))].filter(Boolean);
        setDomains(uniqueDomains as string[]);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async (domain: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, name, exam_type')
        .eq('exam_type', domain)
        .order('name');
      
      if (!error && data) {
        setBatches(data);
      }
    } catch (error) {
      console.error('Error loading batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async (batchId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('subject')
        .eq('batch_id', batchId)
        .not('subject', 'is', null);
      
      if (!error && data) {
        const uniqueSubjects = [...new Set(data.map(d => d.subject))].filter(Boolean);
        setSubjects(uniqueSubjects as string[]);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (batchId: string, subject: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_chapters')
        .select('id, chapter_name, roadmap_id')
        .eq('subject', subject)
        .order('chapter_name');
      
      if (!error && data) {
        // Filter chapters that belong to the batch's roadmap
        const { data: batchData } = await supabase
          .from('batches')
          .select('linked_roadmap_id')
          .eq('id', batchId)
          .single();
        
        if (batchData?.linked_roadmap_id) {
          const filtered = data.filter(ch => ch.roadmap_id === batchData.linked_roadmap_id);
          setChapters(filtered);
        } else {
          setChapters(data);
        }
      }
    } catch (error) {
      console.error('Error loading chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async (chapterId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_topics')
        .select('id, topic_name, chapter_id')
        .eq('chapter_id', chapterId)
        .order('topic_name');
      
      if (!error && data) {
        setTopics(data);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    onFiltersChange({ answer_status: 'all' });
    setBatches([]);
    setSubjects([]);
    setChapters([]);
    setTopics([]);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'answer_status') return value !== 'all';
    return value !== undefined && value !== null;
  }).length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
          >
            <FilterX className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Domain Filter */}
          <div className="space-y-2">
            <Label>Domain</Label>
            <Select
              value={filters.exam_domain || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, exam_domain: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Domains</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain} value={domain}>
                    {domain.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Batch Filter */}
          <div className="space-y-2">
            <Label>Batch</Label>
            <Select
              value={filters.batch_id || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, batch_id: value || undefined })}
              disabled={!filters.exam_domain}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Batches</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject Filter */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select
              value={filters.subject || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, subject: value || undefined })}
              disabled={!filters.batch_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chapter Filter */}
          <div className="space-y-2">
            <Label>Chapter</Label>
            <Select
              value={filters.chapter_id || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, chapter_id: value || undefined })}
              disabled={!filters.subject}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Chapters</SelectItem>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    {chapter.chapter_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic Filter */}
          <div className="space-y-2">
            <Label>Topic</Label>
            <Select
              value={filters.topic_id || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, topic_id: value || undefined })}
              disabled={!filters.chapter_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.topic_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Answer Status Filter */}
          <div className="space-y-2">
            <Label>Answer Status</Label>
            <Select
              value={filters.answer_status || 'all'}
              onValueChange={(value: any) => onFiltersChange({ ...filters, answer_status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Questions</SelectItem>
                <SelectItem value="unanswered">Unanswered Only</SelectItem>
                <SelectItem value="answered">Answered Only</SelectItem>
                <SelectItem value="reviewed">Reviewed Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
