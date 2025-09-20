import { supabase } from '@/integrations/supabase/client';

// Helper function to get auth token from Supabase
const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
};

// Generic request handler for Supabase functions
const makeSupabaseRequest = async (functionName: string, body?: any) => {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    makeSupabaseRequest('auth-login', credentials),

  register: (userData: { name: string; email: string; password: string; role?: string }) =>
    makeSupabaseRequest('auth-register', { 
      full_name: userData.name, 
      email: userData.email, 
      password: userData.password,
      role: userData.role || 'student'
    }),

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return { message: 'Logout successful' };
  },

  getProfile: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    
    if (!user) throw new Error('No user logged in');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, user_roles!inner(role), batches(name, level)')
      .eq('id', user.id)
      .single();
    
    // Get role from user_roles table
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        role: userRole?.role || 'student',
        batch: profile?.batches
      }
    };
  },

  updateProfile: async (userData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('profiles')
      .update(userData)
      .eq('id', user?.id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return { profile: data };
  },
};

// Courses API
export const coursesAPI = {
  getCourses: async (params?: URLSearchParams) => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        profiles:instructor_id (full_name)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { courses: data };
  },

  getCourse: async (id: string) => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        profiles:instructor_id (full_name),
        videos (id, title, duration_minutes, order_num),
        tests (id, title, total_marks, time_limit_minutes)
      `)
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) throw new Error(error.message);
    return { course: data };
  },

  createCourse: async (courseData: any) => {
    try {
      console.log('Creating course with data:', courseData);
      const { data, error } = await makeSupabaseRequest('courses-api', courseData);
      if (error) {
        console.error('Course creation API error:', error);
        throw error;
      }
      console.log('Course created successfully:', data);
      return data;
    } catch (error) {
      console.error('Course creation failed:', error);
      throw error;
    }
  },

  updateCourse: async (id: string, courseData: any) => {
    try {
      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/courses-api/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify(courseData),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error('Course update failed:', error);
      throw error;
    }
  },

  deleteCourse: async (id: string) => {
    try {
      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/courses-api/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error('Course deletion failed:', error);
      throw error;
    }
  },

  enrollInCourse: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('enrollments')
      .insert({ student_id: user?.id, course_id: id })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return { enrollment: data };
  },

  getEnrolledCourses: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, courses(*)')
      .eq('student_id', user?.id);
    
    if (error) throw new Error(error.message);
    return { courses: data.map(enrollment => enrollment.courses) };
  },

  getCourseVideos: async (id: string) => {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('course_id', id)
      .order('order_num');
    
    if (error) throw new Error(error.message);
    return { videos: data };
  },
};

// Videos API
export const videosAPI = {
  getVideos: async (params?: URLSearchParams) => {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        courses (title, subject)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { videos: data };
  },

  getVideo: async (id: string) => {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        courses (title, subject)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return { video: data };
  },

  createVideo: async (videoData: any) => {
    const { data, error } = await supabase
      .from('videos')
      .insert([videoData])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { video: data };
  },

  updateVideo: async (id: string, videoData: any) => {
    const { data, error } = await supabase
      .from('videos')
      .update(videoData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { video: data };
  },

  deleteVideo: async (id: string) => {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Video deleted successfully' };
  },

  trackProgress: async (videoId: string, progressData: { watchTime: number; isCompleted: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get enrollment first
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user?.id)
      .limit(1)
      .single();
    
    const { data, error } = await supabase
      .from('video_progress')
      .upsert({
        enrollment_id: enrollment?.id,
        video_id: videoId,
        watch_time_seconds: progressData.watchTime,
        is_completed: progressData.isCompleted,
        last_watched_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { progress: data };
  },
};

// Tests API
export const testsAPI = {
  getTests: async (params?: URLSearchParams) => {
    const { data, error } = await supabase
      .from('tests')
      .select(`
        *,
        courses (title, subject)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { tests: data };
  },

  getTest: async (id: string) => {
    const { data, error } = await supabase
      .from('tests')
      .select(`
        *,
        questions (*),
        courses (title)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return { test: data };
  },

  createTest: async (testData: any) => {
    const { data, error } = await supabase
      .from('tests')
      .insert([testData])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { test: data };
  },

  updateTest: async (id: string, testData: any) => {
    const { data, error } = await supabase
      .from('tests')
      .update(testData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { test: data };
  },

  deleteTest: async (id: string) => {
    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Test deleted successfully' };
  },

  attemptTest: async (id: string, attemptData: { answers: any[]; timeTaken?: number }) => {
    // Get test questions
    const { data: test } = await supabase
      .from('tests')
      .select('*, questions (*)')
      .eq('id', id)
      .single();

    // Calculate score
    let score = 0;
    let total_marks = 0;
    const results = [];

    for (const question of test.questions) {
      total_marks += question.marks;
      const userAnswer = attemptData.answers.find(a => a.questionId === question.id)?.answer;
      const isCorrect = userAnswer === question.correct_answer;
      
      if (isCorrect) {
        score += question.marks;
      }

      results.push({
        question_id: question.id,
        user_answer: userAnswer,
        is_correct: isCorrect,
        marks_obtained: isCorrect ? question.marks : 0
      });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Save attempt
    const { data: attempt, error } = await supabase
      .from('test_attempts')
      .insert({
        student_id: user?.id,
        test_id: id,
        score,
        total_marks,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    return { 
      attempt,
      score,
      total_marks,
      percentage: (score / total_marks) * 100
    };
  },

  getTestAttempts: async (id: string) => {
    const { data, error } = await supabase
      .from('test_attempts')
      .select('*, profiles(full_name)')
      .eq('test_id', id)
      .order('completed_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { attempts: data };
  },

  getMyTestAttempts: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('test_attempts')
      .select('*, tests(title, subject)')
      .eq('student_id', user?.id)
      .order('completed_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { attempts: data };
  },
};

// Users API
export const usersAPI = {
  getUsers: async (params?: URLSearchParams) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner (role),
        batches (name, level)
      `)
      .eq('user_roles.role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { users: data };
  },

  getUser: async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles (role),
        batches (name, level)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return { user: data };
  },

  updateUser: async (id: string, userData: any) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(userData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { user: data };
  },

  deleteUser: async (id: string) => {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
    return { message: 'User deleted successfully' };
  },

  updateProfile: async (userData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('profiles')
      .update(userData)
      .eq('id', user?.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { profile: data };
  },
};

// Analytics APIs
export const analyticsAPI = {
  getStudentAnalytics: () => makeSupabaseRequest('student-analytics'),
  getAdminAnalytics: () => makeSupabaseRequest('admin-analytics'),
  getTeacherAnalytics: () => makeSupabaseRequest('teacher-analytics'),
  getRankPrediction: () => makeSupabaseRequest('predictive-analytics'),
};

// Dashboard APIs
export const dashboardAPI = {
  getOverview: () => makeSupabaseRequest('dashboard-overview'),
  getSchedule: () => makeSupabaseRequest('dashboard-schedule'),
  getAchievements: () => makeSupabaseRequest('dashboard-achievements'),
};

export default {
  auth: authAPI,
  courses: coursesAPI,
  videos: videosAPI,
  tests: testsAPI,
  users: usersAPI,
  analytics: analyticsAPI,
  dashboard: dashboardAPI,
};