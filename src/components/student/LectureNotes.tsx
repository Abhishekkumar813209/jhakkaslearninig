import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Clock, Edit2, Trash2, Save, X } from "lucide-react";

interface LectureNote {
  id: string;
  note_text: string;
  timestamp_seconds: number;
  created_at: string;
  updated_at: string;
}

interface LectureNotesProps {
  lectureId: string;
  currentTime: number;
  onSeekToTime: (seconds: number) => void;
}

const LectureNotes = ({ lectureId, currentTime, onSeekToTime }: LectureNotesProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState("");
  const [showNewNote, setShowNewNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    fetchNotes();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('lecture-notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lecture_notes',
          filter: `chapter_lecture_id=eq.${lectureId}`
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId]);

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("lecture_notes")
        .select("*")
        .eq("chapter_lecture_id", lectureId)
        .eq("student_id", user.id)
        .order("timestamp_seconds");

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) {
      toast({
        title: "Note text required",
        description: "Please enter some text for your note",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("lecture_notes")
        .insert({
          student_id: user.id,
          chapter_lecture_id: lectureId,
          note_text: newNoteText.trim(),
          timestamp_seconds: Math.floor(currentTime)
        });

      if (error) throw error;

      toast({
        title: "Note added",
        description: `Note saved at ${formatTime(currentTime)}`
      });

      setNewNoteText("");
      setShowNewNote(false);
      fetchNotes();
    } catch (error: any) {
      toast({
        title: "Failed to add note",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editText.trim()) {
      toast({
        title: "Note text required",
        description: "Note cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("lecture_notes")
        .update({ note_text: editText.trim() })
        .eq("id", noteId);

      if (error) throw error;

      toast({
        title: "Note updated",
        description: "Your note has been updated"
      });

      setEditingNoteId(null);
      setEditText("");
      fetchNotes();
    } catch (error: any) {
      toast({
        title: "Failed to update note",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("lecture_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      toast({
        title: "Note deleted",
        description: "Your note has been removed"
      });

      fetchNotes();
    } catch (error: any) {
      toast({
        title: "Failed to delete note",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const startEditing = (note: LectureNote) => {
    setEditingNoteId(note.id);
    setEditText(note.note_text);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditText("");
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">📝 My Notes</h3>
          {notes.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
              {notes.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewNote(!showNewNote)}
        >
          {showNewNote ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showNewNote ? "Cancel" : "Add Note"}
        </Button>
      </div>

      {showNewNote && (
        <div className="space-y-2 p-3 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>At {formatTime(currentTime)}</span>
          </div>
          <Textarea
            placeholder="Type your note here..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddNote}>
              <Save className="w-4 h-4 mr-2" />
              Save Note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNewNote(false);
                setNewNoteText("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="h-[300px] pr-4">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">
              Click "Add Note" to capture important moments
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card
                key={note.id}
                className="p-3 hover:bg-muted/50 transition-colors"
              >
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateNote(note.id)}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        onClick={() => onSeekToTime(note.timestamp_seconds)}
                      >
                        <Clock className="w-4 h-4" />
                        {formatTime(note.timestamp_seconds)}
                      </button>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => startEditing(note)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                      {note.note_text}
                    </p>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default LectureNotes;
