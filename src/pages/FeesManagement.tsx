import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StudentBatteryCard from "@/components/fees/StudentBatteryCard";
import FeeAnalyticsDashboard from "@/components/fees/FeeAnalyticsDashboard";
import AdminPaymentManager from "@/components/fees/AdminPaymentManager";
import { supabase } from "@/integrations/supabase/client";
import { Battery, TrendingUp, CreditCard } from "lucide-react";

const FeesManagement = () => {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        setUserRole(data?.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fees Management Portal</h1>
        <p className="text-muted-foreground">
          {userRole === 'admin' ? 
            'Manage student fees, track payments, and view analytics' : 
            'View your fee status and payment history'
          }
        </p>
      </div>

      {userRole === 'student' && (
        <div className="max-w-2xl mx-auto">
          <StudentBatteryCard />
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Battery className="h-5 w-5" />
                How Battery System Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-success rounded-full mt-2" />
                <div>
                  <p className="font-medium">100% - Month Start</p>
                  <p className="text-sm text-muted-foreground">Your fee battery starts at 100% every month</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-warning rounded-full mt-2" />
                <div>
                  <p className="font-medium">Daily Drain</p>
                  <p className="text-sm text-muted-foreground">Battery decreases gradually each day until due date</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-destructive rounded-full mt-2" />
                <div>
                  <p className="font-medium">Low Battery Warning</p>
                  <p className="text-sm text-muted-foreground">Below 25% - Time to recharge with fee payment!</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-success rounded-full mt-2" />
                <div>
                  <p className="font-medium">Recharge Complete</p>
                  <p className="text-sm text-muted-foreground">Payment instantly recharges battery back to 100%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {userRole === 'admin' && (
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Manager
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Battery className="h-4 w-4" />
              Student View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <FeeAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="payments">
            <AdminPaymentManager />
          </TabsContent>

          <TabsContent value="preview">
            <div className="max-w-2xl mx-auto">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Student View Preview</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    This is how students see their fee status
                  </p>
                </CardHeader>
              </Card>
              <StudentBatteryCard />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!userRole && (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-muted-foreground">Unable to determine user role. Please contact admin.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeesManagement;