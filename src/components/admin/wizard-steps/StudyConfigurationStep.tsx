import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, BookOpen } from "lucide-react";

interface StudyConfigurationStepProps {
  chaptersPerDay: number;
  setChaptersPerDay: (value: number) => void;
  studyDays: number[];
  setStudyDays: (value: number[]) => void;
  parallelStudy: boolean;
  setParallelStudy: (value: boolean) => void;
  weeklyDistribution: { [subject: string]: number };
  setWeeklyDistribution: (value: { [subject: string]: number }) => void;
  subjects: string[];
}

const weekDays = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export const StudyConfigurationStep = ({
  chaptersPerDay,
  setChaptersPerDay,
  studyDays,
  setStudyDays,
  parallelStudy,
  setParallelStudy,
  weeklyDistribution,
  setWeeklyDistribution,
  subjects,
}: StudyConfigurationStepProps) => {
  const toggleStudyDay = (day: number) => {
    if (studyDays.includes(day)) {
      setStudyDays(studyDays.filter(d => d !== day));
    } else {
      setStudyDays([...studyDays, day].sort());
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold mb-2">Study Configuration (Optional)</h3>
        <p className="text-sm text-muted-foreground">
          Configure how chapters should be distributed across study days
        </p>
      </div>

      {/* Chapters per Day */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label className="text-base font-semibold">Chapters per Day</Label>
              <p className="text-sm text-muted-foreground">
                Maximum chapters to study per day: {chaptersPerDay}
              </p>
            </div>
          </div>
          <Slider
            value={[chaptersPerDay]}
            onValueChange={(value) => setChaptersPerDay(value[0])}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 chapter</span>
            <span>3 chapters</span>
            <span>5 chapters</span>
          </div>
        </CardContent>
      </Card>

      {/* Study Days per Week */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label className="text-base font-semibold">Study Days per Week</Label>
              <p className="text-sm text-muted-foreground">
                {studyDays.length} days selected
              </p>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div
                key={day.value}
                onClick={() => toggleStudyDay(day.value)}
                className={`
                  p-3 rounded-lg border-2 text-center cursor-pointer transition-all
                  ${studyDays.includes(day.value)
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <span className="text-sm">{day.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parallel Study */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label htmlFor="parallel-study" className="text-base font-semibold cursor-pointer">
                  Parallel Subject Study
                </Label>
                <p className="text-sm text-muted-foreground">
                  Mix multiple subjects on the same day for variety
                </p>
              </div>
            </div>
            <Switch
              id="parallel-study"
              checked={parallelStudy}
              onCheckedChange={setParallelStudy}
            />
          </div>
        </CardContent>
      </Card>

      {/* Weekly Subject Distribution */}
      {parallelStudy && subjects.length > 0 && (
        <Card className="animate-scale-in">
          <CardContent className="p-6 space-y-4">
            <Label className="text-base font-semibold">Weekly Subject Distribution</Label>
            <p className="text-sm text-muted-foreground">
              Allocate study days per week for each subject
            </p>
            {subjects.map((subject) => (
              <div key={subject} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{subject}</span>
                  <span className="text-sm text-muted-foreground">
                    {weeklyDistribution[subject] || 3} days/week
                  </span>
                </div>
                <Slider
                  value={[weeklyDistribution[subject] || 3]}
                  onValueChange={(value) =>
                    setWeeklyDistribution({
                      ...weeklyDistribution,
                      [subject]: value[0]
                    })
                  }
                  min={1}
                  max={Math.min(7, studyDays.length)}
                  step={1}
                  className="w-full"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> These settings help AI distribute chapters more effectively.
            You can skip this step to use default settings (3 chapters/day, Mon-Sat).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
