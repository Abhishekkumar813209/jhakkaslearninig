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
import { CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PricingManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [basePrice, setBasePrice] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");
  const [validFrom, setValidFrom] = useState<Date>();
  const [validUntil, setValidUntil] = useState<Date>();

  const { data: pricingConfig, isLoading } = useQuery({
    queryKey: ['pricing-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createPricingMutation = useMutation({
    mutationFn: async (values: {
      base_price: number;
      display_price: number;
      valid_from?: string;
      valid_until?: string;
    }) => {
      // Deactivate all existing pricing
      await supabase
        .from('pricing_config')
        .update({ is_active: false })
        .eq('is_active', true);

      const discountPercentage = Math.round(((values.base_price - values.display_price) / values.base_price) * 100);

      const { data, error } = await supabase
        .from('pricing_config')
        .insert({
          base_price: values.base_price,
          display_price: values.display_price,
          discount_percentage: discountPercentage,
          valid_from: values.valid_from,
          valid_until: values.valid_until,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-config'] });
      toast({
        title: "Pricing Updated",
        description: "New pricing configuration has been activated."
      });
      setBasePrice("");
      setDisplayPrice("");
      setValidFrom(undefined);
      setValidUntil(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const activePricing = pricingConfig?.find(p => p.is_active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const base = parseFloat(basePrice);
    const display = parseFloat(displayPrice);

    if (isNaN(base) || isNaN(display)) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid numbers for prices.",
        variant: "destructive"
      });
      return;
    }

    if (display > base) {
      toast({
        title: "Invalid Pricing",
        description: "Display price cannot be greater than base price.",
        variant: "destructive"
      });
      return;
    }

    createPricingMutation.mutate({
      base_price: base,
      display_price: display,
      valid_from: validFrom?.toISOString(),
      valid_until: validUntil?.toISOString()
    });
  };

  if (isLoading) {
    return <div>Loading pricing configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Management
          </CardTitle>
          <CardDescription>
            Set base price and display price for premium subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePricing && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Current Active Pricing</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Base Price:</span>
                  <span className="ml-2 font-semibold">₹{activePricing.base_price}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Display Price:</span>
                  <span className="ml-2 font-semibold text-primary">₹{activePricing.display_price}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="ml-2 font-semibold text-green-600">{activePricing.discount_percentage}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valid Until:</span>
                  <span className="ml-2">{activePricing.valid_until ? format(new Date(activePricing.valid_until), 'PPP') : 'No expiry'}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (₹)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  placeholder="399"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Original MRP shown with strikethrough</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayPrice">Display Price (₹)</Label>
                <Input
                  id="displayPrice"
                  type="number"
                  placeholder="299"
                  value={displayPrice}
                  onChange={(e) => setDisplayPrice(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Selling price shown to students</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid From (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !validFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validFrom ? format(validFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={validFrom}
                      onSelect={setValidFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Valid Until (Optional)</Label>
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
                      {validUntil ? format(validUntil, "PPP") : "Pick a date"}
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

            <Button type="submit" disabled={createPricingMutation.isPending}>
              {createPricingMutation.isPending ? "Saving..." : "Activate New Pricing"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pricingConfig?.map((config) => (
              <div
                key={config.id}
                className={cn(
                  "p-3 rounded border",
                  config.is_active ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">
                      ₹{config.base_price} → ₹{config.display_price} ({config.discount_percentage}% off)
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {config.valid_from ? `From ${format(new Date(config.valid_from), 'PP')}` : 'Immediate'} 
                      {config.valid_until ? ` until ${format(new Date(config.valid_until), 'PP')}` : ''}
                    </div>
                  </div>
                  {config.is_active && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingManagement;
