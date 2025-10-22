import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Download, Database, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTableData } from '@/hooks/useTableData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditCellDialog } from './EditCellDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TableDataViewerProps {
  tableName: string | null;
  onRowSelect?: (row: any) => void;
}

export function TableDataViewer({ tableName, onRowSelect }: TableDataViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ row: any; column: string; value: any } | null>(null);
  const { data, columns, loading, count, page, pageSize, totalPages, setPage, setPageSize, refresh, searchTable } = useTableData(tableName);

  const handleSearch = () => {
    setPage(1);
    searchTable(searchTerm);
  };

  const handleCellClick = (row: any, column: string, value: any) => {
    setEditingCell({ row, column, value });
  };

  const handleCellSave = async (newValue: any) => {
    if (!editingCell || !tableName) return;

    try {
      const { error } = await (supabase as any)
        .from(tableName)
        .update({ [editingCell.column]: newValue })
        .eq('id', editingCell.row.id);

      if (error) throw error;

      toast.success('Cell updated successfully');
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update cell');
      throw error;
    }
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
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">null</span>;
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

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  return (
    <>
      <Card className="flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-4">
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
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden">
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
            <ScrollArea className="h-full w-full">
              <div className="overflow-x-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      {columns.map(col => (
                        <TableHead key={col.name} className="min-w-[150px] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {col.name}
                            <Badge variant="outline" className="text-xs">
                              {col.type}
                            </Badge>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.map(col => (
                          <TableCell 
                            key={col.name} 
                            className="font-mono text-xs whitespace-nowrap group cursor-pointer hover:bg-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCellClick(row, col.name, row[col.name]);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span>{formatValue(row[col.name])}</span>
                              <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Sticky Footer - Pagination */}
        {data.length > 0 && (
          <div className="sticky bottom-0 z-10 bg-background border-t px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Showing {from}-{to} of {count} rows
                </span>
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 px-3 text-sm">
                  Page <span className="font-semibold mx-1">{page}</span> of{' '}
                  <span className="font-semibold ml-1">{totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Cell Dialog */}
      {editingCell && (
        <EditCellDialog
          open={!!editingCell}
          onClose={() => setEditingCell(null)}
          onSave={handleCellSave}
          columnName={editingCell.column}
          currentValue={editingCell.value}
          dataType={typeof editingCell.value}
        />
      )}
    </>
  );
}