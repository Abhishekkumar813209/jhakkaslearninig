import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Crown, TrendingUp, Flame } from "lucide-react";

// Mock leaderboard data
const overallLeaderboard = [
  { rank: 1, name: "Priya Patel", batch: "JEE Advanced", score: 94.5, streak: 28, tests: 35, change: 0 },
  { rank: 2, name: "Rahul Sharma", batch: "JEE Main", score: 92.8, streak: 22, tests: 32, change: 1 },
  { rank: 3, name: "Arjun Singh", batch: "NEET", score: 91.2, streak: 19, tests: 30, change: -1 },
  { rank: 4, name: "Sneha Gupta", batch: "JEE Advanced", score: 89.7, streak: 25, tests: 28, change: 2 },
  { rank: 5, name: "Vikash Kumar", batch: "JEE Main", score: 88.9, streak: 15, tests: 31, change: 0 }
];

const subjectToppers = {
  Physics: [
    { name: "Rahul Sharma", score: 96.5, batch: "JEE Main" },
    { name: "Priya Patel", score: 95.2, batch: "JEE Advanced" },
    { name: "Arjun Singh", score: 93.8, batch: "NEET" }
  ],
  Chemistry: [
    { name: "Sneha Gupta", score: 97.1, batch: "JEE Advanced" },
    { name: "Priya Patel", score: 94.8, batch: "JEE Advanced" },
    { name: "Vikash Kumar", score: 92.3, batch: "JEE Main" }
  ],
  Mathematics: [
    { name: "Priya Patel", score: 98.2, batch: "JEE Advanced" },
    { name: "Rahul Sharma", score: 94.7, batch: "JEE Main" },
    { name: "Amit Verma", score: 91.5, batch: "Foundation" }
  ]
};

const streakLeaders = [
  { name: "Priya Patel", streak: 28, batch: "JEE Advanced", total: 840 },
  { name: "Sneha Gupta", streak: 25, batch: "JEE Advanced", total: 675 },
  { name: "Rahul Sharma", streak: 22, batch: "JEE Main", total: 594 },
  { name: "Arjun Singh", streak: 19, batch: "NEET", total: 513 },
  { name: "Vikash Kumar", streak: 15, batch: "JEE Main", total: 390 }
];

const batchLeaders = [
  { batch: "JEE Advanced", leader: "Priya Patel", avgScore: 89.5, totalStudents: 280 },
  { batch: "JEE Main", leader: "Rahul Sharma", avgScore: 82.3, totalStudents: 450 },
  { batch: "NEET", leader: "Arjun Singh", avgScore: 85.7, totalStudents: 320 },
  { batch: "Foundation", leader: "Amit Verma", avgScore: 76.2, totalStudents: 197 }
];

const LeaderboardManagement = () => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Leaderboard Management</h2>
          <p className="text-muted-foreground">Track top performers and student rankings</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="overall">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select leaderboard type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">Overall Performance</SelectItem>
              <SelectItem value="weekly">Weekly Rankings</SelectItem>
              <SelectItem value="monthly">Monthly Rankings</SelectItem>
              <SelectItem value="subject">Subject-wise</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Refresh Rankings</Button>
        </div>
      </div>

      {/* Overall Leaderboard */}
      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Overall Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {overallLeaderboard.map((student) => (
              <div key={student.rank} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-sm">
                    {getRankIcon(student.rank)}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{student.name}</div>
                    <div className="text-sm text-muted-foreground">{student.batch}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground">{student.score}%</div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {student.streak}
                    </div>
                    <div className="text-xs text-muted-foreground">Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-foreground">{student.tests}</div>
                    <div className="text-xs text-muted-foreground">Tests</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getChangeIndicator(student.change)}
                    {student.change !== 0 && (
                      <span className="text-xs text-muted-foreground">{Math.abs(student.change)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subject Toppers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(subjectToppers).map(([subject, toppers]) => (
          <Card key={subject} className="card-gradient shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">{subject} Toppers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {toppers.map((topper, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRankIcon(index + 1)}
                      <div>
                        <div className="text-sm font-medium">{topper.name}</div>
                        <div className="text-xs text-muted-foreground">{topper.batch}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-foreground">{topper.score}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Streak Leaders & Batch Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streak Leaders */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Streak Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {streakLeaders.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.batch}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">{student.streak}</div>
                    <div className="text-xs text-muted-foreground">{student.total} total days</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Batch Leaders */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle>Batch Leaders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {batchLeaders.map((batch, index) => (
                <div key={index} className="p-3 bg-muted/30 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{batch.batch}</Badge>
                    <div className="text-sm font-medium">{batch.avgScore}% avg</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{batch.leader}</div>
                      <div className="text-xs text-muted-foreground">{batch.totalStudents} students</div>
                    </div>
                    <Crown className="h-4 w-4 text-yellow-500" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderboardManagement;