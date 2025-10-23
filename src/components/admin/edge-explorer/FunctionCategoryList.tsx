import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FunctionSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { categories, getFunctionsByCategory, type EdgeFunctionMetadata } from '@/utils/edgeFunctionRegistry';
import { Badge } from '@/components/ui/badge';

interface FunctionCategoryListProps {
  onFunctionSelect: (func: EdgeFunctionMetadata) => void;
  selectedFunctionId?: string;
}

export const FunctionCategoryList: React.FC<FunctionCategoryListProps> = ({
  onFunctionSelect,
  selectedFunctionId
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Dashboard']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredCategories = categories.map(category => {
    const functions = getFunctionsByCategory(category);
    const filtered = functions.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { category, functions: filtered };
  }).filter(c => c.functions.length > 0);

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FunctionSquare className="h-4 w-4" />
          Edge Functions
        </h3>
        <Input
          placeholder="Search functions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredCategories.map(({ category, functions }) => (
            <div key={category} className="mb-1">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent text-sm font-medium"
              >
                <div className="flex items-center gap-2">
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <span>{category}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {functions.length}
                </Badge>
              </button>

              {expandedCategories.has(category) && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {functions.map((func) => (
                    <button
                      key={func.id}
                      onClick={() => onFunctionSelect(func)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors ${
                        selectedFunctionId === func.id ? 'bg-accent font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{func.name}</span>
                        {func.requiresAuth && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Auth
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
