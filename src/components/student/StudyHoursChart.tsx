import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Clock } from "lucide-react";

export const StudyHoursChart = () => {
  const { data: studyLogs, isLoading } = useQuery({
    queryKey: ["study-hours-chart"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("daily_study_logs")
        .select("date, study_minutes, tests_taken, lessons_watched")
        .eq("student_id", user.id)
        .gte("date", sevenDaysAgo.toISOString().split('T')[0])
        .order("date", { ascending: true });

      if (error) throw error;

      // Fill in missing dates with 0 values
      const filledData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const existing = data?.find(d => d.date === dateStr);
        filledData.push({
          date: dateStr,
          displayDate: date.toLocaleDateString('en-US', { weekday: 'short' }),
          hours: existing ? Math.round(existing.study_minutes / 60 * 10) / 10 : 0,
          tests: existing?.tests_taken || 0,
          lessons: existing?.lessons_watched || 0
        });
      }

      return filledData;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Study Hours (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalHours = studyLogs?.reduce((sum, log) => sum + log.hours, 0) || 0;
  const avgHours = studyLogs ? (totalHours / studyLogs.length).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Study Hours
        </CardTitle>
        <CardDescription>
          Total: {totalHours.toFixed(1)}h | Avg: {avgHours}h/day
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={studyLogs}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="displayDate" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'hours') return [`${value}h`, 'Study Time'];
                if (name === 'tests') return [value, 'Tests Taken'];
                if (name === 'lessons') return [value, 'Lessons Watched'];
                return [value, name];
              }}
            />
            <Bar 
              dataKey="hours" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
