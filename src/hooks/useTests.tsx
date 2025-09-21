import { useState, useEffect } from 'react';
import { testsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export interface Test {
  id: string;
  title: string;
  description: string;
  duration: number;
  total_marks: number;
  passing_marks: number;
  start_date: string;
  end_date: string;
  is_published: boolean;
  course_id?: string;
  course_title?: string;
  questions?: Question[];
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id: string;
  question: string;
  type: 'mcq' | 'subjective' | 'true-false';
  options?: { text: string; is_correct: boolean }[];
  correct_answer?: string;
  marks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  topic: string;
  explanation?: string;
}

export const useTests = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTests = async (params?: URLSearchParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await testsAPI.getTests(params);
      setTests(response.tests as Test[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tests';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTest = async (id: string) => {
    try {
      const response = await testsAPI.getTest(id);
      return response.test;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch test';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const createTest = async (testData: Partial<Test>) => {
    try {
      const response = await testsAPI.createTest(testData);
      
      if (response && response.test) {
        setTests(prev => [response.test as Test, ...prev]);
        toast({
          title: "Success",
          description: "Test created successfully",
        });
        return response.test;
      } else {
        throw new Error('Invalid response format from test creation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create test';
      console.error('Test creation error:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateTest = async (id: string, testData: Partial<Test>) => {
    try {
      const response = await testsAPI.updateTest(id, testData);
      
      if (response && response.test) {
        setTests(prev => prev.map(test => 
          test.id === id ? response.test as Test : test
        ));
        toast({
          title: "Success",
          description: "Test updated successfully",
        });
        return response.test;
      } else {
        throw new Error('Invalid response format from test update');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update test';
      console.error('Test update error:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteTest = async (id: string) => {
    try {
      await testsAPI.deleteTest(id);
      setTests(prev => prev.filter(test => test.id !== id));
      toast({
        title: "Success",
        description: "Test deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete test';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const attemptTest = async (id: string, attemptData: { answers: any[]; timeTaken?: number }) => {
    try {
      const response = await testsAPI.attemptTest(id, attemptData);
      toast({
        title: "Success",
        description: "Test submitted successfully",
      });
      return response.attempt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit test';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  return {
    tests,
    loading,
    error,
    fetchTests,
    getTest,
    createTest,
    updateTest,
    deleteTest,
    attemptTest,
  };
};