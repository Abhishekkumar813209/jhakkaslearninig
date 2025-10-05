import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, GraduationCap, Building2, TrendingUp, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useExamTypes } from '@/hooks/useExamTypes';
import * as LucideIcons from 'lucide-react';

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
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  const { examTypes } = useExamTypes();

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

  const getDomainZoneCount = (domain: string) => {
    return zoneStats.filter(z => {
      // This will be populated after data is loaded
      return true; // Placeholder for now
    }).length;
  };

  useEffect(() => {
    if (selectedDomain) {
      fetchAnalytics();
    }
  }, [selectedDomain]);

  const fetchAnalytics = async () => {
    if (!selectedDomain) return;
    
    try {
      // Fetch zone-wise statistics with performance filtered by exam type
      const { data: zones, error: zoneError } = await supabase
        .from('zones')
        .select(`
          id,
          name,
          code,
          is_active,
          exam_type
        `)
        .eq('is_active', true)
        .eq('exam_type', selectedDomain);

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

      // Fetch school-wise statistics filtered by exam type
      const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select(`
          id,
          name,
          is_active,
          exam_type,
          zones!fk_schools_zone(name)
        `)
        .eq('is_active', true)
        .eq('exam_type', selectedDomain);

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

  if (loading && selectedDomain) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Zone & School Analytics</h2>
          <p className="text-muted-foreground mt-1">
            {selectedDomain 
              ? `Viewing analytics for ${examTypes.find(t => t.code === selectedDomain)?.display_name}` 
              : "Select an exam domain to view analytics"}
          </p>
        </div>
        {selectedDomain && (
          <Button onClick={() => setSelectedDomain(null)} variant="outline">
            Change Domain
          </Button>
        )}
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
                  onClick={() => setSelectedDomain(examType.code)}
                >
                  <CardContent className="p-6">
                    <div className={`w-full h-24 ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-600'} rounded-lg mb-4 flex items-center justify-center`}>
                      <IconComponent className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{examType.display_name}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>View Analytics</span>
                      <Badge variant="secondary">Analytics</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Selected Domain Badge */}
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
              <Badge className="text-lg px-4 py-2">{zoneStats.length} zones</Badge>
            </CardContent>
          </Card>
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
        </>
      )}
    </div>
  );
};
