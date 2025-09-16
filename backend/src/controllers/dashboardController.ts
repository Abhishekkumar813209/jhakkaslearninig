import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '@/types';
import User from '@/models/User';
import TestAttempt from '@/models/TestAttempt';
import Enrollment from '@/models/Enrollment';
import Video from '@/models/Video';
import Course from '@/models/Course';
import asyncHandler from '@/utils/asyncHandler';
import Logger from '@/utils/logger';

// @desc    Get student dashboard overview data
// @route   GET /api/dashboard/overview
// @access  Private (Student only)
export const getDashboardOverview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    Logger.info(`📊 Fetching dashboard overview for student: ${req.user._id}`);
    
    const userId = req.user._id;
    const user = await User.findById(userId).populate('batch', 'name currentStrength');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      } as ApiResponse);
    }

    // Calculate time periods
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get current stats
    const currentStats = {
      totalStudyTime: user.analytics.totalStudyTime,
      averageScore: user.analytics.averageScore,
      streakDays: user.analytics.streakDays,
      testsAttempted: user.analytics.testsAttempted,
      batchRank: user.analytics.rank.batch,
      overallRank: user.analytics.rank.overall
    };

    // Calculate previous week stats for comparison
    const weeklyTestAttempts = await TestAttempt.find({
      student: userId,
      createdAt: { $gte: oneWeekAgo }
    });

    const monthlyTestAttempts = await TestAttempt.find({
      student: userId,
      createdAt: { $gte: oneMonthAgo }
    });

    // Calculate study time change (simplified - you might want to track daily study time)
    const thisWeekStudyTime = weeklyTestAttempts.reduce((sum, attempt) => sum + (attempt.timeTaken || 0), 0);
    const lastWeekStudyTime = user.analytics.totalStudyTime - thisWeekStudyTime;
    const studyTimeChange = lastWeekStudyTime > 0 ? ((thisWeekStudyTime - lastWeekStudyTime) / lastWeekStudyTime) * 100 : 0;

    // Calculate average score change
    const thisWeekAvgScore = weeklyTestAttempts.length > 0 
      ? weeklyTestAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / weeklyTestAttempts.length 
      : currentStats.averageScore;
    const scoreChange = currentStats.averageScore - thisWeekAvgScore;

    // Calculate streak change (simplified)
    const streakChange = 15; // You would calculate this based on historical data

    // Calculate rank change
    const totalBatchStudents = user.batch ? (user.batch as any).currentStrength : 150;
    const rankChange = 2; // You would calculate this based on historical rank data

    // Get subject-wise performance
    const subjectPerformance = await TestAttempt.aggregate([
      { $match: { student: userId } },
      {
        $lookup: {
          from: 'tests',
          localField: 'test',
          foreignField: '_id',
          as: 'testData'
        }
      },
      { $unwind: '$testData' },
      {
        $group: {
          _id: '$testData.subject',
          averageScore: { $avg: '$percentage' },
          testsCount: { $sum: 1 }
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    // Get recent activity
    const recentTestAttempts = await TestAttempt.find({ student: userId })
      .populate('test', 'title subject')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentEnrollments = await Enrollment.find({ student: userId })
      .populate('course', 'title')
      .sort({ enrolledAt: -1 })
      .limit(3);

    // Format recent activity
    const recentActivity = [
      ...recentTestAttempts.map(attempt => ({
        type: 'test' as const,
        title: `Completed Quiz: ${(attempt.test as any).title}`,
        description: `Score: ${attempt.percentage}%`,
        timestamp: attempt.createdAt,
        icon: 'CheckCircle',
        color: 'success'
      })),
      ...recentEnrollments.slice(0, 2).map(enrollment => ({
        type: 'enrollment' as const,
        title: `Enrolled in: ${(enrollment.course as any).title}`,
        description: 'New course enrollment',
        timestamp: enrollment.enrolledAt,
        icon: 'PlayCircle',
        color: 'primary'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

    // Get performance trend (last 6 months)
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    const performanceTrend = await TestAttempt.aggregate([
      {
        $match: {
          student: userId,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          averageScore: { $avg: '$percentage' },
          testsCount: { $sum: 1 }
        }
      },
      {
        $project: {
          month: {
            $let: {
              vars: {
                monthsInYear: [
                  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ]
              },
              in: { $arrayElemAt: ['$$monthsInYear', '$_id.month'] }
            }
          },
          score: { $round: ['$averageScore', 0] },
          _id: 0
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get weekly study goal progress
    const weeklyGoal = 15; // hours
    const currentWeekStudyHours = Math.round(thisWeekStudyTime / 60);
    const goalProgress = Math.min((currentWeekStudyHours / weeklyGoal) * 100, 100);

    const overviewData = {
      stats: {
        totalStudyTime: {
          value: `${Math.round(currentStats.totalStudyTime / 60)}h`,
          change: Math.round(studyTimeChange),
          changeType: studyTimeChange >= 0 ? 'increase' : 'decrease',
          description: 'This month'
        },
        averageScore: {
          value: `${Math.round(currentStats.averageScore)}%`,
          change: Math.round(Math.abs(scoreChange)),
          changeType: scoreChange >= 0 ? 'increase' : 'decrease',
          description: 'Across all subjects'
        },
        currentStreak: {
          value: `${currentStats.streakDays} days`,
          change: streakChange,
          changeType: 'increase',
          description: 'Consecutive study days'
        },
        batchRank: {
          value: `#${currentStats.batchRank || 'N/A'}`,
          change: rankChange,
          changeType: 'increase',
          description: `Out of ${totalBatchStudents} students`
        }
      },
      subjectPerformance: subjectPerformance.map(subject => ({
        subject: subject._id,
        score: Math.round(subject.averageScore)
      })),
      recentActivity,
      performanceTrend,
      weeklyGoal: {
        current: currentWeekStudyHours,
        target: weeklyGoal,
        progress: Math.round(goalProgress),
        description: goalProgress >= 80 
          ? "You're on track to meet your weekly goal!" 
          : "Keep studying to reach your weekly goal."
      }
    };

    Logger.info(`✅ Successfully fetched dashboard overview for student: ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Dashboard overview fetched successfully',
      data: overviewData
    } as ApiResponse);

  } catch (error) {
    Logger.error(`❌ Error in getDashboardOverview: ${error}`);
    throw error;
  }
});

// @desc    Get upcoming classes/schedule
// @route   GET /api/dashboard/schedule
// @access  Private (Student only)
export const getUpcomingSchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    Logger.info(`📅 Fetching upcoming schedule for student: ${req.user._id}`);

    // Mock data for now - you can replace this with actual schedule/live class data
    const upcomingClasses = [
      {
        id: 1,
        title: "Quantum Mechanics - Wave Function",
        instructor: "Dr. Rajesh Kumar",
        time: "Today, 4:00 PM",
        duration: "1.5 hours",
        subject: "Physics",
        meetingLink: "https://zoom.us/j/123456789"
      },
      {
        id: 2,
        title: "Calculus - Integration by Parts",
        instructor: "Prof. Priya Sharma", 
        time: "Tomorrow, 2:00 PM",
        duration: "2 hours",
        subject: "Mathematics",
        meetingLink: "https://zoom.us/j/987654321"
      },
      {
        id: 3,
        title: "Organic Chemistry - Reaction Mechanisms",
        instructor: "Dr. Amit Verma",
        time: "Friday, 3:30 PM",
        duration: "1.5 hours",
        subject: "Chemistry",
        meetingLink: "https://zoom.us/j/456789123"
      }
    ];

    res.status(200).json({
      success: true,
      message: 'Upcoming schedule fetched successfully',
      data: upcomingClasses
    } as ApiResponse);

  } catch (error) {
    Logger.error(`❌ Error in getUpcomingSchedule: ${error}`);
    throw error;
  }
});

// @desc    Get student achievements
// @route   GET /api/dashboard/achievements
// @access  Private (Student only)
export const getAchievements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    Logger.info(`🏆 Fetching achievements for student: ${req.user._id}`);
    
    const userId = req.user._id;

    // Get user test attempts to calculate achievements
    const testAttempts = await TestAttempt.find({ student: userId });
    const enrollments = await Enrollment.find({ student: userId });

    const achievements = [];

    // Quiz Master achievement
    const highScores = testAttempts.filter(attempt => attempt.percentage >= 90);
    if (highScores.length >= 10) {
      achievements.push({
        title: "Quiz Master",
        description: "Scored 90%+ in 10 quizzes",
        icon: "Trophy",
        earnedAt: highScores[9].createdAt,
        category: "performance"
      });
    }

    // Consistent Learner achievement
    const user = await User.findById(userId);
    if (user && user.analytics.streakDays >= 7) {
      achievements.push({
        title: "Consistent Learner",
        description: `${user.analytics.streakDays}-day learning streak`,
        icon: "Target",
        earnedAt: user.analytics.lastActiveDate,
        category: "consistency"
      });
    }

    // Fast Learner achievement
    const recentEnrollments = enrollments.filter(enrollment => 
      enrollment.enrolledAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    if (recentEnrollments.length >= 3) {
      achievements.push({
        title: "Fast Learner",
        description: "Enrolled in 3 courses this week",
        icon: "TrendingUp",
        earnedAt: recentEnrollments[2].enrolledAt,
        category: "engagement"
      });
    }

    // Course Completer achievement
    const completedCourses = enrollments.filter(enrollment => enrollment.isCompleted);
    if (completedCourses.length >= 1) {
      achievements.push({
        title: "Course Completer",
        description: `Completed ${completedCourses.length} course${completedCourses.length > 1 ? 's' : ''}`,
        icon: "Award",
        earnedAt: completedCourses[completedCourses.length - 1].completedAt,
        category: "completion"
      });
    }

    // Sort by most recent
    achievements.sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());

    res.status(200).json({
      success: true,
      message: 'Achievements fetched successfully',
      data: achievements.slice(0, 5) // Return top 5 recent achievements
    } as ApiResponse);

  } catch (error) {
    Logger.error(`❌ Error in getAchievements: ${error}`);
    throw error;
  }
});