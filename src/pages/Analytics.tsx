import Navbar from '@/components/Navbar';
import AnalyticsCharts from '@/components/AnalyticsCharts';

const Analytics = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your learning progress and performance insights
          </p>
        </div>
        
        <AnalyticsCharts activeTab="overview" />
      </div>
    </div>
  );
};

export default Analytics;