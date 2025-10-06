import { useState, useCallback } from 'react';

interface BoardClassHierarchy {
  selectedDomain: string | null;
  selectedBoard: string | null;
  selectedClass: string | null;
  setDomain: (domain: string | null) => void;
  setBoard: (board: string | null) => void;
  setClass: (cls: string | null) => void;
  reset: () => void;
  resetFromBoard: () => void;
}

export const useBoardClassHierarchy = (): BoardClassHierarchy => {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const setDomain = useCallback((domain: string | null) => {
    setSelectedDomain(domain);
    setSelectedBoard(null);
    setSelectedClass(null);
  }, []);

  const setBoard = useCallback((board: string | null) => {
    setSelectedBoard(board);
    setSelectedClass(null);
  }, []);

  const setClass = useCallback((cls: string | null) => {
    setSelectedClass(cls);
  }, []);

  const reset = useCallback(() => {
    setSelectedDomain(null);
    setSelectedBoard(null);
    setSelectedClass(null);
  }, []);

  const resetFromBoard = useCallback(() => {
    setSelectedBoard(null);
    setSelectedClass(null);
  }, []);

  return {
    selectedDomain,
    selectedBoard,
    selectedClass,
    setDomain,
    setBoard,
    setClass,
    reset,
    resetFromBoard,
  };
};
