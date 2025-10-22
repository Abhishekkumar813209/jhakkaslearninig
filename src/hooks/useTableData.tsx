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

export function useTableData(tableName: string | null) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { toast } = useToast();

  useEffect(() => {
    if (!tableName) {
      setData([]);
      setColumns([]);
      return;
    }

    fetchTableData();
  }, [tableName, page, pageSize]);

  const fetchTableData = async () => {
    if (!tableName) return;

    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Fetch data using any type to bypass strict typing
      const { data: tableData, error: dataError, count: totalCount } = await (supabase as any)
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(from, to);

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

  return {
    data,
    columns,
    loading,
    count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
    setPage,
    setPageSize,
    refresh: fetchTableData,
    searchTable
  };
}