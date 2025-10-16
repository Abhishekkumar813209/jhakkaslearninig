import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useExamTypes } from '@/hooks/useExamTypes';
import { useBoardClassHierarchy } from '@/hooks/useBoardClassHierarchy';
import { BoardClassSelector } from './BoardClassSelector';
import { Save, RefreshCw, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface TestXPConfig {
  id: string;
  title: string;
  subject: string;
  target_class?: string;
  target_board?: string;
  exam_domain?: string;
  difficulty: string;
  base_xp_reward: number;
  xp_per_mark: number;
  bonus_xp_on_perfect: number;
  total_marks: number;
}

const XPManagement: React.FC = () => {
  const { examTypes } = useExamTypes();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const { selectedBoard, selectedClass, setBoard, setClass, resetFromBoard, resetToBoard } = useBoardClassHierarchy();
  const [tests, setTests] = useState<TestXPConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => {
    if (selectedDomain && (selectedDomain !== 'school' || (selectedBoard && selectedClass))) {
      fetchTests();
    }
  }, [selectedDomain, selectedBoard, selectedClass]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tests')
        .select('id, title, subject, target_class, target_board, difficulty, base_xp_reward, xp_per_mark, bonus_xp_on_perfect, total_marks, exam_domain')
        .eq('exam_domain', selectedDomain!)
        .order('created_at', { ascending: false });

      if (selectedDomain === 'school' && selectedBoard && selectedClass) {
        query = query.eq('target_board', selectedBoard as any).eq('target_class', selectedClass as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTests((data || []).map(test => ({
        ...test,
        base_xp_reward: test.base_xp_reward ?? 50,
        xp_per_mark: test.xp_per_mark ?? 2,
        bonus_xp_on_perfect: test.bonus_xp_on_perfect ?? 50,
      })));
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleXPChange = (testId: string, field: 'base_xp_reward' | 'xp_per_mark' | 'bonus_xp_on_perfect', value: string) => {
    const numValue = parseInt(value) || 0;
    setTests(prev => prev.map(test => 
      test.id === testId ? { ...test, [field]: numValue } : test
    ));
  };

  const saveTestXP = async (testId: string) => {
    try {
      setSaving(true);
      const test = tests.find(t => t.id === testId);
      if (!test) return;

      const { error } = await supabase
        .from('tests')
        .update({
          base_xp_reward: test.base_xp_reward,
          xp_per_mark: test.xp_per_mark,
          bonus_xp_on_perfect: test.bonus_xp_on_perfect,
        })
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "XP configuration saved successfully!"
      });
    } catch (error) {
      console.error('Error saving XP config:', error);
      toast({
        title: "Error",
        description: "Failed to save XP configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAllXP = async () => {
    try {
      setSaving(true);
      const updates = tests.map(test => 
        supabase
          .from('tests')
          .update({
            base_xp_reward: test.base_xp_reward,
            xp_per_mark: test.xp_per_mark,
            bonus_xp_on_perfect: test.bonus_xp_on_perfect,
          })
          .eq('id', test.id)
      );

      await Promise.all(updates);

      toast({
        title: "Success",
        description: `Updated XP configuration for ${tests.length} tests!`
      });
    } catch (error) {
      console.error('Error saving all XP configs:', error);
      toast({
        title: "Error",
        description: "Failed to save XP configurations",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateMaxXP = (test: TestXPConfig) => {
    return test.base_xp_reward + (test.total_marks * test.xp_per_mark) + test.bonus_xp_on_perfect;
  };

  const getDomainTestCount = (examType: string) => {
    return tests.filter(t => t.exam_domain === examType).length;
  };

  const getTestCounts = () => {
    const domainTests = tests.filter(t => t.exam_domain === selectedDomain);
    const byBoard: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};

    domainTests.forEach(test => {
      const board = test.target_board || 'General';
      const cls = test.target_class;
      
      byBoard[board] = (byBoard[board] || 0) + 1;
      
      if (!byClass[board]) byClass[board] = {};
      if (cls) {
        byClass[board][cls] = (byClass[board][cls] || 0) + 1;
      }
    });

    return { byBoard, byClass };
  };

  const handleChangeDomain = () => {
    setSelectedDomain(null);
    setTests([]);
    resetFromBoard();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            XP Configuration
          </h2>
          <p className="text-muted-foreground mt-1">
            {selectedDomain 
              ? `Configure XP rewards for ${examTypes.find(t => t.code === selectedDomain)?.display_name}` 
              : "Select an exam domain to configure XP rewards"}
          </p>
        </div>
        {selectedDomain && (
          <div className="flex items-center gap-3">
            <Button onClick={handleChangeDomain} variant="outline">
              Change Domain
            </Button>
            {selectedDomain === 'school' && selectedBoard && (
              <Button variant="outline" onClick={resetFromBoard}>
                Change Board
              </Button>
            )}
            {selectedDomain === 'school' && selectedBoard && selectedClass && (
              <Button variant="outline" onClick={resetToBoard}>
                Change Class
              </Button>
            )}
          </div>
        )}
      </div>

      {!selectedDomain ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select Exam Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {examTypes.map((examType, index) => {
              const IconComponent = examType.icon_name 
                ? iconMap[examType.icon_name] || LucideIcons.BookOpen 
                : LucideIcons.BookOpen;
              
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
                      <span>Configure XP</span>
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : selectedDomain === 'school' && (!selectedBoard || !selectedClass) ? (
        <BoardClassSelector
          examType={selectedDomain}
          selectedBoard={selectedBoard}
          selectedClass={selectedClass}
          onBoardSelect={setBoard}
          onClassSelect={setClass}
          onReset={resetFromBoard}
          onResetToBoard={resetToBoard}
          studentCounts={getTestCounts()}
          countLabel="tests"
        />
      ) : (
        <>
          <Card className="animate-fade-in bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const examType = examTypes.find(e => e.code === selectedDomain);
                  const IconComponent = examType?.icon_name 
                    ? iconMap[examType.icon_name] || LucideIcons.BookOpen 
                    : LucideIcons.BookOpen;
                  return (
                    <>
                      <div className={`p-3 rounded-lg ${examType?.color_class || 'bg-primary/20'}`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{examType?.display_name}</h3>
                        {selectedDomain === 'school' && (
                          <p className="text-sm text-muted-foreground">
                            {selectedBoard} • Class {selectedClass}
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center gap-3">
                <Badge className="text-lg px-4 py-2">{tests.length} tests</Badge>
                {tests.length > 0 && (
                  <Button onClick={saveAllXP} disabled={saving} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save All
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No tests found for this configuration</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>XP Rewards Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead className="text-center">Base XP</TableHead>
                      <TableHead className="text-center">XP per Mark</TableHead>
                      <TableHead className="text-center">Perfect Bonus</TableHead>
                      <TableHead className="text-center">Max XP</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {test.title}
                        </TableCell>
                        <TableCell>{test.subject}</TableCell>
                        <TableCell>
                          <Badge variant={
                            test.difficulty === 'easy' ? 'secondary' : 
                            test.difficulty === 'hard' ? 'destructive' : 
                            'default'
                          }>
                            {test.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={test.base_xp_reward}
                            onChange={(e) => handleXPChange(test.id, 'base_xp_reward', e.target.value)}
                            className="w-24 text-center"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={test.xp_per_mark}
                            onChange={(e) => handleXPChange(test.id, 'xp_per_mark', e.target.value)}
                            className="w-24 text-center"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={test.bonus_xp_on_perfect}
                            onChange={(e) => handleXPChange(test.id, 'bonus_xp_on_perfect', e.target.value)}
                            className="w-24 text-center"
                            min="0"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold">
                            <Zap className="h-3 w-3 mr-1" />
                            {calculateMaxXP(test)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => saveTestXP(test.id)}
                            disabled={saving}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default XPManagement;
