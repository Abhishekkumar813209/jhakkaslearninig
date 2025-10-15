import { supabase } from "@/integrations/supabase/client";

interface InvokeArgs<T> {
  name: string;
  body?: T;
}

interface EdgeFunctionError {
  message: string;
  code?: number;
}

/**
 * Wrapper for invoking Supabase Edge Functions with automatic authentication
 * Ensures user is logged in before making the request and handles auth errors gracefully
 */
export async function invokeWithAuth<TBody = unknown, TResp = unknown>({
  name,
  body,
}: InvokeArgs<TBody>): Promise<TResp> {
  // Check if user has valid session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    // Auto-redirect to login
    window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
    throw {
      code: 401,
      message: "Please log in to continue",
    } as EdgeFunctionError;
  }

  // Invoke the function with authenticated session
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    // Normalize error responses
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      // Auto-redirect to login on session expiry
      window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
      throw {
        code: 401,
        message: "Session expired. Please log in again.",
      } as EdgeFunctionError;
    }
    
    throw {
      code: error.status || 500,
      message: error.message || "An error occurred while processing your request",
    } as EdgeFunctionError;
  }

  return data as TResp;
}
