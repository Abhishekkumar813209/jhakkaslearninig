import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Withdrawal {
  id: string;
  student_id: string;
  amount: number;
  upi_id: string;
  phone_number?: string;
  account_holder_name?: string;
  withdrawal_method: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  payment_reference: string | null;
  failure_reason: string | null;
  profiles?: {
    full_name: string;
    email: string;
    phone_number: string;
  };
}

export const WithdrawalManagement = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawals();

    // Real-time subscription for new withdrawal requests
    const channel = supabase
      .channel('withdrawal_requests')
      .on(
        'postgres_changes',
        { 
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'withdrawal_history' 
        },
        (payload) => {
          console.log('🔔 Withdrawal request update:', payload);
          fetchWithdrawals(); // Refresh list on any change
          
          // Show toast notification for new requests
          if (payload.eventType === 'INSERT') {
            toast({
              title: '🔔 New Withdrawal Request',
              description: `A student has requested to withdraw ₹${payload.new.amount}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_history')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Fetch student profiles separately
      const studentIds = [...new Set(data?.map(w => w.student_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone_number')
        .in('id', studentIds);

      // Merge profiles with withdrawals
      const withdrawalsWithProfiles = data?.map(w => ({
        ...w,
        profiles: profilesData?.find(p => p.id === w.student_id)
      })) || [];

      setWithdrawals(withdrawalsWithProfiles as Withdrawal[]);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load withdrawal requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal || !paymentReference.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter payment reference/UTR number',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('admin-approve-withdrawal', {
        body: {
          withdrawalId: selectedWithdrawal.id,
          action: 'approve',
          paymentReference: paymentReference.trim(),
          notes: notes.trim() || `Approved and paid via UPI. Reference: ${paymentReference.trim()}`
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });

      if (error) throw error;

      toast({
        title: 'Withdrawal Approved',
        description: `₹${selectedWithdrawal.amount} has been approved and marked as paid.`,
      });

      setApproveModalOpen(false);
      setPaymentReference('');
      setNotes('');
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error: any) {
      console.error('Error approving withdrawal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve withdrawal',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionReason) {
      toast({
        title: 'Error',
        description: 'Please select a rejection reason',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fullReason = notes.trim() ? `${rejectionReason}. ${notes.trim()}` : rejectionReason;
      
      const { error } = await supabase.functions.invoke('admin-approve-withdrawal', {
        body: {
          withdrawalId: selectedWithdrawal.id,
          action: 'reject',
          notes: fullReason
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });

      if (error) throw error;

      toast({
        title: 'Withdrawal Rejected',
        description: 'The withdrawal request has been rejected and credits unlocked.',
      });

      setRejectModalOpen(false);
      setRejectionReason('');
      setNotes('');
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error: any) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject withdrawal',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500 text-white"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500 text-white"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');
  const rejectedWithdrawals = withdrawals.filter(w => w.status === 'failed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests Management</CardTitle>
          <CardDescription>Review and process student withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                  <div className="text-2xl font-bold">{pendingWithdrawals.length}</div>
                  <div className="text-sm text-muted-foreground">Pending Requests</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <div className="text-2xl font-bold">{completedWithdrawals.length}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                  <div className="text-2xl font-bold">{rejectedWithdrawals.length}</div>
                  <div className="text-sm text-muted-foreground">Rejected</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pendingWithdrawals.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedWithdrawals.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejectedWithdrawals.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingWithdrawals.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending withdrawal requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Payment Details</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-medium">{withdrawal.profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{withdrawal.profiles?.email}</div>
                            <div className="text-muted-foreground">{withdrawal.profiles?.phone_number}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">₹{withdrawal.amount}</TableCell>
                        <TableCell>
                          <Badge variant={withdrawal.withdrawal_method === 'phone' ? 'secondary' : 'outline'}>
                            {withdrawal.withdrawal_method === 'phone' ? '📱 Phone' : '💳 UPI ID'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {withdrawal.withdrawal_method === 'phone' ? (
                            <div>
                              <div>{withdrawal.phone_number}</div>
                              <div className="text-xs text-muted-foreground">{withdrawal.account_holder_name}</div>
                            </div>
                          ) : (
                            withdrawal.upi_id
                          )}
                        </TableCell>
                        <TableCell>{new Date(withdrawal.requested_at).toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setApproveModalOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setRejectModalOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="completed">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>UPI ID</TableHead>
                    <TableHead>Payment Reference</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">{withdrawal.profiles?.full_name || 'N/A'}</TableCell>
                      <TableCell className="font-bold text-green-600">₹{withdrawal.amount}</TableCell>
                      <TableCell className="font-mono text-sm">{withdrawal.upi_id}</TableCell>
                      <TableCell className="font-mono text-sm">{withdrawal.payment_reference || 'N/A'}</TableCell>
                      <TableCell>{withdrawal.completed_at ? new Date(withdrawal.completed_at).toLocaleString('en-IN') : 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="rejected">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>UPI ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejectedWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">{withdrawal.profiles?.full_name || 'N/A'}</TableCell>
                      <TableCell className="font-bold text-red-600">₹{withdrawal.amount}</TableCell>
                      <TableCell className="font-mono text-sm">{withdrawal.upi_id}</TableCell>
                      <TableCell className="text-sm">{withdrawal.failure_reason || 'N/A'}</TableCell>
                      <TableCell>{new Date(withdrawal.requested_at).toLocaleString('en-IN')}</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal Request</DialogTitle>
            <DialogDescription>
              Confirm that you have transferred the money to the student's UPI
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student:</span>
                  <span className="font-medium">{selectedWithdrawal.profiles?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-bold text-green-600">₹{selectedWithdrawal.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">UPI ID:</span>
                  <span className="font-mono text-sm">{selectedWithdrawal.upi_id}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="paymentReference">Payment Reference / UTR Number *</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter UTR number or transaction ID"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the transaction reference number from your payment app
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about this transaction"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setApproveModalOpen(false);
                    setPaymentReference('');
                    setNotes('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={processing || !paymentReference.trim()}
                  className="flex-1"
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>
              The student's credits will be unlocked and they can request again
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student:</span>
                  <span className="font-medium">{selectedWithdrawal.profiles?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-bold">₹{selectedWithdrawal.amount}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Select value={rejectionReason} onValueChange={setRejectionReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Invalid UPI ID">Invalid UPI ID</SelectItem>
                    <SelectItem value="Duplicate Request">Duplicate Request</SelectItem>
                    <SelectItem value="Fraudulent Activity Suspected">Fraudulent Activity Suspected</SelectItem>
                    <SelectItem value="Minimum Balance Not Met">Minimum Balance Not Met</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rejectNotes">Additional Details (Optional)</Label>
                <Textarea
                  id="rejectNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide more details about the rejection"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectionReason('');
                    setNotes('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing || !rejectionReason}
                  className="flex-1"
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Reject Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};