import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

interface WizardState {
  isOpen: boolean;
  step: number;
  context: Record<string, string>;
}

export const useAdminWizardState = (featureName: string) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read current state from URL
  const isOpen = searchParams.get('wizard') !== null;
  const step = parseInt(searchParams.get('step') || '1');
  const context = Object.fromEntries(
    Array.from(searchParams.entries()).filter(
      ([key]) => !['tab', 'wizard', 'step'].includes(key)
    )
  );
  
  // Open wizard with optional initial context
  const open = useCallback((initialContext: Record<string, string> = {}) => {
    const params = new URLSearchParams({
      tab: featureName,
      wizard: 'create',
      step: '1',
      ...initialContext
    });
    setSearchParams(params);
  }, [featureName, setSearchParams]);
  
  // Update wizard step and context
  const updateStep = useCallback((newStep: number, newContext: Record<string, string> = {}) => {
    const params = new URLSearchParams(searchParams);
    params.set('step', newStep.toString());
    Object.entries(newContext).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  }, [searchParams, setSearchParams]);
  
  // Close wizard and return to feature list
  const close = useCallback(() => {
    setSearchParams({ tab: featureName });
  }, [featureName, setSearchParams]);
  
  // Go to previous step
  const previousStep = useCallback(() => {
    if (step > 1) {
      const params = new URLSearchParams(searchParams);
      params.set('step', (step - 1).toString());
      setSearchParams(params);
    }
  }, [step, searchParams, setSearchParams]);
  
  // Go to next step
  const nextStep = useCallback((newContext: Record<string, string> = {}) => {
    updateStep(step + 1, newContext);
  }, [step, updateStep]);
  
  return {
    isOpen,
    step,
    context,
    open,
    close,
    updateStep,
    nextStep,
    previousStep
  };
};
