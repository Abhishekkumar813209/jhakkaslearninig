import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, UserCheck, UserX, Eye, Filter, Loader2 } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useToast } from "@/hooks/use-toast";
import { usersAPI } from "@/services/api";

interface Student {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  batch_id?: string | null;
  user_roles?: { role: string } | null;
  batches?: { id: string; name: string; level: string } | null;
}

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { batches, fetchBatches } = useBatches();
  const { toast } = useToast();

  const fetchStudents = async (search?: string) => {
    try {
      setLoading(true);
      const { students } = await usersAPI.getStudents(search);
      setStudents(students as Student[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch students";
      console.error("Students fetch error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, []);

  // Debounced server-side search
  useEffect(() => {
    const t = setTimeout(() => {
      fetchStudents(searchTerm.trim() || undefined);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredStudents = useMemo(() => {
    const list = students;
    if (selectedBatch === "all") return list;
    if (selectedBatch === "unassigned") {
      return list.filter((s) => !s.batch_id || s.batch_id === null);
    }
    return list.filter((s) => s.batches?.name === selectedBatch || s.batch_id === selectedBatch);
  }, [students, selectedBatch]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      suspended: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
    } as const;
    return variants[status as keyof typeof variants] || variants.inactive;
  };

  const handleAssign = async (studentId: string, batchId: string) => {
    try {
      setLoading(true);
      const res = await usersAPI.assignStudentToBatch(studentId, batchId);
      toast({ title: "Assigned", description: "Student assigned to batch" });
      // Refresh list
      fetchStudents(searchTerm.trim() || undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to assign batch";
      console.error("Assign batch error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedStudents = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.seedStudents();
      toast({ 
        title: "Success", 
        description: `${response.message}. Created ${response.students?.length || 0} students.` 
      });
      fetchStudents(); // Refresh the list
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to seed students";
      console.error("Seed students error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Student Management</h2>
          <p className="text-muted-foreground">Manage all students and their batch assignments</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSeedStudents}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Seed 50 Students
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Full Name" />
              <Input placeholder="Email" type="email" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button className="flex-1">Add Student</Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="card-gradient shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-56">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="unassigned">Unassigned Students</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Assign to Batch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{student.full_name || 'Unnamed'}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.batches?.name || 'Unassigned'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select onValueChange={(val) => handleAssign(student.id, val)}>
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="Select batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentManagement;
