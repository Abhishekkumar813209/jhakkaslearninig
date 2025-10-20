import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PostTestAnalytics } from '@/components/student/PostTestAnalytics';
import Navbar from '@/components/Navbar';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const TestAnalyticsHistory: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistoricalAnalytics();
  }, [attemptId]);

  const fetchHistoricalAnalytics = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('test_analytics_snapshots')
        .select('analytics_data')
        .eq('test_attempt_id', attemptId)
        .maybeSingle();

      if (error) throw error;

      if (!data || !data.analytics_data) {
        toast({
          title: 'No Analytics Found',
          description: 'This test was completed before analytics tracking. Please take a new test to see detailed analytics.',
          variant: 'default'
        });
        navigate('/student/dashboard');
        return;
      }

      setAnalyticsData(data.analytics_data);
    } catch (error) {
      console.error('Error fetching historical analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test analytics. Please try again.',
        variant: 'destructive'
      });
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" />
            <p className="text-xl">Loading analytics...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <Button 
            onClick={() => navigate('/student/dashboard')}
            variant="ghost"
            className="text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          {analyticsData && (
            <PostTestAnalytics
              analyticsData={analyticsData}
              onSubscribeClick={() => navigate('/student/dashboard?tab=subscription')}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default TestAnalyticsHistory;