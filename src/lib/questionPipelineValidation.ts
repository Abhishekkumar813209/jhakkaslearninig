/**
 * Question Pipeline Validation Library
 * 
 * Validates data structure at each stage of the question pipeline:
 * 1. Question Extraction → generated_questions
 * 2. Question Bank → generated_questions (approved)
 * 3. Lesson Builder → topic_learning_content
 * 4. Lesson Library → topic_learning_content (human_reviewed)
 * 5. Gamified Exercises → gamified_exercises
 * 6. Student Games → gameplay
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// STAGE 1: Question Extraction Validation
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stage: string;
  data?: any;
}

/**
 * Validate extracted question from generated_questions table
 */
export async function validateExtractedQuestion(questionId: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    stage: "Question Extraction",
  };

  try {
    const { data: question, error } = await supabase
      .from('generated_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error) {
      result.isValid = false;
      result.errors.push(`DB Error: ${error.message}`);
      return result;
    }

    result.data = question;

    // Check required fields
    if (!question.question_type) {
      result.errors.push("Missing question_type");
      result.isValid = false;
    }

    if (!question.question_text) {
      result.errors.push("Missing question_text");
      result.isValid = false;
    }

    if (!question.correct_answer) {
      result.errors.push("Missing correct_answer");
      result.isValid = false;
    }

    // Parse correct_answer (it's stored as JSON string)
    let parsedAnswer: any;
    try {
      parsedAnswer = typeof question.correct_answer === 'string'
        ? JSON.parse(question.correct_answer)
        : question.correct_answer;
    } catch (e) {
      result.errors.push("Invalid correct_answer JSON format");
      result.isValid = false;
    }

    // Type-specific validation
    if (question.question_type === 'true_false') {
      // For True/False, correct_answer contains the statements array
      if (!parsedAnswer || !Array.isArray(parsedAnswer)) {
        result.errors.push("True/False: correct_answer must be an array of {text, answer} objects");
        result.isValid = false;
      } else {
        parsedAnswer.forEach((stmt: any, idx: number) => {
          if (!stmt.text) {
            result.errors.push(`Statement ${idx + 1}: Missing text`);
            result.isValid = false;
          }
          if (stmt.answer === undefined) {
            result.errors.push(`Statement ${idx + 1}: Missing answer property`);
            result.isValid = false;
          }
        });
      }
    }

    if (question.question_type === 'mcq') {
      // Parse options JSONB
      const options = typeof question.options === 'string'
        ? JSON.parse(question.options as string)
        : question.options;
        
      if (!options || !Array.isArray(options)) {
        result.errors.push("MCQ: options must be an array");
        result.isValid = false;
      }
      if (!parsedAnswer || (parsedAnswer.index === undefined && parsedAnswer.index !== 0)) {
        result.errors.push("MCQ: correct_answer must have index property");
        result.isValid = false;
      }
    }

    if (question.question_type === 'fill_blank') {
      if (!parsedAnswer || !parsedAnswer.answers || !Array.isArray(parsedAnswer.answers)) {
        result.errors.push("Fill Blank: correct_answer.answers must be an array");
        result.isValid = false;
      }
    }

    if (question.question_type === 'match_column') {
      if (!parsedAnswer || !parsedAnswer.pairs || !Array.isArray(parsedAnswer.pairs)) {
        result.errors.push("Match Column: correct_answer.pairs must be an array");
        result.isValid = false;
      }
    }

    // Check approval status
    if (!question.admin_reviewed) {
      result.warnings.push("Question not yet admin reviewed");
    }

    if (!question.is_approved) {
      result.warnings.push("Question not approved - won't be available in Lesson Builder");
    }

  } catch (error: any) {
    result.isValid = false;
    result.errors.push(`Validation error: ${error.message}`);
  }

  return result;
}

// ============================================================================
// STAGE 2: Lesson Content Validation (topic_learning_content)
// ============================================================================

/**
 * Validate lesson content before saving to topic_learning_content
 */
export async function validateLessonContent(lessonId: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    stage: "Lesson Content",
  };

  try {
    const { data: lesson, error } = await supabase
      .from('topic_learning_content')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) {
      result.isValid = false;
      result.errors.push(`DB Error: ${error.message}`);
      return result;
    }

    result.data = lesson;

    // Only validate game-type lessons
    if (lesson.lesson_type !== 'game') {
      result.warnings.push("Not a game lesson - skipping game validation");
      return result;
    }

    // Check required fields for game lessons
    if (!lesson.game_type) {
      result.errors.push("Game lesson missing game_type");
      result.isValid = false;
    }

    if (!lesson.game_data) {
      result.errors.push("Game lesson missing game_data (JSONB)");
      result.isValid = false;
    }

    // Validate game_data structure by type
    if (lesson.game_data) {
      const gameData = typeof lesson.game_data === 'string'
        ? JSON.parse(lesson.game_data)
        : lesson.game_data;

      if (lesson.game_type === 'true_false') {
        if (!gameData.statements || !Array.isArray(gameData.statements)) {
          result.errors.push("True/False: game_data.statements must be an array");
          result.isValid = false;
        } else {
          gameData.statements.forEach((stmt: any, idx: number) => {
            if (!stmt.text) {
              result.errors.push(`Statement ${idx + 1}: Missing text`);
              result.isValid = false;
            }
            if (stmt.answer === undefined) {
              result.errors.push(`Statement ${idx + 1}: Missing answer property`);
              result.isValid = false;
            }
          });
        }

        // Check correct_answer exists
        if (!gameData.correct_answer) {
          result.warnings.push("Missing correct_answer in game_data - may cause issues");
        }
      }

      if (lesson.game_type === 'mcq') {
        if (!gameData.options || !Array.isArray(gameData.options)) {
          result.errors.push("MCQ: game_data.options must be an array");
          result.isValid = false;
        }
        if (!gameData.correct_answer || gameData.correct_answer.index === undefined) {
          result.errors.push("MCQ: game_data.correct_answer.index is required");
          result.isValid = false;
        }
      }
    }

    // Check if human reviewed
    if (!lesson.human_reviewed) {
      result.warnings.push("Lesson not human_reviewed - won't trigger gamified_exercises sync");
    }

  } catch (error: any) {
    result.isValid = false;
    result.errors.push(`Validation error: ${error.message}`);
  }

  return result;
}

// ============================================================================
// STAGE 3: Gamified Exercise Validation
// ============================================================================

/**
 * Validate gamified exercise after trigger sync
 */
export async function validateGamifiedExercise(exerciseId: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    stage: "Gamified Exercise",
  };

  try {
    const { data: exercise, error } = await supabase
      .from('gamified_exercises')
      .select('*')
      .eq('id', exerciseId)
      .single();

    if (error) {
      result.isValid = false;
      result.errors.push(`DB Error: ${error.message}`);
      return result;
    }

    result.data = exercise;

    // Check required fields
    if (!exercise.exercise_type) {
      result.errors.push("Missing exercise_type");
      result.isValid = false;
    }

    if (!exercise.exercise_data) {
      result.errors.push("Missing exercise_data (JSONB)");
      result.isValid = false;
    }

    if (!exercise.correct_answer) {
      result.errors.push("Missing correct_answer - student answer validation will fail!");
      result.isValid = false;
    }

    // Parse JSONB data
    const exerciseData = typeof exercise.exercise_data === 'string'
      ? JSON.parse(exercise.exercise_data)
      : exercise.exercise_data;
    const correctAnswer = typeof exercise.correct_answer === 'string'
      ? JSON.parse(exercise.correct_answer)
      : exercise.correct_answer;

    // Type-specific validation
    if (exercise.exercise_type === 'true_false' && exerciseData) {
      if (!exerciseData.statements || !Array.isArray(exerciseData.statements)) {
        result.errors.push("True/False: exercise_data.statements must be an array");
        result.isValid = false;
      } else {
        exerciseData.statements.forEach((stmt: any, idx: number) => {
          if (!stmt.text) {
            result.errors.push(`Statement ${idx + 1}: Missing text`);
            result.isValid = false;
          }
          if (stmt.answer === undefined) {
            result.errors.push(`Statement ${idx + 1}: Missing answer property`);
            result.isValid = false;
          }
        });
      }
    }

    if (exercise.exercise_type === 'mcq' && exerciseData && correctAnswer) {
      if (!exerciseData.options || !Array.isArray(exerciseData.options)) {
        result.errors.push("MCQ: exercise_data.options must be an array");
        result.isValid = false;
      }
      if (correctAnswer.index === undefined && correctAnswer.index !== 0) {
        result.errors.push("MCQ: correct_answer.index is required");
        result.isValid = false;
      }
    }

  } catch (error: any) {
    result.isValid = false;
    result.errors.push(`Validation error: ${error.message}`);
  }

  return result;
}

