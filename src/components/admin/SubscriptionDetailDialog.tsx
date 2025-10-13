import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreditCard, Calendar, DollarSign, User, Mail, Receipt } from "lucide-react";

interface SubscriptionDetailDialogProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StudentProfile {
  full_name: string;
  email: string;
  phone_number: string | null;
}

interface Subscription {
  id: string;
  subscription_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  payment_method: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  payment_method: string | null;
  created_at: string;
}

interface DiscountUsage {
  discount_type: string;
  discount_amount: number;
  code_used: string | null;
  created_at: string;
}

export const SubscriptionDetailDialog = ({
  studentId,
  open,
  onOpenChange,
}: SubscriptionDetailDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [discounts, setDiscounts] = useState<DiscountUsage[]>([]);

  useEffect(() => {
    if (open && studentId) {
      fetchStudentDetails();
    }
  }, [open, studentId]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone_number')
        .eq('id', studentId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch subscriptions
      const { data: subData, error: subError } = await supabase
        .from('test_subscriptions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (subError) throw subError;
      setSubscriptions(subData || []);

      // Fetch payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;
      setPayments(paymentData || []);

      // Fetch discount usage
      const { data: discountData, error: discountError } = await supabase
        .from('discount_usage_log')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (discountError) throw discountError;
      setDiscounts(discountData || []);

    } catch (error: any) {
      console.error('Error fetching student details:', error);
      toast.error('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'captured':
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'created':
        return <Badge variant="secondary">Created</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DialogContent>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke premium access for {profile?.full_name}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason (Optional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g., Disciplinary action, policy violation, student request..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="min-h-20"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {canceling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Student Subscription Details</DialogTitle>
            {hasActiveSubscription && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Profile */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Name:</span>
                  <span>{profile.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{profile.email}</span>
                </div>
                {profile.phone_number && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Phone:</span>
                    <span>{profile.phone_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subscription History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No subscriptions found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <Badge variant={sub.subscription_type === 'premium' ? 'default' : 'secondary'}>
                            {sub.subscription_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>
                          {sub.start_date ? format(new Date(sub.start_date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {sub.end_date ? format(new Date(sub.end_date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>₹{sub.amount}</TableCell>
                        <TableCell>{sub.payment_method || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No payments found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Razorpay Order ID</TableHead>
                      <TableHead>Razorpay Payment ID</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">₹{payment.amount}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {payment.razorpay_order_id}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {payment.razorpay_payment_id || 'N/A'}
                        </TableCell>
                        <TableCell>{payment.payment_method || 'N/A'}</TableCell>
                        <TableCell>
                          {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Discount Usage */}
          {discounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Discount Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.map((discount, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline">{discount.discount_type}</Badge>
                        </TableCell>
                        <TableCell>{discount.code_used || 'N/A'}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          -₹{discount.discount_amount}
                        </TableCell>
                        <TableCell>
                          {format(new Date(discount.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
