import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, TrendingUp, Award, Loader2, Filter } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useToast } from "@/hooks/use-toast";
import { CreateBatchWizard } from "./CreateBatchWizard";

const BatchManagement = () => {
  const { batches, loading, deleteBatch, totalStudents, avgPerformance } = useBatches();
  const [showWizard, setShowWizard] = useState(false);
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const { toast } = useToast();

  const handleDelete = async (batchId: string) => {
    if (window.confirm('Are you sure you want to delete this batch? All students will be unassigned.')) {
      try {
        await deleteBatch(batchId);
        toast({
          title: "Success",
          description: "Batch deleted successfully",
        });
      } catch (error) {
        console.error('Error deleting batch:', error);
        toast({
          title: "Error",
          description: "Failed to delete batch",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusBadge = (batch: any) => {
    if (!batch.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    const now = new Date();
    const startDate = new Date(batch.start_date);
    if (startDate > now) {
      return <Badge variant="outline">Upcoming</Badge>;
    }
    return <Badge>Active</Badge>;
  };

  const getDomainBadge = (examType: string) => {
    const colors: any = {
      "School Education": "bg-blue-500",
      "SSC Exams": "bg-green-500",
      "Banking Exams": "bg-purple-500",
      "UPSC Exams": "bg-orange-500",
      "Engineering Entrance": "bg-red-500",
      "Medical Entrance": "bg-pink-500",
      "Custom Exam": "bg-gray-500",
    };
    return (
      <Badge className={`${colors[examType] || "bg-gray-500"} text-white`}>
        {examType || "General"}
      </Badge>
    );
  };

  const filteredBatches = domainFilter === "all" 
    ? batches 
    : batches.filter((b: any) => b.exam_type === domainFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Batch Management</h2>
          <p className="text-muted-foreground mt-1">Create and manage exam-specific batches</p>
        </div>
        <Button onClick={() => setShowWizard(true)} className="animate-scale-in">
          <Plus className="mr-2 h-4 w-4" />
          Create Batch
        </Button>
      </div>

      {/* Batch Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Batches</p>
                <p className="text-2xl font-bold">{batches?.length || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{totalStudents || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                <p className="text-2xl font-bold">{avgPerformance || 0}%</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches Table */}
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Batches</CardTitle>
              <CardDescription>Manage your exam-specific batches</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  <SelectItem value="School Education">School Education</SelectItem>
                  <SelectItem value="SSC Exams">SSC Exams</SelectItem>
                  <SelectItem value="Banking Exams">Banking Exams</SelectItem>
                  <SelectItem value="UPSC Exams">UPSC Exams</SelectItem>
                  <SelectItem value="Engineering Entrance">Engineering</SelectItem>
                  <SelectItem value="Medical Entrance">Medical</SelectItem>
                  <SelectItem value="Custom Exam">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Exam/Board</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading batches...
                    </TableCell>
                  </TableRow>
                ) : filteredBatches?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">
                          {domainFilter === "all" 
                            ? "No batches found. Create your first batch!" 
                            : "No batches in this domain."}
                        </p>
                        {domainFilter === "all" && (
                          <Button onClick={() => setShowWizard(true)} variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Batch
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches?.map((batch: any) => (
                    <TableRow key={batch.id} className="hover-scale">
                      <TableCell>
                        <div>
                          <div className="font-medium">{batch.name}</div>
                          {batch.description && (
                            <div className="text-sm text-muted-foreground">{batch.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getDomainBadge(batch.exam_type)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{batch.exam_name || "-"}</div>
                        {batch.target_class && (
                          <div className="text-xs text-muted-foreground">
                            {batch.target_class.replace('class_', 'Class ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{batch.current_strength || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {batch.max_capacity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(batch.start_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(batch)}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive hover:bg-destructive/10" 
                          onClick={() => handleDelete(batch.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateBatchWizard 
        open={showWizard} 
        onOpenChange={setShowWizard}
        onSuccess={() => {
          // Batches will auto-refresh via useBatches hook
          toast({
            title: "Success",
            description: "Batch created successfully!",
          });
        }}
      />
    </div>
  );
};

export default BatchManagement;
