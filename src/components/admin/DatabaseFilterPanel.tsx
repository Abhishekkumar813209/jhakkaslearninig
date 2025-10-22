import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { TableColumn } from '@/hooks/useTableData';

export interface FilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: any;
}

interface DatabaseFilterPanelProps {
  tableName: string;
  columns: TableColumn[];
  currentFilters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
}

interface ColumnTypeInfo {
  type: 'text' | 'number' | 'boolean' | 'date' | 'foreign_key' | 'json';
  referencedTable?: string;
  enumValues?: string[];
}

export function DatabaseFilterPanel({ tableName, columns, currentFilters, onFiltersChange }: DatabaseFilterPanelProps) {
  const [filters, setFilters] = useState<FilterCondition[]>(currentFilters);
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnTypeInfo>>({});

  useEffect(() => {
    detectColumnTypes();
  }, [columns, tableName]);

  const detectColumnTypes = async () => {
    const types: Record<string, ColumnTypeInfo> = {};
    
    for (const column of columns) {
      const colType = column.type.toLowerCase();
      
      // Check common patterns
      if (colType.includes('int') || colType.includes('numeric') || colType.includes('decimal') || colType.includes('real') || colType.includes('double')) {
        types[column.name] = { type: 'number' };
      } else if (colType === 'boolean' || colType === 'bool') {
        types[column.name] = { type: 'boolean' };
      } else if (colType.includes('timestamp') || colType.includes('date') || colType.includes('time')) {
        types[column.name] = { type: 'date' };
      } else if (colType.includes('json')) {
        types[column.name] = { type: 'json' };
      } else if (column.name.endsWith('_id') && column.name !== 'id') {
        // Likely a foreign key
        types[column.name] = { type: 'foreign_key' };
      } else {
        types[column.name] = { type: 'text' };
      }
    }
    
    setColumnTypes(types);
  };

  const updateFilter = (column: string, operator: FilterCondition['operator'], value: any) => {
    const existingIndex = filters.findIndex(f => f.column === column && f.operator === operator);
    
    if (!value && value !== false && value !== 0) {
      // Remove filter if value is empty
      if (existingIndex >= 0) {
        const newFilters = filters.filter((_, i) => i !== existingIndex);
        setFilters(newFilters);
      }
    } else {
      // Add or update filter
      const newFilter: FilterCondition = { column, operator, value };
      if (existingIndex >= 0) {
        const newFilters = [...filters];
        newFilters[existingIndex] = newFilter;
        setFilters(newFilters);
      } else {
        setFilters([...filters, newFilter]);
      }
    }
  };

  const removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(filters);
  };

  const clearAllFilters = () => {
    setFilters([]);
    onFiltersChange([]);
  };

  const getFilterValue = (column: string, operator: FilterCondition['operator'] = 'eq') => {
    return filters.find(f => f.column === column && f.operator === operator)?.value;
  };

  const renderFilterControl = (column: TableColumn) => {
    const columnType = columnTypes[column.name] || { type: 'text' };

    switch (columnType.type) {
      case 'text':
        return (
          <div key={column.name} className="space-y-2">
            <Label className="text-sm font-medium">{column.name}</Label>
            <div className="flex gap-2">
              <Select
                value={filters.find(f => f.column === column.name)?.operator || 'ilike'}
                onValueChange={(op: any) => {
                  const currentValue = getFilterValue(column.name, filters.find(f => f.column === column.name)?.operator);
                  if (currentValue) updateFilter(column.name, op, currentValue);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ilike">Contains</SelectItem>
                  <SelectItem value="eq">Equals</SelectItem>
                  <SelectItem value="neq">Not Equals</SelectItem>
                  <SelectItem value="is">Is Null</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={`Search ${column.name}...`}
                value={getFilterValue(column.name, 'ilike') || getFilterValue(column.name, 'eq') || getFilterValue(column.name, 'neq') || ''}
                onChange={(e) => {
                  const op = filters.find(f => f.column === column.name)?.operator || 'ilike';
                  updateFilter(column.name, op, e.target.value);
                }}
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <div key={column.name} className="space-y-2">
            <Label className="text-sm font-medium">{column.name}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={getFilterValue(column.name, 'gte') || ''}
                onChange={(e) => updateFilter(column.name, 'gte', e.target.value ? Number(e.target.value) : null)}
              />
              <Input
                type="number"
                placeholder="Max"
                value={getFilterValue(column.name, 'lte') || ''}
                onChange={(e) => updateFilter(column.name, 'lte', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div key={column.name} className="flex items-center space-x-2 py-2">
            <Checkbox
              id={column.name}
              checked={getFilterValue(column.name, 'eq') === true}
              onCheckedChange={(checked) => updateFilter(column.name, 'eq', checked ? true : null)}
            />
            <Label htmlFor={column.name} className="text-sm font-medium cursor-pointer">
              {column.name}
            </Label>
          </div>
        );

      case 'date':
        return (
          <div key={column.name} className="space-y-2">
            <Label className="text-sm font-medium">{column.name}</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={getFilterValue(column.name, 'gte') || ''}
                onChange={(e) => updateFilter(column.name, 'gte', e.target.value)}
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={getFilterValue(column.name, 'lte') || ''}
                onChange={(e) => updateFilter(column.name, 'lte', e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4 bg-muted/30 border-b">
      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
          {filters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-2">
              <span className="text-xs">
                {filter.column} {filter.operator} {String(filter.value).slice(0, 20)}
              </span>
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => removeFilter(index)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {columns.slice(0, 12).map(column => renderFilterControl(column))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm"
          onClick={clearAllFilters}
          disabled={filters.length === 0}
        >
          Clear All
        </Button>
        <Button 
          size="sm"
          onClick={applyFilters}
        >
          <Filter className="h-4 w-4 mr-2" />
          Apply Filters ({filters.length})
        </Button>
      </div>
    </div>
  );
}
