import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Database } from 'lucide-react';
import { toast } from 'sonner';
import type { ResolvedID } from '@/hooks/useIDResolver';

interface IDInfoCardProps {
  result: ResolvedID;
}

export const IDInfoCard: React.FC<IDInfoCardProps> = ({ result }) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getTableIcon = (table: string) => {
    const icons: Record<string, string> = {
      topic_content_mapping: '📚',
      profiles: '👤',
      tests: '📝',
      roadmap_topics: '🗺️',
      batches: '🎓',
      gamified_exercises: '🎮',
    };
    return icons[table] || '📊';
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{getTableIcon(result.table)}</span>
            {result.displayName}
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-xs">
            {result.table}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* UUID */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">UUID</p>
              <p className="font-mono text-sm truncate">{result.id}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(result.id, 'UUID')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Details
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(result.metadata).map(([key, value]) => (
              <div key={key} className="p-2 bg-muted/30 rounded">
                <p className="text-xs text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-sm font-medium mt-0.5">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related IDs */}
        {result.relatedIDs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">🔗 Related IDs</h4>
            <div className="space-y-2">
              {result.relatedIDs.map((related, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {related.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {related.table}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{related.value}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {related.id}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(related.id, related.name)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => copyToClipboard(result.id, 'ID')}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy UUID
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.open(`/database-explorer?table=${result.table}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Table
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
