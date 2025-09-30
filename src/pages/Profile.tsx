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
import { User, Mail, Calendar, Edit2, Save, X } from 'lucide-react';
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

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const profile = (response as any).profile || response;
      setProfileData(profile);
      setName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setStudentClass(profile.student_class || '');
      setEducationBoard(profile.education_board || '');
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
      const response = await authAPI.updateProfile({
        full_name: name,
        avatar_url: avatarUrl,
        student_class: studentClass,
        education_board: educationBoard
      });
      
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
                      <label className="text-sm font-medium">Class</label>
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