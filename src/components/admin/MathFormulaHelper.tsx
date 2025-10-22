import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { renderMath } from '@/lib/mathRendering';
import { Lightbulb, ArrowRight } from 'lucide-react';

interface MathFormulaHelperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (formula: string) => void;
}

const GREEK_LETTERS = [
  { symbol: 'α', name: 'alpha' },
  { symbol: 'β', name: 'beta' },
  { symbol: 'γ', name: 'gamma' },
  { symbol: 'δ', name: 'delta' },
  { symbol: 'ε', name: 'epsilon' },
  { symbol: 'θ', name: 'theta' },
  { symbol: 'λ', name: 'lambda' },
  { symbol: 'μ', name: 'mu' },
  { symbol: 'π', name: 'pi' },
  { symbol: 'σ', name: 'sigma' },
  { symbol: 'Δ', name: 'Delta' },
  { symbol: 'Σ', name: 'Sigma' },
  { symbol: 'Ω', name: 'Omega' },
];

const OPERATORS = [
  { symbol: '≤', name: 'less than or equal' },
  { symbol: '≥', name: 'greater than or equal' },
  { symbol: '≈', name: 'approximately' },
  { symbol: '≠', name: 'not equal' },
  { symbol: '±', name: 'plus-minus' },
  { symbol: '×', name: 'multiply' },
  { symbol: '÷', name: 'divide' },
  { symbol: '√', name: 'square root' },
  { symbol: '∞', name: 'infinity' },
  { symbol: '∫', name: 'integral' },
  { symbol: '∂', name: 'partial' },
  { symbol: '∑', name: 'summation' },
];

const TEMPLATES = [
  { name: 'Quadratic Equation', formula: 'ax^2 + bx + c = 0' },
  { name: 'Fraction', formula: '(a + b)/(c + d)' },
  { name: 'Chemical Formula', formula: 'H_2SO_4' },
  { name: 'Physics Equation', formula: 'F = ma' },
  { name: 'Exponent', formula: 'a^n × a^m = a^(n+m)' },
  { name: 'Logarithm', formula: 'log_a(xy) = log_a(x) + log_a(y)' },
  { name: 'Trigonometry', formula: 'sin^2(θ) + cos^2(θ) = 1' },
  { name: 'Chemical Reaction', formula: '2H_2 + O_2 → 2H_2O' },
  { name: 'Vector Equation', formula: '→r = λ(→i + 2→j - →k)' },
  { name: 'Unit Vector', formula: '\\hat{i} + \\hat{j} + \\hat{k}' },
  { name: 'Vector Components', formula: '→a = a_x→i + a_y→j + a_z→k' },
  { name: 'Position Vector', formula: '→r = x\\hat{i} + y\\hat{j} + z\\hat{k}' },
  { name: 'Vector Addition', formula: '→a + →b = (→i + →j) + (2→i - →k)' },
];

export const MathFormulaHelper: React.FC<MathFormulaHelperProps> = ({
  open,
  onOpenChange,
  onInsert,
}) => {
  const [formula, setFormula] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newFormula = formula.substring(0, start) + text + formula.substring(end);
    
    setFormula(newFormula);
    setCursorPosition(start + text.length);
    
    // Set cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleInsert = () => {
    if (formula.trim()) {
      onInsert(formula);
      setFormula('');
      onOpenChange(false);
    }
  };

  const applyTemplate = (templateFormula: string) => {
    setFormula(templateFormula);
    textareaRef.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Math Formula Helper</DialogTitle>
          <DialogDescription>
            Type or build your mathematical equation using shortcuts and templates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Area */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Formula</label>
            <Textarea
              ref={textareaRef}
              value={formula}
              onChange={(e) => {
                setFormula(e.target.value);
                setCursorPosition(e.target.selectionStart);
              }}
              onSelect={(e) => {
                const target = e.target as HTMLTextAreaElement;
                setCursorPosition(target.selectionStart);
              }}
              placeholder="Type your equation here... (e.g., a_1^2 + b_1^2 = c_1^2)"
              className="font-mono min-h-[100px]"
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3" />
              <span>
                Use <code className="px-1 bg-muted rounded">_</code> for subscript and{' '}
                <code className="px-1 bg-muted rounded">^</code> for superscript
              </span>
            </div>
          </div>

          {/* Live Preview */}
          {formula && (
            <div className="border rounded-md p-4 bg-muted/30">
              <label className="text-sm font-medium mb-2 block">Preview</label>
              <div 
                className="prose prose-sm max-w-none text-lg"
                dangerouslySetInnerHTML={{ __html: renderMath(formula) }}
              />
            </div>
          )}

          {/* Quick Insert Tabs */}
          <Tabs defaultValue="patterns" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="greek">Greek</TabsTrigger>
              <TabsTrigger value="operators">Operators</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="patterns" className="space-y-3">
              <ScrollArea className="h-[180px] w-full rounded border p-3">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium mb-2">Common Patterns</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertAtCursor('_')}
                      >
                        _ <span className="text-muted-foreground ml-1">(subscript)</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertAtCursor('^')}
                      >
                        ^ <span className="text-muted-foreground ml-1">(superscript)</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertAtCursor('()')}
                      >
                        ( ) <span className="text-muted-foreground ml-1">(parentheses)</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertAtCursor('/')}
                      >
                        / <span className="text-muted-foreground ml-1">(fraction)</span>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Examples</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded flex-1">x^2</code>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="flex-1">x²</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded flex-1">H_2O</code>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="flex-1">H₂O</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded flex-1">a^(n+m)</code>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="flex-1">a⁽ⁿ⁺ᵐ⁾</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded flex-1">(a+b)/(c-d)</code>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="flex-1">Fraction notation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="greek">
              <ScrollArea className="h-[180px] w-full rounded border p-3">
                <div className="grid grid-cols-4 gap-2">
                  {GREEK_LETTERS.map((letter) => (
                    <Button
                      key={letter.symbol}
                      variant="outline"
                      size="sm"
                      onClick={() => insertAtCursor(letter.symbol)}
                      className="justify-start"
                    >
                      <span className="text-lg mr-2">{letter.symbol}</span>
                      <span className="text-xs text-muted-foreground">{letter.name}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="operators">
              <ScrollArea className="h-[180px] w-full rounded border p-3">
                <div className="grid grid-cols-3 gap-2">
                  {OPERATORS.map((op) => (
                    <Button
                      key={op.symbol}
                      variant="outline"
                      size="sm"
                      onClick={() => insertAtCursor(op.symbol)}
                      className="justify-start"
                    >
                      <span className="text-lg mr-2">{op.symbol}</span>
                      <span className="text-xs text-muted-foreground">{op.name}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="templates">
              <ScrollArea className="h-[180px] w-full rounded border p-3">
                <div className="space-y-2">
                  {TEMPLATES.map((template, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => applyTemplate(template.formula)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{template.name}</p>
                        <code className="text-xs text-muted-foreground">{template.formula}</code>
                      </div>
                      <Button variant="ghost" size="sm">
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setFormula('');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInsert}
              disabled={!formula.trim()}
            >
              Insert Formula
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
