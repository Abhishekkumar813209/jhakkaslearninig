import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Users, BookOpen } from 'lucide-react';
import { TestManagementTabs } from './tests/TestManagementTabs';

const TestManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Get mode from URL
  const mode = (searchParams.get('mode') as 'batch-specific' | 'centralized') || 'batch-specific';

  const handleModeSwitch = (newMode: 'batch-specific' | 'centralized') => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', newMode);
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Tests</h2>
          <p className="text-muted-foreground mt-1">
            Manage batch-specific and centralized test assignments
          </p>
        </div>
      </div>

      {/* Mode Selector - Prominent like Question Bank */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-1">Test Management Mode</h3>
                <p className="text-sm text-muted-foreground">
                  {mode === 'batch-specific' 
                    ? 'Assign tests to batches from centralized bank' 
                    : 'Create and manage reusable tests in centralized library'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant={mode === 'batch-specific' ? 'default' : 'outline'}
                onClick={() => handleModeSwitch('batch-specific')}
                className="flex-1 h-auto py-4"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">Batch-Specific</span>
                </div>
              </Button>
              
              <Button
                variant={mode === 'centralized' ? 'default' : 'outline'}
                onClick={() => handleModeSwitch('centralized')}
                className="flex-1 h-auto py-4"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <span className="font-semibold">Centralized Bank</span>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Render mode-specific component */}
      {mode === 'batch-specific' ? (
        <TestManagementTabs />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Centralized Test Bank</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage reusable tests that can be assigned to multiple batches.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TestManagement;
