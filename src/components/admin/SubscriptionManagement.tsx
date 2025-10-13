import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { SubscriptionDetailDialog } from "./SubscriptionDetailDialog";

interface SubscriptionData {
  student_id: string;
  full_name: string;
  email: string;
  subscription_type: string;
  subscription_status: string;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  payment_method: string | null;
  subscribed_at: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  current_status: string;
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
      
      const { data: subscriptionsData, error: subError } = await supabase
        .from('test_subscriptions')
        .select(`
          id,
          student_id,
          subscription_type,
          status,
          start_date,
          end_date,
          created_at,
          profiles!test_subscriptions_student_id_fkey (
            full_name,
            email,
            phone_number
          ),
          payments (
            amount,
            payment_method,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (subError) {
        console.error('Subscription fetch error:', subError);
        setError(`Failed to load subscriptions: ${subError.message}`);
        setLoading(false);
        return;
      }

      if (!subscriptionsData || subscriptionsData.length === 0) {
        setSubscriptions([]);
        setSummary({
          totalPaidUsers: 0,
          totalRevenue: 0,
          activeSubscriptions: 0,
          expiredSubscriptions: 0,
          freeUsers: 0,
        });
        setLoading(false);
        return;
      }

      const transformedData: SubscriptionData[] = subscriptionsData.map((sub: any) => ({
        student_id: sub.student_id,
        full_name: sub.profiles?.full_name || 'N/A',
        email: sub.profiles?.email || 'N/A',
        phone_number: sub.profiles?.phone_number || 'N/A',
        subscription_type: sub.subscription_type,
        current_status: sub.status,
        start_date: sub.start_date,
        end_date: sub.end_date,
        last_payment_amount: sub.payments?.[0]?.amount || 0,
        payment_method: sub.payments?.[0]?.payment_method || 'N/A',
      }));

      setSubscriptions(transformedData);
      
      const stats = calculateStats(transformedData);
      setSummary(stats);
      
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
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const active = data.filter(s => s.current_status === 'active').length;
    const expired = data.filter(s => s.current_status === 'expired').length;
    const free = data.filter(s => s.current_status === 'free').length;

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
      case 'free':
        return <Badge variant="secondary">Free</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      'Razorpay Order ID',
    ];

    const rows = filteredSubscriptions.map(sub => [
      sub.full_name,
      sub.email,
      sub.subscription_type,
      sub.current_status,
      sub.start_date ? format(new Date(sub.start_date), 'dd/MM/yyyy') : 'N/A',
      sub.end_date ? format(new Date(sub.end_date), 'dd/MM/yyyy') : 'N/A',
      `₹${sub.amount}`,
      sub.payment_method || 'N/A',
      sub.razorpay_order_id || 'N/A',
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
                <SelectItem value="free">Free</SelectItem>
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
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.student_id + sub.subscribed_at}>
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
                      <TableCell>₹{sub.amount}</TableCell>
                      <TableCell>{sub.payment_method || 'N/A'}</TableCell>
                      <TableCell>
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
          onOpenChange={setDetailDialogOpen}
        />
      )}
    </div>
  );
};

export default SubscriptionManagement;
