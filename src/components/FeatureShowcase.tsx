import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FeatureShowcaseProps {
  icon: string;
  title: string;
  description: string;
  highlights: string[];
}

export const FeatureShowcase = ({ icon, title, description, highlights }: FeatureShowcaseProps) => {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="relative z-10 pb-4">
        <div className="w-full h-48 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
          <img 
            src={icon} 
            alt={title}
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>
        <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <CardDescription className="text-muted-foreground mb-4 leading-relaxed">
          {description}
        </CardDescription>
        
        <div className="flex flex-wrap gap-2">
          {highlights.map((highlight, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
            >
              {highlight}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
