import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, TrendingUp, TrendingDown, BarChart3, RefreshCw, FileDown, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportAnalyticsToCSV, exportAnalyticsToPDF } from '@/lib/analyticsExport';

interface ZoneAnalytics {
  overall: {
    green: number;
    grey: number;
    red: number;
  };
  bySubject: Record<string, { green: number; grey: number; red: number }>;
  byBatch: Record<string, { green: number; grey: number; red: number }>;
  topicDetails: Array<{
    topic_id: string;
    topic_name: string;
    chapter_name: string;
    subject: string;
    avg_completion: number;
    student_count: number;
    struggling_count: number;
  }>;
}

const ZONE_COLORS = {
  green: '#22c55e',
  grey: '#6b7280',
  red: '#ef4444',
};

export default function TopicZoneAnalytics() {
  const [analytics, setAnalytics] = useState<ZoneAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('topic-zone-analytics');

      if (error) throw error;

      if (data?.success && data?.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load topic zone analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    try {
      exportAnalyticsToCSV(analytics);
      toast({
        title: 'Success',
        description: 'Analytics exported to CSV successfully',
      });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export CSV',
        variant: 'destructive',
      });
    }
  };

  const handleExportPDF = () => {
    if (!analytics) return;
    try {
      exportAnalyticsToPDF(analytics);
      toast({
        title: 'Success',
        description: 'Analytics exported to PDF successfully',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const total = analytics.overall.green + analytics.overall.grey + analytics.overall.red;
  const greenPercent = total > 0 ? Math.round((analytics.overall.green / total) * 100) : 0;
  const greyPercent = total > 0 ? Math.round((analytics.overall.grey / total) * 100) : 0;
  const redPercent = total > 0 ? Math.round((analytics.overall.red / total) * 100) : 0;

  const pieData = [
    { name: 'Green (>70%)', value: analytics.overall.green, color: ZONE_COLORS.green },
    { name: 'Grey (50-70%)', value: analytics.overall.grey, color: ZONE_COLORS.grey },
    { name: 'Red (<50%)', value: analytics.overall.red, color: ZONE_COLORS.red },
  ];

  const subjectBarData = Object.entries(analytics.bySubject).map(([subject, zones]) => ({
    subject,
    green: zones.green,
    grey: zones.grey,
    red: zones.red,
  }));

  const batchTableData = Object.entries(analytics.byBatch).map(([batch, zones]) => {
    const batchTotal = zones.green + zones.grey + zones.red;
    return {
      batch,
      ...zones,
      total: batchTotal,
      greenPercent: batchTotal > 0 ? Math.round((zones.green / batchTotal) * 100) : 0,
      redPercent: batchTotal > 0 ? Math.round((zones.red / batchTotal) * 100) : 0,
    };
  });

  const filteredProblemTopics = selectedSubject === 'all'
    ? analytics.topicDetails
    : analytics.topicDetails.filter(t => t.subject === selectedSubject);

  const subjects = ['all', ...Object.keys(analytics.bySubject)];

  return (
    <div className="space-y-6">
      {/* Header with Export and Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Topic Zone Analytics</h1>
          <p className="text-muted-foreground">Distribution of topics across green/grey/red zones</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
              Green Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              {greenPercent}%
            </div>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              {analytics.overall.green} topics
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-400">
              Grey Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-700 dark:text-gray-400">
              {greyPercent}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
              {analytics.overall.grey} topics
            </p>
          </CardContent>
        </Card>

        <Card className={`border-red-200 ${redPercent > 30 ? 'bg-red-100 dark:bg-red-950/30' : 'bg-red-50 dark:bg-red-950/20'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
              Red Zone
              {redPercent > 30 && <AlertCircle className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">
              {redPercent}%
            </div>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              {analytics.overall.red} topics
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zone Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Zone Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value} (${Math.round((entry.value / total) * 100)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject-wise Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Zone Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="green" stackId="a" fill={ZONE_COLORS.green} name="Green (>70%)" />
                <Bar dataKey="grey" stackId="a" fill={ZONE_COLORS.grey} name="Grey (50-70%)" />
                <Bar dataKey="red" stackId="a" fill={ZONE_COLORS.red} name="Red (<50%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Batch-wise Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Batch-wise Zone Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Green</TableHead>
                <TableHead className="text-right">Grey</TableHead>
                <TableHead className="text-right">Red</TableHead>
                <TableHead className="text-right">Green %</TableHead>
                <TableHead className="text-right">Red %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchTableData
                .sort((a, b) => b.greenPercent - a.greenPercent)
                .map((batch) => (
                  <TableRow key={batch.batch} className={batch.redPercent > 40 ? 'bg-red-50 dark:bg-red-950/10' : ''}>
                    <TableCell className="font-medium">{batch.batch}</TableCell>
                    <TableCell className="text-right">{batch.total}</TableCell>
                    <TableCell className="text-right text-green-600">{batch.green}</TableCell>
                    <TableCell className="text-right text-gray-600">{batch.grey}</TableCell>
                    <TableCell className="text-right text-red-600">{batch.red}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {batch.greenPercent}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={batch.redPercent > 40 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-red-50 text-red-600 border-red-200'}>
                        {batch.redPercent}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Problem Topics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Problem Topics (Red Zone)
            </CardTitle>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject === 'all' ? 'All Subjects' : subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Avg Completion</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Struggling</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProblemTopics.map((topic) => (
                <TableRow key={topic.topic_id}>
                  <TableCell className="font-medium">{topic.topic_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{topic.chapter_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{topic.subject}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                      {topic.avg_completion.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{topic.student_count}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-red-600 font-semibold">{topic.struggling_count}</span>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProblemTopics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No problem topics found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
