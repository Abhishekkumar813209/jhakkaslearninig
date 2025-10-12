import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, AlertTriangle, AlertOctagon } from "lucide-react";
import { motion } from "framer-motion";

interface ZoneStatusData {
  zone_color: 'green' | 'yellow' | 'red';
  factors: {
    daily_target_completion: number;
    weekly_avg_score: number;
    topic_mastery_percentage: number;
    expected_pass_probability: number;
  };
  recommendation: string;
  calculated_at: string;
}

interface StudentZoneAnalysisProps {
  zoneStatus: ZoneStatusData;
}

export const StudentZoneAnalysis = ({ zoneStatus }: StudentZoneAnalysisProps) => {
  const zoneConfig = {
    green: {
      icon: ShieldCheck,
      label: "Green Zone - Excellent",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-800"
    },
    yellow: {
      icon: AlertTriangle,
      label: "Yellow Zone - Needs Improvement",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      borderColor: "border-yellow-200 dark:border-yellow-800"
    },
    red: {
      icon: AlertOctagon,
      label: "Red Zone - Urgent Attention",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      borderColor: "border-red-200 dark:border-red-800"
    }
  };

  const config = zoneConfig[zoneStatus.zone_color];
  const ZoneIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`${config.bgColor} border-2 ${config.borderColor}`}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ZoneIcon className={`h-12 w-12 ${config.color}`} />
            </motion.div>
            <div className="flex-1">
              <CardTitle className={config.color}>{config.label}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Last calculated: {new Date(zoneStatus.calculated_at).toLocaleString()}
              </p>
            </div>
            <Badge variant={zoneStatus.zone_color === 'green' ? 'default' : 'destructive'} className="text-lg px-4 py-2">
              {zoneStatus.zone_color.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Daily Target Completion</span>
                <span className="font-bold">{zoneStatus.factors.daily_target_completion.toFixed(1)}%</span>
              </div>
              <Progress value={zoneStatus.factors.daily_target_completion} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Weekly Avg Score</span>
                <span className="font-bold">{zoneStatus.factors.weekly_avg_score.toFixed(1)}%</span>
              </div>
              <Progress value={zoneStatus.factors.weekly_avg_score} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Topic Mastery</span>
                <span className="font-bold">{zoneStatus.factors.topic_mastery_percentage.toFixed(1)}%</span>
              </div>
              <Progress value={zoneStatus.factors.topic_mastery_percentage} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Pass Probability</span>
                <span className="font-bold">{zoneStatus.factors.expected_pass_probability.toFixed(1)}%</span>
              </div>
              <Progress value={zoneStatus.factors.expected_pass_probability} className="h-2" />
            </div>
          </div>

          {/* Recommendation */}
          <div className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
            <h4 className="font-semibold mb-2">📋 Recommendation:</h4>
            <p className="text-sm">{zoneStatus.recommendation}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};