import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ProgressCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  description?: string;
  icon?: React.ReactNode;
  color?: "primary" | "success" | "warning" | "destructive";
}

const ProgressCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  description, 
  icon,
  color = "primary" 
}: ProgressCardProps) => {
  const getChangeIcon = () => {
    switch (changeType) {
      case "increase":
        return <TrendingUp className="h-4 w-4" />;
      case "decrease":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case "increase":
        return "text-success";
      case "decrease":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getIconColor = () => {
    switch (color) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "destructive":
        return "text-destructive";
      default:
        return "text-primary";
    }
  };

  return (
    <Card className="shadow-soft hover:shadow-medium transition-smooth">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={`${getIconColor()}`}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {value}
          </div>
          
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              <Badge 
                variant="secondary" 
                className={`${getChangeColor()} bg-transparent border-0 p-0`}
              >
                {getChangeIcon()}
                <span className="ml-1">
                  {Math.abs(change)}%
                </span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                vs last week
              </span>
            </div>
          )}
          
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressCard;