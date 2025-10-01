import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';
import { useZones } from '@/hooks/useZones';
import { useSchools } from '@/hooks/useSchools';

const CompleteProfile = () => {
  const [studentClass, setStudentClass] = useState('');
  const [educationBoard, setEducationBoard] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { zones, loading: zonesLoading } = useZones();
  const { schools, loading: schoolsLoading, getSchoolsByZone } = useSchools();
  
  const filteredSchools = selectedZone ? getSchoolsByZone(selectedZone) : [];

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
    
    if (!studentClass || !educationBoard || !selectedZone || !selectedSchool) {
      toast({
        variant: 'destructive',
        title: 'Required Fields Missing',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          student_class: studentClass as any,
          education_board: educationBoard as any,
          zone_id: selectedZone,
          school_id: selectedSchool,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated!',
        description: 'Your profile has been completed successfully.',
      });

      // Force a small delay to ensure profile is updated in DB
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force page reload to refresh all auth and profile states
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
      <Card className="w-full max-w-md shadow-large">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <p className="text-muted-foreground">
            Please provide your details to access relevant tests
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompleteProfile} className="space-y-6">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-primary/10 p-4 rounded-full">
                <User className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
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
                <label className="text-sm font-medium">Education Board</label>
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
                <label className="text-sm font-medium">Zone</label>
                <Select 
                  value={selectedZone} 
                  onValueChange={(value) => {
                    setSelectedZone(value);
                    setSelectedSchool(''); // Reset school when zone changes
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
                <label className="text-sm font-medium">School</label>
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
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating Profile...' : 'Complete Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;