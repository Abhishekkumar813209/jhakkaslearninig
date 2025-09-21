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
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import FeeAnalyticsDashboard from "@/components/fees/FeeAnalyticsDashboard";
import AdminPaymentManager from "@/components/fees/AdminPaymentManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FeesManagement = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">💰 Fees Management System</h2>
          <p className="text-muted-foreground">
            Battery-style fee tracking with automated reminders
          </p>
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
                <p className="text-2xl font-bold text-success">85%</p>
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
                <p className="text-2xl font-bold text-warning">12</p>
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
                <p className="text-2xl font-bold text-destructive">3</p>
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
                <p className="text-2xl font-bold">₹2.5L</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/fees')}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Battery className="h-5 w-5 text-success" />
              Battery System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Visual fee tracking that drains daily and recharges on payment
            </p>
            <div className="flex items-center gap-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-success h-full w-3/4 rounded-full"></div>
              </div>
              <span className="text-sm font-mono">75%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/fees')}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Analytics Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Batch-wise payment analytics with pie charts and bar graphs
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-success">Paid: 67%</Badge>
              <Badge variant="destructive">Unpaid: 33%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/fees')}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-warning" />
              Payment Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Mark payments, track history, and manage student fee records
            </p>
            <Button size="sm" variant="outline" className="w-full">
              <Zap className="h-3 w-3 mr-1" />
              Mark Payments
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Automated Features */}
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
          
          <div className="mt-4 p-4 bg-primary/10 rounded-lg">
            <p className="text-sm">
              <strong>Auto-Emails:</strong> Parents receive pushy, strict reminders on these dates. 
              Battery turns red when &lt;25%. Payment instantly recharges to 100%! 🔋⚡
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/fees')} className="flex items-center gap-2">
              <Battery className="h-4 w-4" />
              View All Fee Status
            </Button>
            
            <Button variant="outline" onClick={() => navigate('/fees')} className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics Reports
            </Button>
            
            <Button variant="outline" onClick={() => navigate('/fees')} className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Manager
            </Button>
            
            <Button variant="outline" onClick={() => navigate('/fees')} className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Student View Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeesManagement;