import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const moodEmojis = ['😞', '😐', '🙂', '😊', '😄'];

export const WellnessCheckin = () => {
  const [loading, setLoading] = useState(false);
  const [isClean, setIsClean] = useState(true);
  const [mood, setMood] = useState(2);
  const [cravingIntensity, setCravingIntensity] = useState([0]);
  const [exercise, setExercise] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState([8]);
  const [sleepHours, setSleepHours] = useState([7]);
  const [journalEntry, setJournalEntry] = useState('');

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in first');
        return;
      }

      // Insert daily attendance record
      const { error: attendanceError } = await supabase
        .from('daily_attendance')
        .insert({
          student_id: user.id,
          date: new Date().toISOString().split('T')[0],
          is_wellness_checkin: true,
          social_share_done: isClean,
          wellness_metadata: {
            mood: moodEmojis[mood],
            craving_intensity: cravingIntensity[0],
            exercise_done: exercise,
            water_glasses: waterGlasses[0],
            sleep_hours: sleepHours[0],
            journal_entry: journalEntry,
          },
        });

      if (attendanceError) throw attendanceError;

      // Update streak and XP via jhakkas-points-system
      const { error: xpError } = await supabase.functions.invoke('jhakkas-points-system', {
        body: {
          action: 'add',
          xp_amount: isClean ? 10 : 2,
          activity_type: 'wellness_checkin',
        },
      });

      if (xpError) throw xpError;

      toast.success(isClean ? '✅ Check-in complete! +10 XP' : '💪 Relapse logged. Keep going!');
      
      // Reset form
      setIsClean(true);
      setMood(2);
      setCravingIntensity([0]);
      setExercise(false);
      setWaterGlasses([8]);
      setSleepHours([7]);
      setJournalEntry('');

    } catch (error: any) {
      console.error('Error submitting checkin:', error);
      toast.error('Failed to save check-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Check-in</CardTitle>
        <CardDescription>Track your progress and maintain your streak</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Clean Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Are you clean today?</label>
          <div className="flex gap-4">
            <Button
              variant={isClean ? 'default' : 'outline'}
              onClick={() => setIsClean(true)}
              className="flex-1"
            >
              ✅ Yes
            </Button>
            <Button
              variant={!isClean ? 'destructive' : 'outline'}
              onClick={() => setIsClean(false)}
              className="flex-1"
            >
              ❌ Relapse
            </Button>
          </div>
        </div>

        {/* Mood */}
        <div className="space-y-2">
          <label className="text-sm font-medium">How are you feeling?</label>
          <div className="flex justify-between text-3xl">
            {moodEmojis.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => setMood(idx)}
                className={`p-2 rounded transition-transform ${
                  mood === idx ? 'scale-125 bg-accent' : 'hover:scale-110'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Craving Intensity */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Craving Intensity: {cravingIntensity[0]}/10
          </label>
          <Slider
            value={cravingIntensity}
            onValueChange={setCravingIntensity}
            max={10}
            step={1}
          />
        </div>

        {/* Exercise */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="exercise"
            checked={exercise}
            onCheckedChange={(checked) => setExercise(checked as boolean)}
          />
          <label htmlFor="exercise" className="text-sm font-medium cursor-pointer">
            I exercised today
          </label>
        </div>

        {/* Water Intake */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Water Intake: {waterGlasses[0]} glasses
          </label>
          <Slider
            value={waterGlasses}
            onValueChange={setWaterGlasses}
            max={15}
            step={1}
          />
        </div>

        {/* Sleep Hours */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Sleep: {sleepHours[0]} hours
          </label>
          <Slider
            value={sleepHours}
            onValueChange={setSleepHours}
            max={12}
            step={0.5}
          />
        </div>

        {/* Journal Entry */}
        <div className="space-y-2">
          <label htmlFor="journal" className="text-sm font-medium">
            Journal Entry (Optional)
          </label>
          <Textarea
            id="journal"
            placeholder="How did today go? What challenges did you face?"
            value={journalEntry}
            onChange={(e) => setJournalEntry(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Check-in
        </Button>
      </CardContent>
    </Card>
  );
};
