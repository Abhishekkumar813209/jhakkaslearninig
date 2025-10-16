import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface TestAttempt {
  test_id: string;
  test_title: string;
  score: number;
  total_marks: number;
  percentage: number;
  submitted_at: string;
  passed: boolean;
}

interface SubjectChapterTestAnalysisProps {
  testAnalysis: Record<string, TestAttempt[]>;
}

export function SubjectChapterTestAnalysis({ testAnalysis }: SubjectChapterTestAnalysisProps) {
  const subjects = Object.keys(testAnalysis);

  if (subjects.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Targets</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {subjects.map((subject) => (
            <AccordionItem key={subject} value={subject}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-semibold">{subject}</span>
                  <Badge variant="secondary">
                    {testAnalysis[subject].length} tests
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {testAnalysis[subject].map((test, idx) => (
                    <div
                      key={`${test.test_id}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {test.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{test.test_title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(test.submitted_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-lg font-bold ${test.passed ? 'text-green-600' : 'text-red-600'}`}>
                          {test.percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {test.score}/{test.total_marks}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
