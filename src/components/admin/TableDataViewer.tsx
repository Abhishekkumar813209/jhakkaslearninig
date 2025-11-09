import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Download, Database, Edit2, ChevronLeft, ChevronRight, Filter, Trash2, Link2, X } from 'lucide-react';
import { useTableData } from '@/hooks/useTableData';
import { useIDResolver } from '@/hooks/useIDResolver';

import { ScrollArea } from '@/components/ui/scroll-area';
import { EditCellDialog } from './EditCellDialog';
import { DatabaseFilterPanel } from './DatabaseFilterPanel';
import { HierarchyFilterPanel } from './HierarchyFilterPanel';
import { IDInfoCard } from './IDInfoCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TableDataViewerProps {
  tableName: string | null;
  onRowSelect?: (row: any) => void;
}

export function TableDataViewer({ tableName, onRowSelect }: TableDataViewerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [searchMode, setSearchMode] = useState<'table' | 'id'>(searchParams.get('mode') as any || 'table');
  const [editingCell, setEditingCell] = useState<{ row: any; column: string; value: any } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data, columns, loading, count, page, pageSize, totalPages, filters, setPage, setPageSize, refresh, searchTable, applyFilters, deleteRows } = useTableData(tableName);
  const { resolveID, loading: idLoading, result: idResult } = useIDResolver();

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerThRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const isSyncingRef = useRef(false);
  const [colWidths, setColWidths] = useState<number[]>([]);

  // Clear selection when table changes
  useState(() => {
    setSelectedRows(new Set());
  });

  // Auto-detect UUID and switch mode
  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm.trim());
    if (isUUID && searchTerm.length === 36) {
      setSearchMode('id');
    }
  }, [searchTerm]);

  // Persist search in URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (searchTerm) {
      params.set('search', searchTerm);
      params.set('mode', searchMode);
    } else {
      params.delete('search');
      params.delete('mode');
    }
    setSearchParams(params);
  }, [searchTerm, searchMode]);

  const handleSearch = () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    if (searchMode === 'id') {
      resolveID(trimmed);
    } else {
      setPage(1);
      searchTable(trimmed);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.delete('mode');
    setSearchParams(params);
    refresh();
  };

  const isUUID = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  const handleCellClick = (row: any, column: string, value: any) => {
    setEditingCell({ row, column, value });
  };

  const handleCellDoubleClick = (value: any) => {
    if (isUUID(value)) {
      // Switch to ID Resolver mode
      setSearchMode('id');
      // Set the search term
      setSearchTerm(value);
      // Trigger the search
      setSearchParams(() => {
        const params = new URLSearchParams(searchParams);
        params.set('mode', 'id');
        params.set('search', value);
        return params;
      });
      resolveID(value);
      // Scroll to top to show the result
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCellSave = async (newValue: any) => {
    if (!editingCell || !tableName) return;

    const oldValue = editingCell.value;
    const rowId = editingCell.row.id;
    const column = editingCell.column;

    // Optimistic update - update UI immediately
    setEditingCell(null);
    const originalData = [...data];
    const updatedData = data.map(row => 
      row.id === rowId 
        ? { ...row, [column]: newValue }
        : row
    );
    // Note: We can't directly set data here as it comes from the hook,
    // but we'll show the toast and refresh

    try {
      const { error } = await (supabase as any)
        .from(tableName)
        .update({ [column]: newValue })
        .eq('id', rowId);

      if (error) throw error;

      toast.success(`✅ Updated ${column} in ${tableName} table`);
      // Refresh to ensure database and UI are in sync
      setTimeout(() => refresh(), 300);
    } catch (error: any) {
      toast.error(`❌ Update failed: ${error.message || 'Unknown error'}`);
      // Refresh to revert UI
      refresh();
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

  const toggleSelectAll = () => {
    if (selectedRows.size === data.length && data.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map(row => row.id).filter(id => id)));
    }
  };

  const toggleRowSelection = (id: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const ids = Array.from(selectedRows);

    const result = await deleteRows(ids);

    if (result.success) {
      toast.success(`✅ Successfully deleted ${ids.length} row(s) from ${tableName}`);
      setSelectedRows(new Set());
      setShowDeleteDialog(false);
    } else {
      toast.error(`❌ Failed to delete rows: ${result.error}`);
    }

    setIsDeleting(false);
  };

  const hasIdColumn = columns.some(col => col.name === 'id');

  const measureColWidths = () => {
    const ths = headerThRefs.current;
    if (!ths || ths.length === 0) return;
    const widths = ths.map((th) => (th ? th.offsetWidth : 0));
    setColWidths(widths);
  };

  // Scroll sync - immediate sync without RAF for better responsiveness
  useEffect(() => {
    const headerEl = headerScrollRef.current;
    const bodyEl = bodyScrollRef.current;
    if (!headerEl || !bodyEl) return;

    const onBodyScroll = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      headerEl.scrollLeft = bodyEl.scrollLeft;
      isSyncingRef.current = false;
    };
    
    const onHeaderScroll = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      bodyEl.scrollLeft = headerEl.scrollLeft;
      isSyncingRef.current = false;
    };

    bodyEl.addEventListener('scroll', onBodyScroll, { passive: true } as any);
    headerEl.addEventListener('scroll', onHeaderScroll, { passive: true } as any);

    return () => {
      bodyEl.removeEventListener('scroll', onBodyScroll);
      headerEl.removeEventListener('scroll', onHeaderScroll);
    };
  }, [columns.length]);

  // Reset scroll position and re-measure on data change
  useEffect(() => {
    if (data.length > 0) {
      // Reset scroll to left
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = 0;
      if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = 0;
      
      // Force re-measure column widths
      setTimeout(() => measureColWidths(), 100);
    }
  }, [data]);

  useEffect(() => {
    const id = requestAnimationFrame(measureColWidths);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, data.length, hasIdColumn]);

  useEffect(() => {
    if (!bodyScrollRef.current) return;
    const ro = new ResizeObserver(() => {
      measureColWidths();
    });
    ro.observe(bodyScrollRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.length]);


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
              {filters.length > 0 && (
                <Badge variant="default">{filters.length} filter{filters.length > 1 ? 's' : ''}</Badge>
              )}
            </div>
            <div className="flex gap-2 mr-4">
              <Button 
                variant={showFilters ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
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

          <div className="space-y-3">
            {/* Search Mode Toggle */}
            <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as any)}>
              <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                <TabsTrigger value="table" className="text-xs">
                  <Search className="h-3 w-3 mr-1" />
                  Table Search
                </TabsTrigger>
                <TabsTrigger value="id" className="text-xs">
                  <Link2 className="h-3 w-3 mr-1" />
                  ID Resolver
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="flex-1 flex gap-2 relative">
                <Input
                  placeholder={searchMode === 'id' ? 'Paste UUID to resolve...' : 'Search in all columns...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className={searchMode === 'id' ? 'font-mono' : ''}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button onClick={handleSearch} disabled={loading || idLoading || !searchTerm.trim()}>
                {searchMode === 'id' ? (
                  <Link2 className="h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* ID Resolver Result */}
            {searchMode === 'id' && idResult && (
              <ScrollArea className="max-h-[500px] border rounded-lg bg-accent/50">
                <div className="p-3">
                  <IDInfoCard result={idResult} />
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedRows.size > 0 && hasIdColumn && (
          <div className="bg-primary/10 border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRows(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="border-b">
            <div className="p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-3">Hierarchy Filters (Board → Class → Subject → Chapter)</h4>
              <HierarchyFilterPanel 
                onFiltersChange={(hierarchyFilters) => {
                  // TODO: Implement hierarchy-based filtering in backend
                  console.log('Hierarchy filters:', hierarchyFilters);
                }}
              />
            </div>
            <div className="p-4 bg-muted/30">
              <h4 className="text-sm font-medium mb-3">Column Filters</h4>
              <DatabaseFilterPanel
                tableName={tableName}
                columns={columns}
                currentFilters={filters}
                onFiltersChange={applyFilters}
              />
            </div>
          </div>
        )}

        {/* Header Table (static, horizontal scroll only) */}
        {!loading && data.length > 0 && (
          <div ref={headerScrollRef} className="overflow-x-auto border-b bg-background shadow-sm">
            <div className="w-full">
              <table className="w-full caption-bottom text-sm border-collapse table-fixed">
                <colgroup>
                  {hasIdColumn && <col className="w-14" />}
                  {columns.map((col) => {
                    const isUUIDType = col.type.toLowerCase().includes('uuid');
                    return <col key={col.name} className={isUUIDType ? 'w-[20%] min-w-[200px]' : 'w-auto min-w-[120px]'} />;
                  })}
                </colgroup>
                <thead className="bg-background">
                  <tr className="hover:bg-transparent">
                    {hasIdColumn && (
                      <th
                        ref={el => (headerThRefs.current[0] = el)}
                        className="w-14 px-4 text-left align-middle border-r"
                      >
                        <Checkbox
                          checked={selectedRows.size === data.length && data.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all rows"
                        />
                      </th>
                    )}
                    {columns.map((col, i) => {
                      const isUUIDType = col.type.toLowerCase().includes('uuid');
                      return (
                        <th
                          key={col.name}
                          ref={el => (headerThRefs.current[(hasIdColumn ? 1 : 0) + i] = el)}
                          className="h-12 px-3 text-left align-middle font-medium text-muted-foreground border-r"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-semibold truncate">{col.name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {col.type}
                            </Badge>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
              </table>
            </div>
          </div>
        )}
        {/* Scrollable Content */}
        <div ref={bodyScrollRef} className="flex-1 min-h-0 overflow-auto">
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
            <div className="w-full">
              <table className="w-full caption-bottom text-sm border-collapse table-fixed">
                <colgroup>
                  {hasIdColumn && <col className="w-14" />}
                  {columns.map((col) => {
                    const isUUIDType = col.type.toLowerCase().includes('uuid');
                    return <col key={col.name} className={isUUIDType ? 'w-[20%] min-w-[200px]' : 'w-auto min-w-[120px]'} />;
                  })}
                </colgroup>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className={`border-b hover:bg-accent/50 ${selectedRows.has(row.id) ? 'bg-accent/50' : ''}`}>
                      {hasIdColumn && (
                        <td className="w-14 px-4 border-r" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRows.has(row.id)}
                            onCheckedChange={() => toggleRowSelection(row.id)}
                            aria-label={`Select row ${idx + 1}`}
                          />
                        </td>
                      )}
                      {columns.map(col => {
                        const cellValue = row[col.name];
                        const isUUIDValue = isUUID(cellValue);
                        const isUUIDType = col.type.toLowerCase().includes('uuid');

                        return (
                          <td
                            key={col.name}
                            className={`p-3 align-middle font-mono text-xs group hover:bg-accent border-r ${
                              isUUIDValue ? 'cursor-alias' : 'cursor-pointer'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isUUIDValue) {
                                handleCellClick(row, col.name, cellValue);
                              }
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleCellDoubleClick(cellValue);
                            }}
                            title={isUUIDValue ? 'Double-click to resolve ID' : 'Click to edit'}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="truncate flex-1">{formatValue(cellValue)}</span>
                              {isUUIDValue ? (
                                <Link2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 shrink-0" />
                              ) : (
                                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground shrink-0" />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected rows from the <strong>{tableName}</strong> table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}