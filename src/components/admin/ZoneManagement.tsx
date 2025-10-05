import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Users, Building, Trash2, UserCheck, ArrowRight } from 'lucide-react';
import { useExamTypes } from '@/hooks/useExamTypes';

interface Zone {
  id: string;
  name: string;
  code: string;
  description: string | null;
  exam_type: string;
  is_active: boolean;
  student_count?: number;
  school_count?: number;
}

interface School {
  id: string;
  name: string;
  code: string;
  zone_id: string;
  address: string | null;
  is_active: boolean;
  student_count?: number;
}

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  zone_name?: string;
  school_name?: string;
}

export const ZoneManagement = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSchoolDialogOpen, setIsSchoolDialogOpen] = useState(false);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedZoneForSchool, setSelectedZoneForSchool] = useState<string | null>(null);
  const [examFilter, setExamFilter] = useState<string>('all');
  
  const { examTypes } = useExamTypes();

  useEffect(() => {
    fetchZonesAndSchools();
    fetchStudents();
  }, []);

  const fetchZonesAndSchools = async () => {
    try {
      // Fetch zones with student counts
      const { data: zonesData, error: zonesError } = await supabase
        .from('zones')
        .select(`
          *,
          schools!fk_schools_zone(count),
          profiles!fk_profiles_zone(count)
        `);

      if (zonesError) throw zonesError;

      // Fetch schools with student counts
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select(`
          *,
          profiles!fk_profiles_school(count)
        `);

      if (schoolsError) throw schoolsError;

      // Process zones data
      const processedZones = zonesData?.map(zone => ({
        ...zone,
        student_count: zone.profiles?.[0]?.count || 0,
        school_count: zone.schools?.[0]?.count || 0
      })) || [];

      // Process schools data
      const processedSchools = schoolsData?.map(school => ({
        ...school,
        student_count: school.profiles?.[0]?.count || 0
      })) || [];

      setZones(processedZones);
      setSchools(processedSchools);
    } catch (error) {
      console.error('Error fetching zones and schools:', error);
      toast.error('Failed to load zones and schools');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data: studentsData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          zones!fk_profiles_zone(name),
          schools!fk_profiles_school(name)
        `)
        .not('id', 'is', null);

      if (error) throw error;

      const processedStudents = studentsData?.map(student => ({
        ...student,
        zone_name: student.zones?.name || 'No Zone',
        school_name: student.schools?.name || 'No School'
      })) || [];

      setStudents(processedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      // First move all students from this zone to Zone A
      const zoneA = zones.find(z => z.code === 'A');
      if (zoneA && zoneA.id !== zoneId) {
        await supabase
          .from('profiles')
          .update({ zone_id: zoneA.id })
          .eq('zone_id', zoneId);
      }

      // Delete the zone
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', zoneId);

      if (error) throw error;

      toast.success('Zone deleted successfully');
      fetchZonesAndSchools();
      fetchStudents();
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('Failed to delete zone');
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    try {
      // First move all students from this school to default school
      const defaultSchool = schools.find(s => s.code === 'SCH001');
      if (defaultSchool && defaultSchool.id !== schoolId) {
        await supabase
          .from('profiles')
          .update({ school_id: defaultSchool.id })
          .eq('school_id', schoolId);
      }

      // Delete the school
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolId);

      if (error) throw error;

      toast.success('School deleted successfully');
      fetchZonesAndSchools();
      fetchStudents();
    } catch (error) {
      console.error('Error deleting school:', error);
      toast.error('Failed to delete school');
    }
  };

  const handleAssignStudentToZone = async (studentId: string, zoneId: string, schoolId?: string) => {
    try {
      const updateData: any = { zone_id: zoneId };
      if (schoolId) {
        updateData.school_id = schoolId;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', studentId);

      if (error) throw error;

      // Recalculate rankings
      const { error: rankingError } = await supabase.rpc('calculate_zone_rankings');
      if (rankingError) console.error('Error recalculating rankings:', rankingError);

      toast.success('Student assigned successfully');
      fetchZonesAndSchools();
      fetchStudents();
      setIsStudentDialogOpen(false);
    } catch (error) {
      console.error('Error assigning student:', error);
      toast.error('Failed to assign student');
    }
  };

  const handleSaveZone = async (formData: FormData) => {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const exam_type = formData.get('exam_type') as string;

    try {
      if (editingZone) {
        // Update existing zone
        const { error } = await supabase
          .from('zones')
          .update({ name, description, exam_type })
          .eq('id', editingZone.id);

        if (error) throw error;
        toast.success('Zone updated successfully');
      } else {
        // Create new zone - generate next code
        const nextCode = String.fromCharCode(65 + zones.length); // A, B, C, etc.
        
        const { error } = await supabase
          .from('zones')
          .insert({ name, code: nextCode, description, exam_type });

        if (error) throw error;
        toast.success('Zone created successfully');
      }

      setIsEditDialogOpen(false);
      setEditingZone(null);
      fetchZonesAndSchools();
    } catch (error) {
      console.error('Error saving zone:', error);
      toast.error('Failed to save zone');
    }
  };

  const handleSaveSchool = async (formData: FormData) => {
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const zoneId = formData.get('zone_id') as string || selectedZoneForSchool;
    const address = formData.get('address') as string;

    try {
      if (editingSchool) {
        // Update existing school
        const { error } = await supabase
          .from('schools')
          .update({ name, code, zone_id: zoneId, address })
          .eq('id', editingSchool.id);

        if (error) throw error;
        toast.success('School updated successfully');
      } else {
        // Create new school
        const { error } = await supabase
          .from('schools')
          .insert({ name, code, zone_id: zoneId, address });

        if (error) throw error;
        toast.success('School created successfully');
      }

      setIsSchoolDialogOpen(false);
      setEditingSchool(null);
      setSelectedZoneForSchool(null);
      fetchZonesAndSchools();
      fetchStudents();
    } catch (error) {
      console.error('Error saving school:', error);
      toast.error('Failed to save school');
    }
  };

  const handleMoveStudents = async (fromZoneId: string, toZoneId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ zone_id: toZoneId })
        .eq('zone_id', fromZoneId);

      if (error) throw error;

      // Recalculate rankings after moving students
      const { error: rankingError } = await supabase.rpc('calculate_zone_rankings');
      if (rankingError) console.error('Error recalculating rankings:', rankingError);

      toast.success('Students moved successfully');
      fetchStudents();
    } catch (error) {
      console.error('Error moving students:', error);
      toast.error('Failed to move students');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-6">Loading zones and schools...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Zone Management</h2>
          <p className="text-muted-foreground">Manage student zones and schools</p>
        </div>
        <div className="flex gap-2">
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {examTypes.map((type) => (
                <SelectItem key={type.id} value={type.code}>
                  {type.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <UserCheck className="w-4 h-4 mr-2" />
                Assign Students
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Assign Students to Zones & Schools</DialogTitle>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{student.full_name || 'Unnamed Student'}</h4>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Current: {student.zone_name} - {student.school_name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Select onValueChange={(value) => {
                          const [zoneId, schoolId] = value.split('|');
                          handleAssignStudentToZone(student.id, zoneId, schoolId);
                        }}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select Zone & School" />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.map((zone) => {
                              const zoneSchools = schools.filter(s => s.zone_id === zone.id);
                              return zoneSchools.map((school) => (
                                <SelectItem key={`${zone.id}|${school.id}`} value={`${zone.id}|${school.id}`}>
                                  {zone.name} - {school.name}
                                </SelectItem>
                              ));
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingZone(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingZone ? 'Edit Zone' : 'Create New Zone'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSaveZone(formData);
              }} className="space-y-4">
                <div>
                  <Label htmlFor="name">Zone Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingZone?.name || ''}
                    placeholder="Enter zone name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="exam_type">Exam Type</Label>
                  <Select name="exam_type" defaultValue={editingZone?.exam_type || ''} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam type" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.map((type) => (
                        <SelectItem key={type.id} value={type.code}>
                          {type.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    defaultValue={editingZone?.description || ''}
                    placeholder="Enter zone description"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingZone ? 'Update Zone' : 'Create Zone'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isSchoolDialogOpen} onOpenChange={setIsSchoolDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSchool ? 'Edit School' : 'Create New School'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSaveSchool(formData);
              }} className="space-y-4">
                <div>
                  <Label htmlFor="school_name">School Name</Label>
                  <Input
                    id="school_name"
                    name="name"
                    defaultValue={editingSchool?.name || ''}
                    placeholder="Enter school name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="school_code">School Code</Label>
                  <Input
                    id="school_code"
                    name="code"
                    defaultValue={editingSchool?.code || ''}
                    placeholder="Enter school code (e.g., SCH002)"
                    required
                  />
                </div>
                {!selectedZoneForSchool && (
                  <div>
                    <Label htmlFor="zone_select">Zone</Label>
                    <Select name="zone_id" defaultValue={editingSchool?.zone_id || ''}>
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
                )}
                {selectedZoneForSchool && (
                  <div>
                    <Label>Zone</Label>
                    <div className="p-2 bg-muted rounded border">
                      {zones.find(z => z.id === selectedZoneForSchool)?.name}
                    </div>
                    <input type="hidden" name="zone_id" value={selectedZoneForSchool} />
                  </div>
                )}
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={editingSchool?.address || ''}
                    placeholder="Enter school address"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingSchool ? 'Update School' : 'Create School'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Zones Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {zones.filter(z => examFilter === 'all' || z.exam_type === examFilter).map((zone) => (
          <Card key={zone.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{zone.name}</CardTitle>
                  <CardDescription>Code: {zone.code}</CardDescription>
                </div>
                <Badge variant={zone.is_active ? "default" : "secondary"}>
                  {zone.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {zone.description && (
                <p className="text-sm text-muted-foreground">{zone.description}</p>
              )}
              
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{zone.student_count} students</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  <span>{zone.school_count} schools</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingZone(zone);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit Zone
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedZoneForSchool(zone.id);
                    setEditingSchool(null);
                    setIsSchoolDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add School
                </Button>
                
                {zone.code !== 'A' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Zone
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Zone</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {zone.name}? All students will be moved to Zone A.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteZone(zone.id)}>
                          Delete Zone
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schools by Zone Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Schools Management</h3>
          <p className="text-sm text-muted-foreground">Each zone can have multiple schools</p>
        </div>
        
        {zones.map((zone) => {
          const zoneSchools = schools.filter(school => school.zone_id === zone.id);
          
          return (
            <Card key={zone.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{zone.name} - Schools ({zoneSchools.length})</CardTitle>
                  <Badge variant="outline">{zone.code}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {zoneSchools.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No schools in this zone</p>
                    <p className="text-sm text-muted-foreground">Create a new school and assign it to {zone.name}</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {zoneSchools.map((school) => (
                      <Card key={school.id} className="p-4 border-2 hover:border-primary/20 transition-colors">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-lg">{school.name}</h4>
                              <Badge variant="outline" className="text-xs">{school.code}</Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingSchool(school);
                                  setSelectedZoneForSchool(school.zone_id);
                                  setIsSchoolDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              
                              {school.code !== 'SCH001' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete School</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {school.name}? All students will be moved to the default school.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteSchool(school.id)}>
                                        Delete School
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                          
                          {school.address && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{school.address}</p>
                          )}
                          
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm flex items-center gap-1 text-muted-foreground">
                              <Users className="w-4 h-4" />
                              {school.student_count} students
                            </span>
                            <Badge variant={school.is_active ? "default" : "secondary"}>
                              {school.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};