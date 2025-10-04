import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authAPI } from '@/services/api';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Calendar, Edit2, Save, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StudentAnalytics } from '@/components/student/StudentAnalytics';
import { StudentRankings } from '@/components/student/StudentRankings';

const Profile = () => {
  const { user, isAdmin, isStudent } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [educationBoard, setEducationBoard] = useState('');
  const [examDomain, setExamDomain] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [zones, setZones] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  // Auto-enable edit mode if profile is incomplete
  useEffect(() => {
    if (profileData) {
      const isIncomplete = !profileData.exam_domain || 
        !profileData.zone_id || 
        !profileData.school_id ||
        (profileData.exam_domain === 'school' && (!profileData.student_class || !profileData.education_board));
      if (isIncomplete) {
        setIsEditing(true);
      }
    }
  }, [profileData]);

  // Load zones and schools
  useEffect(() => {
    loadZonesAndSchools();
  }, []);

  // Filter schools by zone
  useEffect(() => {
    if (zoneId && schools.length > 0) {
      const filtered = schools.filter(school => school.zone_id === zoneId);
      setFilteredSchools(filtered);
    } else {
      setFilteredSchools(schools);
    }
  }, [zoneId, schools]);

  const loadZonesAndSchools = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Load zones
      const { data: zonesData, error: zonesError } = await supabase
        .from('zones')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (zonesError) throw zonesError;
      setZones(zonesData || []);
      
      // Load schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);
    } catch (error) {
      console.error('Failed to load zones and schools:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const profile = (response as any).profile || response;
      setProfileData(profile);
      setName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setStudentClass(profile.student_class || '');
      setEducationBoard(profile.education_board || '');
      setExamDomain(profile.exam_domain || '');
      setZoneId(profile.zone_id || '');
      setSchoolId(profile.school_id || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fallback to user metadata
      setName(user?.user_metadata?.full_name || '');
      setAvatarUrl(user?.user_metadata?.avatar_url || '');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Name cannot be empty',
      });
      return;
    }

    setLoading(true);
    try {
      const updatePayload: any = {
        full_name: name,
        avatar_url: avatarUrl,
        exam_domain: examDomain,
        zone_id: zoneId,
        school_id: schoolId
      };

      // Only include school fields if category is 'school'
      if (examDomain === 'school') {
        updatePayload.student_class = studentClass;
        updatePayload.education_board = educationBoard;
      } else {
        // Clear school fields for non-school categories
        updatePayload.student_class = null;
        updatePayload.education_board = null;
      }

      const response = await authAPI.updateProfile(updatePayload);
      
      const profile = (response as any).profile || response;
      setProfileData(profile);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile',
      });
    }
    setLoading(false);
  };

  const getRoleColor = () => {
    if (isAdmin) return 'destructive';
    if (isStudent) return 'secondary';
    return 'outline';
  };

  const getRoleText = () => {
    if (isAdmin) return 'Admin';
    if (isStudent) return 'Student';
    return 'User';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">Manage your account settings</p>
          </div>

          {/* Incomplete profile banner */}
          {isStudent && (
            !examDomain || 
            !zoneId || 
            !schoolId || 
            (examDomain === 'school' && (!studentClass || !educationBoard))
          ) && (
            <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-600">Complete Your Profile</AlertTitle>
              <AlertDescription className="text-orange-700 dark:text-orange-400">
                Please fill in all required details (exam category, zone, and school/library) to access all features.
              </AlertDescription>
            </Alert>
          )}

          <Card className="shadow-soft">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xl">
                    {name.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-xl">{name || 'User'}</CardTitle>
                <Badge variant={getRoleColor()}>{getRoleText()}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="p-3 bg-muted rounded-md">{name || 'Not provided'}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </label>
                  <div className="p-3 bg-muted rounded-md">{user?.email || 'Not provided'}</div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Member Since
                  </label>
                  <div className="p-3 bg-muted rounded-md">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                {isStudent && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Exam Category</label>
                      {isEditing ? (
                        <Select 
                          value={examDomain} 
                          onValueChange={(value) => {
                            setExamDomain(value);
                            // Clear school fields if changing to non-school category
                            if (value !== 'school') {
                              setStudentClass('');
                              setEducationBoard('');
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select exam category" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {/* School Preparation */}
                            <SelectItem value="school">📚 School (Foundation to 12th)</SelectItem>
                            
                            {/* Competitive Exams */}
                            <SelectItem value="iit_jee_main">🎯 IIT JEE Main</SelectItem>
                            <SelectItem value="iit_jee_advanced">🏆 IIT JEE Advanced</SelectItem>
                            <SelectItem value="neet_ug">🩺 NEET UG</SelectItem>
                            <SelectItem value="neet_pg">🏥 NEET PG</SelectItem>
                            <SelectItem value="bitsat">💻 BITSAT</SelectItem>
                            <SelectItem value="viteee">⚡ VITEEE</SelectItem>
                            
                            {/* Government Exams */}
                            <SelectItem value="upsc_cse">🏛️ UPSC CSE</SelectItem>
                            <SelectItem value="ssc_cgl">📝 SSC CGL</SelectItem>
                            <SelectItem value="ssc_chsl">📋 SSC CHSL</SelectItem>
                            <SelectItem value="ibps_po">🏦 IBPS PO</SelectItem>
                            <SelectItem value="ibps_clerk">💼 IBPS Clerk</SelectItem>
                            <SelectItem value="sbi_po">🏛️ SBI PO</SelectItem>
                            <SelectItem value="railway_ntpc">🚂 Railway NTPC</SelectItem>
                            
                            {/* UG & PG Entrance */}
                            <SelectItem value="cat">📊 CAT (MBA)</SelectItem>
                            <SelectItem value="xat">🎓 XAT</SelectItem>
                            <SelectItem value="clat">⚖️ CLAT (Law)</SelectItem>
                            <SelectItem value="gate">🔬 GATE</SelectItem>
                            <SelectItem value="cmat">📈 CMAT</SelectItem>
                            
                            {/* Finance */}
                            <SelectItem value="ca_foundation">💰 CA Foundation</SelectItem>
                            <SelectItem value="ca_intermediate">📚 CA Intermediate</SelectItem>
                            <SelectItem value="ca_final">🎯 CA Final</SelectItem>
                            <SelectItem value="cs">📜 CS (Company Secretary)</SelectItem>
                            <SelectItem value="cma">💼 CMA</SelectItem>
                            
                            {/* Others */}
                            <SelectItem value="others">📖 Others</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 bg-muted rounded-md">
                          {examDomain ? (
                            examDomain === 'school' ? '📚 School (Foundation to 12th)' :
                            examDomain === 'iit_jee_main' ? '🎯 IIT JEE Main' :
                            examDomain === 'iit_jee_advanced' ? '🏆 IIT JEE Advanced' :
                            examDomain === 'neet_ug' ? '🩺 NEET UG' :
                            examDomain === 'neet_pg' ? '🏥 NEET PG' :
                            examDomain === 'bitsat' ? '💻 BITSAT' :
                            examDomain === 'viteee' ? '⚡ VITEEE' :
                            examDomain === 'upsc_cse' ? '🏛️ UPSC CSE' :
                            examDomain === 'ssc_cgl' ? '📝 SSC CGL' :
                            examDomain === 'ssc_chsl' ? '📋 SSC CHSL' :
                            examDomain === 'ibps_po' ? '🏦 IBPS PO' :
                            examDomain === 'ibps_clerk' ? '💼 IBPS Clerk' :
                            examDomain === 'sbi_po' ? '🏛️ SBI PO' :
                            examDomain === 'railway_ntpc' ? '🚂 Railway NTPC' :
                            examDomain === 'cat' ? '📊 CAT (MBA)' :
                            examDomain === 'xat' ? '🎓 XAT' :
                            examDomain === 'clat' ? '⚖️ CLAT (Law)' :
                            examDomain === 'gate' ? '🔬 GATE' :
                            examDomain === 'cmat' ? '📈 CMAT' :
                            examDomain === 'ca_foundation' ? '💰 CA Foundation' :
                            examDomain === 'ca_intermediate' ? '📚 CA Intermediate' :
                            examDomain === 'ca_final' ? '🎯 CA Final' :
                            examDomain === 'cs' ? '📜 CS (Company Secretary)' :
                            examDomain === 'cma' ? '💼 CMA' :
                            examDomain === 'others' ? '📖 Others' :
                            examDomain.charAt(0).toUpperCase() + examDomain.slice(1)
                          ) : 'Not set'}
                        </div>
                      )}
                    </div>

                    {/* Zone - Required for ALL students */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Zone *</label>
                      {isEditing ? (
                        <Select value={zoneId} onValueChange={setZoneId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.map(zone => (
                              <SelectItem key={zone.id} value={zone.id}>
                                {zone.name} ({zone.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 bg-muted rounded-md">
                          {zones.find(z => z.id === zoneId)?.name || 'Not set'}
                        </div>
                      )}
                    </div>

                    {/* School/Library - Required for ALL students */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {examDomain === 'school' ? 'School *' : 'School/Library *'}
                      </label>
                      {isEditing ? (
                        <Select value={schoolId} onValueChange={setSchoolId} disabled={!zoneId}>
                          <SelectTrigger>
                            <SelectValue placeholder={zoneId ? "Select School/Library" : "Select Zone first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredSchools.map(school => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name} ({school.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 bg-muted rounded-md">
                          {schools.find(s => s.id === schoolId)?.name || 'Not set'}
                        </div>
                      )}
                    </div>

                    {/* Show Class and Board ONLY for school category */}
                    {examDomain === 'school' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Class *</label>
                          {isEditing ? (
                            <Select value={studentClass} onValueChange={setStudentClass}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Class" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Class 1</SelectItem>
                                <SelectItem value="2">Class 2</SelectItem>
                                <SelectItem value="3">Class 3</SelectItem>
                                <SelectItem value="4">Class 4</SelectItem>
                                <SelectItem value="5">Class 5</SelectItem>
                                <SelectItem value="6">Class 6</SelectItem>
                                <SelectItem value="7">Class 7</SelectItem>
                                <SelectItem value="8">Class 8</SelectItem>
                                <SelectItem value="9">Class 9</SelectItem>
                                <SelectItem value="10">Class 10</SelectItem>
                                <SelectItem value="11">Class 11</SelectItem>
                                <SelectItem value="12">Class 12</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-3 bg-muted rounded-md">
                              {studentClass ? `Class ${studentClass}` : 'Not set'}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Education Board</label>
                          {isEditing ? (
                            <Select value={educationBoard} onValueChange={setEducationBoard}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Board" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CBSE">CBSE</SelectItem>
                                <SelectItem value="ICSE">ICSE</SelectItem>
                                <SelectItem value="UP_BOARD">UP Board</SelectItem>
                                <SelectItem value="BIHAR_BOARD">Bihar Board</SelectItem>
                                <SelectItem value="RAJASTHAN_BOARD">Rajasthan Board</SelectItem>
                                <SelectItem value="MAHARASHTRA_BOARD">Maharashtra Board</SelectItem>
                                <SelectItem value="GUJARAT_BOARD">Gujarat Board</SelectItem>
                                <SelectItem value="WEST_BENGAL_BOARD">West Bengal Board</SelectItem>
                                <SelectItem value="KARNATAKA_BOARD">Karnataka Board</SelectItem>
                                <SelectItem value="TAMIL_NADU_BOARD">Tamil Nadu Board</SelectItem>
                                <SelectItem value="KERALA_BOARD">Kerala Board</SelectItem>
                                <SelectItem value="ANDHRA_PRADESH_BOARD">Andhra Pradesh Board</SelectItem>
                                <SelectItem value="TELANGANA_BOARD">Telangana Board</SelectItem>
                                <SelectItem value="MADHYA_PRADESH_BOARD">Madhya Pradesh Board</SelectItem>
                                <SelectItem value="HARYANA_BOARD">Haryana Board</SelectItem>
                                <SelectItem value="PUNJAB_BOARD">Punjab Board</SelectItem>
                                <SelectItem value="ASSAM_BOARD">Assam Board</SelectItem>
                                <SelectItem value="ODISHA_BOARD">Odisha Board</SelectItem>
                                <SelectItem value="JHARKHAND_BOARD">Jharkhand Board</SelectItem>
                                <SelectItem value="CHHATTISGARH_BOARD">Chhattisgarh Board</SelectItem>
                                <SelectItem value="UTTARAKHAND_BOARD">Uttarakhand Board</SelectItem>
                                <SelectItem value="HIMACHAL_PRADESH_BOARD">Himachal Pradesh Board</SelectItem>
                                <SelectItem value="JAMMU_KASHMIR_BOARD">Jammu & Kashmir Board</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-3 bg-muted rounded-md">
                              {educationBoard ? educationBoard.replace('_', ' ') : 'Not set'}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} className="flex-1" disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isStudent && (
            <>
              <StudentAnalytics userId={user?.id} />
              <StudentRankings userId={user?.id} studentClass={studentClass} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;