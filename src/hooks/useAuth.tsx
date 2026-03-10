import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

// Demo/read-only admin emails — can view admin dashboard but cannot modify data
const READONLY_ADMIN_EMAILS = ['reviewer@jhakkas.app', 'demo@jhakkas.app'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isStudent: boolean;
  isReadOnly: boolean;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  isAdmin: false,
  isStudent: false,
  isReadOnly: false,
  userRole: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider: Initializing auth state...');
    
    // First get the current session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthProvider: Initial session check:', { session, error });
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthProvider: Found existing session for user:', session.user.id);
          fetchUserRole(session.user.id);
        } else {
          console.log('AuthProvider: No existing session found');
          setUserRole(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('AuthProvider: Error initializing auth:', error);
        setLoading(false);
      }
    };

    // Set up auth state listener FIRST (before checking existing session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthProvider: Auth state changed:', { event, session });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role when session changes
        if (session?.user) {
          console.log('AuthProvider: Session exists, fetching user role for:', session.user.id);
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          console.log('AuthProvider: No session, clearing user role');
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // THEN initialize auth state
    initializeAuth();

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    console.log('AuthProvider: Fetching user role for:', userId);
    try {
      // Prefer secure RPC (SECURITY DEFINER) to avoid RLS issues and 406 on empty
      const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', { user_id: userId });

      if (roleError) {
        console.error('AuthProvider: RPC get_user_role error:', roleError);
      }

      const role = (roleData as string | null) ?? 'student';
      console.log('AuthProvider: Role resolved (via RPC):', role);
      setUserRole(role);
    } catch (error) {
      console.error('AuthProvider: Error resolving role:', error);
      setUserRole('student');
    }
  };

  const signOut = async () => {
    try {
      // Try using edge function first
      await supabase.functions.invoke('auth-logout', { body: {} });
    } catch (error) {
      console.log('Edge function logout failed, using direct method');
    }
    
    // Always call direct logout as fallback
    await supabase.auth.signOut();
    
    // Clear all auth state
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  // Real role logic based on database
  const isAdmin = userRole === 'admin';
  const isStudent = userRole === 'student';
  const isReadOnly = READONLY_ADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? '');

  const value = {
    user,
    session,
    loading,
    signOut,
    isAdmin,
    isStudent,
    isReadOnly,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};