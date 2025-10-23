import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Info } from 'lucide-react';
import { useIDResolver } from '@/hooks/useIDResolver';
import { IDInfoCard } from './IDInfoCard';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const IDResolver: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const { resolveID, loading, result } = useIDResolver();

  const handleResolve = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      resolveID(trimmedValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleResolve();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            ID Resolver
          </CardTitle>
          <CardDescription>
            Paste any UUID to find what it represents across all database tables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Supports: topic_content_mapping, profiles, tests, roadmap_topics, batches, gamified_exercises
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Input
              placeholder="Paste UUID here (e.g., df25b93a-1668-406c-87a7-dd3c439f8d6b)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="font-mono"
            />
            <Button onClick={handleResolve} disabled={loading || !inputValue.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Resolve
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && <IDInfoCard result={result} />}
    </div>
  );
};
