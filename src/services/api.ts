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

// Auth API using edge functions with fallbacks
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      const { data, error } = await makeSupabaseRequest('auth-login', credentials);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Login edge function failed:', error);
      throw error;
    }
  },

  register: async (userData: { name: string; email: string; password: string; role?: string }) => {
    try {
      const { data, error } = await makeSupabaseRequest('auth-register', {
        email: userData.email,
        password: userData.password,
        full_name: userData.name,
        role: userData.role || 'student'
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Registration edge function failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        await makeSupabaseRequest('auth-logout', {});
      }
    } catch (error) {
      console.log('Edge function logout failed');
    }
    
    // Always call direct logout as fallback
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return { message: 'Logout successful' };
  },

  googleAuth: async (redirectTo?: string) => {
    try {
      const result = await makeSupabaseRequest('auth-google', { redirectTo });
      return result as { message?: string; url: string };
    } catch (error) {
      console.error('Google auth failed:', error);
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/profile-management`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error('Get profile failed, using fallback:', error);
      
      // Fallback to direct query
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      
      if (!user) throw new Error('No user logged in');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          batch_id,
          created_at,
          updated_at
        `)
        .eq('id', user.id)
        .single();
      
      if (profileError) throw new Error(profileError.message);
      
      // Get role separately
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      return { profile: { ...profile, role: roleData?.role || 'student' } };
    }
  },

  updateProfile: async (userData: any) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/profile-management`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error('Update profile failed, using fallback:', error);
      
      // Fallback to direct query
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);
      return { profile: data };
    }
  },
};

// Courses API
export const coursesAPI = {
  getCourses: async (params?: URLSearchParams) => {
    try {
      let query = supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      // Only filter by published status if not admin view
      const showAll = params?.get('showAll');
      if (!showAll) {
        query = query.eq('is_published', true);
      }

      const { data: courses, error } = await query;

      if (error) throw new Error(error.message);
      return { courses };
    } catch (error) {
      console.error('Get courses failed:', error);
      throw error;
    }
  },

  getCourse: async (id: string) => {
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (error) throw new Error(error.message);
      return { course };
    } catch (error) {
      console.error('Get course failed:', error);
      throw error;
    }
  },

  createCourse: async (courseData: any) => {
    try {
      console.log('Creating course with data:', courseData);
      
      // Get current session to ensure we have proper auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }
      
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
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('enrollments')
      .insert([{ student_id: user.id, course_id: id }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { enrollment: data };
  },

  getEnrolledCourses: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        course_id,
        progress,
        is_completed,
        enrolled_at,
        courses (*)
      `)
      .eq('student_id', user.id);

    if (error) throw new Error(error.message);
    return { courses: enrollments?.map(e => e.courses) || [] };
  },

  getCourseLectures: async (id: string) => {
    const { data: lectures, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('course_id', id)
      .eq('is_published', true)
      .order('order_num', { ascending: true });

    if (error) throw new Error(error.message);
    return { lectures };
  },
};

// Lectures API
export const lecturesAPI = {
  getLectures: async (params?: URLSearchParams) => {
    const { data: lectures, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('is_published', true);

    if (error) throw new Error(error.message);
    return { lectures };
  },

  getLecture: async (id: string) => {
    const { data: lecture, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) throw new Error(error.message);
    return { lecture };
  },

  createLecture: async (lectureData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('lectures')
      .insert([{ ...lectureData, uploaded_by: user?.id }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { lecture: data };
  },

  updateLecture: async (id: string, lectureData: any) => {
    const { data, error } = await supabase
      .from('lectures')
      .update(lectureData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { lecture: data };
  },

  deleteLecture: async (id: string) => {
    const { error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Lecture deleted successfully' };
  },
};

// Tests API
export const testsAPI = {
  getTests: async (params?: URLSearchParams) => {
    return makeSupabaseRequest('tests-api', { params: params?.toString() });
  },

  getTest: async (id: string) => {
    return makeSupabaseRequest('tests-api', { testId: id });
  },

  createTest: async (testData: any) => {
    return makeSupabaseRequest('tests-api', testData);
  },

  updateTest: async (id: string, testData: any) => {
    return makeSupabaseRequest('tests-api', { action: 'updateTest', testId: id, ...testData });
  },

  deleteTest: async (id: string) => {
    return makeSupabaseRequest('tests-api', { action: 'deleteTest', testId: id });
  },

  attemptTest: async (id: string, attemptData: { answers: any[]; timeTaken?: number }) => {
    return makeSupabaseRequest('tests-api', { action: 'attempt', testId: id, ...attemptData });
  },
};

// Users API
export const usersAPI = {
  seedStudents: async () => {
    const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/student-management/seed-students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to seed students')
    }

    return await response.json()
  },
  getStudents: async (search?: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No authentication token');

    const url = new URL(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/users-api/students`);
    if (search) url.searchParams.set('search', search);

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || 'Failed to fetch students');
    return result as { students: any[] };
  },

  getUser: async (id: string) => {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', id)
      .single();
    
    return { user: { ...user, role: roleData?.role || 'student' } };
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
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'User deleted successfully' };
  },

  updateProfile: async (userData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('profiles')
      .update(userData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { profile: data };
  },

  assignStudentToBatch: async (studentId: string, batchId: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/users-api/students/${studentId}/batch`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ batch_id: batchId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || 'Failed to assign batch');
    return result;
  },
};

// Analytics API
export const analyticsAPI = {
  getStudentAnalytics: () => makeSupabaseRequest('student-analytics'),
  getAdminAnalytics: () => makeSupabaseRequest('admin-analytics'),
  getTeacherAnalytics: () => makeSupabaseRequest('teacher-analytics'),
  getRankPrediction: () => makeSupabaseRequest('predictive-analytics'),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => makeSupabaseRequest('dashboard-overview'),
  getSchedule: () => makeSupabaseRequest('dashboard-schedule'),
  getAchievements: () => makeSupabaseRequest('dashboard-achievements'),
};

// Export all APIs
export default {
  auth: authAPI,
  courses: coursesAPI,
  lectures: lecturesAPI,
  tests: testsAPI,
  users: usersAPI,
  analytics: analyticsAPI,
  dashboard: dashboardAPI,
};

// Batch API
export const batchAPI = {
  getBatches: async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/batch-api`, {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = result?.error || `Failed to fetch batches (${response.status})`;
        console.error('Batch API GET error:', { status: response.status, result });
        throw new Error(msg);
      }
      console.log('Batches fetched successfully:', result);
      return result;
    } catch (error) {
      console.error('Batch fetch failed:', error);
      throw error;
    }
  },

  getBatch: async (id: string) => {
    try {
      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/batch-api/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error('Get batch failed:', error);
      throw error;
    }
  },

  createBatch: async (batchData: any) => {
    try {
      console.log('Creating batch with data:', batchData);

      const token = await getAuthToken();
      if (!token) throw new Error('User not authenticated');

      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/batch-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(batchData),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = result?.error || 'Failed to create batch';
        console.error('Batch creation API error:', { status: response.status, result });
        throw new Error(msg);
      }
      console.log('Batch created successfully:', result);
      return result;
    } catch (error) {
      console.error('Batch creation failed:', error);
      throw error;
    }
  },

  updateBatch: async (id: string, batchData: any) => {
    try {
      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/batch-api/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify(batchData),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error('Batch update failed:', error);
      throw error;
    }
  },

  deleteBatch: async (id: string) => {
    try {
      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/batch-api/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error('Batch deletion failed:', error);
      throw error;
    }
  },
};