// ============================================================================
// FULL PIPELINE VALIDATION
// ============================================================================

/**
 * Validate entire pipeline for a topic
 */
export async function validateTopicPipeline(topicId: string): Promise<{
  extracted: ValidationResult[];
  lessons: ValidationResult[];
  exercises: ValidationResult[];
  summary: {
    totalIssues: number;
    criticalErrors: number;
    warnings: number;
  };
}> {
  const extracted: ValidationResult[] = [];
  const lessons: ValidationResult[] = [];
  const exercises: ValidationResult[] = [];

  // 1. Check generated_questions for this topic
  const { data: genQuestions } = await supabase
    .from('generated_questions')
    .select('id')
    .eq('topic_id', topicId);

  if (genQuestions) {
    for (const q of genQuestions) {
      const validation = await validateExtractedQuestion(q.id);
      extracted.push(validation);
    }
  }

  // 2. Check topic_learning_content
  const { data: lessonContent } = await supabase
    .from('topic_learning_content')
    .select('id')
    .eq('topic_id', topicId)
    .eq('lesson_type', 'game');

  if (lessonContent) {
    for (const l of lessonContent) {
      const validation = await validateLessonContent(l.id);
      lessons.push(validation);
    }
  }

  // 3. Check gamified_exercises
  const { data: mappings } = await supabase
    .from('topic_content_mapping')
    .select('id')
    .eq('topic_id', topicId);

  if (mappings) {
    for (const m of mappings) {
      const { data: exs } = await supabase
        .from('gamified_exercises')
        .select('id')
        .eq('topic_content_id', m.id);

      if (exs) {
        for (const ex of exs) {
          const validation = await validateGamifiedExercise(ex.id);
          exercises.push(validation);
        }
      }
    }
  }

  // Calculate summary
  const allResults = [...extracted, ...lessons, ...exercises];
  const criticalErrors = allResults.reduce((sum, r) => sum + r.errors.length, 0);
  const warnings = allResults.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    extracted,
    lessons,
    exercises,
    summary: {
      totalIssues: criticalErrors + warnings,
      criticalErrors,
      warnings,
    },
  };
}

// ============================================================================
// DIAGNOSTIC QUERIES
// ============================================================================

/**
 * Get pipeline status for a specific question
 */
export async function diagnoseQuestion(questionId: string): Promise<{
  extraction: any;
  lesson: any;
  exercise: any;
  path: string[];
}> {
  const path: string[] = [];
  
  // 1. Check if exists in generated_questions
  const { data: extracted } = await supabase
    .from('generated_questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (extracted) {
    path.push(`✓ Extracted (${extracted.is_approved ? 'Approved' : 'Not Approved'})`);
  }

  // 2. Check if converted to lesson
  const { data: lesson } = await supabase
    .from('topic_learning_content')
    .select('*')
    .eq('topic_id', extracted?.topic_id)
    .eq('lesson_type', 'game')
    .eq('human_reviewed', true)
    .maybeSingle();

  if (lesson) {
    path.push(`✓ Lesson Created (${lesson.human_reviewed ? 'Reviewed' : 'Not Reviewed'})`);
  } else {
    path.push('✗ Not converted to lesson yet');
  }

  // 3. Check if synced to gamified_exercises
  let exercise = null;
  if (lesson) {
    const { data: mapping } = await supabase
      .from('topic_content_mapping')
      .select('id')
      .eq('topic_id', lesson.topic_id)
      .single();

    if (mapping) {
      const { data: ex } = await supabase
        .from('gamified_exercises')
        .select('*')
        .eq('topic_content_id', mapping.id)
        .maybeSingle();

      if (ex) {
        exercise = ex;
        path.push('✓ Synced to Gamified Exercise');
      } else {
        path.push('✗ Not synced to gamified_exercises (trigger may have failed)');
      }
    }
  }

  return {
    extraction: extracted,
    lesson,
    exercise,
    path,
  };
}
