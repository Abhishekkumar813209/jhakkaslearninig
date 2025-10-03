import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, GraduationCap, Building2, Trophy, Briefcase, BookMarked } from 'lucide-react';
import { useZones } from '@/hooks/useZones';
import { useSchools } from '@/hooks/useSchools';

const EXAM_CATEGORIES = [
  { id: 'school', name: 'School Preparation', icon: BookOpen, description: 'Foundation to 12th', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { id: 'competitive', name: 'Competitive Exams', icon: Trophy, description: 'JEE, NEET, etc.', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  { id: 'government', name: 'Government Exams', icon: Building2, description: 'UPSC, SSC, Banking', color: 'bg-green-500/10 text-green-600 border-green-200' },
  { id: 'ugpg', name: 'UG & PG Entrance', icon: GraduationCap, description: 'MBA, Law, etc.', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { id: 'finance', name: 'Finance', icon: Briefcase, description: 'CA, CS, ACCA', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
  { id: 'others', name: 'Others', icon: BookMarked, description: 'Skill development', color: 'bg-gray-500/10 text-gray-600 border-gray-200' }
];

const CompleteProfile = () => {
  const [examCategory, setExamCategory] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [educationBoard, setEducationBoard] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [examDomain, setExamDomain] = useState('');
  const [targetExam, setTargetExam] = useState('');
  const [preparationLevel, setPreparationLevel] = useState('');
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { zones, loading: zonesLoading } = useZones();
  const { schools, loading: schoolsLoading, getSchoolsByZone } = useSchools();
  
  const filteredSchools = selectedZone ? getSchoolsByZone(selectedZone) : [];

  useEffect(() => {
    const fetchDomains = async () => {
      const { data } = await supabase
        .from("exam_domains")
        .select("*")
        .eq("is_active", true);
      if (data) setDomains(data);
    };
    fetchDomains();
  }, []);

  useEffect(() => {
    checkUserAndProfile();
  }, []);

  const checkUserAndProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    setUser(user);

    // Check if profile is already complete
    const { data: profile } = await supabase
      .from('profiles')
      .select('student_class, education_board, zone_id, school_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.student_class && profile?.education_board && profile?.zone_id && profile?.school_id) {
      // Profile already complete, redirect to dashboard
      navigate('/student');
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!examCategory) {
      toast({
        variant: 'destructive',
        title: 'Category Required',
        description: 'Please select an exam category.',
      });
      return;
    }

    // For school category, validate school-specific fields
    if (examCategory === 'school') {
      if (!studentClass || !educationBoard || !selectedZone || !selectedSchool) {
        toast({
          variant: 'destructive',
          title: 'Required Fields Missing',
          description: 'Please fill in Class, Board, Zone, and School.',
        });
        return;
      }
    } else {
      // For other categories, validate target exam
      if (!targetExam) {
        toast({
          variant: 'destructive',
          title: 'Required Field Missing',
          description: 'Please enter your target exam.',
        });
        return;
      }
    }

    setLoading(true);

    try {
      const updateData: any = {
        exam_domain: examCategory,
        target_exam: targetExam || null,
        preparation_level: preparationLevel || null,
        updated_at: new Date().toISOString()
      };

      // Only set school fields if category is 'school'
      if (examCategory === 'school') {
        updateData.student_class = studentClass;
        updateData.education_board = educationBoard;
        updateData.zone_id = selectedZone;
        updateData.school_id = selectedSchool;
      } else {
        // Clear school fields for non-school categories
        updateData.student_class = null;
        updateData.education_board = null;
        updateData.zone_id = null;
        updateData.school_id = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated!',
        description: 'Your profile has been completed successfully.',
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.replace('/student');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Failed to update profile. Please try again.',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-large">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <p className="text-muted-foreground">
            {!examCategory ? 'Choose your learning path' : 'Provide your details to get started'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompleteProfile} className="space-y-6">
            {/* Step 1: Exam Category Selection */}
            {!examCategory ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">What do you want to study for?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EXAM_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    return (
                      <Card
                        key={category.id}
                        className={`cursor-pointer transition-all hover:shadow-md border-2 ${category.color}`}
                        onClick={() => setExamCategory(category.id)}
                      >
                        <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                          <Icon className="h-10 w-10" />
                          <h4 className="font-semibold">{category.name}</h4>
                          <p className="text-sm opacity-80">{category.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Step 2: Conditional Fields Based on Category */
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {EXAM_CATEGORIES.find(c => c.id === examCategory)?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {EXAM_CATEGORIES.find(c => c.id === examCategory)?.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setExamCategory('');
                      setStudentClass('');
                      setEducationBoard('');
                      setSelectedZone('');
                      setSelectedSchool('');
                      setTargetExam('');
                      setPreparationLevel('');
                    }}
                  >
                    Change
                  </Button>
                </div>

                {/* School-specific fields - ONLY for school category */}
                {examCategory === 'school' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Class *</label>
                      <Select value={studentClass} onValueChange={setStudentClass} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your class" />
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
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Education Board *</label>
                      <Select value={educationBoard} onValueChange={setEducationBoard} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select education board" />
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
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Zone *</label>
                      <Select 
                        value={selectedZone} 
                        onValueChange={(value) => {
                          setSelectedZone(value);
                          setSelectedSchool('');
                        }}
                        disabled={zonesLoading}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.filter(z => z.is_active).map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.name} ({zone.student_count || 0} students)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">School *</label>
                      <Select 
                        value={selectedSchool} 
                        onValueChange={setSelectedSchool}
                        disabled={!selectedZone || schoolsLoading}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={selectedZone ? "Select your school" : "Select zone first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSchools.filter(s => s.is_active).map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name} ({school.student_count || 0} students)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  /* Non-school fields - for competitive/government/other exams */
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="targetExam">Target Exam *</Label>
                      <Input
                        id="targetExam"
                        value={targetExam}
                        onChange={(e) => setTargetExam(e.target.value)}
                        placeholder="e.g., JEE Main, NEET, UPSC, CAT"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preparationLevel">Preparation Level (Optional)</Label>
                      <Select value={preparationLevel} onValueChange={setPreparationLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating Profile...' : 'Complete Profile'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;