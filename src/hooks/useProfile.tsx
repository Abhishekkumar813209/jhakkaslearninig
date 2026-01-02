import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  full_name?: string;
  email?: string;
  student_class?: string;
  education_board?: string;
  avatar_url?: string;
  exam_domain?: string;
  zone_id?: string;
  school_id?: string;
  batch_id?: string;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);

      // Get user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Get user's role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
      }

      // If user is a student and doesn't have complete profile info, redirect to profile page
      if (roleData?.role === 'student' && profile) {
        // If no exam_domain selected at all
        if (!profile.exam_domain) {
          navigate('/profile');
          return;
        }
        
        // School students need: exam_domain, student_class, education_board, zone_id, school_id
        if (profile.exam_domain === 'school') {
          const isIncomplete = !profile.student_class || !profile.education_board || !profile.zone_id || !profile.school_id;
          if (isIncomplete) {
            navigate('/profile');
            return;
          }
        }
        
        // Non-school exam students need: exam_domain, zone_id, school_id
        if (profile.exam_domain !== 'school') {
          const isIncomplete = !profile.zone_id || !profile.school_id;
          if (isIncomplete) {
            navigate('/profile');
            return;
          }
        }
      }

      setProfile(profile);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh profile data
  const refreshProfile = async () => {
    if (user) {
      await checkAuth();
    }
  };

  return { profile, user, loading, checkAuth, refreshProfile };
};