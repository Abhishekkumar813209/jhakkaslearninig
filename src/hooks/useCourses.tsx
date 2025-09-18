import { useState, useEffect } from 'react';
import { coursesAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced' | string;
  price?: number;
  is_paid?: boolean;
  instructor_id: string;
  duration_hours?: number;
  total_videos?: number;
  tags?: string[];
  enrollment_count?: number;
  rating?: number;
  is_published?: boolean;
  is_enrolled?: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name?: string;
  };
  videos?: any[];
  tests?: any[];
  // Legacy fields for backward compatibility
  _id?: string;
  originalPrice?: number;
  instructor?: {
    _id?: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
  lessons?: any[];
  totalDuration?: number;
  enrollmentCount?: number;
  requirements?: string[];
  whatYouWillLearn?: string[];
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const useCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCourses = async (params?: URLSearchParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await coursesAPI.getCourses(params);
      setCourses(response.courses as Course[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch courses';
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

  const getCourse = async (id: string) => {
    try {
      const response = await coursesAPI.getCourse(id);
      return response.course;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch course';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const createCourse = async (courseData: Partial<Course>) => {
    try {
      const response = await coursesAPI.createCourse(courseData);
      setCourses(prev => [response.course as Course, ...prev]);
      toast({
        title: "Success",
        description: "Course created successfully",
      });
      return response.course;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create course';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateCourse = async (id: string, courseData: Partial<Course>) => {
    try {
      const response = await coursesAPI.updateCourse(id, courseData);
      setCourses(prev => prev.map(course => 
        course.id === id ? response.course as Course : course
      ));
      toast({
        title: "Success",
        description: "Course updated successfully",
      });
      return response.course;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update course';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await coursesAPI.deleteCourse(id);
      setCourses(prev => prev.filter(course => course.id !== id));
      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete course';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const enrollInCourse = async (id: string) => {
    try {
      await coursesAPI.enrollInCourse(id);
      setCourses(prev => prev.map(course => 
        course.id === id ? { ...course, is_enrolled: true } : course
      ));
      toast({
        title: "Success",
        description: "Successfully enrolled in course",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enroll in course';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return {
    courses,
    loading,
    error,
    fetchCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollInCourse,
  };
};

export const useEnrolledCourses = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await coursesAPI.getEnrolledCourses();
      setEnrolledCourses(response.courses);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch enrolled courses';
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

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  return {
    enrolledCourses,
    loading,
    error,
    fetchEnrolledCourses,
  };
};