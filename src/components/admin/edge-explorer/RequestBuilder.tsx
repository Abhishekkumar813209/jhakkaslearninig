import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Play, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { EdgeFunctionMetadata } from '@/utils/edgeFunctionRegistry';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { supabase } from '@/integrations/supabase/client';

interface RequestBuilderProps {
  func: EdgeFunctionMetadata;
  onResponse: (response: any, error?: any, responseTime?: number) => void;
}

export const RequestBuilder: React.FC<RequestBuilderProps> = ({ func, onResponse }) => {
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(func.exampleRequest || func.requestSchema, null, 2)
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(requestBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const handleSendRequest = async () => {
    setLoading(true);
    const startTime = Date.now();

    try {
      let body;
      try {
        body = requestBody.trim() ? JSON.parse(requestBody) : {};
      } catch (e) {
        toast.error('Invalid JSON in request body');
        setLoading(false);
        return;
      }

      let response;
      if (func.requiresAuth) {
        response = await invokeWithAuth({ name: func.id, body });
      } else {
        const { data, error } = await supabase.functions.invoke(func.id, { body });
        if (error) throw error;
        response = data;
      }

      const responseTime = Date.now() - startTime;
      onResponse(response, null, responseTime);
      toast.success(`Function executed in ${responseTime}ms`);
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      onResponse(null, error, responseTime);
      toast.error(error.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Request Builder</CardTitle>
          <div className="flex items-center gap-2">
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
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Request Body (JSON)</Label>
          <Textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            placeholder='{"key": "value"}'
            className="font-mono text-xs mt-1.5 min-h-[150px]"
          />
        </div>

        <Button
          onClick={handleSendRequest}
          disabled={loading}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Send Request
            </>
          )}
        </Button>

        {func.requiresAuth && (
          <p className="text-xs text-muted-foreground">
            🔒 This function requires authentication. Your session token will be included automatically.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
