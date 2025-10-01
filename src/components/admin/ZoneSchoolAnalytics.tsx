import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, GraduationCap, Building2, TrendingUp, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ZoneStats {
  zone_id: string;
  zone_name: string;
  zone_code: string;
  student_count: number;
  average_score: number;
  tests_attempted: number;
}

interface SchoolStats {
  school_id: string;
  school_name: string;
  zone_name: string;
  student_count: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const ZoneSchoolAnalytics = () => {
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [schoolStats, setSchoolStats] = useState<SchoolStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalZones, setTotalZones] = useState(0);
  const [totalSchools, setTotalSchools] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch zone-wise statistics with performance
      const { data: zones, error: zoneError } = await supabase
        .from('zones')
        .select(`
          id,
          name,
          code,
          is_active
        `)
        .eq('is_active', true);

      if (zoneError) throw zoneError;

      // For each zone, get student count and average performance
      const zoneStatsPromises = zones?.map(async (zone) => {
        // Get student count
        const { count: studentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('zone_id', zone.id);

        // Get student IDs in this zone
        const { data: zoneProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('zone_id', zone.id);

        const studentIds = zoneProfiles?.map(p => p.id) || [];

        // Get average performance for students in this zone
        const { data: analytics } = await supabase
          .from('student_analytics')
          .select('average_score, tests_attempted')
          .in('student_id', studentIds);

        const avgScore = analytics?.reduce((sum, a) => sum + (a.average_score || 0), 0) / (analytics?.length || 1);
        const totalTests = analytics?.reduce((sum, a) => sum + (a.tests_attempted || 0), 0);

        return {
          zone_id: zone.id,
          zone_name: zone.name,
          zone_code: zone.code,
          student_count: studentCount || 0,
          average_score: Math.round(avgScore || 0),
          tests_attempted: totalTests || 0,
        };
      }) || [];

      const zoneStatsData = await Promise.all(zoneStatsPromises);
      setZoneStats(zoneStatsData);
      setTotalZones(zones?.length || 0);

      // Fetch school-wise statistics
      const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select(`
          id,
          name,
          is_active,
          zones!fk_schools_zone(name)
        `)
        .eq('is_active', true);

      if (schoolError) throw schoolError;

      const schoolStatsPromises = schools?.map(async (school) => {
        const { count: studentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id);

        return {
          school_id: school.id,
          school_name: school.name,
          zone_name: school.zones?.name || 'N/A',
          student_count: studentCount || 0,
        };
      }) || [];

      const schoolStatsData = await Promise.all(schoolStatsPromises);
      setSchoolStats(schoolStatsData);
      setTotalSchools(schools?.length || 0);

      // Calculate total students
      const total = zoneStatsData.reduce((sum, zone) => sum + zone.student_count, 0);
      setTotalStudents(total);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all zones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalZones}</div>
            <p className="text-xs text-muted-foreground">Zones with students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSchools}</div>
            <p className="text-xs text-muted-foreground">Schools registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(zoneStats.reduce((sum, z) => sum + z.average_score, 0) / (zoneStats.length || 1))}%
            </div>
            <p className="text-xs text-muted-foreground">Overall average score</p>
          </CardContent>
        </Card>
      </div>

      {/* Zone Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Zone-wise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={zoneStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="zone_code" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="student_count" fill="hsl(var(--chart-1))" name="Students" />
              <Bar yAxisId="right" dataKey="average_score" fill="hsl(var(--chart-2))" name="Avg Score %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Zone Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Student Distribution by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={zoneStats}
                  dataKey="student_count"
                  nameKey="zone_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.zone_code}: ${entry.student_count}`}
                >
                  {zoneStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Schools by Students */}
        <Card>
          <CardHeader>
            <CardTitle>Top Schools by Student Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {schoolStats
                .sort((a, b) => b.student_count - a.student_count)
                .slice(0, 5)
                .map((school, index) => (
                  <div key={school.school_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{school.school_name}</p>
                        <p className="text-sm text-muted-foreground">{school.zone_name}</p>
                      </div>
                    </div>
                    <Badge>
                      <Users className="w-3 h-3 mr-1" />
                      {school.student_count}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Zone</th>
                  <th className="text-left p-2">Code</th>
                  <th className="text-right p-2">Students</th>
                  <th className="text-right p-2">Avg Score</th>
                  <th className="text-right p-2">Tests Taken</th>
                  <th className="text-center p-2">Performance</th>
                </tr>
              </thead>
              <tbody>
                {zoneStats.map((zone) => (
                  <tr key={zone.zone_id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{zone.zone_name}</td>
                    <td className="p-2">
                      <Badge variant="outline">{zone.zone_code}</Badge>
                    </td>
                    <td className="p-2 text-right">{zone.student_count}</td>
                    <td className="p-2 text-right">{zone.average_score}%</td>
                    <td className="p-2 text-right">{zone.tests_attempted}</td>
                    <td className="p-2 text-center">
                      <Badge
                        variant={zone.average_score >= 75 ? 'default' : zone.average_score >= 50 ? 'secondary' : 'destructive'}
                      >
                        {zone.average_score >= 75 ? 'Excellent' : zone.average_score >= 50 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
