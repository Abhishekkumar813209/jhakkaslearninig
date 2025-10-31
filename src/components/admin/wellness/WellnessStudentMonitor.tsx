import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Heart, AlertTriangle } from 'lucide-react';

interface StudentProgress {
  student_id: string;
  student_name: string;
  current_streak: number;
  longest_streak: number;
  last_checkin: string;
  roadmap_title: string;
  wellness_xp: number;
}

export const WellnessStudentMonitor = () => {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentProgress();
  }, []);

  const fetchStudentProgress = async () => {
    try {
      // Fetch students with wellness check-ins
      const { data, error } = await supabase
        .from('daily_attendance')
        .select(`
          student_id,
          streak_days,
          marked_at,
          profiles!inner(name),
          batch_roadmaps!inner(title, is_wellness_mode)
        `)
        .eq('is_wellness_checkin', true)
        .eq('batch_roadmaps.is_wellness_mode', true)
        .order('marked_at', { ascending: false });

      if (error) throw error;

      // Process and group by student
      const studentMap = new Map<string, StudentProgress>();
      
      data?.forEach((record: any) => {
        const studentId = record.student_id;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student_id: studentId,
            student_name: record.profiles?.name || 'Unknown',
            current_streak: record.streak_days || 0,
            longest_streak: record.streak_days || 0,
            last_checkin: record.marked_at,
            roadmap_title: record.batch_roadmaps?.title || 'N/A',
            wellness_xp: 0
          });
        } else {
          const existing = studentMap.get(studentId)!;
          existing.longest_streak = Math.max(existing.longest_streak, record.streak_days || 0);
        }
      });

      setStudents(Array.from(studentMap.values()));
    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStreakStatus = (streak: number) => {
    if (streak >= 30) return { variant: 'default' as const, label: 'On Fire 🔥', color: 'text-orange-600' };
    if (streak >= 14) return { variant: 'secondary' as const, label: 'Strong 💪', color: 'text-blue-600' };
    if (streak >= 7) return { variant: 'secondary' as const, label: 'Good 👍', color: 'text-green-600' };
    return { variant: 'secondary' as const, label: 'Starting', color: 'text-gray-600' };
  };

  const daysSinceCheckin = (lastCheckin: string) => {
    const diff = Date.now() - new Date(lastCheckin).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading student data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Progress Monitor</CardTitle>
        <CardDescription>Track wellness journey progress and identify students needing support</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Roadmap</TableHead>
              <TableHead>Current Streak</TableHead>
              <TableHead>Longest Streak</TableHead>
              <TableHead>Last Check-in</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No wellness students found
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => {
                const streakStatus = getStreakStatus(student.current_streak);
                const daysSince = daysSinceCheckin(student.last_checkin);
                
                return (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium">{student.student_name}</TableCell>
                    <TableCell className="text-sm">{student.roadmap_title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-600" />
                        <span className={streakStatus.color}>{student.current_streak} days</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-600" />
                        {student.longest_streak} days
                      </div>
                    </TableCell>
                    <TableCell>
                      {daysSince === 0 ? (
                        <span className="text-green-600">Today</span>
                      ) : daysSince === 1 ? (
                        <span className="text-blue-600">Yesterday</span>
                      ) : daysSince > 2 ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {daysSince} days ago
                        </span>
                      ) : (
                        <span>{daysSince} days ago</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={streakStatus.variant}>
                        {streakStatus.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
