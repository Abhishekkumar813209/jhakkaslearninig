import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ResponseViewerProps {
  response: any;
  error: any;
  responseTime?: number;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  error,
  responseTime
}) => {
  const [copied, setCopied] = useState(false);

  const hasResponse = response !== null || error !== null;
  const isError = error !== null;
  const statusCode = isError ? (error.code || 500) : 200;

  const handleCopy = () => {
    const textToCopy = JSON.stringify(isError ? error : response, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Response copied to clipboard');
  };

  if (!hasResponse) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Response</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No response yet. Send a request to see the response here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Response</CardTitle>
            <Badge
              variant={isError ? 'destructive' : 'default'}
              className="font-mono"
            >
              {statusCode}
            </Badge>
            {responseTime && (
              <Badge variant="secondary" className="font-mono text-xs">
                {responseTime}ms
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="pretty" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="pretty">Pretty</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>

          <TabsContent value="pretty" className="mt-0">
            <div className="bg-muted/50 rounded p-4 max-h-[500px] overflow-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(isError ? error : response, null, 2)}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="mt-0">
            <div className="bg-muted/50 rounded p-4 max-h-[500px] overflow-auto">
              <pre className="text-xs font-mono break-all">
                {JSON.stringify(isError ? error : response)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>

        {isError && error.message && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded">
            <p className="text-sm font-medium text-destructive">Error Message:</p>
            <p className="text-sm text-destructive/90 mt-1">{error.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
