import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, ArrowRight } from 'lucide-react';
import type { EdgeFunctionMetadata } from '@/utils/edgeFunctionRegistry';

interface DatabaseInspectorProps {
  func: EdgeFunctionMetadata;
}

export const DatabaseInspector: React.FC<DatabaseInspectorProps> = ({ func }) => {
  const { tables, operations, relationships } = func.databaseOperations;

  if (tables.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Inspector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This function does not perform any database operations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Database Inspector
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tables Used */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Tables Accessed ({tables.length})</h4>
          <div className="grid grid-cols-2 gap-2">
            {tables.map((table) => (
              <div
                key={table}
                className="p-2 bg-muted/50 rounded border border-border"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">{table}</span>
                  <Badge variant="outline" className="text-xs">
                    Table
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operations */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Query Operations</h4>
          <div className="flex flex-wrap gap-2">
            {operations.map((op) => (
              <Badge
                key={op}
                variant={op === 'SELECT' ? 'secondary' : 'default'}
                className="text-sm px-3 py-1"
              >
                {op}
              </Badge>
            ))}
          </div>
        </div>

        {/* Relationships */}
        {relationships && relationships.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Table Relationships</h4>
            <div className="space-y-2">
              {relationships.map((rel, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
                >
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs">{rel}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Flow Visualization */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-sm font-semibold mb-3">Data Flow</h4>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {tables[0] || 'Database'}
            </Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">
              Edge Function
            </Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              Frontend
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
