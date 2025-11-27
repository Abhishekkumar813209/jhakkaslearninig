import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CentralizedTestBankManager } from './CentralizedTestBankManager';
import { BatchTestAssigner } from './BatchTestAssigner';
import { FileText, BookOpen, Users } from 'lucide-react';

export const TestManagementTabs = () => {
  return (
    <Tabs defaultValue="centralized" className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-2 mb-6">
        <TabsTrigger value="centralized" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Centralized Test Bank
        </TabsTrigger>
        <TabsTrigger value="batch-assignment" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Batch Test Assignment
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="centralized" className="mt-6">
        <CentralizedTestBankManager />
      </TabsContent>
      
      <TabsContent value="batch-assignment" className="mt-6">
        <BatchTestAssigner />
      </TabsContent>
    </Tabs>
  );
};
