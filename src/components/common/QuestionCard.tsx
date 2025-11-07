import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { renderWithImages } from "@/lib/mathRendering";
import { parseQuestionData } from "@/lib/questionDataHelpers";
import { 
  CheckCircle, 
  Edit, 
  Trash2, 
  ChevronDown, 
  FileQuestion,
  CheckCheck,
  HelpCircle,
  ListOrdered,
  Shuffle,
  Grid2x2,
  Link2,
  Type,
  PenLine
} from "lucide-react";
import { useState } from "react";

interface QuestionCardProps {
  question: {
    id: string;
    question_number?: string;
    question_type: string;
    question_data?: any;  // JSONB column
    answer_data?: any;    // JSONB column
    question_text?: string; // Legacy fallback
    options?: string[];     // Legacy fallback
    correct_answer?: any;   // Legacy fallback
    explanation?: string;
    marks?: number;
    difficulty?: string;
    is_published?: boolean;
    admin_reviewed?: boolean;
    created_manually?: boolean;
    source_file_name?: string;
  };
  onEdit?: (question: any) => void;
  onDelete?: (questionId: string) => void;
  showActions?: boolean;
}

const gameTypeIcons: Record<string, any> = {
  mcq: FileQuestion,
  true_false: CheckCheck,
  fill_blank: PenLine,
  match_column: Link2,
  match_pairs: Grid2x2,
  sequence_order: ListOrdered,
  typing_race: Type,
  interactive_blanks: HelpCircle,
  card_memory: Shuffle,
};

const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  hard: "bg-red-500/10 text-red-600 border-red-500/20",
};

export const QuestionCard = ({ question, onEdit, onDelete, showActions = true }: QuestionCardProps) => {
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Parse JSONB data
  const parsed = parseQuestionData(question);
  const questionText = parsed.text || question.question_text || '';
  const explanation = parsed.explanation || question.explanation || '';
  
  const GameIcon = gameTypeIcons[question.question_type] || FileQuestion;
  
  const getCorrectAnswerDisplay = () => {
    const { question_type } = question;
    
    if (question_type === 'mcq' && parsed.options) {
      return parsed.options[parsed.correctIndex] || 'N/A';
    }
    
    if (question_type === 'true_false') {
      return parsed.correctValue ? 'True' : 'False';
    }
    
    if (question_type === 'fill_blank' || question_type === 'fill_blanks') {
      if (parsed.blanks && parsed.blanks.length > 0) {
        return parsed.blanks.map((b: any) => b.correctAnswer).join(', ');
      }
    }
    
    if (question_type === 'match_column' || question_type === 'match_pairs') {
      return `${parsed.correctPairs?.length || 0} pairs`;
    }
    
    return 'N/A';
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <GameIcon className="h-5 w-5 text-primary shrink-0" />
            <div className="flex flex-wrap items-center gap-2">
              {question.question_number && (
                <Badge variant="outline" className="text-xs">
                  Q{question.question_number}
                </Badge>
              )}
              
              {/* Source Badge */}
              {question.created_manually ? (
                <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                  ✏️ Manual
                </Badge>
              ) : question.source_file_name ? (
                <Badge className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                  📄 PDF
                </Badge>
              ) : null}
              
              {/* Status Badge */}
              {question.is_published ? (
                <Badge className="text-xs bg-primary/10 text-primary">
                  ✓ Published
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  📝 Draft
                </Badge>
              )}
              
              {/* Difficulty Badge */}
              {question.difficulty && (
                <Badge className={`text-xs ${difficultyColors[question.difficulty] || 'bg-gray-500/10 text-gray-600'}`}>
                  {question.difficulty}
                </Badge>
              )}
              
              {/* Marks */}
              {question.marks && (
                <Badge variant="secondary" className="text-xs">
                  {question.marks} mark{question.marks > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          {showActions && (
            <div className="flex gap-1 shrink-0">
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(question)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(question.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Question Text */}
        {question.question_type === 'mcq' && parsed.options && parsed.options.length > 0 ? (
          <div className="space-y-3">
            <div 
              className="text-sm leading-relaxed font-medium"
              dangerouslySetInnerHTML={{ __html: renderWithImages(questionText) }}
            />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Options:</div>
              <div className="grid gap-2">
                {parsed.options.map((option: string, idx: number) => {
                  const isCorrect = idx === parsed.correctIndex;
                  
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-md border text-sm ${
                        isCorrect 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-500/30' 
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant={isCorrect ? "default" : "outline"} className="shrink-0 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {String.fromCharCode(65 + idx)}
                        </Badge>
                        <div 
                          className="flex-1"
                          dangerouslySetInnerHTML={{ __html: renderWithImages(option) }}
                        />
                        {isCorrect && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : question.question_type === 'true_false' && parsed.statements ? (
          <div className="space-y-2">
            <div className="text-sm leading-relaxed font-medium">
              i. {parsed.statements[0].text}
              {parsed.statements.length > 1 && (
                <Badge variant="secondary" className="ml-2 text-xs">+{parsed.statements.length - 1} more</Badge>
              )}
            </div>
          </div>
        ) : question.question_type === 'fill_blank' && parsed.sub_questions ? (
          <div className="space-y-2">
            <div className="text-sm leading-relaxed font-medium">
              1. {parsed.sub_questions[0].text}
              {parsed.sub_questions.length > 1 && (
                <Badge variant="secondary" className="ml-2 text-xs">+{parsed.sub_questions.length - 1} more</Badge>
              )}
            </div>
          </div>
        ) : (
          <div 
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderWithImages(questionText) }}
          />
        )}
        
        {/* Correct Answer for non-MCQ */}
        {question.question_type !== 'mcq' && (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-500/30 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Correct Answer:</span>
            </div>
            <div 
              className="text-sm text-green-900 dark:text-green-100"
              dangerouslySetInnerHTML={{ __html: renderWithImages(getCorrectAnswerDisplay()) }}
            />
          </div>
        )}
        
        {/* Explanation (Collapsible) */}
        {explanation && (
          <Collapsible open={showExplanation} onOpenChange={setShowExplanation}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-primary hover:underline">
              <ChevronDown className={`h-4 w-4 transition-transform ${showExplanation ? 'rotate-180' : ''}`} />
              {showExplanation ? 'Hide' : 'Show'} Explanation
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm">
                <div 
                  dangerouslySetInnerHTML={{ __html: renderWithImages(explanation) }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};
