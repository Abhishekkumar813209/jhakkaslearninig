import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Users, Building, Filter, Loader2, MapPin, GraduationCap, BookOpen, Briefcase, Building2, X } from "lucide-react";
import { useZones, Zone } from "@/hooks/useZones";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usersAPI } from "@/services/api";
import { useExamTypes } from "@/hooks/useExamTypes";
import * as LucideIcons from "lucide-react";

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  zone_name?: string;
  zone_id?: string;
}

const ZoneManagementNew = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", exam_type: "" });
  
  const { zones, loading, fetchZones, createZone, updateZone, deleteZone, assignStudentToZone } = useZones();
  const { examTypes, loading: examTypesLoading } = useExamTypes();
  const { toast } = useToast();

  // Icon mapping for dynamic icons
  const iconMap: { [key: string]: any } = {
    GraduationCap,
    BookOpen,
    Briefcase,
    Building2,
    MapPin,
  };

  const fetchStudents = async (search?: string) => {
    try {
      console.log('🔍 [ZoneManagement] Fetching students. Search:', search || '(none)');
      const { students } = await usersAPI.getStudents(search);
      const mapped = (students || []).map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        email: s.email,
        zone_id: s.zone_id,
        zone_name: s.zones?.name || 'No Zone',
      }));
      console.log('✅ [ZoneManagement] Students received:', mapped.length);
      setStudents(mapped);
    } catch (error: any) {
      console.error('❌ [ZoneManagement] Fetch students failed:', error);
      const msg = error?.message || 'Failed to fetch students';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedZone !== "all") {
      if (selectedZone === "unassigned") {
        filtered = filtered.filter(s => !s.zone_id);
      } else {
        filtered = filtered.filter(s => s.zone_id === selectedZone);
      }
    }
    
  return filtered;
  }, [students, searchTerm, selectedZone]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const triggerSearch = () => {
    const term = searchTerm.trim();
    console.log('🖱️ [ZoneManagement] Manual search. Term:', term || '(empty)');
    fetchStudents(term || undefined);
  };

  const clearSearch = () => {
    console.log('🧹 [ZoneManagement] Clear search');
    setSearchTerm('');
    fetchStudents(undefined);
  };

  // Filter zones by selected domain
  const filteredZones = useMemo(() => {
    if (!selectedDomain) return [];
    return zones.filter(zone => zone.exam_type === selectedDomain);
  }, [zones, selectedDomain]);

  // Get zone count for each domain
  const getDomainZoneCount = (examType: string) => {
    return zones.filter(zone => zone.exam_type === examType).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const zoneData = { 
        ...formData, 
        exam_type: selectedDomain || formData.exam_type 
      };
      if (editingZone) {
        await updateZone(editingZone.id, zoneData);
      } else {
        await createZone(zoneData);
      }
      setShowAddDialog(false);
      setEditingZone(null);
      setFormData({ name: "", description: "", exam_type: "" });
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleEdit = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({ name: zone.name, description: zone.description || "", exam_type: zone.exam_type || "" });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this zone? All students will be moved to Zone A.")) {
      await deleteZone(id);
    }
  };

  const handleAssignStudent = async (studentId: string, zoneId: string) => {
    try {
      await assignStudentToZone(studentId, zoneId);
      await fetchStudents(); // Refresh students list
      await fetchZones(); // Refresh zones list
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
          <h2 className="text-2xl font-bold text-foreground">Zone Management</h2>
          <p className="text-muted-foreground">Manage student zones and assignments</p>
        </div>
      </div>

      {/* Exam Domain Selection Cards */}
      {!selectedDomain ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {examTypesLoading ? (
            <Card className="col-span-full flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </Card>
          ) : (
            examTypes.map((examType) => {
              const IconComponent = examType.icon_name 
                ? (iconMap[examType.icon_name] || MapPin)
                : MapPin;
              const zoneCount = getDomainZoneCount(examType.code);
              
              return (
                <Card 
                  key={examType.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-700'} text-white overflow-hidden group`}
                  onClick={() => setSelectedDomain(examType.code)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                        <IconComponent className="h-8 w-8" />
                      </div>
                      <Badge variant="secondary" className="bg-white/30 text-white border-white/50">
                        {zoneCount} zones
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{examType.display_name}</h3>
                    <p className="text-sm opacity-90">{examType.category}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <>
          {/* Selected Domain Header */}
          <div className="flex items-center justify-between gap-4">
            <Badge variant="secondary" className="text-lg px-4 py-2 flex items-center gap-2">
              {examTypes.find(et => et.code === selectedDomain)?.display_name || selectedDomain}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-transparent"
                onClick={() => {
                  setSelectedDomain(null);
                  setSelectedZone("all");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </Badge>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedDomain(null)}
              >
                Change Domain
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => {
                      setEditingZone(null);
                      setFormData({ name: "", description: "", exam_type: selectedDomain || "" });
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Zone
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingZone ? 'Edit Zone' : 'Create New Zone'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Zone Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter zone name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter zone description"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingZone ? 'Update Zone' : 'Create Zone'}
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
                <CardTitle className="text-sm font-medium">Domain Zones</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredZones.length}</div>
              </CardContent>
            </Card>
            <Card className="card-gradient shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredZones.reduce((acc, zone) => acc + (zone.student_count || 0), 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="card-gradient shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredZones.reduce((acc, zone) => acc + (zone.school_count || 0), 0)}
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
                    placeholder="Search by name or email… (Press Enter or click Search)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') triggerSearch(); }}
                    className="pl-10"
                  />
                </div>
                <Button onClick={triggerSearch} className="md:w-28">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" onClick={clearSearch} disabled={!searchTerm} className="md:w-24">
                  Clear
                </Button>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger className="w-56">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="unassigned">Unassigned Students</SelectItem>
                    {filteredZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Zones Table */}
          <Card className="card-gradient shadow-soft">
            <CardHeader>
              <CardTitle>Zones ({filteredZones.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Schools</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading zones...
                        </TableCell>
                      </TableRow>
                    ) : filteredZones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No zones found for this exam domain
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredZones.map((zone) => (
                        <TableRow key={zone.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">{zone.name}</div>
                              {zone.description && (
                                <div className="text-sm text-muted-foreground">{zone.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{zone.code}</Badge>
                          </TableCell>
                          <TableCell>{zone.student_count || 0}</TableCell>
                          <TableCell>{zone.school_count || 0}</TableCell>
                          <TableCell>{getStatusBadge(zone.is_active)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(zone)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600"
                                onClick={() => handleDelete(zone.id)}
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

          {/* Students Assignment Table */}
          <Card className="card-gradient shadow-soft">
            <CardHeader>
              <CardTitle>Assign Students to Zones ({filteredStudents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Current Zone</TableHead>
                      <TableHead>Assign Zone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading students...
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          No students found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">{student.full_name || 'Unnamed Student'}</div>
                              <div className="text-sm text-muted-foreground">{student.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{student.zone_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={student.zone_id || ''} 
                              onValueChange={(value) => handleAssignStudent(student.id, value)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select Zone" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredZones.map((zone) => (
                                  <SelectItem key={zone.id} value={zone.id}>
                                    {zone.name} ({zone.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
    </div>
  );
};

export default ZoneManagementNew;