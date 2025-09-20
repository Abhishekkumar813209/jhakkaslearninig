import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Users, TrendingUp, Award, Loader2 } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useToast } from "@/hooks/use-toast";

const BatchManagement = () => {
  const { batches, loading, createBatch, updateBatch, deleteBatch, totalStudents, avgPerformance } = useBatches();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: '',
    start_date: '',
    end_date: '',
    max_capacity: 50
  });
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      if (editingBatch) {
        await updateBatch(editingBatch.id, formData);
      } else {
        await createBatch(formData);
      }
      setShowAddDialog(false);
      setEditingBatch(null);
      setFormData({ name: '', description: '', level: '', start_date: '', end_date: '', max_capacity: 50 });
    } catch (error) {
      console.error('Error saving batch:', error);
    }
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      description: batch.description || '',
      level: batch.level,
      start_date: batch.start_date,
      end_date: batch.end_date || '',
      max_capacity: batch.max_capacity
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (batchId) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteBatch(batchId);
      } catch (error) {
        console.error('Error deleting batch:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      completed: "bg-blue-100 text-blue-800"
    };
    return variants[status as keyof typeof variants] || variants.inactive;
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      Foundation: "bg-orange-100 text-orange-800",
      Intermediate: "bg-yellow-100 text-yellow-800", 
      Advanced: "bg-purple-100 text-purple-800"
    };
    return variants[level as keyof typeof variants] || variants.Foundation;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Batch Management</h2>
          <p className="text-muted-foreground">Manage student batches and performance</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBatch ? 'Edit Batch' : 'Create New Batch'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input 
                placeholder="Batch Name" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <Select value={formData.level} onValueChange={(value) => setFormData({...formData, level: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Foundation">Foundation</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Crash Course">Crash Course</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                placeholder="Description" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
              <Input 
                type="date" 
                placeholder="Start Date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
              <Input 
                type="date" 
                placeholder="End Date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              />
              <Input 
                type="number" 
                placeholder="Max Capacity"
                value={formData.max_capacity}
                onChange={(e) => setFormData({...formData, max_capacity: parseInt(e.target.value) || 50})}
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingBatch ? 'Update Batch' : 'Create Batch'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowAddDialog(false);
                  setEditingBatch(null);
                  setFormData({ name: '', description: '', level: '', start_date: '', end_date: '', max_capacity: 50 });
                }}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Batch Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Batches</p>
                <p className="text-2xl font-bold text-foreground">{batches?.length || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold text-foreground">{totalStudents || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                <p className="text-2xl font-bold text-foreground">{avgPerformance || 0}%</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches Table */}
      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle>All Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading batches...
                    </TableCell>
                  </TableRow>
                ) : batches?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No batches found. Create your first batch!
                    </TableCell>
                  </TableRow>
                ) : (
                  batches?.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{batch.name}</div>
                          <div className="text-sm text-muted-foreground">{batch.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getLevelBadge(batch.level)}`}>
                          {batch.level}
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1">
                           <Users className="h-4 w-4 text-muted-foreground" />
                           <span className="font-medium">{batch.student_count || 0} / {batch.max_capacity}</span>
                         </div>
                       </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{batch.avg_score || 0}%</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(batch.is_active ? 'active' : 'inactive')}`}>
                          {batch.is_active ? 'active' : 'inactive'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(batch)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(batch.id)}>
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

export default BatchManagement;