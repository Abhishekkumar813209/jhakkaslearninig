import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Link as LinkIcon, Trash2, Search, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ParentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [relationship, setRelationship] = useState('parent');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all parents with their profile data
  const { data: parents, isLoading: parentsLoading } = useQuery({
    queryKey: ['parents'],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'parent');

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) return [];

      const userIds = roleData.map(r => r.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profileError) throw profileError;

      return roleData.map(role => ({
        user_id: role.user_id,
        role: role.role,
        profiles: profileData?.find(p => p.id === role.user_id)
      }));
    },
  });

  // Fetch all users for assignment
  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all students with their profile data
  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'student');

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) return [];

      const userIds = roleData.map(r => r.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, student_class')
        .in('id', userIds);

      if (profileError) throw profileError;

      return roleData.map(role => ({
        user_id: role.user_id,
        role: role.role,
        profiles: profileData?.find(p => p.id === role.user_id)
      }));
    },
  });

  // Fetch parent-student links with student profiles
  const { data: links } = useQuery({
    queryKey: ['parent-links'],
    queryFn: async () => {
      const { data: linkData, error: linkError } = await supabase
        .from('parent_student_links')
        .select('id, parent_id, student_id, relationship, is_primary_contact');

      if (linkError) throw linkError;

      if (!linkData || linkData.length === 0) return [];

      const studentIds = [...new Set(linkData.map(l => l.student_id))];
      const { data: studentProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, student_class')
        .in('id', studentIds);

      if (profileError) throw profileError;

      return linkData.map(link => ({
        ...link,
        student: studentProfiles?.find(p => p.id === link.student_id)
      }));
    },
  });

  // Assign parent role
  const assignParentRole = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'parent' })
        .select()
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast({ title: 'Success', description: 'Parent role assigned successfully' });
      setSelectedUser('');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  // Link student to parent
  const linkStudent = useMutation({
    mutationFn: async ({ parentId, studentId, rel }: { parentId: string; studentId: string; rel: string }) => {
      const { error } = await supabase
        .from('parent_student_links')
        .insert({
          parent_id: parentId,
          student_id: studentId,
          relationship: rel,
          is_primary_contact: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-links'] });
      toast({ title: 'Success', description: 'Student linked successfully' });
      setSelectedStudent('');
      setRelationship('parent');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  // Remove link
  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('parent_student_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-links'] });
      toast({ title: 'Success', description: 'Link removed successfully' });
    },
  });

  const filteredParents = parents?.filter((p) =>
    p.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLinkedStudents = (parentId: string) => {
    return links?.filter((link) => link.parent_id === parentId) || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Parent Management</h2>
          <p className="text-muted-foreground">Manage parent accounts and student links</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Parent Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Parent Role to User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => selectedUser && assignParentRole.mutate(selectedUser)}
                disabled={!selectedUser || assignParentRole.isPending}
                className="w-full"
              >
                {assignParentRole.isPending ? 'Assigning...' : 'Assign Role'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search parents by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Parents ({filteredParents?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Linked Students</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parentsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredParents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No parents found</TableCell>
                </TableRow>
              ) : (
                filteredParents?.map((parent) => {
                  const linkedStudents = getLinkedStudents(parent.user_id);
                  return (
                    <TableRow key={parent.user_id}>
                      <TableCell className="font-medium">{parent.profiles?.full_name}</TableCell>
                      <TableCell>{parent.profiles?.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {linkedStudents.length === 0 ? (
                            <Badge variant="secondary">No students linked</Badge>
                          ) : (
                            linkedStudents.map((link) => (
                              <div key={link.id} className="flex items-center gap-2">
                                <Badge>{link.student?.full_name} ({link.relationship})</Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLink.mutate(link.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <LinkIcon className="mr-2 h-3 w-3" />
                              Link Student
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Link Student to {parent.profiles?.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select student" />
                                </SelectTrigger>
                                <SelectContent>
                                  {students?.map((student) => (
                                    <SelectItem key={student.user_id} value={student.user_id}>
                                      {student.profiles?.full_name} - Class {student.profiles?.student_class}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={relationship} onValueChange={setRelationship}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Relationship" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="father">Father</SelectItem>
                                  <SelectItem value="mother">Mother</SelectItem>
                                  <SelectItem value="guardian">Guardian</SelectItem>
                                  <SelectItem value="parent">Parent</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() =>
                                  selectedStudent &&
                                  linkStudent.mutate({
                                    parentId: parent.user_id,
                                    studentId: selectedStudent,
                                    rel: relationship,
                                  })
                                }
                                disabled={!selectedStudent || linkStudent.isPending}
                                className="w-full"
                              >
                                {linkStudent.isPending ? 'Linking...' : 'Link Student'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
