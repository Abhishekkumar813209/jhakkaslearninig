import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CreditCard, 
  Search, 
  Download, 
  Eye,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  XCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { SubscriptionDetailDialog } from "./SubscriptionDetailDialog";
import { subscriptionAPI } from "@/services/api";

interface SubscriptionData {
  student_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  subscription_type: string;
  current_status: string;
  start_date: string | null;
  end_date: string | null;
  last_payment_amount: number;
  payment_method: string | null;
}

interface SummaryStats {
  totalPaidUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  freeUsers: number;
}

const SubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [stats, setStats] = useState<SummaryStats>({
    totalPaidUsers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    freeUsers: 0,
  });
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch subscriptions
      const { data: subscriptionsData, error: subError } = await supabase
        .from('test_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subError) {
        console.error('Subscription fetch error:', subError);
        setError(`Failed to load subscriptions: ${subError.message}`);
        setLoading(false);
        return;
      }

      if (!subscriptionsData || subscriptionsData.length === 0) {
        setSubscriptions([]);
        setStats({
          totalPaidUsers: 0,
          totalRevenue: 0,
          activeSubscriptions: 0,
          expiredSubscriptions: 0,
          freeUsers: 0,
        });
        setLoading(false);
        return;
      }

      // Get unique student IDs
      const studentIds = [...new Set(subscriptionsData.map(sub => sub.student_id))];

      // Fetch profiles separately
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone_number')
        .in('id', studentIds);

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      // Fetch payments separately
      const subscriptionIds = subscriptionsData.map(sub => sub.id);
      const { data: paymentsData, error: paymentError } = await supabase
        .from('payments')
        .select('subscription_id, amount, payment_method, created_at')
        .in('subscription_id', subscriptionIds)
        .order('created_at', { ascending: false });

      if (paymentError) {
        console.error('Payment fetch error:', paymentError);
      }

      // Create lookup maps
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const paymentMap = new Map();
      paymentsData?.forEach(payment => {
        if (!paymentMap.has(payment.subscription_id)) {
          paymentMap.set(payment.subscription_id, payment);
        }
      });

      // Transform and merge data
      const transformedData: SubscriptionData[] = subscriptionsData.map((sub: any) => {
        const profile = profileMap.get(sub.student_id);
        const payment = paymentMap.get(sub.id);

        return {
          student_id: sub.student_id,
          full_name: profile?.full_name || 'N/A',
          email: profile?.email || 'N/A',
          phone_number: profile?.phone_number || 'N/A',
          subscription_type: sub.subscription_type,
          current_status: sub.status,
          start_date: sub.start_date,
          end_date: sub.end_date,
          last_payment_amount: payment?.amount || sub.amount || 0,
          payment_method: payment?.payment_method || 'N/A',
        };
      });

      setSubscriptions(transformedData);
      calculateStats(transformedData);
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred while loading subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: SubscriptionData[]) => {
    const paidUsers = data.filter(s => s.subscription_type === 'premium').length;
    const totalRevenue = data
      .filter(s => s.subscription_type === 'premium')
      .reduce((sum, s) => sum + (s.last_payment_amount || 0), 0);
    const active = data.filter(s => s.current_status === 'active').length;
    const expired = data.filter(s => s.current_status === 'expired').length;
    const free = data.filter(s => s.subscription_type === 'free').length;

    setStats({
      totalPaidUsers: paidUsers,
      totalRevenue,
      activeSubscriptions: active,
      expiredSubscriptions: expired,
      freeUsers: free,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'free':
        return <Badge variant="secondary">Free</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCancelSubscription = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to cancel subscription for ${studentName}?\n\nThis action will immediately revoke their premium access.`)) {
      return;
    }
    
    try {
      await subscriptionAPI.cancelSubscription(studentId);
      toast.success(`Subscription cancelled for ${studentName}`);
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Student Name',
      'Email',
      'Type',
      'Status',
      'Start Date',
      'End Date',
      'Amount',
      'Payment Method',
    ];

    const rows = filteredSubscriptions.map(sub => [
      sub.full_name,
      sub.email,
      sub.subscription_type,
      sub.current_status,
      sub.start_date ? format(new Date(sub.start_date), 'dd/MM/yyyy') : 'N/A',
      sub.end_date ? format(new Date(sub.end_date), 'dd/MM/yyyy') : 'N/A',
      `₹${sub.last_payment_amount}`,
      sub.payment_method || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    
    toast.success('CSV exported successfully');
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || sub.subscription_type === filterType;
    const matchesStatus = filterStatus === 'all' || sub.current_status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPaidUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Calendar className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expiredSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Users</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.freeUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Subscriptions Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub, idx) => (
                    <TableRow key={sub.student_id + idx}>
                      <TableCell className="font-medium">{sub.full_name}</TableCell>
                      <TableCell>{sub.email}</TableCell>
                      <TableCell>
                        <Badge variant={sub.subscription_type === 'premium' ? 'default' : 'secondary'}>
                          {sub.subscription_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.current_status)}</TableCell>
                      <TableCell>
                        {sub.start_date ? format(new Date(sub.start_date), 'dd/MM/yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {sub.end_date ? format(new Date(sub.end_date), 'dd/MM/yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>₹{sub.last_payment_amount}</TableCell>
                      <TableCell>{sub.payment_method || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(sub.student_id);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {sub.current_status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleCancelSubscription(sub.student_id, sub.full_name)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedStudent && (
        <SubscriptionDetailDialog
          studentId={selectedStudent}
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) fetchSubscriptions();
          }}
        />
      )}
    </div>
  );
};

export default SubscriptionManagement;