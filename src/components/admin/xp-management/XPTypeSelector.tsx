import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GamesXPManager } from './GamesXPManager';
import { TestsXPManager } from './TestsXPManager';
import { Gamepad2, FileText } from 'lucide-react';

interface XPTypeSelectorProps {
  subject: string;
  chapter: { id: string; name: string };
}

export const XPTypeSelector = ({ subject, chapter }: XPTypeSelectorProps) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Manage XP for: {chapter.name}</h2>
      
      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="games" className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            Games XP
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tests XP
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="games" className="mt-6">
          <GamesXPManager chapterId={chapter.id} />
        </TabsContent>
        
        <TabsContent value="tests" className="mt-6">
          <TestsXPManager
            chapterId={chapter.id}
            subject={subject}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
