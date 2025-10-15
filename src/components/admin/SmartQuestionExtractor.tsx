import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2, Eye, FileText, CheckCircle2, Search, Filter } from "lucide-react";
import { getDocument } from 'pdfjs-dist';

interface ExtractedQuestion {
  id: string;
  question_number: string;
  question_type: 'mcq' | 'match_column' | 'assertion_reason' | 'fill_blank' | 'true_false' | 'short_answer';
  question_text: string;
  options?: string[];
  left_column?: string[];
  right_column?: string[];
  assertion?: string;
  reason?: string;
  blanks_count?: number;
  marks?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface SmartQuestionExtractorProps {
  selectedTopic?: string;
  onQuestionsAdded: (questions: ExtractedQuestion[]) => void;
}

export const SmartQuestionExtractor = ({ selectedTopic, onQuestionsAdded }: SmartQuestionExtractorProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<ExtractedQuestion | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Enhanced text extraction for better structure preservation
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Preserve layout structure
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n--- PAGE ${i} ---\n${pageText}\n`;
    }
    
    return fullText;
  };

  // Add structure markers to help AI detect question types
  const enhanceTextForAI = (text: string): string => {
    let enhanced = text;
    
    // Mark question numbers clearly
    enhanced = enhanced.replace(/(\d+)\.\s+/g, '\n\n[QUESTION_$1]\n');
    
    // Mark match column questions
    enhanced = enhanced.replace(/(Match.*column.*II)/gi, '\n[MATCH_COLUMN]\n$1\n');
    enhanced = enhanced.replace(/(Match.*the.*following)/gi, '\n[MATCH_COLUMN]\n$1\n');
    
    // Mark assertion-reason questions
    enhanced = enhanced.replace(/(Assertion.*?\(A\).*?:)/gi, '\n[ASSERTION_REASON]\nAssertion (A):');
    enhanced = enhanced.replace(/(Reason.*?\(R\).*?:)/gi, 'Reason (R):');
    
    // Mark fill in the blanks
    enhanced = enhanced.replace(/(.*?_____.*?)/g, '[FILL_BLANK]$1');
    
    return enhanced;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    setIsUploading(true);
    setIsExtracting(true);

    try {
      let fileContent = '';

      // Extract text based on file type
      if (file.type === 'application/pdf') {
        toast.info("Extracting text from PDF with advanced parsing...", { duration: 3000 });
        fileContent = await extractTextFromPDF(file);
      } else {
        // For Word docs, read as text
        fileContent = await file.text();
      }

      // Enhance text with structure markers
      const enhancedContent = enhanceTextForAI(fileContent);

      console.log('📄 Document Analysis:', {
        original_length: fileContent.length,
        enhanced_length: enhancedContent.length,
        first_200_chars: enhancedContent.substring(0, 200),
        question_markers: (enhancedContent.match(/\[QUESTION_/g) || []).length,
        assertion_markers: (enhancedContent.match(/\[ASSERTION_REASON\]/g) || []).length,
        match_markers: (enhancedContent.match(/\[MATCH_COLUMN\]/g) || []).length,
        fill_blank_markers: (enhancedContent.match(/\[FILL_BLANK\]/g) || []).length
      });

      // Call AI extraction edge function
      const { data, error } = await supabase.functions.invoke('ai-extract-all-questions', {
        body: {
          file_content: enhancedContent,
          subject: 'General',
          chapter: '',
          topic: ''
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      // Add unique IDs to questions
      const questionsWithIds = data.questions.map((q: any, index: number) => ({
        ...q,
        id: `q-${Date.now()}-${index}`,
        auto_corrected: q.auto_corrected || false
      }));

      setExtractedQuestions(questionsWithIds);
      toast.success(`Found ${data.total_questions} questions! Select the ones you want to add.`);

    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract questions');
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const filtered = getFilteredQuestions();
    setSelectedIds(filtered.map(q => q.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const getFilteredQuestions = () => {
    let filtered = extractedQuestions;

    if (filterType !== 'all') {
      filtered = filtered.filter(q => q.question_type === filterType);
    }

    if (searchText) {
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(searchText.toLowerCase()) ||
        q.question_number.includes(searchText)
      );
    }

    return filtered;
  };

  const handleAddToGames = () => {
    const selected = extractedQuestions.filter(q => selectedIds.includes(q.id));
    if (selected.length === 0) {
      toast.error("Please select at least one question");
      return;
    }

    onQuestionsAdded(selected);
    toast.success(`Adding ${selected.length} questions to lesson builder...`);
    
    // Clear selection
    setSelectedIds([]);
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'mcq': 'Multiple Choice',
      'match_column': 'Match Column',
      'assertion_reason': 'Assertion-Reason',
      'fill_blank': 'Fill in Blanks',
      'true_false': 'True/False',
      'short_answer': 'Short Answer'
    };
    return labels[type] || type;
  };

  const getQuestionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'mcq': 'bg-blue-500',
      'match_column': 'bg-purple-500',
      'assertion_reason': 'bg-orange-500',
      'fill_blank': 'bg-green-500',
      'true_false': 'bg-yellow-500',
      'short_answer': 'bg-pink-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getDifficultyColor = (difficulty?: string) => {
    const colors: Record<string, string> = {
      'easy': 'text-green-600',
      'medium': 'text-yellow-600',
      'hard': 'text-red-600'
    };
    return colors[difficulty || 'medium'] || 'text-gray-600';
  };

  const filteredQuestions = getFilteredQuestions();

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      {extractedQuestions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload PDF/Word Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload a PDF or Word document containing questions. AI will automatically detect all questions and their types.
              </p>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button asChild disabled={isUploading}>
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extraction Progress */}
      {isExtracting && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <div>
                <p className="font-medium">AI is analyzing your document...</p>
                <p className="text-sm text-muted-foreground">This may take a minute for large files</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Grid */}
      {extractedQuestions.length > 0 && (
        <>
          {/* Filter Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types ({extractedQuestions.length})</SelectItem>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="match_column">Match Column</SelectItem>
                    <SelectItem value="assertion_reason">Assertion-Reason</SelectItem>
                    <SelectItem value="fill_blank">Fill in Blanks</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All ({filteredQuestions.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="mt-3 text-sm text-muted-foreground">
                Found {extractedQuestions.length} questions • Selected {selectedIds.length}
              </div>
            </CardContent>
          </Card>

          {/* Questions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuestions.map((question) => (
              <Card 
                key={question.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedIds.includes(question.id) ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
                }`}
                onClick={() => toggleSelection(question.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Checkbox 
                      checked={selectedIds.includes(question.id)}
                      onCheckedChange={() => toggleSelection(question.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getQuestionTypeColor(question.question_type)}>
                          {getQuestionTypeLabel(question.question_type)}
                        </Badge>
                        {question.difficulty && (
                          <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                            {question.difficulty}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Q{question.question_number} • {question.marks || 1} mark(s)
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-3 mb-3">
                    {question.question_text}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewQuestion(question);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Bar */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{selectedIds.length} selected</span>
                    </div>
                    <Button onClick={handleAddToGames} size="lg">
                      Add to Lesson Builder ({selectedIds.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Question {previewQuestion?.question_number} Preview
            </DialogTitle>
            <DialogDescription>
              <div className="flex gap-2 mt-2">
                <Badge className={getQuestionTypeColor(previewQuestion?.question_type || '')}>
                  {getQuestionTypeLabel(previewQuestion?.question_type || '')}
                </Badge>
                {previewQuestion?.difficulty && (
                  <Badge variant="outline" className={getDifficultyColor(previewQuestion.difficulty)}>
                    {previewQuestion.difficulty}
                  </Badge>
                )}
                <Badge variant="outline">
                  {previewQuestion?.marks || 1} mark(s)
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Question:</h4>
              <p className="text-sm whitespace-pre-wrap">{previewQuestion?.question_text}</p>
            </div>

            {previewQuestion?.options && previewQuestion.options.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Options:</h4>
                <ul className="space-y-1">
                  {previewQuestion.options.map((opt, idx) => (
                    <li key={idx} className="text-sm pl-4">{opt}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewQuestion?.left_column && previewQuestion?.right_column && (
              <div>
                <h4 className="font-medium mb-2">Matching Items:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium mb-1">Column I:</p>
                    <ul className="space-y-1">
                      {previewQuestion.left_column.map((item, idx) => (
                        <li key={idx} className="text-sm">• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">Column II:</p>
                    <ul className="space-y-1">
                      {previewQuestion.right_column.map((item, idx) => (
                        <li key={idx} className="text-sm">• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {previewQuestion?.assertion && previewQuestion?.reason && (
              <div>
                <h4 className="font-medium mb-2">Assertion & Reason:</h4>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Assertion:</strong> {previewQuestion.assertion}</p>
                  <p className="text-sm"><strong>Reason:</strong> {previewQuestion.reason}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
