import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, UserCheck, UserX, Eye, Filter, Loader2, MapPin, Building } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useToast } from "@/hooks/use-toast";
import { usersAPI } from "@/services/api";
import { useZones } from "@/hooks/useZones";
import { useSchools } from "@/hooks/useSchools";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import * as LucideIcons from "lucide-react";

interface Student {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  batch_id?: string | null;
  zone_id?: string | null;
  school_id?: string | null;
  exam_domain?: string | null;
  student_class?: string | null;
  education_board?: string | null;
  preparation_level?: string | null;
  batches?: { id: string; name: string; level: string } | null;
  zones?: { name: string } | null;
  schools?: { name: string } | null;
}

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExamType, setSelectedExamType] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { batches, fetchBatches } = useBatches();
  const { zones } = useZones();
  const { schools, getSchoolsByZone } = useSchools();
  const { examTypes } = useExamTypes();
  const { toast } = useToast();
  const { selectedBoard, selectedClass, setBoard, setClass, resetFromBoard, resetToBoard } = useBoardClassHierarchy();

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

  const fetchStudents = async (search?: string) => {
    try {
      setLoading(true);
      console.log('🔍 [StudentManagement] Fetching students with search term:', search);
      const { students } = await usersAPI.getStudents(search);
      console.log('✅ [StudentManagement] Received students:', students?.length || 0, 'students');
      console.log('📋 [StudentManagement] First student sample:', students?.[0]);
      
      setStudents(students as Student[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch students";
      console.error("❌ [StudentManagement] Students fetch error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const triggerSearch = () => {
    const trimmed = searchTerm.trim();
    console.log('🖱️ [StudentManagement] Manual search triggered. Term:', trimmed || '(empty)');
    fetchStudents(trimmed || undefined);
  };

  const clearSearch = () => {
    console.log('🧹 [StudentManagement] Clearing search');
    setSearchTerm('');
    fetchStudents(undefined);
  };

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, []);

  // Debounced server-side search
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchTerm.trim();
      console.log('⏱️ [StudentManagement] Search debounce triggered. Term:', trimmed || '(empty)');
      fetchStudents(trimmed || undefined);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const getClassOptionsForExam = (examDomain: string): { value: string; label: string }[] => {
    if (examDomain === 'school') {
      return Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: `Class ${i + 1}`
      }));
    } else if (examDomain === 'jee' || examDomain === 'neet') {
      return [
        { value: '11th', label: '11th' },
        { value: '12th', label: '12th' },
        { value: 'dropper', label: 'Dropper' }
      ];
    }
    return [];
  };

  const getExamTypeBatchCount = (code: string) => {
    return students.filter((s) => {
      const studentExamDomain = s.exam_domain || 'school';
      return studentExamDomain === code;
    }).length;
  };

  // Calculate student counts for boards and classes with dynamic bucketing
  const studentCounts = useMemo(() => {
    const schoolStudents = students.filter(s => 
      (s.exam_domain || 'school') === 'school'
    );
    
    // Get available boards from exam_types
    const schoolExam = examTypes.find(et => et.code === "school" || et.display_name === "School Education");
    const availableBoards = Array.isArray(schoolExam?.available_exams) ? schoolExam.available_exams : [];
    
    // Normalize function for case-insensitive comparison
    const normalize = (str: string): string => 
      str.trim().toLowerCase().replace(/[-_\s]/g, '');
    
    // Synonyms map for common board name variations
    const synonyms: Record<string, string> = {
      'wbbse': 'West-Bengal Board',
      'westbengalboard': 'West-Bengal Board',
      'westbengal': 'West-Bengal Board',
      'cisce': 'ICSE',
      'cbse': 'CBSE',
      'icse': 'ICSE',
      'upboard': 'UP Board',
      'biharboard': 'Bihar Board',
      'mpboard': 'Mp Board',
    };
    
    // Create normalized map from available boards
    const normalizedMap: Record<string, string> = {};
    availableBoards.forEach(board => {
      normalizedMap[normalize(board)] = board;
    });
    
    // Bucketing function: maps student board to the correct bucket
    const getBucket = (studentBoard?: string | null): string => {
      const boardName = (studentBoard || "").trim();
      if (!boardName) return "Unknown";
      
      const normalized = normalize(boardName);
      
      // Check synonyms first
      if (synonyms[normalized]) {
        const synonymBoard = synonyms[normalized];
        if (availableBoards.includes(synonymBoard)) {
          return synonymBoard;
        }
      }
      
      // Then check normalized map
      if (normalizedMap[normalized]) {
        return normalizedMap[normalized];
      }
      
      // Fallback to Unknown for unmatched boards
      return "Unknown";
    };
    
    const byBoard: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};
    
    schoolStudents.forEach(student => {
      const bucket = getBucket(student.education_board);
      const cls = student.student_class || 'Unknown';
      
      // Count by board bucket
      byBoard[bucket] = (byBoard[bucket] || 0) + 1;
      
      // Count by board bucket + class
      if (!byClass[bucket]) byClass[bucket] = {};
      byClass[bucket][cls] = (byClass[bucket][cls] || 0) + 1;
    });
    
    return { byBoard, byClass, availableBoards };
  }, [students, examTypes]);

  const filteredStudents = useMemo(() => {
    let list = students;
    console.log('🔧 [StudentManagement] Starting filter. Total students:', list.length);
    
    // Filter by exam type
    if (selectedExamType) {
      list = list.filter((s) => {
        const studentExamDomain = s.exam_domain || 'school';
        return studentExamDomain === selectedExamType;
      });
      console.log('🔧 [StudentManagement] After exam type filter:', list.length);
    }
    
    // Filter by board for school domain with bucketing logic
    if (selectedExamType === 'school' && selectedBoard) {
      const availableBoards = studentCounts.availableBoards || [];
      const normalize = (str: string): string => 
        str.trim().toLowerCase().replace(/[-_\s]/g, '');
      
      // Synonyms map (same as in studentCounts)
      const synonyms: Record<string, string> = {
        'wbbse': 'West-Bengal Board',
        'westbengalboard': 'West-Bengal Board',
        'westbengal': 'West-Bengal Board',
        'cisce': 'ICSE',
        'cbse': 'CBSE',
        'icse': 'ICSE',
        'upboard': 'UP Board',
        'biharboard': 'Bihar Board',
        'mpboard': 'Mp Board',
      };
      
      // Create normalized map from available boards
      const normalizedMap: Record<string, string> = {};
      availableBoards.forEach(board => {
        normalizedMap[normalize(board)] = board;
      });
      
      // Helper to get bucket for student
      const getStudentBucket = (studentBoard?: string | null): string => {
        const boardName = (studentBoard || "").trim();
        if (!boardName) return "Unknown";
        
        const normalized = normalize(boardName);
        
        if (synonyms[normalized]) {
          const synonymBoard = synonyms[normalized];
          if (availableBoards.includes(synonymBoard)) {
            return synonymBoard;
          }
        }
        
        if (normalizedMap[normalized]) {
          return normalizedMap[normalized];
        }
        
        return "Unknown";
      };
      
      list = list.filter((s) => {
        const studentBucket = getStudentBucket(s.education_board);
        return studentBucket === selectedBoard;
      });
      console.log('🔧 [StudentManagement] After board filter:', list.length);
    }
    
    // Filter by class/level
    if (selectedExamType === 'school' && selectedClass) {
      list = list.filter((s) => {
        return s.student_class === selectedClass;
      });
      console.log('🔧 [StudentManagement] After class filter:', list.length);
    }
    
    // Filter by batch
    if (selectedBatch !== "all") {
      if (selectedBatch === "unassigned") {
        list = list.filter((s) => !s.batch_id || s.batch_id === null);
      } else {
        list = list.filter((s) => s.batches?.name === selectedBatch || s.batch_id === selectedBatch);
      }
      console.log('🔧 [StudentManagement] After batch filter:', list.length);
    }
    
    // Filter by zone
    if (selectedZone !== "all") {
      if (selectedZone === "unassigned") {
        list = list.filter((s) => !s.zone_id);
      } else {
        list = list.filter((s) => s.zone_id === selectedZone);
      }
      console.log('🔧 [StudentManagement] After zone filter:', list.length);
    }
    
    // Filter by school
    if (selectedSchool !== "all") {
      if (selectedSchool === "unassigned") {
        list = list.filter((s) => !s.school_id);
      } else {
        list = list.filter((s) => s.school_id === selectedSchool);
      }
      console.log('🔧 [StudentManagement] After school filter:', list.length);
    }
    
    console.log('✅ [StudentManagement] Final filtered count:', list.length);
    return list;
  }, [students, selectedExamType, selectedBatch, selectedZone, selectedSchool, selectedClass]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      suspended: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
    } as const;
    return variants[status as keyof typeof variants] || variants.inactive;
  };

  const handleAssign = async (studentId: string, batchId: string) => {
    try {
      setLoading(true);
      const res = await usersAPI.assignStudentToBatch(studentId, batchId);
      toast({ title: "Assigned", description: "Student assigned to batch" });
      // Refresh list
      fetchStudents(searchTerm.trim() || undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to assign batch";
      console.error("Assign batch error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignZone = async (studentId: string, zoneId: string) => {
    try {
      setLoading(true);
      await usersAPI.assignStudentToZone(studentId, zoneId);
      toast({ title: "Assigned", description: "Student assigned to zone" });
      fetchStudents(searchTerm.trim() || undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to assign zone";
      console.error("Assign zone error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSchool = async (studentId: string, schoolId: string) => {
    try {
      setLoading(true);
      await usersAPI.assignStudentToSchool(studentId, schoolId);
      toast({ title: "Assigned", description: "Student assigned to school" });
      fetchStudents(searchTerm.trim() || undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to assign school";
      console.error("Assign school error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClass = async (studentId: string, classValue: string, examDomain: string) => {
    try {
      setLoading(true);
      await usersAPI.assignStudentClass(studentId, classValue, examDomain);
      toast({ title: "Assigned", description: "Class/Level assigned successfully" });
      fetchStudents(searchTerm.trim() || undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to assign class/level";
      console.error("Assign class error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  // Filter batches for a specific student based on their exam_domain, board, and class
  const getFilteredBatchesForStudent = (student: Student) => {
    return batches.filter(batch => {
      // Must match exam domain
      if (batch.exam_type !== (student.exam_domain || 'school')) return false;
      
      // For school domain, match board and class
      if ((student.exam_domain || 'school') === 'school') {
        if (batch.target_board !== student.education_board) return false;
        if (batch.target_class !== student.student_class) return false;
      }
      
      // For competitive exams (SSC/Banking/etc.), match exam_name if set
      if (student.exam_domain !== 'school' && student.preparation_level) {
        if (batch.exam_name !== student.preparation_level) return false;
      }
      
      return true;
    });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Student Management</h2>
          <p className="text-muted-foreground">
            {selectedExamType 
              ? `Showing ${examTypes.find(t => t.code === selectedExamType)?.display_name || selectedExamType} students` 
              : "Select an exam type to view students"}
          </p>
        </div>
        {selectedExamType && (
          <Button onClick={() => setSelectedExamType(null)} variant="outline">
            Change Exam Type
          </Button>
        )}
        <div className="flex gap-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Full Name" />
              <Input placeholder="Email" type="email" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button className="flex-1">Add Student</Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Exam Type Selection Cards */}
      {!selectedExamType ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select Exam Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {examTypes.map((examType, index) => {
              const IconComponent = examType.icon_name ? iconMap[examType.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
              return (
                <Card 
                  key={examType.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in hover:scale-105 border-2 hover:border-primary"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => setSelectedExamType(examType.code)}
                >
                  <CardContent className="p-6">
                    <div className={`w-full h-24 ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-600'} rounded-lg mb-4 flex items-center justify-center`}>
                      <IconComponent className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{examType.display_name}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{getExamTypeBatchCount(examType.code)} students</span>
                      <Badge variant="secondary">{getExamTypeBatchCount(examType.code)}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Board/Class Selector for School Domain */}
          {selectedExamType === 'school' && (
            <BoardClassSelector
              examType={selectedExamType}
              selectedBoard={selectedBoard}
              selectedClass={selectedClass}
              onBoardSelect={setBoard}
              onClassSelect={setClass}
              onReset={resetFromBoard}
              onResetToBoard={resetToBoard}
              studentCounts={studentCounts}
            />
          )}

          {/* Selected Exam Type Badge */}
          {(selectedExamType !== 'school' || (selectedBoard && selectedClass)) && (
            <Card className="animate-fade-in bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const examType = examTypes.find(t => t.code === selectedExamType);
                    const IconComponent = examType?.icon_name ? iconMap[examType.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
                    return (
                      <div className={`p-3 rounded-lg ${examType?.color_class || 'bg-gray-500'}`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-sm text-muted-foreground">Selected Exam Type</p>
                    <p className="text-xl font-bold">{examTypes.find(t => t.code === selectedExamType)?.display_name}</p>
                  </div>
                </div>
                <Badge className="text-lg px-4 py-2">{filteredStudents.length} students</Badge>
              </CardContent>
            </Card>
          )}

          {/* Filters - Only show if not in selection mode OR selected */}
          {(selectedExamType !== 'school' || (selectedBoard && selectedClass)) && (
          <Card className="card-gradient shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email… (Press Enter or click Search)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') triggerSearch();
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={triggerSearch} disabled={loading} className="md:w-28">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={clearSearch} disabled={loading || !searchTerm} className="md:w-24">
              Clear
            </Button>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="w-48">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="unassigned">No Zone</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-48">
                <Building className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by school" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                <SelectItem value="unassigned">No School</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
          )}

      {/* Students Table */}
      {(selectedExamType !== 'school' || (selectedBoard && selectedClass)) && (
      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class/Level</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{student.full_name || 'Unnamed'}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={
                            (student.exam_domain || 'school') === 'school' 
                              ? student.student_class || '' 
                              : student.preparation_level || ''
                          }
                          onValueChange={(value) => handleAssignClass(student.id, value, student.exam_domain || 'school')}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Set class" />
                          </SelectTrigger>
                          <SelectContent>
                            {getClassOptionsForExam(student.exam_domain || 'school').map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={student.zone_id || ''} 
                          onValueChange={(val) => handleAssignZone(student.id, val)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder={student.zones?.name || 'No zone'} />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.map((z) => (
                              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={student.school_id || ''} 
                          onValueChange={(val) => handleAssignSchool(student.id, val)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder={student.schools?.name || 'No school'} />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={student.batch_id || ''} 
                          onValueChange={(val) => handleAssign(student.id, val)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder={student.batches?.name || 'No batch'} />
                          </SelectTrigger>
                          <SelectContent>
                            {getFilteredBatchesForStudent(student).length > 0 ? (
                              getFilteredBatchesForStudent(student).map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-batches" disabled>
                                No matching batches available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
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
      )}
        </>
      )}
    </div>
  );
};

export default StudentManagement;
