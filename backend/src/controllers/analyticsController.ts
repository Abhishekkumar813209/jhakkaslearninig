import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, StudentAnalytics, AdminAnalytics, ApiResponse } from '@/types';
import User from '@/models/User';
import Course from '@/models/Course';
import Test from '@/models/Test';
import TestAttempt from '@/models/TestAttempt';
import Enrollment from '@/models/Enrollment';
import Video from '@/models/Video';
import asyncHandler from '@/utils/asyncHandler';
import Logger from '@/utils/logger';

// @desc    Get student analytics
// @route   GET /api/analytics/student
// @access  Private (Student only)
export const getStudentAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    Logger.info(`📊 Fetching analytics for student: ${req.user._id}`);
    
    const userId = req.user._id;

    // Get user with analytics data
    const user = await User.findById(userId).populate('batch', 'name level');
    if (!user) {
      Logger.warn(`❌ User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      } as ApiResponse);
    }

    // Get enrollments with course details
    const enrollments = await Enrollment.find({ student: userId })
      .populate('course', 'title subject level')
      .sort({ enrolledAt: -1 });

    // Get test attempts
    const testAttempts = await TestAttempt.find({ student: userId })
      .populate('test', 'title subject totalMarks')
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate analytics
    const coursesEnrolled = enrollments.length;
    const coursesCompleted = enrollments.filter(e => e.isCompleted).length;
    const totalWatchTime = enrollments.reduce((sum, e) => sum + e.totalWatchTime, 0);

    // Recent activity
    const recentActivity = [
      ...testAttempts.slice(0, 10).map(attempt => ({
        type: 'test' as const,
        title: (attempt.test as any).title,
        timestamp: attempt.createdAt,
        score: attempt.percentage
      })),
      ...enrollments.slice(0, 5).map(enrollment => ({
        type: 'course' as const,
        title: (enrollment.course as any).title,
        timestamp: enrollment.enrolledAt
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    // Performance trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAttempts = await TestAttempt.find({
      student: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }).populate('test', 'subject');

    const performanceTrend = recentAttempts.map(attempt => ({
      date: attempt.createdAt,
      score: attempt.percentage,
      subject: (attempt.test as any).subject
    }));

    // Subject-wise performance
    const subjectMap = new Map();
    testAttempts.forEach(attempt => {
      const subject = (attempt.test as any).subject;
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { total: 0, count: 0 });
      }
      const current = subjectMap.get(subject);
      current.total += attempt.percentage;
      current.count += 1;
    });

    const subjectWisePerformance = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      averageScore: Math.round(data.total / data.count),
      testsAttempted: data.count
    }));

    // Calculate rank (simplified - you might want to implement more sophisticated ranking)
    const batchStudents = user.batch ? await User.countDocuments({ 
      batch: user.batch, 
      role: 'student',
      'analytics.averageScore': { $lt: user.analytics.averageScore }
    }) : null;

    const allStudents = await User.countDocuments({ 
      role: 'student',
      'analytics.averageScore': { $lt: user.analytics.averageScore }
    });

    const analytics: StudentAnalytics = {
      userId,
      totalStudyTime: user.analytics.totalStudyTime,
      streakDays: user.analytics.streakDays,
      testsAttempted: user.analytics.testsAttempted,
      averageScore: user.analytics.averageScore,
      coursesEnrolled,
      coursesCompleted,
      totalWatchTime,
      rank: {
        batch: batchStudents ? batchStudents + 1 : undefined,
        overall: allStudents + 1
      },
      recentActivity,
      performanceTrend,
      subjectWisePerformance
    };

    Logger.info(`✅ Successfully fetched analytics for student: ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Student analytics fetched successfully',
      data: analytics
    } as ApiResponse<StudentAnalytics>);

  } catch (error) {
    Logger.error(`❌ Error in getStudentAnalytics: ${error}`);
    throw error;
  }
});

