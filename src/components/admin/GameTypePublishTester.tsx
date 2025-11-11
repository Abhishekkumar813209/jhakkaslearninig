import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { normalizeGameTypeForContent, normalizeGameTypeForMapping } from "@/lib/gameTypeMapping";

interface GameTypeTest {
  uiName: string;
  description: string;
  rawInput: string;
  expectedContent: string;
  expectedMapping: string;
}

const gameTypeTests: GameTypeTest[] = [
  {
    uiName: "Match Column",
    description: "Line drawing to match items",
    rawInput: "match_column",
    expectedContent: "match_column",
    expectedMapping: "match_column"
  },
  {
    uiName: "Drag-Drop Sort",
    description: "Drag items into correct order",
    rawInput: "drag_drop",
    expectedContent: "drag_drop",
    expectedMapping: "drag_drop_sort"
  },
  {
    uiName: "Sequence Order",
    description: "Arrange items in sequence",
    rawInput: "sequence_order",
    expectedContent: "sequence_order",
    expectedMapping: "drag_drop_sequence"
  },
  {
    uiName: "Word Puzzle",
    description: "Crossword-style puzzles",
    rawInput: "word_puzzle",
    expectedContent: "word_puzzle",
    expectedMapping: "crossword"
  },
  {
    uiName: "Fill Blanks",
    description: "Drag words to fill blanks",
    rawInput: "fill_blanks",
    expectedContent: "fill_blanks",
    expectedMapping: "fill_blanks"
  },
  {
    uiName: "Match Pairs",
    description: "Memory card matching",
    rawInput: "match_pairs",
    expectedContent: "match_pair",
    expectedMapping: "match_pairs"
  },
  {
    uiName: "MCQ",
    description: "Multiple choice questions",
    rawInput: "mcq",
    expectedContent: "mcq",
    expectedMapping: "mcq"
  },
  {
    uiName: "True/False",
    description: "True or false statements",
    rawInput: "true_false",
    expectedContent: "true_false",
    expectedMapping: "true_false"
  }
];

export const GameTypePublishTester = () => {
  const testResults = gameTypeTests.map(test => {
    const contentResult = normalizeGameTypeForContent(test.rawInput);
    const mappingResult = normalizeGameTypeForMapping(test.rawInput);
    
    const contentPass = contentResult === test.expectedContent;
    const mappingPass = mappingResult === test.expectedMapping;
    const overallPass = contentPass && mappingPass;
    
    return {
      ...test,
      contentResult,
      mappingResult,
      contentPass,
      mappingPass,
      overallPass
    };
  });

  const allPass = testResults.every(r => r.overallPass);
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.overallPass).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Game Type Normalization Test</CardTitle>
            <CardDescription>
              Verify all game types normalize correctly for both database tables
            </CardDescription>
          </div>
          <Badge variant={allPass ? "default" : "destructive"} className="text-lg px-4 py-2">
            {passedTests}/{totalTests} Passed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {testResults.map((result, idx) => (
          <Card key={idx} className={result.overallPass ? "border-green-200" : "border-red-200"}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {result.overallPass ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <h3 className="font-semibold">{result.uiName}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.description}</p>
                </div>
                <Badge variant="outline">{result.rawInput}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                {/* Content Table Result */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    topic_learning_content.game_type
                  </div>
                  <div className="flex items-center gap-2">
                    {result.contentPass ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {result.contentResult || "null"}
                    </code>
                    {!result.contentPass && (
                      <span className="text-xs text-muted-foreground">
                        (expected: {result.expectedContent})
                      </span>
                    )}
                  </div>
                </div>

                {/* Mapping Table Result */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    topic_content_mapping.content_type
                  </div>
                  <div className="flex items-center gap-2">
                    {result.mappingPass ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {result.mappingResult || "null"}
                    </code>
                    {!result.mappingPass && (
                      <span className="text-xs text-muted-foreground">
                        (expected: {result.expectedMapping})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
