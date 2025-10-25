import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  default_value: string | null;
}

export interface FilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: any;
}

export function useTableData(tableName: string | null) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!tableName) {
      setData([]);
      setColumns([]);
      return;
    }

    fetchTableData();
  }, [tableName, page, pageSize, filters]);

  // Real-time subscription for database changes
  useEffect(() => {
    if (!tableName) return;

    const channel = supabase
      .channel(`table-${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          console.log('Real-time change detected:', payload);
          fetchTableData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName]);

  const fetchTableData = async () => {
    if (!tableName) return;

    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Build query with filters
      let query = (supabase as any)
        .from(tableName)
        .select('*', { count: 'exact' });

      // Apply filters
      filters.forEach(filter => {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.column, filter.value);
            break;
          case 'neq':
            query = query.neq(filter.column, filter.value);
            break;
          case 'gt':
            query = query.gt(filter.column, filter.value);
            break;
          case 'lt':
            query = query.lt(filter.column, filter.value);
            break;
          case 'gte':
            query = query.gte(filter.column, filter.value);
            break;
          case 'lte':
            query = query.lte(filter.column, filter.value);
            break;
          case 'like':
            query = query.like(filter.column, `%${filter.value}%`);
            break;
          case 'ilike':
            query = query.ilike(filter.column, `%${filter.value}%`);
            break;
          case 'in':
            query = query.in(filter.column, filter.value);
            break;
          case 'is':
            query = query.is(filter.column, filter.value);
            break;
        }
      });

      // Try to sort by created_at descending (newest first)
      // If column doesn't exist, query will continue without this ordering
      try {
        query = query.order('created_at', { ascending: false });
      } catch (error) {
        console.warn(`Cannot sort by created_at on table ${tableName}`);
      }

      // Apply pagination
      query = query.range(from, to);
      
      const { data: tableData, error: dataError, count: totalCount } = await query;

      if (dataError) throw dataError;

      setData(tableData || []);
      setCount(totalCount || 0);

      // Get columns from first row
      if (tableData && tableData.length > 0) {
        const cols = Object.keys(tableData[0]).map(key => ({
          name: key,
          type: typeof tableData[0][key],
          nullable: true,
          default_value: null
        }));
        setColumns(cols);
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch data from ${tableName}`,
        variant: 'destructive'
      });
      setData([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  const searchTable = async (searchTerm: string) => {
    if (!tableName || !searchTerm.trim()) {
      fetchTableData();
      return;
    }

    setLoading(true);
    try {
      // Search in text columns using any type
      const { data: searchData, error } = await (supabase as any)
        .from(tableName)
        .select('*')
        .textSearch('fts', searchTerm)
        .limit(50);

      if (error) {
        // Fallback: search all columns
        const { data: allData } = await (supabase as any)
          .from(tableName)
          .select('*')
          .limit(50);
        
        const filtered = allData?.filter(row => 
          Object.values(row).some(val => 
            val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
        setData(filtered || []);
      } else {
        setData(searchData || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (newFilters: FilterCondition[]) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page
  };

  const deleteRows = async (ids: string[]) => {
    if (!tableName || ids.length === 0) {
      return { success: false, error: 'No rows to delete' };
    }

    try {
      const { error } = await (supabase as any)
        .from(tableName)
        .delete()
        .in('id', ids);

      if (error) throw error;

      await fetchTableData();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return {
    data,
    columns,
    loading,
    count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
    filters,
    setPage,
    setPageSize,
    refresh: fetchTableData,
    searchTable,
    applyFilters,
    deleteRows
  };
}