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
    window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    throw {
      code: 401,
      message: "Please log in to continue",
    } as EdgeFunctionError;
  }

  // Refresh the session to ensure token is valid
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  
  if (refreshError || !refreshData.session) {
    console.error('Session refresh failed:', refreshError);
    // Session is invalid, redirect to login
    window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    throw {
      code: 401,
      message: "Session expired. Please log in again.",
    } as EdgeFunctionError;
  }

  // Invoke the function with authenticated session (using refreshed token)
  // Explicitly pass Authorization header with the user's access token
  const accessToken = refreshData.session.access_token;
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error(`Edge function ${name} error:`, error);

    // Normalize 401 / auth errors
    const msg = error.message ?? '';
    if (error.status === 401 || /Unauthorized|Invalid authentication token|401/i.test(msg)) {
      // Token is invalid even after refresh, force re-login
      window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
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
