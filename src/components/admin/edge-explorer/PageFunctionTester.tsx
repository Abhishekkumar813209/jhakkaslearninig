import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { allPages, pageCategories, getPagesByCategory, type PageInfo } from '@/utils/pageToFunctionMap';
import { getFunctionById, type EdgeFunctionMetadata } from '@/utils/edgeFunctionRegistry';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { supabase } from '@/integrations/supabase/client';

interface PageFunctionTesterProps {
  onFunctionSelect: (func: EdgeFunctionMetadata) => void;
}

interface TestResult {
  functionId: string;
  success: boolean;
  responseTime: number;
  error?: any;
  response?: any;
}

export const PageFunctionTester: React.FC<PageFunctionTesterProps> = ({ onFunctionSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Student');
  const [selectedPage, setSelectedPage] = useState<PageInfo | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const pages = getPagesByCategory(selectedCategory);

  const handlePageSelect = (pagePath: string) => {
    const page = allPages.find(p => p.path === pagePath);
    setSelectedPage(page || null);
    setTestResults([]);
  };

  const testAllFunctions = async () => {
    if (!selectedPage || selectedPage.functionIds.length === 0) {
      toast.error('No functions to test on this page');
      return;
    }

    setTesting(true);
    const results: TestResult[] = [];

    for (const functionId of selectedPage.functionIds) {
      const func = getFunctionById(functionId);
      if (!func) continue;

      const startTime = Date.now();
      try {
        const body = func.exampleRequest || {};
        let response;

        if (func.requiresAuth) {
          response = await invokeWithAuth({ name: func.id, body });
        } else {
          const { data, error } = await supabase.functions.invoke(func.id, { body });
          if (error) throw error;
          response = data;
        }

        results.push({
          functionId,
          success: true,
          responseTime: Date.now() - startTime,
          response
        });
      } catch (error: any) {
        results.push({
          functionId,
          success: false,
          responseTime: Date.now() - startTime,
          error
        });
      }
    }

    setTestResults(results);
    setTesting(false);

    const successCount = results.filter(r => r.success).length;
    if (successCount === results.length) {
      toast.success(`All ${successCount} functions executed successfully`);
    } else {
      toast.warning(`${successCount}/${results.length} functions succeeded`);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Test by Page</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a page to test all edge functions it uses
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Page Category</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Select Page</label>
          <Select
            value={selectedPage?.path || ''}
            onValueChange={handlePageSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a page..." />
            </SelectTrigger>
            <SelectContent>
              {pages.map((page) => (
                <SelectItem key={page.path} value={page.path}>
                  <div className="flex items-center justify-between gap-2">
                    <span>{page.name}</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {page.functionIds.length}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Page Info */}
        {selectedPage && (
          <div className="p-3 bg-muted/50 rounded border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{selectedPage.name}</h4>
              <Badge variant="outline" className="font-mono text-xs">
                {selectedPage.path}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {selectedPage.description}
            </p>

            {selectedPage.functionIds.length > 0 ? (
              <>
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold">
                    Edge Functions Called ({selectedPage.functionIds.length})
                  </h5>
                  {selectedPage.functionIds.map((funcId) => {
                    const func = getFunctionById(funcId);
                    const result = testResults.find(r => r.functionId === funcId);

                    return (
                      <div
                        key={funcId}
                        className="flex items-center justify-between p-2 bg-background rounded border border-border cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => func && onFunctionSelect(func)}
                      >
                        <div className="flex items-center gap-2">
                          {result && (
                            result.success ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )
                          )}
                          <span className="text-sm font-mono">{funcId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              {result.responseTime}ms
                            </Badge>
                          )}
                          {func?.requiresAuth && (
                            <Badge variant="outline" className="text-xs">
                              Auth
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={testAllFunctions}
                  disabled={testing}
                  className="w-full mt-4"
                  size="sm"
                >
                  {testing ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Test All Functions
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                This page doesn't call any edge functions.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
