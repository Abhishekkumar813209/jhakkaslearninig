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
  const { batches, loading, deleteBatch, fetchBatches, totalStudents, avgPerformance } = useBatches();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [examFilter, setExamFilter] = useState<string>("all");
  const { toast } = useToast();

  const examDomains = [
    { value: "School Education", label: "School Education", icon: "🎓", color: "from-blue-500 to-blue-600" },
    { value: "SSC Exams", label: "SSC Exams", icon: "📝", color: "from-green-500 to-green-600" },
    { value: "Banking Exams", label: "Banking Exams", icon: "🏦", color: "from-purple-500 to-purple-600" },
    { value: "UPSC Exams", label: "UPSC Exams", icon: "🏛️", color: "from-orange-500 to-orange-600" },
    { value: "Engineering Entrance", label: "Engineering", icon: "⚙️", color: "from-red-500 to-red-600" },
    { value: "Medical Entrance", label: "Medical", icon: "⚕️", color: "from-pink-500 to-pink-600" },
    { value: "Custom Exam", label: "Custom", icon: "📚", color: "from-gray-500 to-gray-600" },
  ];

  const getDomainBatchCount = (domain: string) => {
    return batches.filter((b: any) => b.exam_type === domain).length;
  };

  const getUniqueExamNames = () => {
    if (!selectedDomain) return [];
    const domainBatches = batches.filter((b: any) => b.exam_type === selectedDomain);
    const examNames = [...new Set(domainBatches.map((b: any) => b.exam_name).filter(Boolean))];
    return examNames;
  };

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

  const filteredBatches = !selectedDomain 
    ? [] 
    : batches.filter((b: any) => {
        if (b.exam_type !== selectedDomain) return false;
        if (examFilter === "all") return true;
        return b.exam_name === examFilter;
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Batch Management</h2>
          <p className="text-muted-foreground mt-1">
            {selectedDomain 
              ? `Managing ${selectedDomain} batches` 
              : "Select an exam domain to view batches"}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDomain && (
            <Button onClick={() => { setSelectedDomain(null); setExamFilter("all"); }} variant="outline">
              Change Domain
            </Button>
          )}
          <Button onClick={() => setShowWizard(true)} className="animate-scale-in">
            <Plus className="mr-2 h-4 w-4" />
            Create Batch
          </Button>
        </div>
      </div>

      {/* Domain Selection Cards */}
      {!selectedDomain ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select Exam Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {examDomains.map((domain, index) => (
              <Card 
                key={domain.value}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in hover:scale-105 border-2 hover:border-primary"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => setSelectedDomain(domain.value)}
              >
                <CardContent className="p-6">
                  <div className={`w-full h-24 bg-gradient-to-br ${domain.color} rounded-lg mb-4 flex items-center justify-center text-4xl`}>
                    {domain.icon}
                  </div>
                  <h4 className="font-semibold text-lg mb-2">{domain.label}</h4>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{getDomainBatchCount(domain.value)} batches</span>
                    <Badge variant="secondary">{getDomainBatchCount(domain.value)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Selected Domain Badge */}
          <Card className="animate-fade-in bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {examDomains.find(d => d.value === selectedDomain)?.icon}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Selected Domain</p>
                  <p className="text-xl font-bold">{selectedDomain}</p>
                </div>
              </div>
              <Badge className="text-lg px-4 py-2">{filteredBatches.length} batches</Badge>
            </CardContent>
          </Card>

          {/* Batch Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Domain Batches</p>
                    <p className="text-2xl font-bold">{filteredBatches.length}</p>
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
                    <p className="text-2xl font-bold">
                      {filteredBatches.reduce((sum: number, b: any) => sum + (b.student_count || 0), 0)}
                    </p>
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
                    <p className="text-sm font-medium text-muted-foreground">Capacity Used</p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        (filteredBatches.reduce((sum: number, b: any) => sum + (b.student_count || 0), 0) /
                        filteredBatches.reduce((sum: number, b: any) => sum + (b.max_capacity || 1), 1)) * 100
                      )}%
                    </p>
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
                  <CardTitle>{selectedDomain} Batches</CardTitle>
                  <CardDescription>Manage batches in this domain</CardDescription>
                </div>
                {getUniqueExamNames().length > 0 && (
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={examFilter} onValueChange={setExamFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by exam" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Exams</SelectItem>
                        {getUniqueExamNames().map((exam: any) => (
                          <SelectItem key={exam} value={exam}>{exam}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                          No batches found in {selectedDomain}
                          {examFilter !== "all" && ` for ${examFilter}`}
                        </p>
                        <Button onClick={() => setShowWizard(true)} variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Batch
                        </Button>
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
                          <span>{batch.student_count ?? batch.current_strength ?? 0}</span>
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
        </>
      )}

      <CreateBatchWizard
        open={showWizard} 
        onOpenChange={setShowWizard}
        onSuccess={() => {
          fetchBatches();
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
