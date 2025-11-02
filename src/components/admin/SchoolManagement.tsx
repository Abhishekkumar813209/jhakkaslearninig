import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Users, Building, Loader2, MapPin } from "lucide-react";
import { useSchools, School } from "@/hooks/useSchools";
import { useZones } from "@/hooks/useZones";
import { useToast } from "@/hooks/use-toast";
import { useExamTypes } from "@/hooks/useExamTypes";
import * as LucideIcons from 'lucide-react';

const SchoolManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState("all");
  const [formData, setFormData] = useState({ 
    name: "", 
    code: "", 
    zone_id: "", 
    address: "",
    exam_type: ""
  });
  
  const { schools, loading, fetchSchools, createSchool, updateSchool, deleteSchool } = useSchools();
  const { zones } = useZones();
  const { examTypes } = useExamTypes();
  const { toast } = useToast();

  // Hydrate from URL on mount
  useEffect(() => {
    const domain = searchParams.get('domain');
    if (domain) setSelectedDomain(domain);
  }, []);

  // URL-aware handler
  const handleDomainSelect = (domain: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('domain', domain);
    setSearchParams(params);
    setSelectedDomain(domain);
  };

  const handleChangeDomain = () => {
    setSelectedDomain(null);
    const params = new URLSearchParams(searchParams);
    params.delete('domain');
    setSearchParams(params);
  };

  const iconMap: Record<string, any> = {
    GraduationCap: LucideIcons.GraduationCap,
    BookOpen: LucideIcons.BookOpen,
    Briefcase: LucideIcons.Briefcase,
    Building2: LucideIcons.Building2,
    Globe: LucideIcons.Globe,
    Shield: LucideIcons.Shield,
    Zap: LucideIcons.Zap,
    Award: LucideIcons.Award,
    Pencil: LucideIcons.Pencil,
  };

  const getDomainSchoolCount = (domain: string) => {
    return schools.filter(s => s.exam_type === domain).length;
  };

  const filteredSchools = useMemo(() => {
    if (!selectedDomain) return [];
    
    let filtered = schools.filter(school => school.exam_type === selectedDomain);
    
    if (zoneFilter !== "all") {
      filtered = filtered.filter(school => school.zone_id === zoneFilter);
    }
    
    return filtered;
  }, [schools, selectedDomain, zoneFilter]);

  const filteredZones = useMemo(() => {
    if (!selectedDomain) return [];
    return zones.filter(z => z.exam_type === selectedDomain);
  }, [zones, selectedDomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchool) {
        await updateSchool(editingSchool.id, formData);
      } else {
        await createSchool({ ...formData, exam_type: selectedDomain || formData.exam_type });
      }
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving school:', error);
    }
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      zone_id: school.zone_id,
      address: school.address || "",
      exam_type: school.exam_type || ""
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this school?')) {
      try {
        await deleteSchool(id);
      } catch (error) {
        console.error('Error deleting school:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: "", code: "", zone_id: "", address: "", exam_type: "" });
    setEditingSchool(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">School Management</h2>
          <p className="text-muted-foreground mt-1">
            {selectedDomain 
              ? `Managing ${selectedDomain} schools` 
              : "Select an exam domain to view schools"}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDomain && (
            <>
              <Button onClick={handleChangeDomain} variant="outline">
                Change Domain
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="animate-scale-in">
                    <Plus className="mr-2 h-4 w-4" />
                    Add School
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingSchool ? 'Edit School' : 'Add New School'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">School Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Enter school name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">School Code</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        placeholder="e.g., SCH001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="zone_id">Zone</Label>
                      <Select 
                        value={formData.zone_id} 
                        onValueChange={(value) => setFormData({...formData, zone_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredZones.map((zone) => (
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
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="Enter school address"
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingSchool ? 'Update School' : 'Create School'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Domain Selection Cards */}
      {!selectedDomain ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select Exam Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {examTypes.map((examType, index) => {
              const IconComponent = examType.icon_name ? iconMap[examType.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
              return (
                <Card 
                  key={examType.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in hover:scale-105 border-2 hover:border-primary"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => handleDomainSelect(examType.code)}
                >
                  <CardContent className="p-6">
                    <div className={`w-full h-24 ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-600'} rounded-lg mb-4 flex items-center justify-center`}>
                      <IconComponent className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{examType.display_name}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{getDomainSchoolCount(examType.code)} schools</span>
                      <Badge variant="secondary">{getDomainSchoolCount(examType.code)}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Selected Domain Badge */}
          <Card className="animate-fade-in bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const examType = examTypes.find(t => t.code === selectedDomain);
                  const IconComponent = examType?.icon_name ? iconMap[examType.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
                  return (
                    <div className={`p-3 rounded-lg ${examType?.color_class || 'bg-gray-500'}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                  );
                })()}
                <div>
                  <p className="text-sm text-muted-foreground">Selected Domain</p>
                  <p className="text-xl font-bold">{examTypes.find(t => t.code === selectedDomain)?.display_name}</p>
                </div>
              </div>
              <Badge className="text-lg px-4 py-2">{filteredSchools.length} schools</Badge>
            </CardContent>
          </Card>

          {/* School Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Schools</p>
                    <p className="text-2xl font-bold">{filteredSchools.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <Building className="h-6 w-6 text-primary" />
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
                      {filteredSchools.reduce((sum, s) => sum + (s.student_count || 0), 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Zones</p>
                    <p className="text-2xl font-bold">{filteredZones.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schools Table */}
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{selectedDomain} Schools</CardTitle>
                  <CardDescription>Manage schools in this domain</CardDescription>
                </div>
                {filteredZones.length > 0 && (
                  <Select value={zoneFilter} onValueChange={setZoneFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {filteredZones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          <p className="text-muted-foreground">
                            No schools found in {selectedDomain}
                            {zoneFilter !== "all" && " for selected zone"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchools.map((school) => (
                        <TableRow key={school.id} className="hover-scale">
                          <TableCell>
                            <div>
                              <div className="font-medium">{school.name}</div>
                              {school.address && (
                                <div className="text-sm text-muted-foreground">{school.address}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{school.code}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{school.zone_name || 'N/A'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{school.student_count || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={school.is_active ? "default" : "secondary"}>
                              {school.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleEdit(school)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-destructive hover:bg-destructive/10" 
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
        </>
      )}
    </div>
  );
};

export default SchoolManagement;
