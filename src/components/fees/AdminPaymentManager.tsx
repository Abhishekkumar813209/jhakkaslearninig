import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  CreditCard, 
  Battery, 
  BatteryLow, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeeRecord {
  id: string;
  student_id: string;
  amount: number;
  month: number;
  year: number;
  due_date: string;
  paid_date: string | null;
  is_paid: boolean;
  battery_level: number;
  payment_method: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
  batches?: {
    name: string;
  };
}

const AdminPaymentManager = () => {
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [markingPayment, setMarkingPayment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllFees();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [feeRecords, searchTerm, statusFilter]);

  const fetchAllFees = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fee-management', {
        body: { action: 'get_all_students_fees' }
      });

      if (error) throw error;
      setFeeRecords(data.feeRecords || []);
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast({
        title: "Error",
        description: "Failed to load fee records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = feeRecords;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.batches?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "paid":
          filtered = filtered.filter(record => record.is_paid);
          break;
        case "unpaid":
          filtered = filtered.filter(record => !record.is_paid);
          break;
        case "critical":
          filtered = filtered.filter(record => !record.is_paid && record.battery_level < 25);
          break;
        case "overdue":
          const today = new Date();
          filtered = filtered.filter(record => 
            !record.is_paid && new Date(record.due_date) < today
          );
          break;
      }
    }

    setFilteredRecords(filtered);
  };

  const markPaymentAsPaid = async () => {
    if (!selectedRecord) return;

    setMarkingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('fee-management', {
        body: { 
          action: 'mark_payment',
          studentId: selectedRecord.student_id,
          month: selectedRecord.month,
          year: selectedRecord.year,
          paymentMethod: paymentMethod || 'cash'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment marked for ${selectedRecord.profiles?.full_name}`,
      });

      setSelectedRecord(null);
      setPaymentMethod("");
      await fetchAllFees();
    } catch (error) {
      console.error('Error marking payment:', error);
      toast({
        title: "Error",
        description: "Failed to mark payment",
        variant: "destructive",
      });
    } finally {
      setMarkingPayment(false);
    }
  };

  const getBatteryIcon = (level: number, isPaid: boolean) => {
    if (isPaid) return <CheckCircle className="h-4 w-4 text-success" />;
    if (level > 25) return <Battery className="h-4 w-4 text-success" />;
    if (level > 10) return <BatteryLow className="h-4 w-4 text-warning" />;
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  };

  const getStatusBadge = (record: FeeRecord) => {
    if (record.is_paid) {
      return <Badge variant="default" className="bg-success text-success-foreground">Paid</Badge>;
    }
    
    const today = new Date();
    const dueDate = new Date(record.due_date);
    const isOverdue = dueDate < today;
    
    if (record.battery_level < 10) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    if (record.battery_level < 25) {
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Low</Badge>;
    }

    return <Badge variant="outline">Pending</Badge>;
  };

  const getStats = () => {
    const total = filteredRecords.length;
    const paid = filteredRecords.filter(r => r.is_paid).length;
    const unpaid = total - paid;
    const critical = filteredRecords.filter(r => !r.is_paid && r.battery_level < 25).length;
    
    return { total, paid, unpaid, critical };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Payment Management</h2>
          <p className="text-muted-foreground">Manage student fee payments and battery status</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Users className="h-8 w-8 text-muted-foreground mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle className="h-8 w-8 text-success mr-3" />
            <div>
              <p className="text-2xl font-bold text-success">{stats.paid}</p>
              <p className="text-xs text-muted-foreground">Paid</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-warning mr-3" />
            <div>
              <p className="text-2xl font-bold text-warning">{stats.unpaid}</p>
              <p className="text-xs text-muted-foreground">Unpaid</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-8 w-8 text-destructive mr-3" />
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or batch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="critical">Critical (&lt;25%)</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Student Records */}
      <div className="grid gap-4">
        {filteredRecords.map((record) => (
          <Card key={record.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getBatteryIcon(record.battery_level, record.is_paid)}
                  
                  <div>
                    <h3 className="font-semibold">{record.profiles?.full_name || 'Unknown Student'}</h3>
                    <p className="text-sm text-muted-foreground">{record.profiles?.email}</p>
                    {record.batches?.name && (
                      <p className="text-xs text-muted-foreground">Batch: {record.batches.name}</p>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Battery className="h-4 w-4" />
                    <span className="font-mono text-sm">{record.battery_level}%</span>
                  </div>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        record.is_paid ? 'bg-success' :
                        record.battery_level > 50 ? 'bg-success' :
                        record.battery_level > 25 ? 'bg-warning' : 'bg-destructive'
                      }`}
                      style={{ width: `${record.battery_level}%` }}
                    />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold">₹{record.amount}</p>
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(record.due_date).toLocaleDateString('en-IN')}
                  </p>
                  {record.is_paid && record.paid_date && (
                    <p className="text-xs text-success">
                      Paid: {new Date(record.paid_date).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(record)}
                  
                  {!record.is_paid && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedRecord(record)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Mark Payment as Paid</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p><strong>Student:</strong> {selectedRecord?.profiles?.full_name}</p>
                            <p><strong>Amount:</strong> ₹{selectedRecord?.amount}</p>
                            <p><strong>Month:</strong> {selectedRecord?.month}/{selectedRecord?.year}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Payment Method</label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="cheque">Cheque</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              onClick={markPaymentAsPaid} 
                              disabled={markingPayment}
                              className="flex-1"
                            >
                              {markingPayment ? "Processing..." : "Confirm Payment"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-muted-foreground">No fee records found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPaymentManager;