import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FileText, Library } from "lucide-react";
import { TestBankBuilder } from "./tests/TestBankBuilder";
import { CentralizedTestBankBuilder } from "./tests/CentralizedTestBankBuilder";

const TestManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<'batch-specific' | 'centralized'>('batch-specific');
  const [isClient, setIsClient] = useState(false);

  // Hydration fix: only render URL-based content on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync mode with URL and set default if missing
  useEffect(() => {
    if (isClient) {
      const urlMode = searchParams.get('mode');
      if (urlMode === 'centralized' || urlMode === 'batch-specific') {
        setMode(urlMode);
      } else {
        // Set default mode if missing
        const params = new URLSearchParams(searchParams);
        params.set('mode', 'batch-specific');
        setSearchParams(params, { replace: true });
      }
    }
  }, [isClient, searchParams, setSearchParams]);

  const handleModeChange = (newMode: 'batch-specific' | 'centralized') => {
    setMode(newMode);
    const params = new URLSearchParams(searchParams);
    params.set('mode', newMode);
    
    // Use window.history.replaceState for immediate URL update
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    setSearchParams(params);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Tests</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Tests</h1>
            <p className="text-muted-foreground">Manage batch-specific and centralized test assignments</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => handleModeChange('batch-specific')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'batch-specific'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Batch-Specific
          </button>
          <button
            onClick={() => handleModeChange('centralized')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'centralized'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Library className="h-4 w-4 inline mr-2" />
            Centralized Bank
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'batch-specific' ? (
        <TestBankBuilder />
      ) : (
        <CentralizedTestBankBuilder />
      )}
    </div>
  );
};

export default TestManagement;
