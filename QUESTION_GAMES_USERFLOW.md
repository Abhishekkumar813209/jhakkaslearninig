# Question Games User Flow - Admin to Student

## Overview
Complete workflow for creating interactive question games with different answer formats.

## Admin Workflow

### 1. **MCQ Questions**
- Location: `QuestionBankBuilder.tsx` → Select "MCQ"
- Admin enters question + 4 options (with optional images)
- Select correct option via radio button
- **Storage**: `correct_answer = { index: 2 }`
- **Student Component**: `MCQGame.tsx` (radio buttons)

### 2. **Fill in the Blanks (Drag-Drop)**
- Location: `QuestionBankBuilder.tsx` → Select "Fill Blank"
- Admin defines number of blanks
- For each blank:
  - Enter correct answer
  - Add 3 distractor words (wrong options)
- **Storage**: `correct_answer = { blanks: [{ correctAnswer: "photosynthesis", distractors: ["respiration", "transpiration", "digestion"] }] }`
- **Student Component**: `DragDropBlanks.tsx` (drag words into blanks)

### 3. **Match Column (Line Drawing)**
- Location: `QuestionBankBuilder.tsx` → Select "Match Column"
- Admin enters left column items (e.g., Scientists)
- Admin enters right column items (e.g., Discoveries)
- Match pairs using dropdown
- **Storage**: `correct_answer = { pairs: [{ left: 0, right: 2 }, { left: 1, right: 0 }] }`
- **Student Component**: `LineMatchingGame.tsx` (click to draw SVG lines)

### 4. **True/False (Large Buttons)**
- Location: `QuestionBankBuilder.tsx` → Select "True/False"
- Admin enters statement
- Toggle TRUE or FALSE switch
- **Storage**: `correct_answer = { value: true }`
- **Student Component**: `TrueFalseGame.tsx` (large animated buttons)

## Answer Storage Location
- **Table**: `question_bank`
- **Column**: `correct_answer` (JSONB type)
- **Flexibility**: JSONB allows different formats per question type

## Student Gameplay Flow
1. Student opens topic in `TopicStudyView.tsx`
2. Question type routes to appropriate game component
3. Student interacts (drag/drop, draw lines, click buttons)
4. Answer validated against stored `correct_answer`
5. Correct → XP reward + confetti + sound
6. Wrong → Show correct answer + explanation
7. Progress saved to `student_topic_game_progress`

## Key Files
- **Admin**: `QuestionAnswerInput.tsx`, `QuestionBankBuilder.tsx`, `RichQuestionEditor.tsx`
- **Student Games**: `MCQGame.tsx`, `DragDropBlanks.tsx`, `LineMatchingGame.tsx`, `TrueFalseGame.tsx`
- **Routing**: `TopicStudyView.tsx`
- **Database**: `question_bank.correct_answer` (JSONB)
