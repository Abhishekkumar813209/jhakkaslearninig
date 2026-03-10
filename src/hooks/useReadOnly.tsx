import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook that provides read-only mode utilities for admin components.
 * Returns `isReadOnly` flag and a `guardAction` wrapper that blocks mutations.
 */
export function useReadOnly() {
  const { isReadOnly } = useAuth();
  const { toast } = useToast();

  const guardAction = useCallback(
    <T extends (...args: any[]) => any>(fn: T): T => {
      if (!isReadOnly) return fn;
      return ((...args: any[]) => {
        toast({
          title: "Read-Only Mode",
          description: "You have read-only access. Data modifications are disabled.",
          variant: "destructive",
        });
      }) as unknown as T;
    },
    [isReadOnly, toast]
  );

  const showReadOnlyToast = useCallback(() => {
    toast({
      title: "Read-Only Mode",
      description: "You have read-only access. Data modifications are disabled.",
      variant: "destructive",
    });
  }, [toast]);

  return { isReadOnly, guardAction, showReadOnlyToast };
}
