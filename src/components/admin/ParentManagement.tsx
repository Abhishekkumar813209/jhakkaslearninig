import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link as LinkIcon, Trash2, Search, Users, UserCheck, UserX, TrendingUp, Phone, Mail } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ParentManagement() {
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentPhoneSearch, setParentPhoneSearch] = useState('');
  const [relationship, setRelationship] = useState('father');
  const [parentFilter, setParentFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [selectedStudentForLink, setSelectedStudentForLink] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch students with their parent links (Student-centric view)
  const { data: studentsWithParents, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-with-parents', studentSearchQuery],
    queryFn: async () => {
      const { data: studentRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (roleError) throw roleError;
      const studentIds = studentRoles?.map(r => r.user_id) || [];

      let query = supabase
        .from('profiles')
        .select('id, full_name, email, student_class, phone_number')
        .in('id', studentIds);

      if (studentSearchQuery.length >= 2) {
        query = query.or(`full_name.ilike.%${studentSearchQuery}%,email.ilike.%${studentSearchQuery}%`);
      }

      const { data: students, error: studentError } = await query.order('full_name').limit(20);
      if (studentError) throw studentError;

      // Fetch parent links for these students
      const { data: links, error: linkError } = await supabase
        .from('parent_student_links')
        .select(`
          id,
          parent_id,
          student_id,
          relationship,
          is_primary_contact
        `)
        .in('student_id', students?.map(s => s.id) || []);

      if (linkError) throw linkError;

      // Fetch parent profiles
      const parentIds = [...new Set(links?.map(l => l.parent_id) || [])];
      const { data: parentProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, email')
        .in('id', parentIds);

      return students?.map(student => ({
        ...student,
        parent_links: links?.filter(l => l.student_id === student.id).map(link => ({
          ...link,
          parent: parentProfiles?.find(p => p.id === link.parent_id)
        })) || []
      }));
    },
    enabled: studentSearchQuery.length >= 2,
  });

  // Fetch all parents with their profile data
  const { data: parents, isLoading: parentsLoading } = useQuery({
    queryKey: ['parents', parentSearchQuery],
    queryFn: async () => {
      // Use RPC with wildcard for "all parents"
      const searchTerm = parentSearchQuery || '';
      const { data, error } = await supabase.rpc('search_parents_by_phone', {
        phone_like: searchTerm
      });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map(profile => ({
        user_id: profile.id,
        profiles: profile
      }));
    },
  });

  // Fetch all parent-student links
  const { data: allLinks } = useQuery({
    queryKey: ['all-parent-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_student_links')
        .select('id, parent_id, student_id, relationship');
      if (error) throw error;
      return data;
    },
  });

  // Search parent by phone number using RPC
  const { data: foundParents, isLoading: searchingParent } = useQuery({
    queryKey: ['search-parent-by-phone', parentPhoneSearch],
    queryFn: async () => {
      if (parentPhoneSearch.length < 3) return [];

      // Normalize phone input (remove non-digits)
      const digits = parentPhoneSearch.replace(/[^0-9]/g, '');

      const { data, error } = await supabase.rpc('search_parents_by_phone', {
        phone_like: digits
      });

      if (error) throw error;
      return data || [];
    },
    enabled: parentPhoneSearch.length >= 3,
  });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['parent-stats'],
    queryFn: async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'parent');

      const totalParents = roleData?.length || 0;

      const { data: links } = await supabase
        .from('parent_student_links')
        .select('parent_id');

      const linkedParentIds = new Set(links?.map(l => l.parent_id) || []);
      const linkedCount = linkedParentIds.size;
      const unlinkedCount = totalParents - linkedCount;

      // Get new parents this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: newParents } = await supabase
        .from('profiles')
        .select('id')
        .in('id', roleData?.map(r => r.user_id) || [])
        .gte('created_at', weekAgo.toISOString());

      return {
        total: totalParents,
        linked: linkedCount,
        unlinked: unlinkedCount,
        newThisWeek: newParents?.length || 0
      };
    },
  });

  // Link parent to student
  const linkParentToStudent = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['students-with-parents'] });
      queryClient.invalidateQueries({ queryKey: ['all-parent-links'] });
      queryClient.invalidateQueries({ queryKey: ['parent-stats'] });
      toast({ title: 'Success', description: 'Parent linked successfully!' });
      setParentPhoneSearch('');
      setRelationship('father');
      setSelectedStudentForLink(null);
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
      queryClient.invalidateQueries({ queryKey: ['students-with-parents'] });
      queryClient.invalidateQueries({ queryKey: ['all-parent-links'] });
      queryClient.invalidateQueries({ queryKey: ['parent-stats'] });
      toast({ title: 'Success', description: 'Link removed successfully' });
    },
  });

  const filteredParents = parents?.filter((p) => {
    if (parentFilter === 'linked') {
      const hasLinks = allLinks?.some(l => l.parent_id === p.user_id);
      return hasLinks;
    }
    if (parentFilter === 'unlinked') {
      const hasLinks = allLinks?.some(l => l.parent_id === p.user_id);
      return !hasLinks;
    }
    return true;
  });

  const getLinkedStudentsCount = (parentId: string) => {
    return allLinks?.filter(l => l.parent_id === parentId).length || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Parent Management</h2>
        <p className="text-muted-foreground">Student-centric parent linking and management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Parents</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Linked</p>
                <p className="text-2xl font-bold text-green-600">{stats?.linked || 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unlinked</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.unlinked || 0}</p>
              </div>
              <UserX className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New This Week</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.newThisWeek || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students">Search Students</TabsTrigger>
          <TabsTrigger value="parents">All Parents</TabsTrigger>
        </TabsList>

        {/* Student Search Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Find Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student by name or email (min 2 characters)..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Student Results */}
              {studentsLoading && <p className="text-center text-muted-foreground">Loading...</p>}
              
              {studentSearchQuery.length < 2 && (
                <p className="text-center text-muted-foreground py-8">
                  Type at least 2 characters to search students
                </p>
              )}

              {studentSearchQuery.length >= 2 && !studentsLoading && studentsWithParents?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No students found</p>
              )}

              <div className="space-y-3">
                {studentsWithParents?.map((student) => (
                  <Card key={student.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Student Info */}
                        <div>
                          <h4 className="font-semibold text-lg">{student.full_name}</h4>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {student.email}
                            </span>
                            {student.student_class && (
                              <Badge variant="outline">Class {student.student_class}</Badge>
                            )}
                          </div>
                        </div>

                        {/* Linked Parents */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Linked Parents:</Label>
                          {student.parent_links.length === 0 ? (
                            <Badge variant="secondary">No parents linked</Badge>
                          ) : (
                            <div className="space-y-2">
                              {student.parent_links.map((link) => (
                                <div key={link.id} className="flex items-center justify-between bg-muted p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <p className="font-medium">{link.parent?.full_name}</p>
                                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Phone className="h-3 w-3" />
                                        {link.parent?.phone_number || 'N/A'}
                                      </p>
                                    </div>
                                    <Badge variant="outline">{link.relationship}</Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeLink.mutate(link.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Parent Button */}
                        <Dialog open={selectedStudentForLink === student.id} onOpenChange={(open) => !open && setSelectedStudentForLink(null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedStudentForLink(student.id)}>
                              <LinkIcon className="mr-2 h-4 w-4" />
                              Add Parent
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Link Parent to {student.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Search Parent by Phone Number</Label>
                                <Input
                                  placeholder="Enter phone number (min 3 digits)"
                                  value={parentPhoneSearch}
                                  onChange={(e) => setParentPhoneSearch(e.target.value)}
                                />
                              </div>

                              {/* Search Results */}
                              {searchingParent && <p className="text-sm text-muted-foreground">Searching...</p>}
                              
                              {foundParents && foundParents.length > 0 && (
                                <div className="space-y-2">
                                  <Label>Found Parents:</Label>
                                  {foundParents.map((parent) => (
                                    <Card key={parent.id} className="p-3">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <p className="font-medium">{parent.full_name}</p>
                                          <p className="text-sm text-muted-foreground">{parent.phone_number}</p>
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={() => linkParentToStudent.mutate({
                                            parentId: parent.id,
                                            studentId: student.id,
                                            rel: relationship
                                          })}
                                          disabled={linkParentToStudent.isPending}
                                        >
                                          Link
                                        </Button>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              )}

                              {parentPhoneSearch.length >= 10 && !searchingParent && foundParents?.length === 0 && (
                                <div className="p-4 bg-muted rounded space-y-2">
                                  <p className="text-sm font-medium">Parent not registered</p>
                                  <p className="text-xs text-muted-foreground">
                                    Ask the parent to register via the Parent Registration page
                                  </p>
                                </div>
                              )}

                              <div>
                                <Label>Relationship</Label>
                                <Select value={relationship} onValueChange={setRelationship}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="father">Father</SelectItem>
                                    <SelectItem value="mother">Mother</SelectItem>
                                    <SelectItem value="guardian">Guardian</SelectItem>
                                    <SelectItem value="parent">Parent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Parents Tab */}
        <TabsContent value="parents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Parents</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={parentFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParentFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={parentFilter === 'linked' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParentFilter('linked')}
                  >
                    Linked
                  </Button>
                  <Button
                    variant={parentFilter === 'unlinked' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParentFilter('unlinked')}
                  >
                    Unlinked
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search parents by name or phone..."
                    value={parentSearchQuery}
                    onChange={(e) => setParentSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Students Linked</TableHead>
                      <TableHead>Status</TableHead>
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
                        const linkedCount = getLinkedStudentsCount(parent.user_id);
                        const isLinked = linkedCount > 0;

                        return (
                          <TableRow key={parent.user_id}>
                            <TableCell className="font-medium">{parent.profiles?.full_name}</TableCell>
                            <TableCell>{parent.profiles?.phone_number || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={isLinked ? 'default' : 'secondary'}>
                                {linkedCount} {linkedCount === 1 ? 'student' : 'students'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isLinked ? (
                                <Badge className="bg-green-600">Active</Badge>
                              ) : (
                                <Badge variant="destructive">No Link</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}