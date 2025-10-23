import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Database, Link as LinkIcon } from 'lucide-react';
import type { EdgeFunctionMetadata } from '@/utils/edgeFunctionRegistry';

interface FunctionMetadataCardProps {
  func: EdgeFunctionMetadata;
}

export const FunctionMetadataCard: React.FC<FunctionMetadataCardProps> = ({ func }) => {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{func.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{func.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={func.method === 'POST' ? 'default' : 'secondary'}>
              {func.method}
            </Badge>
            {func.requiresAuth ? (
              <Badge variant="destructive" className="gap-1">
                <Lock className="h-3 w-3" />
                Auth Required
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Unlock className="h-3 w-3" />
                Public
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Request Schema */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Request Parameters</h4>
          <div className="bg-muted/50 rounded p-3 text-sm font-mono">
            {Object.keys(func.requestSchema).length > 0 ? (
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(func.requestSchema, null, 2)}
              </pre>
            ) : (
              <span className="text-muted-foreground">No parameters</span>
            )}
          </div>
        </div>

        {/* Database Operations */}
        {func.databaseOperations.tables.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Operations
            </h4>
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Tables:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {func.databaseOperations.tables.map((table) => (
                    <Badge key={table} variant="outline" className="text-xs">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Operations:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {func.databaseOperations.operations.map((op) => (
                    <Badge
                      key={op}
                      variant={op === 'SELECT' ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {op}
                    </Badge>
                  ))}
                </div>
              </div>
              {func.databaseOperations.relationships && func.databaseOperations.relationships.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Relationships:</span>
                  <div className="mt-1 space-y-1">
                    {func.databaseOperations.relationships.map((rel, idx) => (
                      <div key={idx} className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                        {rel}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Used In Pages */}
        {func.usedInPages.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Used In Pages
            </h4>
            <div className="flex flex-wrap gap-1">
              {func.usedInPages.map((page) => (
                <Badge key={page} variant="outline" className="text-xs font-mono">
                  {page}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Function ID */}
        <div className="pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Function ID: </span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{func.id}</code>
        </div>
      </CardContent>
    </Card>
  );
};