// @desc    Get admin analytics
// @route   GET /api/analytics/admin
// @access  Private (Admin only)
export const getAdminAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    Logger.info(`📊 Fetching admin analytics by user: ${req.user._id}`);

    // Get counts
    const [
      totalStudents,
      totalTeachers,
      totalCourses,
      totalTests,
      totalEnrollments
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Course.countDocuments(),
      Test.countDocuments(),
      Enrollment.countDocuments()
    ]);

    // Calculate revenue (simplified - you'll need to implement payment tracking)
    const totalRevenue = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      {
        $unwind: '$courseData'
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$courseData.price' }
        }
      }
    ]);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
      Enrollment.aggregate([
        { $match: { enrolledAt: { $gte: thisMonth } } },
        {
          $lookup: {
            from: 'courses',
            localField: 'course',
            foreignField: '_id',
            as: 'courseData'
          }
        },
        { $unwind: '$courseData' },
        { $group: { _id: null, total: { $sum: '$courseData.price' } } }
      ]),
      Enrollment.aggregate([
        { 
          $match: { 
            enrolledAt: { 
              $gte: lastMonth, 
              $lt: thisMonth 
            } 
          } 
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'course',
            foreignField: '_id',
            as: 'courseData'
          }
        },
        { $unwind: '$courseData' },
        { $group: { _id: null, total: { $sum: '$courseData.price' } } }
      ])
    ]);

    const revenue = {
      total: totalRevenue[0]?.total || 0,
      thisMonth: thisMonthRevenue[0]?.total || 0,
      lastMonth: lastMonthRevenue[0]?.total || 0,
      growth: 0
    };

    if (revenue.lastMonth > 0) {
      revenue.growth = ((revenue.thisMonth - revenue.lastMonth) / revenue.lastMonth) * 100;
    }

    // Active users
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dailyActive, weeklyActive, monthlyActive] = await Promise.all([
      User.countDocuments({ 'analytics.lastActiveDate': { $gte: oneDayAgo } }),
      User.countDocuments({ 'analytics.lastActiveDate': { $gte: oneWeekAgo } }),
      User.countDocuments({ 'analytics.lastActiveDate': { $gte: oneMonthAgo } })
    ]);

    // Course popularity
    const coursePopularity = await Course.aggregate([
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'course',
          as: 'enrollments'
        }
      },
      {
        $project: {
          title: 1,
          rating: 1,
          enrollments: { $size: '$enrollments' }
        }
      },
      { $sort: { enrollments: -1 } },
      { $limit: 10 }
    ]);

    // Test analytics
    const testAnalytics = await TestAttempt.aggregate([
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          passedAttempts: {
            $sum: {
              $cond: [{ $gte: ['$percentage', 60] }, 1, 0]
            }
          }
        }
      }
    ]);

    const testStats = testAnalytics[0] || { totalAttempts: 0, averageScore: 0, passedAttempts: 0 };
    const passRate = testStats.totalAttempts > 0 ? (testStats.passedAttempts / testStats.totalAttempts) * 100 : 0;

    // User registrations (last 30 days)
    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          count: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Revenue chart (last 30 days)
    const revenueChart = await Enrollment.aggregate([
      {
        $match: {
          enrolledAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      { $unwind: '$courseData' },
      {
        $group: {
          _id: {
            year: { $year: '$enrolledAt' },
            month: { $month: '$enrolledAt' },
            day: { $dayOfMonth: '$enrolledAt' }
          },
          amount: { $sum: '$courseData.price' }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          amount: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    const analytics: AdminAnalytics = {
      totalStudents,
      totalTeachers,
      totalCourses,
      totalTests,
      totalEnrollments,
      revenue,
      activeUsers: {
        daily: dailyActive,
        weekly: weeklyActive,
        monthly: monthlyActive
      },
      coursePopularity: coursePopularity.map(course => ({
        courseId: course._id,
        title: course.title,
        enrollments: course.enrollments,
        rating: course.rating
      })),
      testAnalytics: {
        totalAttempts: testStats.totalAttempts,
        averageScore: Math.round(testStats.averageScore || 0),
        passRate: Math.round(passRate)
      },
      userRegistrations,
      revenueChart
    };

    Logger.info(`✅ Successfully fetched admin analytics`);
    
    res.status(200).json({
      success: true,
      message: 'Admin analytics fetched successfully',
      data: analytics
    } as ApiResponse<AdminAnalytics>);

  } catch (error) {
    Logger.error(`❌ Error in getAdminAnalytics: ${error}`);
    throw error;
  }
});

// @desc    Get teacher analytics
// @route   GET /api/analytics/teacher
// @access  Private (Teacher only)
export const getTeacherAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    Logger.info(`📊 Fetching teacher analytics for: ${req.user._id}`);

    const teacherId = req.user._id;

    // Get teacher's courses
    const courses = await Course.find({ instructor: teacherId });
    const courseIds = courses.map(c => c._id);

    // Get enrollments for teacher's courses
    const enrollments = await Enrollment.find({ course: { $in: courseIds } })
      .populate('course', 'title')
      .populate('student', 'name email');

    // Get test attempts for teacher's tests
    const tests = await Test.find({ createdBy: teacherId });
    const testIds = tests.map(t => t._id);
    
    const testAttempts = await TestAttempt.find({ test: { $in: testIds } })
      .populate('test', 'title')
      .populate('student', 'name email');

    // Calculate analytics
    const totalStudents = new Set(enrollments.map(e => e.student.toString())).size;
    const totalEnrollments = enrollments.length;
    const averageEnrollmentPerCourse = courses.length > 0 ? totalEnrollments / courses.length : 0;

    const courseAnalytics = courses.map(course => {
      const courseEnrollments = enrollments.filter(e => e.course._id.toString() === course._id.toString());
      const completedCount = courseEnrollments.filter(e => e.isCompleted).length;
      const avgProgress = courseEnrollments.length > 0 
        ? courseEnrollments.reduce((sum, e) => sum + e.progress, 0) / courseEnrollments.length 
        : 0;

      return {
        courseId: course._id,
        title: course.title,
        enrollments: courseEnrollments.length,
        completionRate: courseEnrollments.length > 0 ? (completedCount / courseEnrollments.length) * 100 : 0,
        averageProgress: Math.round(avgProgress),
        rating: course.rating
      };
    });

    const testAnalytics = tests.map(test => {
      const attempts = testAttempts.filter(a => a.test._id.toString() === test._id.toString());
      const avgScore = attempts.length > 0 
        ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length 
        : 0;
      const passRate = attempts.length > 0 
        ? (attempts.filter(a => a.percentage >= (test.passingMarks / test.totalMarks) * 100).length / attempts.length) * 100 
        : 0;

      return {
        testId: test._id,
        title: test.title,
        attempts: attempts.length,
        averageScore: Math.round(avgScore),
        passRate: Math.round(passRate)
      };
    });

    const analytics = {
      totalCourses: courses.length,
      totalStudents,
      totalEnrollments,
      totalTests: tests.length,
      totalTestAttempts: testAttempts.length,
      averageEnrollmentPerCourse: Math.round(averageEnrollmentPerCourse),
      courseAnalytics,
      testAnalytics,
      recentEnrollments: enrollments
        .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
        .slice(0, 10)
        .map(e => ({
          studentName: (e.student as any).name,
          courseName: (e.course as any).title,
          enrolledAt: e.enrolledAt
        }))
    };

    Logger.info(`✅ Successfully fetched teacher analytics for: ${teacherId}`);
    
    res.status(200).json({
      success: true,
      message: 'Teacher analytics fetched successfully',
      data: analytics
    } as ApiResponse);

  } catch (error) {
    Logger.error(`❌ Error in getTeacherAnalytics: ${error}`);
    throw error;
  }
});

