import { useMemo } from 'react';
import { useExamTypes } from './useExamTypes';

interface UseBoardsResult {
  boards: string[];
  requiresBoard: boolean;
  requiresClass: boolean;
  loading: boolean;
}

export const useBoards = (examDomain?: string | null): UseBoardsResult => {
  const { examTypes, loading } = useExamTypes();

  return useMemo(() => {
    if (!examDomain || examTypes.length === 0) {
      return {
        boards: [],
        requiresBoard: false,
        requiresClass: false,
        loading,
      };
    }

    const selectedExamType = examTypes.find(t => t.code === examDomain);

    if (!selectedExamType) {
      return {
        boards: [],
        requiresBoard: false,
        requiresClass: false,
        loading,
      };
    }

    const boards = selectedExamType.requires_board && selectedExamType.available_exams
      ? (selectedExamType.available_exams as string[])
      : [];

    console.log('useBoards:', {
      examDomain,
      requiresBoard: selectedExamType.requires_board,
      boards,
      examType: selectedExamType.display_name,
    });

    return {
      boards,
      requiresBoard: selectedExamType.requires_board,
      requiresClass: selectedExamType.requires_class,
      loading,
    };
  }, [examDomain, examTypes, loading]);
};
