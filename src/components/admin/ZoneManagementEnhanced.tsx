import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Users, Building } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useZones } from '@/hooks/useZones';
import { useExamTypes } from '@/hooks/useExamTypes';

const CLASS_OPTIONS = [
  { value: 'class_6', label: 'Class 6' },
  { value: 'class_7', label: 'Class 7' },
  { value: 'class_8', label: 'Class 8' },
  { value: 'class_9', label: 'Class 9' },
  { value: 'class_10', label: 'Class 10' },
  { value: 'class_11', label: 'Class 11' },
  { value: 'class_12', label: 'Class 12' },
];

export const ZoneManagementEnhanced = () => {
  const { zones, loading, createZone, updateZone, deleteZone } = useZones();
  const { examTypes } = useExamTypes();
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    exam_type: 'school',
    allowed_classes: [] as string[]
  });

  const iconMap: Record<string, any> = {
    GraduationCap: LucideIcons.GraduationCap,
    Building2: LucideIcons.Building2,
    Stethoscope: LucideIcons.Stethoscope,
    Lightbulb: LucideIcons.Lightbulb,
    Briefcase: LucideIcons.Briefcase,
    Calculator: LucideIcons.Calculator,
  };

  const filteredZones = useMemo(() => {
    let filtered = zones;
    
    if (selectedExamType !== 'all') {
      filtered = filtered.filter(zone => zone.exam_type === selectedExamType);
    }
    
    if (selectedClass !== 'all') {
      filtered = filtered.filter(zone => 
        zone.allowed_classes?.includes(selectedClass)
      );
    }
    
    return filtered;
  }, [zones, selectedExamType, selectedClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingZone) {
        await updateZone(editingZone.id, formData);
      } else {
        await createZone(formData);
      }
      setIsEditDialogOpen(false);
      setEditingZone(null);
      setFormData({ name: '', description: '', exam_type: 'school', allowed_classes: [] });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEdit = (zone: any) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
      exam_type: zone.exam_type,
      allowed_classes: zone.allowed_classes || []
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteZone(id);
  };

  const toggleClass = (classValue: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_classes: prev.allowed_classes.includes(classValue)
        ? prev.allowed_classes.filter(c => c !== classValue)
        : [...prev.allowed_classes, classValue]
    }));
  };

  if (loading && zones.length === 0) {
    return <div className="flex justify-center p-6">Loading zones...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Zone Management</h2>
          <p className="text-muted-foreground">Manage zones by exam type and class</p>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingZone(null);
              setFormData({ name: '', description: '', exam_type: 'school', allowed_classes: [] });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingZone ? 'Edit Zone' : 'Create New Zone'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Zone Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter zone name"
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter zone description"
                />
              </div>
              <div>
                <Label>Exam Type</Label>
                <Select value={formData.exam_type} onValueChange={(value) => setFormData({ ...formData, exam_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map(exam => (
                      <SelectItem key={exam.code} value={exam.code}>
                        {exam.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.exam_type === 'school' && (
                <div>
                  <Label>Allowed Classes</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {CLASS_OPTIONS.map(cls => (
                      <Button
                        key={cls.value}
                        type="button"
                        variant={formData.allowed_classes.includes(cls.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleClass(cls.value)}
                      >
                        {cls.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full">
                {editingZone ? 'Update Zone' : 'Create Zone'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Exam Type Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card
          className={`cursor-pointer transition-all ${selectedExamType === 'all' ? 'border-primary shadow-md' : ''}`}
          onClick={() => setSelectedExamType('all')}
        >
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium">All</p>
            <Badge variant="secondary" className="mt-1">{zones.length}</Badge>
          </CardContent>
        </Card>
        {examTypes.map(examType => {
          const Icon = iconMap[examType.icon_name || 'GraduationCap'] || LucideIcons.GraduationCap;
          const count = zones.filter(z => z.exam_type === examType.code).length;
          return (
            <Card
              key={examType.code}
              className={`cursor-pointer transition-all ${selectedExamType === examType.code ? 'border-primary shadow-md' : ''}`}
              onClick={() => setSelectedExamType(examType.code)}
            >
              <CardContent className="p-4 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium text-sm">{examType.display_name}</p>
                <Badge variant="secondary" className="mt-1">{count}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Class Filter */}
      {selectedExamType === 'school' && (
        <div>
          <Label>Filter by Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASS_OPTIONS.map(cls => (
                <SelectItem key={cls.value} value={cls.value}>{cls.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Zones Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredZones.map(zone => (
          <Card key={zone.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{zone.name}</CardTitle>
                  <CardDescription>Code: {zone.code}</CardDescription>
                </div>
                <Badge className={zone.is_active ? 'bg-green-100 text-green-800' : ''}>
                  {zone.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{zone.student_count || 0} Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span className="text-sm">{zone.school_count || 0} Schools</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{examTypes.find(e => e.code === zone.exam_type)?.display_name}</Badge>
                {zone.exam_type === 'school' && zone.allowed_classes && zone.allowed_classes.length > 0 && (
                  <Badge variant="secondary">
                    {zone.allowed_classes.length} Classes
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(zone)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Zone?</AlertDialogTitle>
                      <AlertDialogDescription>
                        All students will be moved to Zone A.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(zone.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};