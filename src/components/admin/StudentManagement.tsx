import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, UserCheck, UserX, Eye, Filter, Loader2, MapPin, Building } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useToast } from "@/hooks/use-toast";
import { usersAPI } from "@/services/api";
import { useZones } from "@/hooks/useZones";
import { useSchools } from "@/hooks/useSchools";

interface Student {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  batch_id?: string | null;
  zone_id?: string | null;
  school_id?: string | null;
  user_roles?: { role: string } | null;
  batches?: { id: string; name: string; level: string } | null;
  zones?: { name: string } | null;
  schools?: { name: string } | null;
}

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { batches, fetchBatches } = useBatches();
  const { zones } = useZones();
  const { schools, getSchoolsByZone } = useSchools();
  const { toast } = useToast();

  const fetchStudents = async (search?: string) => {
    try {
      setLoading(true);
      console.log('🔍 [StudentManagement] Fetching students with search term:', search);
      const { students } = await usersAPI.getStudents(search);
      console.log('✅ [StudentManagement] Received students:', students?.length || 0, 'students');
      console.log('📋 [StudentManagement] First student sample:', students?.[0]);
      setStudents(students as Student[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch students";
      console.error("❌ [StudentManagement] Students fetch error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const triggerSearch = () => {
    const trimmed = searchTerm.trim();
    console.log('🖱️ [StudentManagement] Manual search triggered. Term:', trimmed || '(empty)');
    fetchStudents(trimmed || undefined);
  };

  const clearSearch = () => {
    console.log('🧹 [StudentManagement] Clearing search');
    setSearchTerm('');
    fetchStudents(undefined);
  };

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, []);

  // Debounced server-side search
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchTerm.trim();
      console.log('⏱️ [StudentManagement] Search debounce triggered. Term:', trimmed || '(empty)');
      fetchStudents(trimmed || undefined);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredStudents = useMemo(() => {
    let list = students;
    console.log('🔧 [StudentManagement] Starting filter. Total students:', list.length);
    
    // Filter by batch
    if (selectedBatch !== "all") {
      if (selectedBatch === "unassigned") {
        list = list.filter((s) => !s.batch_id || s.batch_id === null);
      } else {
        list = list.filter((s) => s.batches?.name === selectedBatch || s.batch_id === selectedBatch);
      }
      console.log('🔧 [StudentManagement] After batch filter:', list.length);
    }
    
    // Filter by zone
    if (selectedZone !== "all") {
      if (selectedZone === "unassigned") {
        list = list.filter((s) => !s.zone_id);
      } else {
        list = list.filter((s) => s.zone_id === selectedZone);
      }
      console.log('🔧 [StudentManagement] After zone filter:', list.length);
    }
    
    // Filter by school
    if (selectedSchool !== "all") {
      if (selectedSchool === "unassigned") {
        list = list.filter((s) => !s.school_id);
      } else {
        list = list.filter((s) => s.school_id === selectedSchool);
      }
      console.log('🔧 [StudentManagement] After school filter:', list.length);
    }
    
    console.log('✅ [StudentManagement] Final filtered count:', list.length);
    return list;
  }, [students, selectedBatch, selectedZone, selectedSchool]);

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

  const handleAssignZone = async (studentId: string, zoneId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('profiles')
        .update({ zone_id: zoneId })
        .eq('id', studentId);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Student assigned to zone" });
      fetchStudents(searchTerm.trim() || undefined);
    } catch (err) {
      toast({ title: "Error", description: "Failed to assign zone", variant: "destructive" });
    }
  };

  const handleAssignSchool = async (studentId: string, schoolId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('profiles')
        .update({ school_id: schoolId })
        .eq('id', studentId);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Student assigned to school" });
      fetchStudents(searchTerm.trim() || undefined);
    } catch (err) {
      toast({ title: "Error", description: "Failed to assign school", variant: "destructive" });
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
                placeholder="Search by name or email… (Press Enter or click Search)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') triggerSearch();
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={triggerSearch} disabled={loading} className="md:w-28">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={clearSearch} disabled={loading || !searchTerm} className="md:w-24">
              Clear
            </Button>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="w-48">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="unassigned">No Zone</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-48">
                <Building className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by school" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                <SelectItem value="unassigned">No School</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
                  <TableHead>Zone</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
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
                        <Select 
                          value={student.zone_id || ''} 
                          onValueChange={(val) => handleAssignZone(student.id, val)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder={student.zones?.name || 'No zone'} />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.map((z) => (
                              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={student.school_id || ''} 
                          onValueChange={(val) => handleAssignSchool(student.id, val)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder={student.schools?.name || 'No school'} />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={student.batch_id || ''} 
                          onValueChange={(val) => handleAssign(student.id, val)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder={student.batches?.name || 'No batch'} />
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
