import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Download, AlertCircle, Database } from 'lucide-react';
import { useTableData } from '@/hooks/useTableData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TableDataViewerProps {
  tableName: string | null;
  onRowSelect?: (row: any) => void;
}

export function TableDataViewer({ tableName, onRowSelect }: TableDataViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, columns, loading, count, refresh, searchTable } = useTableData(tableName);

  const handleSearch = () => {
    searchTable(searchTerm);
  };

  const exportToCSV = () => {
    if (!data.length) return;
    
    const headers = columns.map(c => c.name).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const val = row[col.name];
        if (val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return `"${val}"`;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_${new Date().toISOString()}.csv`;
    a.click();
  };

  const formatValue = (value: any) => {
    if (value === null) return <span className="text-muted-foreground italic">null</span>;
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
    if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
    return value?.toString() || '';
  };

  if (!tableName) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a table from the dropdown above to view data</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{tableName}</h3>
            <Badge variant="outline">{count} rows</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!data.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search in all columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {data.length > 0 && data.length < count && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Showing first 50 rows out of {count} total rows
            </AlertDescription>
          </Alert>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Loading data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No data found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead key={col.name} className="min-w-[150px]">
                    {col.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow 
                  key={idx}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowSelect?.(row)}
                >
                  {columns.map(col => (
                    <TableCell key={col.name} className="font-mono text-xs">
                      {formatValue(row[col.name])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </Card>
  );
}