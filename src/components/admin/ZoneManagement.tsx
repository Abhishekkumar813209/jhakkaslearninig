import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Users, Building, Trash2, MapPin, TrendingUp, Loader2 } from 'lucide-react';
import { useExamTypes } from '@/hooks/useExamTypes';
import * as LucideIcons from 'lucide-react';

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

export const ZoneManagement = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  const { examTypes } = useExamTypes();

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

  const getDomainZoneCount = (domain: string) => {
    return zones.filter(z => z.exam_type === domain).length;
  };

  const filteredZones = !selectedDomain 
    ? [] 
    : zones.filter(z => z.exam_type === selectedDomain);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const { data: zonesData, error: zonesError } = await supabase
        .from('zones')
        .select(`
          *,
          schools!fk_schools_zone(count),
          profiles!fk_profiles_zone(count)
        `);

      if (zonesError) throw zonesError;

      const processedZones = zonesData?.map(zone => ({
        ...zone,
        student_count: zone.profiles?.[0]?.count || 0,
        school_count: zone.schools?.[0]?.count || 0
      })) || [];

      setZones(processedZones);
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast.error('Failed to fetch zones');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;

    try {
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', zoneId);

      if (error) throw error;

      toast.success('Zone deleted successfully');
      fetchZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('Failed to delete zone');
    }
  };

  const handleSaveZone = async (formData: FormData) => {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const exam_type = selectedDomain || formData.get('exam_type') as string;

    try {
      if (editingZone) {
        const { error } = await supabase
          .from('zones')
          .update({ name, description, exam_type })
          .eq('id', editingZone.id);

        if (error) throw error;
        toast.success('Zone updated successfully');
      } else {
        const nextCode = String.fromCharCode(65 + zones.length);
        
        const { error } = await supabase
          .from('zones')
          .insert({ name, code: nextCode, description, exam_type });

        if (error) throw error;
        toast.success('Zone created successfully');
      }

      setIsEditDialogOpen(false);
      setEditingZone(null);
      fetchZones();
    } catch (error) {
      console.error('Error saving zone:', error);
      toast.error('Failed to save zone');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Zone Management</h2>
          <p className="text-muted-foreground mt-1">
            {selectedDomain 
              ? `Managing ${selectedDomain} zones` 
              : "Select an exam domain to view zones"}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDomain && (
            <>
              <Button onClick={() => setSelectedDomain(null)} variant="outline">
                Change Domain
              </Button>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingZone(null)} className="animate-scale-in">
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
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        name="description"
                        defaultValue={editingZone?.description || ''}
                        placeholder="Enter description"
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingZone ? 'Update Zone' : 'Create Zone'}
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
                  onClick={() => setSelectedDomain(examType.code)}
                >
                  <CardContent className="p-6">
                    <div className={`w-full h-24 ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-600'} rounded-lg mb-4 flex items-center justify-center`}>
                      <IconComponent className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{examType.display_name}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{getDomainZoneCount(examType.code)} zones</span>
                      <Badge variant="secondary">{getDomainZoneCount(examType.code)}</Badge>
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
              <Badge className="text-lg px-4 py-2">{filteredZones.length} zones</Badge>
            </CardContent>
          </Card>

          {/* Zone Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Domain Zones</p>
                    <p className="text-2xl font-bold">{filteredZones.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <MapPin className="h-6 w-6 text-primary" />
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
                      {filteredZones.reduce((sum, z) => sum + (z.student_count || 0), 0)}
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
                    <p className="text-sm font-medium text-muted-foreground">Total Schools</p>
                    <p className="text-2xl font-bold">
                      {filteredZones.reduce((sum, z) => sum + (z.school_count || 0), 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Zones Table */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>{selectedDomain} Zones</CardTitle>
              <CardDescription>Manage zones in this domain</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Schools</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          <p className="text-muted-foreground">No zones found in {selectedDomain}</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredZones.map((zone) => (
                        <TableRow key={zone.id} className="hover-scale">
                          <TableCell>
                            <div>
                              <div className="font-medium">{zone.name}</div>
                              {zone.description && (
                                <div className="text-sm text-muted-foreground">{zone.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{zone.code}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{zone.student_count || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span>{zone.school_count || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={zone.is_active ? "default" : "secondary"}>
                              {zone.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  setEditingZone(zone);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-destructive hover:bg-destructive/10" 
                                onClick={() => handleDeleteZone(zone.id)}
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
