import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, BookOpen } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BoardClassSelectorProps {
  examType: string;
  selectedBoard: string | null;
  selectedClass: string | null;
  onBoardSelect: (board: string) => void;
  onClassSelect: (cls: string) => void;
  onReset: () => void;
  onResetToBoard?: () => void;
  studentCounts?: {
    byBoard?: Record<string, number>;
    byClass?: Record<string, Record<string, number>>;
  };
}

const BOARDS = [
  { code: "CBSE", name: "CBSE", color: "bg-gradient-to-br from-blue-500 to-blue-600" },
  { code: "ICSE", name: "ICSE", color: "bg-gradient-to-br from-purple-500 to-purple-600" },
  { code: "State Board", name: "State Board", color: "bg-gradient-to-br from-green-500 to-green-600" },
  { code: "IGCSE", name: "IGCSE", color: "bg-gradient-to-br from-orange-500 to-orange-600" },
];

const CLASSES = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Class ${i + 1}`,
}));

export const BoardClassSelector = ({
  examType,
  selectedBoard,
  selectedClass,
  onBoardSelect,
  onClassSelect,
  onReset,
  onResetToBoard,
  studentCounts = {},
}: BoardClassSelectorProps) => {
  // Only show for school education
  if (examType !== 'school') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Interactive Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {selectedBoard || selectedClass ? (
              <BreadcrumbLink 
                onClick={onReset}
                className="cursor-pointer hover:text-primary transition-colors"
              >
                School Education
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>School Education</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          
          {selectedBoard && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {selectedClass ? (
                  <BreadcrumbLink 
                    onClick={onResetToBoard}
                    className="cursor-pointer hover:text-primary transition-colors"
                  >
                    {selectedBoard}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{selectedBoard}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          )}
          
          {selectedClass && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Class {selectedClass}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Board Selection */}
      {!selectedBoard && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select Board</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {BOARDS.map((board, index) => (
              <Card
                key={board.code}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in hover:scale-105 border-2 hover:border-primary"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => onBoardSelect(board.code)}
              >
                <CardContent className="p-6">
                  <div className={`w-full h-24 ${board.color} rounded-lg mb-4 flex items-center justify-center`}>
                    <BookOpen className="h-12 w-12 text-white" />
                  </div>
                  <h4 className="font-semibold text-lg mb-2">{board.name}</h4>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{studentCounts.byBoard?.[board.code] || 0} items</span>
                    <Badge variant="secondary">{studentCounts.byBoard?.[board.code] || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Class Selection */}
      {selectedBoard && !selectedClass && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select Class ({selectedBoard})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {CLASSES.map((cls, index) => (
              <Card
                key={cls.value}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in hover:scale-105 border-2 hover:border-primary"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => onClassSelect(cls.value)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">{cls.value}</div>
                  <p className="text-sm text-muted-foreground">
                    {studentCounts.byClass?.[selectedBoard]?.[cls.value] || 0} items
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected Board & Class Info */}
      {selectedBoard && selectedClass && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 animate-fade-in">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/20">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-xl font-bold">{selectedBoard} - Class {selectedClass}</p>
              </div>
            </div>
            <Badge className="text-lg px-4 py-2">
              {studentCounts.byClass?.[selectedBoard]?.[selectedClass] || 0} items
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
