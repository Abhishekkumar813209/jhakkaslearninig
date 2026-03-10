import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserCog, Loader2, Shield, User, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { usersAPI } from "@/services/api";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface UserSearchResult {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

const UserRoleManagement = () => {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();
  const { isReadOnly, showReadOnlyToast } = useReadOnly();

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      toast({ title: "Error", description: "Please enter an email to search", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const result = await usersAPI.searchUsersByEmail(searchEmail.trim());
      setSearchResults(result.users || []);
      
      if (result.users.length === 0) {
        toast({ title: "No Results", description: "No users found with that email" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to search users";
      console.error("Search error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const initiateRoleChange = (user: UserSearchResult, role: string) => {
    if (user.role === role) {
      toast({ title: "Info", description: "User already has this role" });
      return;
    }
    
    setSelectedUser(user);
    setNewRole(role);
    setShowConfirmDialog(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    try {
      setLoading(true);
      await usersAPI.changeUserRole(selectedUser.id, newRole, selectedUser.role);
      
      toast({ 
        title: "Success", 
        description: `${selectedUser.full_name || selectedUser.email}'s role changed to ${newRole}` 
      });
      
      // Update local state
      setSearchResults(prev => 
        prev.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u)
      );
      
      setShowConfirmDialog(false);
      setSelectedUser(null);
      setNewRole("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change role";
      console.error("Role change error:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'instructor':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'instructor':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            <CardTitle>User Role Management</CardTitle>
          </div>
          <CardDescription>
            Search users by email and manage their roles (Student, Instructor, Admin)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Bar */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter email to search..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {/* Results Table */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.full_name || user.email} 
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{user.full_name || 'No name'}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                          {getRoleIcon(user.role)}
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={user.role}
                          onValueChange={(role) => initiateRoleChange(user, role)}
                          disabled={loading}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Student
                              </div>
                            </SelectItem>
                            <SelectItem value="instructor">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" />
                                Instructor
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && searchResults.length === 0 && searchEmail && (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Try searching with a different email.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change <strong>{selectedUser?.full_name || selectedUser?.email}</strong>'s role 
              from <strong>{selectedUser?.role}</strong> to <strong>{newRole}</strong>?
              {newRole === 'admin' && (
                <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded">
                  ⚠️ This will grant full administrative access to the user.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserRoleManagement;
