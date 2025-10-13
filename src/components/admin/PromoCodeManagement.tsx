import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Tag, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const PromoCodeManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState<Date>();
  const [isActive, setIsActive] = useState(true);

  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createPromoMutation = useMutation({
    mutationFn: async (values: {
      code: string;
      discount_type: string;
      discount_value: number;
      max_uses?: number;
      valid_until?: string;
      is_active: boolean;
    }) => {
      const { data, error } = await supabase
        .from('promo_codes')
        .insert(values)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast({
        title: "Promo Code Created",
        description: "New promotional code has been added."
      });
      setCode("");
      setDiscountValue("");
      setMaxUses("");
      setValidUntil(undefined);
      setIsActive(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const togglePromoMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast({
        title: "Updated",
        description: "Promo code status has been updated."
      });
    }
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast({
        title: "Deleted",
        description: "Promo code has been removed."
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const discount = parseFloat(discountValue);
    const uses = maxUses ? parseInt(maxUses) : undefined;

    if (isNaN(discount) || discount <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid discount amount.",
        variant: "destructive"
      });
      return;
    }

    if (!code.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a promo code.",
        variant: "destructive"
      });
      return;
    }

    createPromoMutation.mutate({
      code: code.toUpperCase().trim(),
      discount_type: 'flat',
      discount_value: discount,
      max_uses: uses,
      valid_until: validUntil?.toISOString(),
      is_active: isActive
    });
  };

  if (isLoading) {
    return <div>Loading promo codes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Create Promo Code
          </CardTitle>
          <CardDescription>
            Create promotional discount codes for students (DIWALI50, NEWYEAR100, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Promo Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="DIWALI50"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Will be converted to uppercase</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue">Discount Amount (₹)</Label>
                <Input
                  id="discountValue"
                  type="number"
                  placeholder="50"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Flat discount in rupees</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="100"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave empty for unlimited</p>
              </div>

              <div className="space-y-2">
                <Label>Expires At (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !validUntil && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntil ? format(validUntil, "PPP") : "No expiry"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={validUntil}
                      onSelect={setValidUntil}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">Active immediately</Label>
            </div>

            <Button type="submit" disabled={createPromoMutation.isPending}>
              {createPromoMutation.isPending ? "Creating..." : "Create Promo Code"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Promo Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {promoCodes?.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No promo codes created yet</p>
            )}
            {promoCodes?.map((promo) => {
              const isExpired = promo.valid_until && new Date(promo.valid_until) < new Date();
              const isMaxedOut = promo.max_uses && promo.current_uses && promo.current_uses >= promo.max_uses;
              
              return (
                <div
                  key={promo.id}
                  className={cn(
                    "p-4 rounded border flex justify-between items-start",
                    promo.is_active && !isExpired && !isMaxedOut ? "border-primary bg-primary/5" : "border-border opacity-60"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-lg">{promo.code}</span>
                      {promo.is_active && !isExpired && !isMaxedOut && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Active</span>
                      )}
                      {isExpired && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Expired</span>}
                      {isMaxedOut && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">Max Uses Reached</span>}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Discount: <span className="font-semibold text-foreground">₹{promo.discount_value}</span></div>
                      <div>
                        Uses: <span className="font-semibold text-foreground">{promo.current_uses || 0}</span>
                        {promo.max_uses ? ` / ${promo.max_uses}` : ' (unlimited)'}
                      </div>
                      {promo.valid_until && (
                        <div>Expires: {format(new Date(promo.valid_until), 'PPP')}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Switch
                      checked={promo.is_active || false}
                      onCheckedChange={(checked) => 
                        togglePromoMutation.mutate({ id: promo.id, is_active: checked })
                      }
                      disabled={togglePromoMutation.isPending}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete promo code "${promo.code}"?`)) {
                          deletePromoMutation.mutate(promo.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromoCodeManagement;
