import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TestBuilderPortal from "@/components/admin/TestBuilderPortal";
import { useToast } from "@/hooks/use-toast";

/**
 * Wrapper component for TestBuilder route
 * Handles "new" testId by creating test in DB first, then redirecting to real UUID
 * This prevents tests-api from receiving testId === "new"
 */
const TestBuilderPage = () => {
  const { testId } = useParams<{ testId: string }>();
  const [resolvedTestId, setResolvedTestId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      if (!testId) {
        console.error('[TestBuilderPage] No testId in URL');
        navigate('/admin?tab=tests');
        return;
      }

      console.log('[TestBuilderPage] testId from URL:', testId);

      // ✅ Existing test → just use it directly
      if (testId !== "new") {
        console.log('[TestBuilderPage] Using existing testId:', testId);
        setResolvedTestId(testId);
        return;
      }

      // 🆕 "new" → create test in DB, then redirect to real UUID
      try {
        console.log('[TestBuilderPage] Detected "new" testId - creating test in database...');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Not authenticated");
        }

        // Extract metadata from URL params
        const context = searchParams.get("context");
        const chapterLibraryId = searchParams.get("chapter_library_id");
        const examDomain = searchParams.get("exam_domain");
        const board = searchParams.get("board");
        const studentClass = searchParams.get("class");
        const subject = searchParams.get("subject") || "";

        console.log('[TestBuilderPage] Creating test with context:', {
          context,
          chapterLibraryId,
          examDomain,
          board,
          studentClass,
          subject
        });

        // Prepare test payload
        const payload: any = {
          title: `New ${context === "centralized" ? "Centralized " : ""}Test - ${subject || "Untitled"}`,
          description: "",
          subject: subject || "",
          difficulty: "medium",
          duration_minutes: 60,
          total_marks: 100,
          passing_marks: 50,
          status: "draft",
          instructions: "",
          is_published: false,
          default_xp: 100,
          created_by: user.id,
        };

        // Add optional fields based on context
        if (studentClass) payload.target_class = studentClass;
        if (board) payload.target_board = board;
        if (examDomain) payload.exam_domain = examDomain;
        
        if (context === "centralized") {
          payload.is_centralized = true;
          if (chapterLibraryId) payload.chapter_library_id = chapterLibraryId;
        }

        console.log('[TestBuilderPage] Inserting test with payload:', payload);

        // Insert test into database
        const { data, error } = await supabase
          .from("tests")
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('[TestBuilderPage] Failed to create test:', error);
          throw error;
        }

        console.log('[TestBuilderPage] ✅ Test created successfully with id:', data.id);

        // Preserve all URL params when redirecting
        const queryString = searchParams.toString();
        const qs = queryString ? `?${queryString}` : "";

        // Redirect to the new test with real UUID
        console.log('[TestBuilderPage] Redirecting to:', `/admin/test-builder/${data.id}${qs}`);
        navigate(`/admin/test-builder/${data.id}${qs}`, { replace: true });
        setResolvedTestId(data.id);
      } catch (err) {
        console.error("[TestBuilderPage] Failed to create test:", err);
        toast({
          title: "Error",
          description: "Failed to create test. Please try again.",
          variant: "destructive",
        });
        navigate("/admin?tab=tests");
      }
    };

    void init();
  }, [testId, searchParams, navigate, toast]);

  // Show loading while creating new test
  if (!testId || (testId === "new" && !resolvedTestId)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Creating test...</p>
        </div>
      </div>
    );
  }

  // Render TestBuilderPortal with real testId
  return <TestBuilderPortal />;
};

export default TestBuilderPage;
