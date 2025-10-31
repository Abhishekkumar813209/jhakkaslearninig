import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, UserPlus, Shield, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Partner {
  id: string;
  partner_id: string;
  status: string;
  roadmap_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  batch_roadmaps: {
    title: string;
  };
}

export const AccountabilityPartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [myInviteCode, setMyInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPartners();
    generateMyInviteCode();
  }, []);

  const fetchPartners = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('wellness_accountability_partners')
      .select('*')
      .or(`student_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching partners:', error);
      return;
    }

    // Fetch partner profiles separately
    const partnerIds = data?.map(p => p.partner_id === user.id ? p.student_id : p.partner_id) || [];
    if (partnerIds.length === 0) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', partnerIds);

    const { data: roadmaps } = await supabase
      .from('batch_roadmaps')
      .select('id, title')
      .in('id', data?.map(p => p.roadmap_id) || []);

    const enrichedPartners = data?.map(partner => ({
      ...partner,
      profiles: profiles?.find(p => p.id === (partner.partner_id === user.id ? partner.student_id : partner.partner_id)) || { full_name: 'Unknown', email: '' },
      batch_roadmaps: roadmaps?.find(r => r.id === partner.roadmap_id) || { title: 'No roadmap' }
    })) || [];

    setPartners(enrichedPartners as any);
  };

  const generateMyInviteCode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Generate unique code
    const code = `WH-${user.id.substring(0, 8).toUpperCase()}`;
    setMyInviteCode(code);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(myInviteCode);
    toast.success('Invite code copied to clipboard!');
  };

  const acceptInvite = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find partner by their invite code pattern
      const partnerUserId = inviteCode.replace('WH-', '').toLowerCase();

      // Create partnership
      const { error } = await supabase
        .from('wellness_accountability_partners')
        .insert({
          student_id: user.id,
          partner_id: partnerUserId,
          invite_code: inviteCode,
          status: 'active',
        });

      if (error) throw error;

      toast.success('Accountability partner added!');
      setInviteCode('');
      fetchPartners();
    } catch (error: any) {
      console.error('Error accepting invite:', error);
      toast.error('Failed to add partner. Invalid code?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Your Invite Code
          </CardTitle>
          <CardDescription>Share this code with others to become accountability partners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={myInviteCode} readOnly className="font-mono" />
            <Button onClick={copyInviteCode} variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Accountability Partner</CardTitle>
          <CardDescription>Enter their invite code to connect</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter invite code (e.g., WH-12345678)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <Button onClick={acceptInvite} disabled={loading}>
              Add Partner
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Partners ({partners.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No active partners yet. Share your invite code!
            </p>
          ) : (
            <div className="space-y-4">
              {partners.map((partner) => (
                <div key={partner.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{partner.profiles?.full_name || 'Anonymous'}</p>
                    <p className="text-sm text-muted-foreground">
                      {partner.batch_roadmaps?.title || 'No roadmap'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <Shield className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
