import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Battery, BatteryLow, Zap, Clock, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeeRecord {
  id: string;
  amount: number;
  month: number;
  year: number;
  due_date: string;
  paid_date: string | null;
  is_paid: boolean;
  battery_level: number;
  profiles?: {
    full_name: string;
    email: string;
  };
  batches?: {
    name: string;
  };
}

interface StudentBatteryCardProps {
  previewMode?: boolean;
  sampleStudentId?: string;
}

const StudentBatteryCard = ({ previewMode = false, sampleStudentId }: StudentBatteryCardProps) => {
  const [feeRecord, setFeeRecord] = useState<FeeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFeeStatus();
  }, []);

  const fetchFeeStatus = async () => {
    try {
      if (previewMode && sampleStudentId) {
        // For admin preview mode, fetch a specific student's data
        const { data, error } = await supabase.functions.invoke('fee-management', {
          body: { action: 'get_sample_student_fee', studentId: sampleStudentId }
        });
        
        if (error) throw error;
        setFeeRecord(data.feeRecord);
      } else if (previewMode) {
        // Show mock data for preview if no specific student ID
        const mockRecord: FeeRecord = {
          id: 'preview-id',
          amount: 5000,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paid_date: null,
          is_paid: false,
          battery_level: 35,
          profiles: {
            full_name: 'Sample Student',
            email: 'student@example.com'
          },
          batches: {
            name: 'JEE Main 2025 Batch A'
          }
        };
        setFeeRecord(mockRecord);
      } else {
        // Normal mode - fetch current user's fee status
        const { data, error } = await supabase.functions.invoke('fee-management', {
          body: { action: 'get_student_fee_status' }
        });

        if (error) throw error;
        setFeeRecord(data.feeRecord);
      }
    } catch (error) {
      console.error('Error fetching fee status:', error);
      toast({
        title: "Error",
        description: "Failed to load fee status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 25) return <Battery className="h-8 w-8 text-success" />;
    if (level > 10) return <BatteryLow className="h-8 w-8 text-warning" />;
    return <BatteryLow className="h-8 w-8 text-destructive" />;
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return "bg-success";
    if (level > 25) return "bg-warning";
    return "bg-destructive";
  };

  const getStatusBadge = (isPaid: boolean, batteryLevel: number) => {
    if (isPaid) {
      return <Badge variant="default" className="bg-success text-success-foreground">
        <Zap className="h-3 w-3 mr-1" />
        Recharged
      </Badge>;
    }
    
    if (batteryLevel < 10) {
      return <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Critical
      </Badge>;
    }
    
    if (batteryLevel < 25) {
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">
        <Clock className="h-3 w-3 mr-1" />
        Low Battery
      </Badge>;
    }

    return <Badge variant="outline">Active</Badge>;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!feeRecord) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">No fee record found</p>
        </CardContent>
      </Card>
    );
  }

  const daysUntilDue = getDaysUntilDue(feeRecord.due_date);
  const isOverdue = daysUntilDue < 0;

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-4">
          {getBatteryIcon(feeRecord.battery_level)}
        </div>
        <CardTitle className="text-xl font-bold">Fee Status</CardTitle>
        {getStatusBadge(feeRecord.is_paid, feeRecord.battery_level)}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Battery Visual */}
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Battery Level</span>
            <span className="text-lg font-bold">{feeRecord.battery_level}%</span>
          </div>
          
          <div className="w-full bg-muted-foreground/20 rounded-full h-4 overflow-hidden">
            <div 
              className={`h-full ${getBatteryColor(feeRecord.battery_level)} transition-all duration-500 rounded-full`}
              style={{ width: `${feeRecord.battery_level}%` }}
            />
          </div>
          
          <div className="text-xs text-muted-foreground mt-2 text-center">
            {feeRecord.is_paid ? (
              "Fully charged! 🔋"
            ) : feeRecord.battery_level < 10 ? (
              "⚠️ Critical - Recharge immediately!"
            ) : feeRecord.battery_level < 25 ? (
              "🪫 Low battery - Recharge soon"
            ) : (
              "Battery draining daily"
            )}
          </div>
        </div>

        {/* Fee Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-semibold">₹{feeRecord.amount}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Due Date</span>
            <span className={`font-semibold ${isOverdue ? 'text-destructive' : ''}`}>
              {new Date(feeRecord.due_date).toLocaleDateString('en-IN')}
            </span>
          </div>
          
          {!feeRecord.is_paid && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {isOverdue ? 'Days Overdue' : 'Days Remaining'}
              </span>
              <span className={`font-semibold ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                {Math.abs(daysUntilDue)} days
              </span>
            </div>
          )}

          {feeRecord.is_paid && feeRecord.paid_date && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Paid On</span>
              <span className="font-semibold text-success">
                {new Date(feeRecord.paid_date).toLocaleDateString('en-IN')}
              </span>
            </div>
          )}

          {feeRecord.batches?.name && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Batch</span>
              <span className="font-semibold">{feeRecord.batches.name}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!feeRecord.is_paid && !previewMode && (
          <Button 
            className="w-full"
            variant={feeRecord.battery_level < 25 ? "destructive" : "default"}
          >
            <Zap className="h-4 w-4 mr-2" />
            Recharge Now - Pay ₹{feeRecord.amount}
          </Button>
        )}

        {previewMode && !feeRecord.is_paid && (
          <Button 
            className="w-full" 
            variant={feeRecord.battery_level < 25 ? "destructive" : "default"}
            disabled
          >
            <Zap className="h-4 w-4 mr-2" />
            Recharge Now - Pay ₹{feeRecord.amount} (Preview Mode)
          </Button>
        )}

        {feeRecord.is_paid && (
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <Zap className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-success font-semibold">Payment Complete!</p>
            <p className="text-xs text-muted-foreground">
              {previewMode ? "Sample payment completed" : "Thank you for your payment"}
            </p>
          </div>
        )}

        {previewMode && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-xs text-center text-primary font-medium">
              👆 Preview Mode - This is how students see their fee status
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentBatteryCard;