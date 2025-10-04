import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExamTypes, ExamType } from '@/hooks/useExamTypes';
import { Plus, Edit, Trash2, GripVertical, Wrench, Heart, GraduationCap, Briefcase, Building2, Scale, Train, Shield, Star } from 'lucide-react';
import { toast } from 'sonner';

const iconMap: Record<string, any> = {
  GraduationCap,
  Wrench,
  Heart,
  Briefcase,
  Building2,
  Scale,
  Train,
  Shield,
  Star,
};

export const ExamTypesManagement = () => {
  const { examTypes, loading, createExamType, updateExamType, deleteExamType } = useExamTypes();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ExamType | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    display_name: '',
    category: 'competitive',
    icon_name: 'GraduationCap',
    color_class: 'bg-blue-500',
    available_exams: [] as string[],
    requires_class: false,
    requires_board: false,
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingType) {
        await updateExamType(editingType.id, formData);
      } else {
        await createExamType(formData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving exam type:', error);
    }
  };

  const handleEdit = (examType: ExamType) => {
    setEditingType(examType);
    setFormData({
      code: examType.code,
      display_name: examType.display_name,
      category: examType.category,
      icon_name: examType.icon_name || 'GraduationCap',
      color_class: examType.color_class || 'bg-blue-500',
      available_exams: examType.available_exams || [],
      requires_class: examType.requires_class,
      requires_board: examType.requires_board,
      is_active: examType.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this exam type?')) {
      await deleteExamType(id);
    }
  };

  const resetForm = () => {
    setEditingType(null);
    setFormData({
      code: '',
      display_name: '',
      category: 'competitive',
      icon_name: 'GraduationCap',
      color_class: 'bg-blue-500',
      available_exams: [],
      requires_class: false,
      requires_board: false,
      is_active: true,
    });
  };

  const handleAvailableExamsChange = (value: string) => {
    const exams = value.split(',').map(e => e.trim()).filter(e => e);
    setFormData({ ...formData, available_exams: exams });
  };

  if (loading) {
    return <div className="p-6">Loading exam types...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Exam Types Management</h2>
          <p className="text-muted-foreground">Manage all exam categories and types</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Exam Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingType ? 'Edit Exam Type' : 'Add New Exam Type'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., engineering"
                    required
                    disabled={!!editingType}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="e.g., Engineering (IIT JEE)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="competitive">Competitive</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon_name">Icon</Label>
                  <Select value={formData.icon_name} onValueChange={(value) => setFormData({ ...formData, icon_name: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(iconMap).map((iconName) => (
                        <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="available_exams">Available Exams (comma-separated)</Label>
                <Input
                  id="available_exams"
                  value={formData.available_exams.join(', ')}
                  onChange={(e) => handleAvailableExamsChange(e.target.value)}
                  placeholder="e.g., JEE Main, JEE Advanced, BITSAT"
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_class"
                    checked={formData.requires_class}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_class: checked })}
                  />
                  <Label htmlFor="requires_class">Requires Class</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_board"
                    checked={formData.requires_board}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_board: checked })}
                  />
                  <Label htmlFor="requires_board">Requires Board</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingType ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {examTypes.map((examType) => {
          const Icon = iconMap[examType.icon_name || 'GraduationCap'];
          
          return (
            <Card key={examType.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${examType.color_class || 'bg-blue-500'} text-white`}>
                      {Icon && <Icon className="h-6 w-6" />}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{examType.display_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Code: {examType.code}</span>
                        <span>Category: {examType.category}</span>
                        {examType.requires_class && <span className="text-blue-600">Requires Class</span>}
                        {examType.requires_board && <span className="text-purple-600">Requires Board</span>}
                        <span className={examType.is_active ? 'text-green-600' : 'text-red-600'}>
                          {examType.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {examType.available_exams && examType.available_exams.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {examType.available_exams.map((exam, idx) => (
                            <span key={idx} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                              {exam}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(examType)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(examType.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
