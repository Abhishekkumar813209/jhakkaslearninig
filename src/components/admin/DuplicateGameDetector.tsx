import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface DuplicateGroup {
  topic_content_id: string;
  chapter_name: string;
  topic_name: string;
  question_preview: string;
  duplicate_count: number;
  game_ids: string[];
}

export function DuplicateGameDetector() {
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);

  const scanForDuplicates = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.rpc("exec_raw_sql", {
        sql_query: `
          WITH duplicates AS (
            SELECT 
              ge.topic_content_id,
              ge.exercise_data->>'question' as question,
              COUNT(*) as dup_count,
              array_agg(ge.id ORDER BY ge.game_order, ge.created_at) as game_ids
            FROM gamified_exercises ge
            WHERE ge.exercise_data->>'question' IS NOT NULL
              AND ge.exercise_data->>'question' != ''
            GROUP BY ge.topic_content_id, ge.exercise_data->>'question'
            HAVING COUNT(*) > 1
          )
          SELECT 
            d.topic_content_id::text,
            rc.chapter_name,
            rt.name as topic_name,
            LEFT(d.question, 100) as question_preview,
            d.dup_count as duplicate_count,
            d.game_ids::text[] as game_ids
          FROM duplicates d
          JOIN topic_content_mapping tcm ON d.topic_content_id = tcm.id
          JOIN roadmap_topics rt ON tcm.topic_id = rt.id
          JOIN roadmap_chapters rc ON rt.chapter_id = rc.id
          ORDER BY d.dup_count DESC, rc.chapter_name, rt.name
        `,
      });

      if (error) throw error;

      if (data && Array.isArray(data)) {
        setDuplicates(data as unknown as DuplicateGroup[]);
        toast.success(`Found ${data.length} duplicate groups`);
      } else {
        setDuplicates([]);
        toast.success("No duplicates found!");
      }
    } catch (error: any) {
      console.error("Error scanning for duplicates:", error);
      toast.error("Failed to scan for duplicates: " + error.message);
    } finally {
      setScanning(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (duplicates.length === 0) {
      toast.error("No duplicates to clean up");
      return;
    }

    setCleaning(true);
    try {
      // Call the edge function to handle cleanup
      const { data, error } = await supabase.functions.invoke("cleanup-duplicate-games", {
        body: { duplicateGroups: duplicates },
      });

      if (error) throw error;

      toast.success(`Cleaned up ${data.deletedCount} duplicate games`);
      
      // Rescan to show updated results
      await scanForDuplicates();
    } catch (error: any) {
      console.error("Error cleaning duplicates:", error);
      toast.error("Failed to clean up duplicates: " + error.message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Duplicate Game Detector
        </CardTitle>
        <CardDescription>
          Scan for and remove duplicate questions within topics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={scanForDuplicates}
            disabled={scanning}
            variant="outline"
          >
            {scanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {scanning ? "Scanning..." : "Scan for Duplicates"}
          </Button>

          {duplicates.length > 0 && (
            <Button
              onClick={cleanupDuplicates}
              disabled={cleaning}
              variant="destructive"
            >
              {cleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cleaning ? "Cleaning..." : `Clean Up ${duplicates.length} Groups`}
            </Button>
          )}
        </div>

        {duplicates.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Found {duplicates.length} duplicate groups across all topics
            </div>

            <div className="border rounded-lg max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Question Preview</TableHead>
                    <TableHead className="text-center">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicates.map((dup, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{dup.chapter_name}</TableCell>
                      <TableCell>{dup.topic_name}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {dup.question_preview}...
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">{dup.duplicate_count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {!scanning && duplicates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-success" />
            <p>No duplicates found. Click "Scan for Duplicates" to check.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
