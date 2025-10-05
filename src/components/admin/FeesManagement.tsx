import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Battery,
  AlertTriangle,
  CreditCard,
  BarChart3,
  Zap,
  GraduationCap,
  BookOpen,
  Building2,
  Briefcase
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useExamTypes } from "@/hooks/useExamTypes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FeeAnalyticsDashboard from "@/components/fees/FeeAnalyticsDashboard";
import AdminPaymentManager from "@/components/fees/AdminPaymentManager";
import StudentBatteryCard from "@/components/fees/StudentBatteryCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const FeesManagement = () => {
  const navigate = useNavigate();
  const { examTypes, loading: examTypesLoading } = useExamTypes();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const iconMap: Record<string, any> = {
    'school': BookOpen,
    'engineering': GraduationCap,
    'medical': Building2,
    'government': Briefcase,
  };

  useEffect(() => {
    if (selectedDomain) {
      fetchBatchesAndFees();
    }
  }, [selectedDomain]);

  const fetchBatchesAndFees = async () => {
    try {
      setLoading(true);
      
      // Fetch batches for selected domain
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('exam_type', selectedDomain)
        .eq('is_active', true);

      if (batchError) throw batchError;
      setBatches(batchData || []);

      // Fetch fee records for current month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const batchIds = (batchData || []).map(b => b.id);
      
      if (batchIds.length > 0) {
        const { data: feeData, error: feeError } = await supabase
          .from('fee_records')
          .select(`
            *,
            profiles!inner(full_name, batch_id)
          `)
          .in('batch_id', batchIds)
          .eq('month', currentMonth)
          .eq('year', currentYear);

        if (feeError) throw feeError;
        setFeeRecords(feeData || []);
      }
    } catch (error: any) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  const getDomainBatchCount = (examType: string) => {
    return batches.filter(b => b.exam_type === examType).length;
  };

  const totalAmount = feeRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  const paidAmount = feeRecords.filter(r => r.is_paid).reduce((sum, r) => sum + Number(r.amount), 0);
  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const lowBattery = feeRecords.filter(r => !r.is_paid && r.battery_level < 50 && r.battery_level >= 25).length;
  const critical = feeRecords.filter(r => !r.is_paid && r.battery_level < 25).length;
  const totalStudents = feeRecords.length;
  const paidStudents = feeRecords.filter(r => r.is_paid).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">💰 Fees Management System</h2>
        <p className="text-muted-foreground">
          Battery-style fee tracking with automated reminders
        </p>
      </div>

      {!selectedDomain ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select Exam Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {examTypes.map((examType, idx) => {
              const Icon = iconMap[examType.category.toLowerCase()] || GraduationCap;
              
              return (
                <Card
                  key={examType.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                  onClick={() => setSelectedDomain(examType.code)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-3 rounded-lg ${examType.color_class || 'bg-primary/10'}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{examType.display_name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{examType.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-sm text-muted-foreground">Active Batches</span>
                      <Badge variant="secondary" className="font-semibold">
                        {batches.filter(b => b.exam_type === examType.code).length}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-base px-4 py-2">
                Selected: {examTypes.find(e => e.code === selectedDomain)?.display_name}
                {examTypes.find(e => e.code === selectedDomain)?.category &&
                  ` (${examTypes.find(e => e.code === selectedDomain)?.category})`
                }
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setSelectedDomain(null)}>
                Change Domain
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/fees')}
              className="flex items-center gap-2"
            >
              <Battery className="h-4 w-4" />
              Full Fees Portal
            </Button>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-success">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Collection Rate</p>
                    <p className="text-2xl font-bold text-success">{collectionRate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-warning">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Low Battery</p>
                    <p className="text-2xl font-bold text-warning">{lowBattery}</p>
                  </div>
                  <Battery className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-destructive">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Critical</p>
                    <p className="text-2xl font-bold text-destructive">{critical}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">₹{(totalAmount / 1000).toFixed(1)}K</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {/* Batches Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Batch-wise Fee Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Name</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Collection %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.map((batch) => {
                        const batchFees = feeRecords.filter(f => f.batch_id === batch.id);
                        const batchPaid = batchFees.filter(f => f.is_paid).length;
                        const batchTotal = batchFees.length;
                        const batchRate = batchTotal > 0 ? Math.round((batchPaid / batchTotal) * 100) : 0;
                        
                        return (
                          <TableRow key={batch.id}>
                            <TableCell className="font-medium">{batch.name}</TableCell>
                            <TableCell>{batch.level}</TableCell>
                            <TableCell>{batchTotal}</TableCell>
                            <TableCell className="text-success">{batchPaid}</TableCell>
                            <TableCell className="text-destructive">{batchTotal - batchPaid}</TableCell>
                            <TableCell>
                              <Badge variant={batchRate >= 80 ? 'default' : batchRate >= 50 ? 'secondary' : 'destructive'}>
                                {batchRate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Automated Reminders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Automated Reminder System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-warning mb-2">25th</div>
                      <p className="text-sm text-muted-foreground">First Reminder</p>
                      <p className="text-xs text-muted-foreground mt-1">Friendly notification</p>
                    </div>
                    
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-destructive mb-2">28th</div>
                      <p className="text-sm text-muted-foreground">Second Reminder</p>
                      <p className="text-xs text-muted-foreground mt-1">Strict warning</p>
                    </div>
                    
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-destructive mb-2">30th</div>
                      <p className="text-sm text-muted-foreground">Final Notice</p>
                      <p className="text-xs text-muted-foreground mt-1">Suspension threat</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <FeeAnalyticsDashboard />
            </TabsContent>

            <TabsContent value="payments">
              <AdminPaymentManager />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default FeesManagement;
