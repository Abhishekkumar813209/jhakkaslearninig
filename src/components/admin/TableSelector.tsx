import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from "lucide-react";

const AVAILABLE_TABLES = [
  { value: 'profiles', label: 'Profiles (Users)', category: 'User Management' },
  { value: 'user_roles', label: 'User Roles', category: 'User Management' },
  { value: 'batches', label: 'Batches', category: 'Batch & Roadmap' },
  { value: 'batch_roadmaps', label: 'Batch Roadmaps', category: 'Batch & Roadmap' },
  { value: 'student_roadmaps', label: 'Student Roadmaps', category: 'Batch & Roadmap' },
  { value: 'roadmap_chapters', label: 'Roadmap Chapters', category: 'Batch & Roadmap' },
  { value: 'roadmap_topics', label: 'Roadmap Topics', category: 'Batch & Roadmap' },
  { value: 'question_bank', label: 'Question Bank', category: 'Content & Learning' },
  { value: 'topic_content_mapping', label: 'Topic Content Mapping', category: 'Content & Learning' },
  { value: 'gamified_exercises', label: 'Gamified Exercises', category: 'Content & Learning' },
  { value: 'student_topic_game_progress', label: 'Student Game Progress', category: 'Progress & Analytics' },
  { value: 'student_analytics', label: 'Student Analytics', category: 'Progress & Analytics' },
  { value: 'subject_analytics', label: 'Subject Analytics', category: 'Progress & Analytics' },
  { value: 'tests', label: 'Tests', category: 'Tests & Assessments' },
  { value: 'test_attempts', label: 'Test Attempts', category: 'Tests & Assessments' },
  { value: 'questions', label: 'Questions', category: 'Tests & Assessments' },
  { value: 'fee_records', label: 'Fee Records', category: 'Finance' },
  { value: 'payments', label: 'Payments', category: 'Finance' },
  { value: 'referrals', label: 'Referrals', category: 'Finance' },
  { value: 'referral_credits', label: 'Referral Credits', category: 'Finance' },
  { value: 'schools', label: 'Schools', category: 'School & Zone' },
  { value: 'zones', label: 'Zones', category: 'School & Zone' },
];

interface TableSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

export function TableSelector({ value, onChange }: TableSelectorProps) {
  const categories = Array.from(new Set(AVAILABLE_TABLES.map(t => t.category)));

  return (
    <div className="flex items-center gap-2 w-full">
      <Database className="h-5 w-5 text-muted-foreground hidden md:block shrink-0" />
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a table to explore" />
        </SelectTrigger>
        <SelectContent>
          {categories.map(category => (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {category}
              </div>
              {AVAILABLE_TABLES
                .filter(t => t.category === category)
                .map(table => (
                  <SelectItem key={table.value} value={table.value}>
                    {table.label}
                  </SelectItem>
                ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}