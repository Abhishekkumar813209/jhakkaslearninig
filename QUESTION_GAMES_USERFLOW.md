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

---

## Gamified Exercises Data Structure (LessonContentBuilder Publishing)

### Expected Schema in `gamified_exercises` Table
```typescript
{
  topic_content_id: uuid,           // FK to topic_content_mapping
  exercise_type: enum,              // 'mcq' | 'true_false' | 'assertion_reason' | 'fill_blanks' | 'match_pairs' | 'match_column'
  exercise_data: JSONB,             // Game-specific data (options, statements, pairs, etc.)
  question_text: text,              // Display text for the question
  options: JSONB,                   // MCQ options array (null for non-MCQ types)
  correct_answer: JSONB,            // Answer validation data (structure varies by type)
  correct_answer_index: integer,    // For MCQ types (null for others)
  marks: integer,                   // Points awarded (default: 1)
  xp_reward: integer,               // XP earned (default: 10)
  difficulty: text,                 // 'easy' | 'medium' | 'hard'
  explanation: text,                // Answer explanation
  game_order: integer               // Display order in sequence
}
```

### Current Data Structure Being Sent (from LessonContentBuilder.tsx)

#### 1. **MCQ Type**
```typescript
insertData = {
  topic_content_id: mapping.id,
  exercise_type: 'mcq',
  exercise_data: { question: "...", options: [...], correct_answer: 2, ... },
  question_text: "What is photosynthesis?",
  options: ["Option A", "Option B", "Option C", "Option D"],
  correct_answer_index: 2,
  marks: 1,
  xp_reward: 10,
  difficulty: 'medium'
}
```

#### 2. **True/False Type**
```typescript
insertData = {
  exercise_type: 'true_false',
  exercise_data: { 
    question: "True/False Statements [3 statements] The sun is hot... | sig:a3f2e1",
    statements: [
      { text: "The sun is hot", is_true: true },
      { text: "Water freezes at 100°C", is_true: false }
    ]
  },
  question_text: "True/False Statements [3 statements] The sun is hot...",
  options: ["True", "False"],
  correct_answer_index: 0,
  // Note: exercise_data.question includes unique signature to prevent duplicates
}
```

#### 3. **Assertion-Reason Type**
```typescript
insertData = {
  exercise_type: 'assertion_reason',
  exercise_data: {
    question: "Assertion-Reason [A/R] Plants are green | They conta... | sig:b8c4d2",
    assertion: "Plants are green",
    reason: "They contain chlorophyll",
    correctOption: "A" // A=Both true+correct, B=Both true+wrong, C=A true, D=A false
  },
  question_text: "Assertion-Reason [A/R] Plants are green | They conta...",
  options: [
    "Both assertion and reason are true and reason is the correct explanation",
    "Both assertion and reason are true but reason is not the correct explanation",
    "Assertion is true but reason is false",
    "Assertion is false but reason is true"
  ],
  correct_answer_index: 0
}
```

#### 4. **Fill Blanks Type**
```typescript
insertData = {
  exercise_type: 'fill_blanks',
  exercise_data: {
    text: "The process of _____ occurs in plants.",
    blanks: [{ 
      correctAnswer: "photosynthesis", 
      distractors: ["respiration", "transpiration", "digestion"] 
    }]
  },
  question_text: "The process of _____ occurs in plants.",
  options: null,
  correct_answer: [{ correctAnswer: "photosynthesis", distractors: [...] }]
}
```

#### 5. **Match Pairs Type**
```typescript
insertData = {
  exercise_type: 'match_pairs',
  exercise_data: {
    pairs: [
      { left: "Newton", right: "Gravity" },
      { left: "Einstein", right: "Relativity" }
    ],
    marks: 2
  },
  question_text: "Match Scientists with Discoveries (2 pairs)",
  options: null,
  correct_answer: { pairs: [...] },  // Validation data
  correct_answer_index: null
}
```

#### 6. **Match Column Type**
```typescript
insertData = {
  exercise_type: 'match_column',
  exercise_data: {
    question: "Match the Columns (4 items)",
    leftColumn: ["Item 1", "Item 2", "Item 3", "Item 4"],
    rightColumn: ["Answer A", "Answer B", "Answer C", "Answer D"],
    correctPairs: [
      { left: 0, right: 2 },  // Item 1 → Answer C
      { left: 1, right: 0 },  // Item 2 → Answer A
      { left: 2, right: 3 },
      { left: 3, right: 1 }
    ]
  },
  question_text: "Match the Columns (4 items)",
  options: null,
  correct_answer: { pairs: [...] }
}
```

### Key Differences to Note
- **`exercise_data`**: Contains ALL game logic data (comprehensive)
- **`correct_answer`**: Contains ONLY validation data (minimal, for answer checking)
- **`question_text`**: Human-readable display string
- **For True/False & Assertion-Reason**: `exercise_data.question` includes unique signature to prevent DB duplicate errors

---

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
