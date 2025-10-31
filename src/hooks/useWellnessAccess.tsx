import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useWellnessAccess = () => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkWellnessAccess();
  }, []);

  const checkWellnessAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check if user is wellness admin
      const { data, error } = await supabase
        .from('wellness_admin_access')
        .select('admin_email')
        .eq('admin_email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error checking wellness access:', error);
        setHasAccess(false);
      } else {
        setHasAccess(!!data);
      }
    } catch (error) {
      console.error('Error in wellness access check:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasAccess, loading, refresh: checkWellnessAccess };
};
