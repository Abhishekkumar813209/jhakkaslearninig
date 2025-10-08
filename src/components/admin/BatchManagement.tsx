import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, TrendingUp, Award, Loader2, Filter } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useToast } from "@/hooks/use-toast";
import { CreateBatchWizard } from "./CreateBatchWizard";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import * as LucideIcons from "lucide-react";

const BatchManagement = () => {
  const { batches, loading, deleteBatch, fetchBatches, totalStudents, avgPerformance } = useBatches();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [examFilter, setExamFilter] = useState<string>("all");
  const { toast } = useToast();
  const { examTypes } = useExamTypes();
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

  // Helper functions for robust matching
  const normalize = (s: any) => s?.toString().trim().toLowerCase();
  
  const boardMatches = (batch: any, board: string) => {
    return normalize(batch.target_board || batch.exam_name) === normalize(board);
  };
  
  const classMatches = (batch: any, cls: string) => {
    return normalize(batch.target_class) === normalize(cls);
  };

  const getDomainBatchCount = (domain: string) => {
    return batches.filter((b: any) => b.exam_type === domain).length;
  };

  const getBoardBatchCount = (domain: string, board: string) => {
    return batches.filter((b: any) => 
      b.exam_type === domain && boardMatches(b, board)
    ).length;
  };

  const getClassBatchCount = (domain: string, board: string, cls: string) => {
    return batches.filter((b: any) => 
      b.exam_type === domain && 
      boardMatches(b, board) && 
      classMatches(b, cls)
    ).length;
  };

  const getUniqueExamNames = () => {
    if (!selectedDomain) return [];
    const domainBatches = batches.filter((b: any) => b.exam_type === selectedDomain);
    const examNames = [...new Set(domainBatches.map((b: any) => b.exam_name).filter(Boolean))];
    return examNames;
  };

  const handleDelete = async (batchId: string) => {
    if (window.confirm('Are you sure you want to delete this batch? All students will be unassigned.')) {
      try {
        await deleteBatch(batchId);
        toast({
          title: "Success",
          description: "Batch deleted successfully",
        });
      } catch (error) {
        console.error('Error deleting batch:', error);
        toast({
          title: "Error",
          description: "Failed to delete batch",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusBadge = (batch: any) => {
    if (!batch.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    const now = new Date();
    const startDate = new Date(batch.start_date);
    if (startDate > now) {
      return <Badge variant="outline">Upcoming</Badge>;
    }
    return <Badge>Active</Badge>;
  };

  const getDomainBadge = (examTypeCode: string) => {
    const examType = examTypes.find(t => t.code === examTypeCode);
    const colorClass = examType?.color_class || "bg-gray-500";
    return (
      <Badge className={`${colorClass} text-white`}>
        {examType?.display_name || examTypeCode || "General"}
      </Badge>
    );
  };

  const filteredBatches = !selectedDomain 
    ? [] 
    : batches.filter((b: any) => {
        if (b.exam_type !== selectedDomain) return false;
        
        // Filter by board for school domain
        if (selectedDomain === 'school' && selectedBoard && !boardMatches(b, selectedBoard)) {
          return false;
        }
        
        // Filter by class for school domain
        if (selectedDomain === 'school' && selectedClass && !classMatches(b, selectedClass)) {
          return false;
        }
        
        if (examFilter === "all") return true;
        return b.exam_name === examFilter;
      });

  // Calculate statsSource for dynamic footer cards
  const statsSource = !selectedDomain 
    ? []
    : selectedDomain === 'school' && selectedBoard && selectedClass
      ? batches.filter((b: any) => 
          b.exam_type === 'school' && 
          boardMatches(b, selectedBoard) && 
          classMatches(b, selectedClass)
        )
      : selectedDomain === 'school' && selectedBoard
        ? batches.filter((b: any) => 
            b.exam_type === 'school' && 
            boardMatches(b, selectedBoard)
          )
        : batches.filter((b: any) => b.exam_type === selectedDomain);

  // Dynamic label for footer cards
  const footerLabel = !selectedDomain 
    ? "Batches"
    : selectedDomain === 'school' && selectedClass
      ? "Class Batches"
      : selectedDomain === 'school' && selectedBoard
        ? "Board Batches"
        : "Domain Batches";

  // Calculate student counts for board/class hierarchy
  const getStudentCounts = () => {
    const domainBatches = batches.filter((b: any) => b.exam_type === selectedDomain);
    const byBoard: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};

    domainBatches.forEach((batch: any) => {
      const board = batch.target_board || batch.exam_name || 'Unknown';
      const cls = batch.target_class;
      
      byBoard[board] = (byBoard[board] || 0) + (batch.student_count || 0);
      
      if (!byClass[board]) byClass[board] = {};
      if (cls) {
        byClass[board][cls] = (byClass[board][cls] || 0) + (batch.student_count || 0);
      }
    });

    return { byBoard, byClass };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Batch Management</h2>
          <p className="text-muted-foreground mt-1">
            {selectedDomain 
              ? `Managing ${selectedDomain} batches` 
              : "Select an exam domain to view batches"}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDomain && (
            <Button onClick={() => { setSelectedDomain(null); setExamFilter("all"); }} variant="outline">
              Change Domain
            </Button>
          )}
          <Button 
            onClick={() => {
              if (!selectedDomain) {
                toast({
                  title: "Domain Required",
                  description: "Please select an exam domain first",
                  variant: "destructive",
                });
                return;
              }
              // School domain requires board and class selection
              if (selectedDomain === 'school' && (!selectedBoard || !selectedClass)) {
                toast({
                  title: "Board & Class Required",
                  description: "School batches ke liye pehle Board aur Class select karein",
                  variant: "destructive",
                });
                return;
              }
              setShowWizard(true);
            }} 
            className="animate-scale-in"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Batch
          </Button>
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
                  onClick={() => {
                    setSelectedDomain(examType.code);
                    resetFromBoard();
                  }}
                >
                  <CardContent className="p-6">
                    <div className={`w-full h-24 ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-600'} rounded-lg mb-4 flex items-center justify-center`}>
                      <IconComponent className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{examType.display_name}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{getDomainBatchCount(examType.code)} batches</span>
                      <Badge variant="secondary">{getDomainBatchCount(examType.code)}</Badge>
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
          {selectedDomain === 'school' && (
            <BoardClassSelector
              examType={selectedDomain}
              selectedBoard={selectedBoard}
              selectedClass={selectedClass}
              onBoardSelect={setBoard}
              onClassSelect={setClass}
              onReset={resetFromBoard}
              onResetToBoard={resetToBoard}
              studentCounts={getStudentCounts()}
              getBoardBatchCount={(board) => getBoardBatchCount('school', board)}
              getClassBatchCount={(cls) => getClassBatchCount('school', selectedBoard || '', cls)}
            />
          )}

          {/* Selected Domain Badge - Only show if board/class not in selection */}
          {(selectedDomain !== 'school' || (selectedBoard && selectedClass)) && (
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
                <Badge className="text-lg px-4 py-2">{filteredBatches.length} batches</Badge>
              </CardContent>
            </Card>
          )}

          {/* Batch Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{footerLabel}</p>
                    <p className="text-2xl font-bold">{statsSource.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
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
                      {statsSource.reduce((sum: number, b: any) => sum + (b.student_count || 0), 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Capacity Used</p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        (statsSource.reduce((sum: number, b: any) => sum + (b.student_count || 0), 0) /
                        statsSource.reduce((sum: number, b: any) => sum + (b.max_capacity || 1), 1)) * 100
                      )}%
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Batches Table - Only show if not in board/class selection mode OR selected */}
          {(selectedDomain !== 'school' || (selectedBoard && selectedClass)) && (
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{selectedDomain} Batches</CardTitle>
                  <CardDescription>Manage batches in this domain</CardDescription>
                </div>
                {getUniqueExamNames().length > 0 && (
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={examFilter} onValueChange={setExamFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by exam" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Exams</SelectItem>
                        {getUniqueExamNames().map((exam: any) => (
                          <SelectItem key={exam} value={exam}>{exam}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Exam/Board</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading batches...
                    </TableCell>
                  </TableRow>
                ) : filteredBatches?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">
                          No batches found in {selectedDomain}
                          {examFilter !== "all" && ` for ${examFilter}`}
                        </p>
                        <Button onClick={() => setShowWizard(true)} variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Batch
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches?.map((batch: any) => (
                    <TableRow key={batch.id} className="hover-scale">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="font-medium">{batch.name}</div>
                          {batch.description && (
                            <div className="text-sm text-muted-foreground">{batch.description}</div>
                          )}
                          {batch.is_current_intake && (
                            <Badge className="bg-green-500 text-white w-fit text-xs">
                              Current Intake
                            </Badge>
                          )}
                          {batch.intake_start_date && (
                            <span className="text-xs text-muted-foreground">
                              Intake: {new Date(batch.intake_start_date).toLocaleDateString()} - {new Date(batch.intake_end_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getDomainBadge(batch.exam_type)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{batch.exam_name || "-"}</div>
                    {batch.target_class && (
                      <div className="text-xs text-muted-foreground">
                        {batch.level === "Dropper" ? "Dropper" : `Class ${batch.target_class}`}
                      </div>
                    )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{batch.student_count ?? batch.current_strength ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{batch.max_capacity}</span>
                          {(() => {
                            const currentStrength = batch.student_count ?? batch.current_strength ?? 0;
                            const capacityPercent = (currentStrength / batch.max_capacity) * 100;
                            if (capacityPercent >= 90) {
                              return (
                                <Badge variant="destructive" className="text-xs">
                                  Near Full
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(batch.start_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(batch)}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive hover:bg-destructive/10" 
                          onClick={() => handleDelete(batch.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <CreateBatchWizard
        open={showWizard} 
        onOpenChange={setShowWizard}
        onSuccess={(createdBatch) => {
          fetchBatches();
          // Auto-select the board and class of the created batch for school domain
          if (createdBatch && selectedDomain === 'school') {
            if (createdBatch.target_board) setBoard(createdBatch.target_board);
            if (createdBatch.target_class) setClass(createdBatch.target_class);
          }
          setShowWizard(false);
        }}
        initialDomain={selectedDomain}
        preselectedBoard={selectedBoard}
        preselectedClass={selectedClass}
        existingBatches={batches}
      />
    </div>
  );
};

export default BatchManagement;
