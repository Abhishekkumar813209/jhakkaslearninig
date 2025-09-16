const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to make API requests
const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: { name: string; email: string; password: string; role?: string }) =>
    makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () =>
    makeRequest('/auth/logout', {
      method: 'POST',
    }),

  getProfile: () => makeRequest('/auth/me'),

  updateProfile: (userData: any) =>
    makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
};

// Courses API
export const coursesAPI = {
  getCourses: (params?: URLSearchParams) =>
    makeRequest(`/courses${params ? `?${params.toString()}` : ''}`),

  getCourse: (id: string) => makeRequest(`/courses/${id}`),

  createCourse: (courseData: any) =>
    makeRequest('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    }),

  updateCourse: (id: string, courseData: any) =>
    makeRequest(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    }),

  deleteCourse: (id: string) =>
    makeRequest(`/courses/${id}`, {
      method: 'DELETE',
    }),

  enrollInCourse: (id: string) =>
    makeRequest(`/courses/${id}/enroll`, {
      method: 'POST',
    }),

  getEnrolledCourses: () => makeRequest('/courses/enrolled/my-courses'),

  getCourseVideos: (id: string) => makeRequest(`/courses/${id}/videos`),
};

// Videos API
export const videosAPI = {
  getVideos: (params?: URLSearchParams) =>
    makeRequest(`/videos${params ? `?${params.toString()}` : ''}`),

  getVideo: (id: string) => makeRequest(`/videos/${id}`),

  createVideo: (formData: FormData) =>
    fetch(`${API_BASE_URL}/videos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: formData,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Video upload failed');
      }
      return data;
    }),

  updateVideo: (id: string, videoData: any) =>
    makeRequest(`/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(videoData),
    }),

  deleteVideo: (id: string) =>
    makeRequest(`/videos/${id}`, {
      method: 'DELETE',
    }),

  trackProgress: (videoId: string, progressData: { watchTime: number; isCompleted: boolean }) =>
    makeRequest(`/videos/${videoId}/progress`, {
      method: 'POST',
      body: JSON.stringify(progressData),
    }),
};

// Tests API
export const testsAPI = {
  getTests: (params?: URLSearchParams) =>
    makeRequest(`/tests${params ? `?${params.toString()}` : ''}`),

  getTest: (id: string) => makeRequest(`/tests/${id}`),

  createTest: (testData: any) =>
    makeRequest('/tests', {
      method: 'POST',
      body: JSON.stringify(testData),
    }),

  updateTest: (id: string, testData: any) =>
    makeRequest(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(testData),
    }),

  deleteTest: (id: string) =>
    makeRequest(`/tests/${id}`, {
      method: 'DELETE',
    }),

  attemptTest: (id: string, attemptData: { answers: any[]; timeTaken?: number }) =>
    makeRequest(`/tests/${id}/attempt`, {
      method: 'POST',
      body: JSON.stringify(attemptData),
    }),

  getTestAttempts: (id: string) => makeRequest(`/tests/${id}/attempts`),

  getMyTestAttempts: () => makeRequest('/tests/attempts/my-attempts'),
};

// Users API
export const usersAPI = {
  getUsers: (params?: URLSearchParams) =>
    makeRequest(`/users${params ? `?${params.toString()}` : ''}`),

  getUser: (id: string) => makeRequest(`/users/${id}`),

  updateUser: (id: string, userData: any) =>
    makeRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  deleteUser: (id: string) =>
    makeRequest(`/users/${id}`, {
      method: 'DELETE',
    }),

  updateProfile: (userData: any) =>
    makeRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
};

export default {
  auth: authAPI,
  courses: coursesAPI,
  videos: videosAPI,
  tests: testsAPI,
  users: usersAPI,
};