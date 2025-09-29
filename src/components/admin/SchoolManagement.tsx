import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Users, Building, Filter, Loader2, MapPin } from "lucide-react";
import { useSchools, School } from "@/hooks/useSchools";
import { useZones } from "@/hooks/useZones";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  school_name?: string;
  school_id?: string;
  zone_name?: string;
}

const SchoolManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [selectedZone, setSelectedZone] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    code: "", 
    zone_id: "", 
    address: "" 
  });
  
  const { schools, loading, fetchSchools, createSchool, updateSchool, deleteSchool, assignStudentToSchool } = useSchools();
  const { zones } = useZones();
  const { toast } = useToast();

  const fetchStudents = async () => {
    try {
      const { data: studentsData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          school_id,
          zone_id,
          schools!profiles_school_id_fkey(name),
          zones!profiles_zone_id_fkey(name)
        `)
        .not('id', 'is', null);

      if (error) throw error;

      const processedStudents = studentsData?.map(student => ({
        ...student,
        school_name: (student.schools as any)?.name || 'No School',
        zone_name: (student.zones as any)?.name || 'No Zone'
      })) || [];

      setStudents(processedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({ title: "Error", description: "Failed to fetch students", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredSchools = useMemo(() => {
    let filtered = schools;
    
    if (selectedZone !== "all") {
      filtered = filtered.filter(school => school.zone_id === selectedZone);
    }
    
    return filtered;
  }, [schools, selectedZone]);

  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedSchool !== "all") {
      if (selectedSchool === "unassigned") {
        filtered = filtered.filter(s => !s.school_id);
      } else {
        filtered = filtered.filter(s => s.school_id === selectedSchool);
      }
    }
    
    return filtered;
  }, [students, searchTerm, selectedSchool]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchool) {
        await updateSchool(editingSchool.id, formData);
      } else {
        await createSchool(formData);
      }
      setShowAddDialog(false);
      setEditingSchool(null);
      setFormData({ name: "", code: "", zone_id: "", address: "" });
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      zone_id: school.zone_id,
      address: school.address || ""
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this school? All students will be moved to the default school.")) {
      await deleteSchool(id);
    }
  };

  const handleAssignStudent = async (studentId: string, schoolId: string) => {
    try {
      await assignStudentToSchool(studentId, schoolId);
      fetchStudents(); // Refresh students list
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">School Management</h2>
          <p className="text-muted-foreground">Manage schools and student assignments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assign Students
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Assign Students to Schools</DialogTitle>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{student.full_name || 'Unnamed Student'}</h4>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Current: {student.zone_name} - {student.school_name}
                        </p>
                      </div>
                      <Select onValueChange={(value) => handleAssignStudent(student.id, value)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select School" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name} ({school.zone_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center gap-2"
                onClick={() => {
                  setEditingSchool(null);
                  setFormData({ name: "", code: "", zone_id: "", address: "" });
                }}
              >
                <Plus className="h-4 w-4" />
                Add School
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSchool ? 'Edit School' : 'Create New School'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter school name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">School Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Enter school code (e.g., SCH002)"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zone">Zone</Label>
                  <Select 
                    value={formData.zone_id} 
                    onValueChange={(value) => setFormData({ ...formData, zone_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name} ({zone.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter school address"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingSchool ? 'Update School' : 'Create School'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-gradient shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schools.length}</div>
          </CardContent>
        </Card>
        <Card className="card-gradient shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schools.reduce((acc, school) => acc + (school.student_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="card-gradient shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schools.filter(school => school.is_active).length}
            </div>
          </CardContent>
        </Card>
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
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="w-56">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by school" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="unassigned">Unassigned Students</SelectItem>
                {filteredSchools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Schools Table */}
      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle>Schools ({filteredSchools.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading schools...
                    </TableCell>
                  </TableRow>
                ) : filteredSchools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No schools found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSchools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{school.name}</div>
                          {school.address && (
                            <div className="text-sm text-muted-foreground">{school.address}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{school.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{school.zone_name}</Badge>
                      </TableCell>
                      <TableCell>{school.student_count || 0}</TableCell>
                      <TableCell>{getStatusBadge(school.is_active)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(school)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600"
                            onClick={() => handleDelete(school.id)}
                          >
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

export default SchoolManagement;