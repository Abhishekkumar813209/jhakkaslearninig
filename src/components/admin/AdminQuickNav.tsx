import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Users, Map, BookOpen, GraduationCap, 
  HelpCircle, MapPin, Building2, FileText, Zap, FileCheck 
} from "lucide-react";

interface QuickNavItem {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const quickNavItems: QuickNavItem[] = [
  { value: 'batches', label: 'Batches', icon: Users },
  { value: 'roadmaps', label: 'Roadmaps', icon: Map },
  { value: 'manual-topics', label: 'Topics', icon: BookOpen },
  { value: 'lessons', label: 'Lessons', icon: GraduationCap },
  { value: 'question-bank', label: 'Questions', icon: HelpCircle },
  { value: 'xp-config', label: 'XP Config', icon: Zap },
  { value: 'answer-management', label: 'Solutions', icon: FileCheck },
  { value: 'tests', label: 'Tests', icon: FileText }
];

interface AdminQuickNavProps {
  activeTab: string;
}

export function AdminQuickNav({ activeTab }: AdminQuickNavProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleQuickNav = (tabValue: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tabValue);
    // All other params (domain, board, class, batch, roadmap, subject, chapter) preserved automatically
    setSearchParams(params);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {quickNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.value;
        
        return (
          <Button
            key={item.value}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => handleQuickNav(item.value)}
            className={`flex items-center gap-2 whitespace-nowrap transition-smooth ${
              isActive ? 'shadow-sm' : 'hover:bg-accent'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
