import { createContext, useContext, useState, ReactNode } from 'react';

interface LessonBuilderContextType {
  selectedDomain: string | null;
  selectedBatch: string;
  selectedSubject: string;
  selectedChapter: string;
  selectedTopic: string;
  selectedBoard: string | null;
  selectedClass: string | null;
  setSelectedDomain: (domain: string | null) => void;
  setSelectedBatch: (batch: string) => void;
  setSelectedSubject: (subject: string) => void;
  setSelectedChapter: (chapter: string) => void;
  setSelectedTopic: (topic: string) => void;
  setSelectedBoard: (board: string | null) => void;
  setSelectedClass: (cls: string | null) => void;
}

const LessonBuilderContext = createContext<LessonBuilderContextType | undefined>(undefined);

export const useLessonBuilder = () => {
  const context = useContext(LessonBuilderContext);
  if (!context) {
    throw new Error('useLessonBuilder must be used within LessonBuilderProvider');
  }
  return context;
};

export const LessonBuilderProvider = ({ children }: { children: ReactNode }) => {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  return (
    <LessonBuilderContext.Provider
      value={{
        selectedDomain,
        selectedBatch,
        selectedSubject,
        selectedChapter,
        selectedTopic,
        selectedBoard,
        selectedClass,
        setSelectedDomain,
        setSelectedBatch,
        setSelectedSubject,
        setSelectedChapter,
        setSelectedTopic,
        setSelectedBoard,
        setSelectedClass,
      }}
    >
      {children}
    </LessonBuilderContext.Provider>
  );
};
