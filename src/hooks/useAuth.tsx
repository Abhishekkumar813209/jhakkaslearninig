import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isStudent: boolean;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  isAdmin: false,
  isStudent: false,
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

    // Set up auth state listener
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

    // Initialize auth state
    initializeAuth();

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    console.log('AuthProvider: Fetching user role for:', userId);
    
    try {
      // Try using edge function for profile
      const { data } = await supabase.functions.invoke('profile-management', {
        body: {}
      });
      
      if (data?.profile?.role) {
        console.log('AuthProvider: Got role from edge function:', data.profile.role);
        setUserRole(data.profile.role);
        return;
      }
    } catch (error) {
      console.log('AuthProvider: Edge function failed, using direct query:', error);
    }

    // Fallback to direct query
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('AuthProvider: Error fetching user role from DB:', error);
        setUserRole('student'); // Default fallback
        return;
      }
      
      const role = data?.role || 'student';
      console.log('AuthProvider: Got role from DB:', role);
      setUserRole(role);
    } catch (error) {
      console.error('AuthProvider: Error in role fetch fallback:', error);
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

  const value = {
    user,
    session,
    loading,
    signOut,
    isAdmin,
    isStudent,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};