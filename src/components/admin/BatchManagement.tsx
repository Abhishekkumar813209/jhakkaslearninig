import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, Users, TrendingUp, Award, Loader2, Filter, Link2, X, CalendarIcon } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useToast } from "@/hooks/use-toast";
import { CreateBatchWizard } from "./CreateBatchWizard";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";

import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays } from "date-fns";
import * as LucideIcons from "lucide-react";

const BatchManagement = () => {
  const { batches, loading, deleteBatch, fetchBatches, totalStudents, avgPerformance, updateBatch } = useBatches();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [examFilter, setExamFilter] = useState<string>("all");
  const [availableRoadmaps, setAvailableRoadmaps] = useState<any[]>([]);
  const [linkingBatch, setLinkingBatch] = useState<string | null>(null);
  const [editingBatchDate, setEditingBatchDate] = useState<string | null>(null);
  
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

  const fetchAvailableRoadmaps = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    let query = supabase
      .from('batch_roadmaps')
      .select('id, title, description, exam_type, exam_name, board, target_board, target_class')
      .order('created_at', { ascending: false });

    // Filter by exam_type (domain)
    if (batch.exam_type) {
      query = query.eq('exam_type', batch.exam_type);
    }

    // For school batches, match board (using new board column) and class
    if (batch.exam_type === 'school') {
      if (batch.target_board) {
        query = query.eq('board', batch.target_board);
      }
      if (batch.target_class) {
        query = query.eq('target_class', batch.target_class);
      }
    } else {
      // For non-school domains, filter by exam_name
      if (batch.exam_name) {
        query = query.eq('exam_name', batch.exam_name);
      }
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Error", description: "Failed to fetch roadmaps", variant: "destructive" });
      return;
    }

    setAvailableRoadmaps(data || []);
  };

  const handleLinkRoadmap = async (batchId: string, roadmapId: string | null) => {
    try {
      await updateBatch(batchId, {
        linked_roadmap_id: roadmapId,
        auto_assign_roadmap: roadmapId ? true : false
      });

      toast({
        title: "Success",
        description: roadmapId ? "Roadmap linked successfully" : "Roadmap unlinked successfully"
      });

      fetchBatches();
      setLinkingBatch(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link roadmap",
        variant: "destructive"
      });
    }
  };

  const handleStartDateChange = async (batchId: string, newDate: Date) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    const oldDate = parseISO(batch.start_date);
    const daysDifference = differenceInDays(newDate, oldDate);

    try {
      // Step 1: Update batch start_date
      await updateBatch(batchId, { 
        start_date: format(newDate, 'yyyy-MM-dd') 
      });

      // Step 2: If roadmap linked, shift dates with proper auth
      if (batch.linked_roadmap_id && daysDifference !== 0) {
        console.log('🔵 [BatchManagement] Linked roadmap detected, preparing to shift dates', {
          roadmap_id: batch.linked_roadmap_id,
          days_shift: daysDifference,
          batch_name: batch.name
        });
        
        // Get session for authorization
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('🔑 [BatchManagement] Session check:', { 
          hasSession: !!session, 
          hasToken: !!session?.access_token,
          error: sessionError 
        });
        
        if (sessionError || !session) {
          console.error('❌ [BatchManagement] No valid session for roadmap shift');
          toast({
            title: "Warning",
            description: "Batch updated but couldn't authenticate for roadmap shift",
            variant: "destructive"
          });
          setEditingBatchDate(null);
          fetchBatches();
          return;
        }

        console.log('📤 [BatchManagement] Calling shift-roadmap-dates edge function with:', {
          roadmap_id: batch.linked_roadmap_id,
          days_shift: daysDifference,
          hasAuthToken: !!session.access_token
        });

        // Call edge function with authorization
        const { data, error } = await supabase.functions.invoke('shift-roadmap-dates', {
          body: {
            roadmap_id: batch.linked_roadmap_id,
            days_shift: daysDifference
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        console.log('📥 [BatchManagement] Edge function response:', { data, error });

        if (error) {
          console.error('❌ [BatchManagement] Roadmap shift error:', error);
          toast({
            title: "Warning",
            description: "Batch date updated but roadmap shift failed",
            variant: "destructive"
          });
        } else {
          console.log('✅ [BatchManagement] Roadmap shifted successfully:', data);
          toast({
            title: "Success",
            description: `Batch and roadmap shifted by ${Math.abs(daysDifference)} days`,
          });
        }
      } else {
        console.log('ℹ️ [BatchManagement] No roadmap shift needed:', {
          hasLinkedRoadmap: !!batch.linked_roadmap_id,
          daysDifference
        });
        toast({
          title: "Success",
          description: "Batch start date updated",
        });
      }

      setEditingBatchDate(null);
      fetchBatches();
    } catch (error: any) {
      console.error('Error updating batch date:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
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
              countLabel="batches"
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
                  <TableHead>Linked Roadmap</TableHead>
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
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading batches...
                    </TableCell>
                  </TableRow>
                ) : filteredBatches?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <p className="text-muted-foreground">
                        No batches found in {selectedDomain}
                        {examFilter !== "all" && ` for ${examFilter}`}
                      </p>
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
                        {linkingBatch === batch.id ? (
                          <Select 
                            value={batch.linked_roadmap_id || "none"} 
                            onValueChange={(value) => handleLinkRoadmap(batch.id, value === "none" ? null : value)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select roadmap" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <div className="flex items-center gap-2">
                                  <X className="h-4 w-4" />
                                  <span>No Roadmap</span>
                                </div>
                              </SelectItem>
                              {availableRoadmaps.map((roadmap) => (
                                <SelectItem key={roadmap.id} value={roadmap.id}>
                                  <div className="flex flex-col gap-0.5">
                                    <span>{roadmap.title}</span>
                                    {roadmap.exam_type === 'school' ? (
                                      roadmap.board && roadmap.target_class && (
                                        <span className="text-xs text-muted-foreground">
                                          {roadmap.board} - Class {roadmap.target_class}
                                        </span>
                                      )
                                    ) : (
                                      roadmap.exam_name && (
                                        <span className="text-xs text-muted-foreground">
                                          {roadmap.exam_name}
                                        </span>
                                      )
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : batch.linked_roadmap_id ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-500/10 text-green-700">
                              <Link2 className="h-3 w-3 mr-1" />
                              Linked
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setLinkingBatch(batch.id);
                                fetchAvailableRoadmaps(batch.id);
                              }}
                            >
                              Change
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setLinkingBatch(batch.id);
                              fetchAvailableRoadmaps(batch.id);
                            }}
                          >
                            <Link2 className="h-4 w-4 mr-1" />
                            Link
                          </Button>
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
                        {editingBatchDate === batch.id ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                {format(parseISO(batch.start_date), 'MMM dd, yyyy')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={parseISO(batch.start_date)}
                                onSelect={(date) => {
                                  if (date) handleStartDateChange(batch.id, date);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div 
                            onClick={() => setEditingBatchDate(batch.id)}
                            className="cursor-pointer hover:bg-accent p-2 rounded transition-colors text-sm"
                            title="Click to edit date"
                          >
                            {format(parseISO(batch.start_date), 'MMM dd, yyyy')}
                          </div>
                        )}
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
