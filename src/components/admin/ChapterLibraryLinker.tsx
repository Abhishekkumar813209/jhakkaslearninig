import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface UnlinkedChapter {
  id: string;
  chapter_name: string;
  subject: string;
  roadmap_id: string;
  roadmap_title: string;
  exam_type: string;
}

interface ChapterLibraryOption {
  id: string;
  chapter_name: string;
  subject: string;
  exam_type: string;
}

export const ChapterLibraryLinker = () => {
  const { toast } = useToast();
  const [unlinkedChapters, setUnlinkedChapters] = useState<UnlinkedChapter[]>([]);
  const [chapterLibrary, setChapterLibrary] = useState<ChapterLibraryOption[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch unlinked chapters with roadmap info
      const { data: unlinked, error: unlinkedError } = await supabase
        .from('roadmap_chapters')
        .select(`
          id,
          chapter_name,
          subject,
          roadmap_id,
          batch_roadmaps!inner(
            title,
            exam_type
          )
        `)
        .is('chapter_library_id', null)
        .order('chapter_name');

      if (unlinkedError) throw unlinkedError;

      const unlinkedWithRoadmap = (unlinked || []).map(ch => ({
        id: ch.id,
        chapter_name: ch.chapter_name,
        subject: ch.subject,
        roadmap_id: ch.roadmap_id,
        roadmap_title: (ch.batch_roadmaps as any)?.title || 'Unknown Roadmap',
        exam_type: (ch.batch_roadmaps as any)?.exam_type || ''
      }));

      setUnlinkedChapters(unlinkedWithRoadmap);

      // Fetch all chapter library entries
      const { data: library, error: libraryError } = await supabase
        .from('chapter_library')
        .select('id, chapter_name, subject, exam_type')
        .eq('is_active', true)
        .order('subject')
        .order('chapter_name');

      if (libraryError) throw libraryError;
      setChapterLibrary(library || []);

      console.log(`📚 [ChapterLibraryLinker] Found ${unlinkedWithRoadmap.length} unlinked chapters`);
    } catch (error: any) {
      console.error('❌ [ChapterLibraryLinker] Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load unlinked chapters",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getMatchingLibraryOptions = (chapter: UnlinkedChapter) => {
    // Find exact matches by name and subject
    const exactMatches = chapterLibrary.filter(lib =>
      lib.subject.toLowerCase() === chapter.subject.toLowerCase() &&
      lib.chapter_name.toLowerCase().includes(chapter.chapter_name.toLowerCase())
    );

    // Also show chapters with matching subject from same exam type
    const subjectMatches = chapterLibrary.filter(lib =>
      lib.subject.toLowerCase() === chapter.subject.toLowerCase() &&
      lib.exam_type === chapter.exam_type &&
      !exactMatches.includes(lib)
    );

    return { exactMatches, subjectMatches };
  };

  const handleSelectMapping = (chapterId: string, libraryId: string) => {
    setSelectedMappings(prev => ({
      ...prev,
      [chapterId]: libraryId
    }));
  };

  const handleSaveLinks = async () => {
    const mappingsToSave = Object.entries(selectedMappings);
    
    if (mappingsToSave.length === 0) {
      toast({
        title: "No mappings selected",
        description: "Please select at least one chapter to link",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);

      // Update all selected chapters
      for (const [chapterId, libraryId] of mappingsToSave) {
        const { error } = await supabase
          .from('roadmap_chapters')
          .update({ chapter_library_id: libraryId })
          .eq('id', chapterId);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Linked ${mappingsToSave.length} chapter${mappingsToSave.length > 1 ? 's' : ''} to centralized library`
      });

      // Refresh data
      setSelectedMappings({});
      fetchData();
    } catch (error: any) {
      console.error('❌ [ChapterLibraryLinker] Error saving links:', error);
      toast({
        title: "Error",
        description: "Failed to save chapter links",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading unlinked chapters...</p>
        </CardContent>
      </Card>
    );
  }

  if (unlinkedChapters.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/10">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h3 className="text-lg font-semibold mb-2">All Chapters Linked!</h3>
          <p className="text-sm text-muted-foreground">
            All batch-specific chapters are now linked to the centralized chapter library.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Manual Chapter Linking</AlertTitle>
        <AlertDescription>
          These batch-specific chapters are not linked to the centralized library. 
          Link them to enable centralized tests and questions for these chapters.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Unlinked Chapters ({unlinkedChapters.length})
          </CardTitle>
          <CardDescription>
            Select a centralized chapter for each batch-specific chapter below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {unlinkedChapters.map((chapter) => {
            const { exactMatches, subjectMatches } = getMatchingLibraryOptions(chapter);
            const hasExactMatch = exactMatches.length > 0;

            return (
              <div key={chapter.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{chapter.chapter_name}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{chapter.subject}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {chapter.roadmap_title}
                      </Badge>
                      {hasExactMatch && (
                        <Badge variant="default" className="bg-green-600">
                          Exact Match Found
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Link to Centralized Chapter:
                  </label>
                  <Select
                    value={selectedMappings[chapter.id] || ""}
                    onValueChange={(value) => handleSelectMapping(chapter.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select centralized chapter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {hasExactMatch && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-green-600">
                            Exact Matches
                          </div>
                          {exactMatches.map(lib => (
                            <SelectItem key={lib.id} value={lib.id}>
                              {lib.chapter_name} ({lib.subject})
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {subjectMatches.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Other {chapter.subject} Chapters
                          </div>
                          {subjectMatches.map(lib => (
                            <SelectItem key={lib.id} value={lib.id}>
                              {lib.chapter_name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {exactMatches.length === 0 && subjectMatches.length === 0 && (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          No matching chapters found in library
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={fetchData} disabled={saving}>
          Refresh
        </Button>
        <Button 
          onClick={handleSaveLinks} 
          disabled={Object.keys(selectedMappings).length === 0 || saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save {Object.keys(selectedMappings).length} Link{Object.keys(selectedMappings).length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
