const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Get all tests
const getTests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      course,
      subject,
      difficulty
    } = req.query;

    const filter = {};
    if (course) filter.course = course;
    if (subject) filter.subject = subject;
    if (difficulty) filter.difficulty = difficulty;

    const tests = await Test.find(filter)
      .populate('course', 'title subject')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Test.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: tests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests'
    });
  }
};

// Get single test
const getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('course', 'title subject')
      .populate('createdBy', 'name email');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if student has access to this test
    if (req.user.role === 'student' && test.course) {
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: test.course._id
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'Not enrolled in the course for this test'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: test
    });
  } catch (error) {
    console.error('Get test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test'
    });
  }
};

// Create new test (Teacher/Admin only)
const createTest = async (req, res) => {
  try {
    const testData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate course if provided
    if (testData.course) {
      const course = await Course.findById(testData.course);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user has permission to add test to this course
      if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add test to this course'
        });
      }
    }

    const test = await Test.create(testData);
    await test.populate('course', 'title subject');
    await test.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: test,
      message: 'Test created successfully'
    });
  } catch (error) {
    console.error('Create test error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create test'
    });
  }
};

// Update test (Teacher/Admin only)
const updateTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this test'
      });
    }

    const updatedTest = await Test.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('course', 'title subject')
     .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      data: updatedTest,
      message: 'Test updated successfully'
    });
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update test'
    });
  }
};

// Delete test (Teacher/Admin only)
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this test'
      });
    }

    // Delete associated test attempts
    await TestAttempt.deleteMany({ test: test._id });
    await Test.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Test deleted successfully'
    });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test'
    });
  }
};

// Attempt test (Student only)
const attemptTest = async (req, res) => {
  try {
    const { answers } = req.body;
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if student has access to this test
    if (test.course) {
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: test.course
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'Not enrolled in the course for this test'
        });
      }
    }

    // Check if already attempted (if retakes not allowed)
    if (!test.allowRetakes) {
      const existingAttempt = await TestAttempt.findOne({
        test: test._id,
        student: req.user._id
      });

      if (existingAttempt) {
        return res.status(400).json({
          success: false,
          message: 'Test already attempted. Retakes not allowed.'
        });
      }
    }

    // Calculate score
    let score = 0;
    let correctAnswers = 0;
    const results = [];

    test.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) {
        score += question.marks;
        correctAnswers++;
      }

      results.push({
        questionId: question._id,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        marks: isCorrect ? question.marks : 0
      });
    });

    const percentage = Math.round((score / test.totalMarks) * 100);

    // Create test attempt
    const attempt = await TestAttempt.create({
      test: test._id,
      student: req.user._id,
      answers: results,
      score,
      percentage,
      totalQuestions: test.questions.length,
      correctAnswers,
      timeTaken: req.body.timeTaken || 0
    });

    await attempt.populate('test', 'title totalMarks');

    res.status(201).json({
      success: true,
      data: attempt,
      message: 'Test completed successfully'
    });
  } catch (error) {
    console.error('Attempt test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit test'
    });
  }
};

// Get test attempts for a specific test (Teacher/Admin only)
const getTestAttempts = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view test attempts'
      });
    }

    const attempts = await TestAttempt.find({ test: test._id })
      .populate('student', 'name email')
      .sort({ attemptedAt: -1 });

    res.status(200).json({
      success: true,
      data: attempts
    });
  } catch (error) {
    console.error('Get test attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test attempts'
    });
  }
};

// Get student's own test attempts
const getMyTestAttempts = async (req, res) => {
  try {
    const attempts = await TestAttempt.find({ student: req.user._id })
      .populate('test', 'title totalMarks subject')
      .sort({ attemptedAt: -1 });

    res.status(200).json({
      success: true,
      data: attempts
    });
  } catch (error) {
    console.error('Get my test attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test attempts'
    });
  }
};

module.exports = {
  getTests,
  getTest,
  createTest,
  updateTest,
  deleteTest,
  attemptTest,
  getTestAttempts,
  getMyTestAttempts
};