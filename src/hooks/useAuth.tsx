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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Try using edge function for profile
      const { data } = await supabase.functions.invoke('profile-management', {
        body: {}
      });
      
      if (data?.profile?.role) {
        setUserRole(data.profile.role);
        return;
      }
    } catch (error) {
      console.log('Edge function failed, using direct query');
    }

    // Fallback to direct query
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user role:', error);
        return;
      }
      
      setUserRole(data?.role || 'student');
    } catch (error) {
      console.error('Error fetching user role:', error);
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