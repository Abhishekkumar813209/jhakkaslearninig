import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

const LegacyTestResultsRedirect: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveAndRedirect = async () => {
      try {
        if (!attemptId) throw new Error('Missing attemptId');
        const { data, error } = await supabase
          .from('test_attempts')
          .select('test_id')
          .eq('id', attemptId)
          .maybeSingle();

        if (error) throw error;
        if (!data?.test_id) throw new Error('Attempt not found');

        // Redirect to the new canonical route
        navigate(`/test/${data.test_id}/results`, { replace: true });
      } catch (e: any) {
        console.error('Legacy redirect failed:', e);
        setError(e?.message || 'Redirect failed');
      } finally {
        setLoading(false);
      }
    };

    resolveAndRedirect();
  }, [attemptId, navigate]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Redirecting to your results…</p>
            </>
          ) : error ? (
            <>
              <h2 className="text-xl font-semibold mb-2">Could not find your results</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default LegacyTestResultsRedirect;
