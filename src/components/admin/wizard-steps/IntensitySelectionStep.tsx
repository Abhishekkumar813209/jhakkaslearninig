import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Zap, Target, Scale } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IntensitySelectionStepProps {
  intensity: 'full' | 'important' | 'balanced';
  onIntensityChange: (intensity: 'full' | 'important' | 'balanced') => void;
  totalBudget: number;
  totalChapters: number;
  coreChapters: number;
  importantChapters: number;
}

export const IntensitySelectionStep = ({
  intensity,
  onIntensityChange,
  totalBudget,
  totalChapters,
  coreChapters,
  importantChapters
}: IntensitySelectionStepProps) => {
  const avgDaysPerChapter = totalChapters > 0 ? (totalBudget / totalChapters).toFixed(1) : 0;
  const isTightBudget = Number(avgDaysPerChapter) < 2;
  
  // Calculate estimated coverage for each intensity
  const fullCoverage = totalChapters;
  const importantCoverage = Math.round(totalChapters * 0.7); // Top 70%
  const balancedCoverage = coreChapters + Math.floor(importantChapters * 0.5);
  
  const intensityOptions = [
    {
      value: 'full' as const,
      label: 'Full Syllabus',
      icon: Zap,
      description: 'Cover all chapters',
      details: `All ${fullCoverage} chapters included`,
      allocation: isTightBudget 
        ? '1-2 days per chapter (clustered concepts)'
        : '3-5 days per chapter',
      badge: isTightBudget ? 'Clustered' : 'Complete',
      badgeVariant: isTightBudget ? 'secondary' : 'default',
      recommended: !isTightBudget
    },
    {
      value: 'important' as const,
      label: 'Important Chapters Only',
      icon: Target,
      description: 'AI selects top important chapters',
      details: `~${importantCoverage} chapters (70% coverage)`,
      allocation: '3-5 days per chapter',
      badge: 'Focused',
      badgeVariant: 'default',
      recommended: isTightBudget
    },
    {
      value: 'balanced' as const,
      label: 'Balanced',
      icon: Scale,
      description: 'Mix of core + important chapters',
      details: `~${balancedCoverage} chapters (core + selected important)`,
      allocation: 'Core: 4-6 days, Important: 2-3 days',
      badge: 'Optimized',
      badgeVariant: 'default',
      recommended: false
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Roadmap Intensity</h3>
        <p className="text-sm text-muted-foreground">
          Choose how to utilize your {totalBudget}-day budget across {totalChapters} chapters
        </p>
      </div>

      {isTightBudget && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tight budget detected ({avgDaysPerChapter} days/chapter). We recommend "Important Only" 
            for better learning outcomes, or "Full Syllabus" with clustered concepts.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3">
        <RadioGroup value={intensity} onValueChange={onIntensityChange}>
          {intensityOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = intensity === option.value;
            
            return (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'border-primary shadow-md' : 'hover:border-primary/50'
                }`}
                onClick={() => onIntensityChange(option.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4 text-primary" />
                        <Label
                          htmlFor={option.value}
                          className="text-base font-semibold cursor-pointer"
                        >
                          {option.label}
                        </Label>
                        <Badge variant={option.badgeVariant as any} className="text-xs">
                          {option.badge}
                        </Badge>
                        {option.recommended && (
                          <Badge variant="default" className="text-xs bg-green-500">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {option.description}
                      </p>
                      <div className="space-y-1">
                        <div className="text-xs">
                          <span className="font-medium">Coverage:</span> {option.details}
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">Allocation:</span> {option.allocation}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </RadioGroup>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Budget Breakdown:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>Total Days: {totalBudget}</div>
              <div>Total Chapters: {totalChapters}</div>
              <div>🔴 Core Chapters: {coreChapters}</div>
              <div>🟡 Important: {importantChapters}</div>
              <div className="col-span-2 pt-2 border-t">
                Average: {avgDaysPerChapter} days/chapter
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};