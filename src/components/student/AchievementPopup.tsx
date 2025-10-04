import { useEffect, useState } from "react";
import { Trophy, Share2, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Achievement {
  id: string;
  achievement_type: string;
  test_id?: string;
  score?: number;
  subject?: string;
  metadata?: any;
  achieved_at: string;
}

export const AchievementPopup = () => {
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAchievements();

    const channel = supabase
      .channel('achievement-updates')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'achievements' 
        },
        (payload) => {
          const achievement = payload.new as Achievement;
          setNewAchievement(achievement);
          fetchAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("student_id", user.id)
        .order("achieved_at", { ascending: false });

      if (error) throw error;
      if (data) setAllAchievements(data);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    }
  };

  const shareAchievement = (achievement: Achievement) => {
    const text = `🏆 I just unlocked "${getAchievementTitle(achievement.achievement_type)}" achievement!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Achievement Unlocked!',
        text: text,
      }).catch(() => {
        copyToClipboard(text);
      });
    } else {
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Achievement copied to clipboard",
    });
  };

  const getAchievementTitle = (type: string): string => {
    const titles: Record<string, string> = {
      'perfect_scorer': '💯 Perfect Score',
      'speed_demon': '⚡ Speed Demon',
      'first_test': '🎯 First Test',
      'streak_master': '🔥 Streak Master',
      'quiz_champion': '👑 Quiz Champion',
    };
    return titles[type] || '🏆 Achievement';
  };

  const getAchievementDescription = (achievement: Achievement): string => {
    switch (achievement.achievement_type) {
      case 'perfect_scorer':
        return `Perfect score on ${achievement.subject || 'a test'}!`;
      case 'speed_demon':
        return `Completed in record time with ${achievement.score}% accuracy!`;
      case 'first_test':
        return 'Completed your first test!';
      case 'streak_master':
        return `Maintained a ${achievement.metadata?.days || 7} day streak!`;
      default:
        return 'Achievement unlocked!';
    }
  };

  const getAchievementColor = (type: string): string => {
    const colors: Record<string, string> = {
      'perfect_scorer': 'from-yellow-400 to-orange-500',
      'speed_demon': 'from-blue-400 to-purple-500',
      'first_test': 'from-green-400 to-teal-500',
      'streak_master': 'from-red-400 to-pink-500',
      'quiz_champion': 'from-purple-400 to-indigo-500',
    };
    return colors[type] || 'from-gray-400 to-gray-600';
  };

  return (
    <>
      {/* New Achievement Popup */}
      <Dialog open={!!newAchievement} onOpenChange={() => setNewAchievement(null)}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <DialogHeader className="text-center space-y-2">
            <div className="mx-auto relative">
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${
                newAchievement ? getAchievementColor(newAchievement.achievement_type) : ''
              } flex items-center justify-center animate-bounce`}>
                <Trophy className="h-12 w-12 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-yellow-400 animate-pulse" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              Achievement Unlocked!
            </DialogTitle>
            <DialogDescription className="text-lg">
              {newAchievement && getAchievementTitle(newAchievement.achievement_type)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              {newAchievement && getAchievementDescription(newAchievement)}
            </p>
            
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => newAchievement && shareAchievement(newAchievement)}
                variant="outline"
                size="sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={() => {
                  setNewAchievement(null);
                  setShowGallery(true);
                }}
                variant="outline"
                size="sm"
              >
                <Trophy className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Achievement Gallery */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Achievement Gallery
            </DialogTitle>
            <DialogDescription>
              {allAchievements.length} achievements unlocked
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-3 mt-4">
              {allAchievements.map(achievement => (
                <Card key={achievement.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${
                        getAchievementColor(achievement.achievement_type)
                      } flex items-center justify-center flex-shrink-0`}>
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">
                          {getAchievementTitle(achievement.achievement_type)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {getAchievementDescription(achievement)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(achievement.achieved_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => shareAchievement(achievement)}
                        variant="ghost"
                        size="sm"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {allAchievements.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Trophy className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>No achievements yet</p>
                  <p className="text-sm mt-1">Complete quests and tests to unlock achievements!</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recent" className="space-y-3 mt-4">
              {allAchievements.slice(0, 5).map(achievement => (
                <Card key={achievement.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${
                        getAchievementColor(achievement.achievement_type)
                      } flex items-center justify-center flex-shrink-0`}>
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">
                          {getAchievementTitle(achievement.achievement_type)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {getAchievementDescription(achievement)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(achievement.achieved_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => shareAchievement(achievement)}
                        variant="ghost"
                        size="sm"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
