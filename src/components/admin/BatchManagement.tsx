import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Users, TrendingUp, Award } from "lucide-react";

// Mock batch data
const mockBatches = [
  {
    id: "1",
    name: "JEE Main 2024",
    level: "Advanced",
    students: 450,
    avgScore: 82.5,
    createdDate: "2024-01-01",
    status: "active",
    description: "Preparation for JEE Main examination"
  },
  {
    id: "2",
    name: "NEET 2024",
    level: "Advanced", 
    students: 320,
    avgScore: 85.2,
    createdDate: "2024-01-15",
    status: "active",
    description: "Medical entrance exam preparation"
  },
  {
    id: "3",
    name: "Foundation Class 10",
    level: "Foundation",
    students: 197,
    avgScore: 75.8,
    createdDate: "2024-02-01",
    status: "active",
    description: "Foundation course for Class 10 students"
  }
];

const BatchManagement = () => {
  const [batches, setBatches] = useState(mockBatches);
  const [showAddDialog, setShowAddDialog] = useState(false);

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
              <DialogTitle>Create New Batch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Batch Name" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foundation">Foundation</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Description" />
              <div className="flex gap-2">
                <Button className="flex-1">Create Batch</Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
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
                <p className="text-2xl font-bold text-foreground">{batches.length}</p>
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
                <p className="text-2xl font-bold text-foreground">{batches.reduce((sum, batch) => sum + batch.students, 0)}</p>
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
                <p className="text-2xl font-bold text-foreground">
                  {((batches.reduce((sum, batch) => sum + batch.avgScore, 0)) / batches.length).toFixed(1)}%
                </p>
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
                {batches.map((batch) => (
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
                        <span className="font-medium">{batch.students}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{batch.avgScore}%</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(batch.createdDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(batch.status)}`}>
                        {batch.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchManagement;