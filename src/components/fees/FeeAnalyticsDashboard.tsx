import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Battery,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface BatchAnalytics {
  [batchName: string]: {
    paid: number;
    unpaid: number;
    total: number;
  };
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

const FeeAnalyticsDashboard = () => {
  const [batchAnalytics, setBatchAnalytics] = useState<BatchAnalytics>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fee-management', {
        body: { action: 'get_batch_analytics' }
      });

      if (error) throw error;
      setBatchAnalytics(data.batchAnalytics || {});
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyFees = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fee-management', {
        body: { action: 'generate_monthly_fees' }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Monthly fees generated successfully",
      });
      
      await fetchAnalytics();
    } catch (error) {
      console.error('Error generating fees:', error);
      toast({
        title: "Error",
        description: "Failed to generate monthly fees",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getTotalStats = () => {
    const totals = Object.values(batchAnalytics).reduce(
      (acc, batch) => ({
        paid: acc.paid + batch.paid,
        unpaid: acc.unpaid + batch.unpaid,
        total: acc.total + batch.total,
      }),
      { paid: 0, unpaid: 0, total: 0 }
    );

    const paidPercentage = totals.total > 0 ? (totals.paid / totals.total) * 100 : 0;
    const collectionRate = paidPercentage;

    return { ...totals, paidPercentage, collectionRate };
  };

  const getPieChartData = () => {
    const stats = getTotalStats();
    return [
      { name: 'Paid', value: stats.paid, color: '#22c55e' },
      { name: 'Unpaid', value: stats.unpaid, color: '#ef4444' },
    ];
  };

  const getBarChartData = () => {
    return Object.entries(batchAnalytics).map(([batchName, data]) => ({
      batch: batchName,
      paid: data.paid,
      unpaid: data.unpaid,
      total: data.total,
      paidPercentage: data.total > 0 ? (data.paid / data.total) * 100 : 0
    }));
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Fee Analytics Dashboard</h2>
          <p className="text-muted-foreground">Monthly fee collection overview</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAnalytics} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={generateMonthlyFees} disabled={refreshing}>
            <DollarSign className="h-4 w-4 mr-2" />
            Generate Monthly Fees
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Across all batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">
              {stats.paidPercentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.unpaid}</div>
            <p className="text-xs text-muted-foreground">
              {(100 - stats.paidPercentage).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collectionRate.toFixed(1)}%</div>
            <Badge variant={stats.collectionRate > 80 ? "default" : stats.collectionRate > 60 ? "secondary" : "destructive"}>
              {stats.collectionRate > 80 ? "Excellent" : stats.collectionRate > 60 ? "Good" : "Needs Attention"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5" />
              Overall Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getPieChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getPieChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Batch-wise Payment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getBarChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="batch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="paid" fill="#22c55e" name="Paid" />
                <Bar dataKey="unpaid" fill="#ef4444" name="Unpaid" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Batch Details Table */}
      {Object.keys(batchAnalytics).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Batch-wise Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Batch</th>
                    <th className="text-center p-2">Total</th>
                    <th className="text-center p-2">Paid</th>
                    <th className="text-center p-2">Unpaid</th>
                    <th className="text-center p-2">Collection %</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(batchAnalytics).map(([batchName, data]) => {
                    const collectionRate = data.total > 0 ? (data.paid / data.total) * 100 : 0;
                    return (
                      <tr key={batchName} className="border-b">
                        <td className="p-2 font-medium">{batchName}</td>
                        <td className="text-center p-2">{data.total}</td>
                        <td className="text-center p-2 text-success">{data.paid}</td>
                        <td className="text-center p-2 text-destructive">{data.unpaid}</td>
                        <td className="text-center p-2">
                          <Badge variant={collectionRate > 80 ? "default" : collectionRate > 60 ? "secondary" : "destructive"}>
                            {collectionRate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeeAnalyticsDashboard;