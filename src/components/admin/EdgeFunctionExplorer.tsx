import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FunctionCategoryList } from './edge-explorer/FunctionCategoryList';
import { FunctionMetadataCard } from './edge-explorer/FunctionMetadataCard';
import { RequestBuilder } from './edge-explorer/RequestBuilder';
import { ResponseViewer } from './edge-explorer/ResponseViewer';
import { DatabaseInspector } from './edge-explorer/DatabaseInspector';
import { PageFunctionTester } from './edge-explorer/PageFunctionTester';
import type { EdgeFunctionMetadata } from '@/utils/edgeFunctionRegistry';
import { edgeFunctionRegistry } from '@/utils/edgeFunctionRegistry';

export const EdgeFunctionExplorer: React.FC = () => {
  const [selectedFunction, setSelectedFunction] = useState<EdgeFunctionMetadata | null>(
    edgeFunctionRegistry[4] // Default to dashboard-overview
  );
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | undefined>();

  const handleResponse = (resp: any, err?: any, time?: number) => {
    setResponse(resp);
    setError(err || null);
    setResponseTime(time);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Left Sidebar - Function List */}
      <div className="w-80 flex-shrink-0">
        <FunctionCategoryList
          onFunctionSelect={setSelectedFunction}
          selectedFunctionId={selectedFunction?.id}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Tabs defaultValue="test-function" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="test-function">Test Individual Function</TabsTrigger>
              <TabsTrigger value="test-page">Test by Page</TabsTrigger>
            </TabsList>

            {/* Test Individual Function */}
            <TabsContent value="test-function" className="space-y-6">
              {selectedFunction ? (
                <>
                  {/* Function Metadata */}
                  <FunctionMetadataCard func={selectedFunction} />

                  {/* Request Builder & Response */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RequestBuilder
                      func={selectedFunction}
                      onResponse={handleResponse}
                    />
                    <ResponseViewer
                      response={response}
                      error={error}
                      responseTime={responseTime}
                    />
                  </div>

                  {/* Database Inspector */}
                  <DatabaseInspector func={selectedFunction} />
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    Select a function from the sidebar to get started
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Test by Page */}
            <TabsContent value="test-page" className="space-y-6">
              <PageFunctionTester onFunctionSelect={setSelectedFunction} />

              {/* Show selected function details if any */}
              {selectedFunction && (
                <>
                  <FunctionMetadataCard func={selectedFunction} />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RequestBuilder
                      func={selectedFunction}
                      onResponse={handleResponse}
                    />
                    <ResponseViewer
                      response={response}
                      error={error}
                      responseTime={responseTime}
                    />
                  </div>

                  <DatabaseInspector func={selectedFunction} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
