import { useState, useEffect } from 'react';

interface PersistedData<T> {
  data: T;
  timestamp: string;
}

export const useFormPersistence = <T>(
  storageKey: string,
  initialData: T,
  expiryHours: number = 24,
  isOpen: boolean = true
) => {
  const [data, setData] = useState<T>(initialData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [savedProgress, setSavedProgress] = useState<T | null>(null);

  // Load saved progress on mount or when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    
    const loadSavedProgress = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return;

        const parsed: PersistedData<T> = JSON.parse(stored);
        const savedTime = new Date(parsed.timestamp).getTime();
        const now = new Date().getTime();
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);

        if (hoursDiff < expiryHours) {
          setSavedProgress(parsed.data);
          setShowResumeDialog(true);
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error('Failed to load saved progress:', error);
      }
    };

    loadSavedProgress();
  }, [storageKey, expiryHours, isOpen]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!hasUnsavedChanges || !isOpen) return;

    const saveProgress = () => {
      try {
        const persistedData: PersistedData<T> = {
          data,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(persistedData));
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    };

    saveProgress();
  }, [data, storageKey, hasUnsavedChanges, isOpen]);

  const clearProgress = () => {
    try {
      localStorage.removeItem(storageKey);
      setHasUnsavedChanges(false);
      setSavedProgress(null);
    } catch (error) {
      console.error('Failed to clear progress:', error);
    }
  };

  const resumeProgress = () => {
    if (savedProgress) {
      setData(savedProgress);
      setHasUnsavedChanges(true);
      setShowResumeDialog(false);
    }
  };

  const startFresh = () => {
    clearProgress();
    setShowResumeDialog(false);
  };

  return {
    data,
    setData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showResumeDialog,
    setShowResumeDialog,
    showExitConfirmation,
    setShowExitConfirmation,
    savedProgress,
    clearProgress,
    resumeProgress,
    startFresh,
  };
};