// @desc    Get predictive rank
// @route   GET /api/analytics/rank-prediction
// @access  Private (Student only)
export const getRankPrediction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    Logger.info(`🔮 Generating rank prediction for student: ${req.user._id}`);

    const userId = req.user._id;

    // Get student's test history
    const testAttempts = await TestAttempt.find({ student: userId })
      .populate('test', 'subject totalMarks')
      .sort({ createdAt: -1 })
      .limit(20);

    if (testAttempts.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Need at least 3 test attempts for rank prediction'
      } as ApiResponse);
    }

    // Calculate trend
    const recentScores = testAttempts.slice(0, 10).map(a => a.percentage);
    const trend = recentScores.length > 1 
      ? (recentScores[0] - recentScores[recentScores.length - 1]) / (recentScores.length - 1)
      : 0;

    // Get current rank
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      } as ApiResponse);
    }

    // Simple prediction algorithm (you can make this more sophisticated)
    const currentScore = user.analytics.averageScore;
    const predictedScoreIncrease = Math.max(0, trend * 5); // Predict improvement over next 5 tests
    const predictedScore = Math.min(100, currentScore + predictedScoreIncrease);

    // Calculate predicted rank based on score improvement
    const betterStudentsCount = await User.countDocuments({
      role: 'student',
      'analytics.averageScore': { $gt: predictedScore }
    });

    const totalStudents = await User.countDocuments({ role: 'student' });
    const predictedRank = betterStudentsCount + 1;
    const percentile = ((totalStudents - predictedRank + 1) / totalStudents) * 100;

    // Subject-wise predictions
    const subjectPredictions = [];
    const subjects = [...new Set(testAttempts.map(a => (a.test as any).subject))];
    
    for (const subject of subjects) {
      const subjectAttempts = testAttempts.filter(a => (a.test as any).subject === subject);
      const subjectScores = subjectAttempts.map(a => a.percentage);
      const subjectTrend = subjectScores.length > 1 
        ? (subjectScores[0] - subjectScores[subjectScores.length - 1]) / (subjectScores.length - 1)
        : 0;
      
      const currentSubjectAvg = subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length;
      const predictedSubjectScore = Math.min(100, currentSubjectAvg + (subjectTrend * 3));

      subjectPredictions.push({
        subject,
        currentAverage: Math.round(currentSubjectAvg),
        predictedScore: Math.round(predictedSubjectScore),
        trend: subjectTrend > 0 ? 'improving' : subjectTrend < 0 ? 'declining' : 'stable'
      });
    }

    const prediction = {
      currentRank: user.analytics.rank.overall || null,
      predictedRank,
      percentile: Math.round(percentile),
      currentScore: Math.round(currentScore),
      predictedScore: Math.round(predictedScore),
      improvement: Math.round(predictedScore - currentScore),
      confidence: Math.min(100, Math.max(50, 100 - (Math.abs(trend) * 10))), // Simple confidence calculation
      trend: trend > 2 ? 'strong_improvement' : trend > 0 ? 'improving' : trend < -2 ? 'declining' : 'stable',
      subjectPredictions,
      recommendations: generateRecommendations(trend, subjectPredictions)
    };

    Logger.info(`✅ Successfully generated rank prediction for student: ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Rank prediction generated successfully',
      data: prediction
    } as ApiResponse);

  } catch (error) {
    Logger.error(`❌ Error in getRankPrediction: ${error}`);
    throw error;
  }
});

// Helper function to generate recommendations
function generateRecommendations(trend: number, subjectPredictions: any[]): string[] {
  const recommendations = [];

  if (trend < -1) {
    recommendations.push('Focus on consistent study schedule to improve performance');
    recommendations.push('Review previous test mistakes and weak areas');
  } else if (trend > 1) {
    recommendations.push('Great progress! Maintain your current study momentum');
    recommendations.push('Consider taking more challenging tests to further improve');
  } else {
    recommendations.push('Maintain steady practice to keep improving');
  }

  // Subject-specific recommendations
  const weakSubjects = subjectPredictions
    .filter(s => s.currentAverage < 60)
    .sort((a, b) => a.currentAverage - b.currentAverage);

  if (weakSubjects.length > 0) {
    recommendations.push(`Focus more on ${weakSubjects[0].subject} - consider extra practice`);
  }

  const strongSubjects = subjectPredictions
    .filter(s => s.currentAverage > 80)
    .slice(0, 2);

  if (strongSubjects.length > 0) {
    recommendations.push(`Leverage your strength in ${strongSubjects.map(s => s.subject).join(' and ')}`);
  }

  return recommendations.slice(0, 4); // Limit to 4 recommendations
}