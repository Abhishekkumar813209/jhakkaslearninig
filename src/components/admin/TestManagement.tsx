import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, FileText, Clock, Users, BarChart3 } from "lucide-react";

// Mock test data
const mockTests = [
  {
    id: "1",
    title: "Physics Motion and Force",
    subject: "Physics",
    batch: "JEE Main 2024",
    questions: 30,
    duration: 90,
    maxMarks: 120,
    attempts: 245,
    avgScore: 78.5,
    status: "published",
    createdDate: "2024-03-01",
    type: "practice"
  },
  {
    id: "2",
    title: "Organic Chemistry Test 1",
    subject: "Chemistry", 
    batch: "JEE Advanced",
    questions: 25,
    duration: 60,
    maxMarks: 100,
    attempts: 180,
    avgScore: 82.3,
    status: "published",
    createdDate: "2024-03-05",
    type: "assessment"
  },
  {
    id: "3",
    title: "Calculus Practice Test",
    subject: "Mathematics",
    batch: "Foundation",
    questions: 20,
    duration: 45,
    maxMarks: 80,
    attempts: 156,
    avgScore: 75.8,
    status: "draft",
    createdDate: "2024-03-10",
    type: "practice"
  }
];

const TestManagement = () => {
  const [tests, setTests] = useState(mockTests);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      published: "bg-green-100 text-green-800",
      draft: "bg-yellow-100 text-yellow-800",
      archived: "bg-gray-100 text-gray-800"
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      practice: "bg-blue-100 text-blue-800",
      assessment: "bg-purple-100 text-purple-800",
      mock: "bg-orange-100 text-orange-800"
    };
    return variants[type as keyof typeof variants] || variants.practice;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Test Management</h2>
          <p className="text-muted-foreground">Create and manage tests and assessments</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Test Title" />
              <div className="grid grid-cols-2 gap-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physics">Physics</SelectItem>
                    <SelectItem value="chemistry">Chemistry</SelectItem>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="biology">Biology</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jee-main">JEE Main 2024</SelectItem>
                    <SelectItem value="jee-advanced">JEE Advanced</SelectItem>
                    <SelectItem value="neet">NEET 2024</SelectItem>
                    <SelectItem value="foundation">Foundation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input placeholder="Questions" type="number" />
                <Input placeholder="Duration (min)" type="number" />
                <Input placeholder="Max Marks" type="number" />
              </div>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Test Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">Practice Test</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="mock">Mock Test</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button className="flex-1">Create Test</Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Test Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold text-foreground">{tests.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Questions</p>
                <p className="text-2xl font-bold text-foreground">{tests.reduce((sum, test) => sum + test.questions, 0)}</p>
              </div>
              <div className="h-8 w-8 text-green-600 font-bold text-lg">?</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold text-foreground">{tests.reduce((sum, test) => sum + test.attempts, 0)}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold text-foreground">{((tests.reduce((sum, test) => sum + test.avgScore, 0)) / tests.length).toFixed(1)}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests Table */}
      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle>All Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Details</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-foreground">{test.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadge(test.type)}`}>
                            {test.type}
                          </div>
                          <span className="text-xs text-muted-foreground">Max: {test.maxMarks} marks</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{test.subject}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">{test.batch}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{test.questions}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{test.duration}m</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{test.attempts}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{test.avgScore}%</div>
                    </TableCell>
                    <TableCell>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(test.status)}`}>
                        {test.status}
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

export default TestManagement;