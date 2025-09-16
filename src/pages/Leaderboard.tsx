import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp, Users } from 'lucide-react';

const Leaderboard = () => {
  const topStudents = [
    {
      rank: 1,
      name: 'Aarav Sharma',
      score: 2890,
      streak: 45,
      batch: 'JEE Advanced',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    },
    {
      rank: 2,
      name: 'Priya Patel',
      score: 2785,
      streak: 38,
      batch: 'NEET',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    },
    {
      rank: 3,
      name: 'Rohit Gupta',
      score: 2650,
      streak: 32,
      batch: 'JEE Main',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    },
  ];

  const leaderboardData = [
    ...topStudents,
    {
      rank: 4,
      name: 'Ananya Singh',
      score: 2540,
      streak: 28,
      batch: 'JEE Advanced',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    },
    {
      rank: 5,
      name: 'Karan Verma',
      score: 2435,
      streak: 25,
      batch: 'NEET',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    },
    {
      rank: 6,
      name: 'Sneha Reddy',
      score: 2380,
      streak: 22,
      batch: 'JEE Main',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-orange-600" />;
      default: return <span className="text-muted-foreground font-semibold">#{rank}</span>;
    }
  };

  const getBatchColor = (batch: string) => {
    switch (batch) {
      case 'JEE Advanced': return 'destructive';
      case 'JEE Main': return 'secondary';
      case 'NEET': return 'secondary'; // Changed from 'success' to 'secondary'
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            See how you rank among your peers
          </p>
        </div>

        {/* Top 3 Podium */}
        <div className="mb-8">
          <Card className="p-6 shadow-soft">
            <CardHeader className="text-center mb-6">
              <CardTitle className="text-2xl">Top Performers</CardTitle>
            </CardHeader>
            <div className="grid md:grid-cols-3 gap-6">
              {topStudents.map((student, index) => (
                <div key={student.rank} className={`text-center ${index === 0 ? 'md:order-2' : index === 1 ? 'md:order-1' : 'md:order-3'}`}>
                  <div className={`relative mb-4 ${index === 0 ? 'scale-110' : ''}`}>
                    <Avatar className="h-20 w-20 mx-auto mb-2">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-2 -right-2">
                      {getRankIcon(student.rank)}
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1">{student.name}</h3>
                  <div className="text-2xl font-bold text-primary mb-1">{student.score}</div>
                  <div className="text-sm text-muted-foreground mb-2">points</div>
                  <Badge variant={getBatchColor(student.batch)} className="text-xs">
                    {student.batch}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Full Leaderboard */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Weekly Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboardData.map((student) => (
                <div
                  key={student.rank}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-smooth"
                >
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(student.rank)}
                  </div>
                  
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.avatar} />
                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="font-semibold">{student.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {student.streak} day streak
                    </div>
                  </div>
                  
                  <Badge variant={getBatchColor(student.batch)}>
                    {student.batch}
                  </Badge>
                  
                  <div className="text-right">
                    <div className="font-bold text-primary">{student.score}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +120
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Your Rank Card */}
        <div className="mt-8">
          <Card className="shadow-soft border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                  <span className="text-primary font-bold">#12</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Your Current Rank</div>
                  <div className="text-sm text-muted-foreground">
                    You're in the top 25% of students!
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">2,180 points</div>
                  <div className="text-sm text-success">+45 this week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;