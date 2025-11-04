-- Insert 8 sample questions for Tissues topic (CBSE Class 9 Science)
-- topic_id: b61645ad-fef8-42d2-9a54-bbe396b332d4 (Introduction to Tissues)
-- chapter_id: a6fe60c5-8b95-48a4-a6d9-3061236e56e9 (Tissues)

-- MCQ Questions
INSERT INTO question_bank (
  topic_id,
  chapter_id,
  question_text, 
  question_type, 
  correct_answer, 
  options, 
  marks, 
  difficulty,
  subject,
  exam_domain,
  exam_name,
  explanation,
  is_published,
  created_manually
) VALUES 
(
  'b61645ad-fef8-42d2-9a54-bbe396b332d4',
  'a6fe60c5-8b95-48a4-a6d9-3061236e56e9',
  'What is a tissue?',
  'mcq',
  '1',
  '[{"text": "A single cell", "isCorrect": false}, {"text": "A group of cells with similar structure performing a specific function", "isCorrect": true}, {"text": "An organ system", "isCorrect": false}, {"text": "A type of protein", "isCorrect": false}]'::jsonb,
  1,
  'easy',
  'Science',
  'School/Board Exams',
  'CBSE Class 9',
  'A tissue is defined as a group of cells that have similar structure and work together to perform a specific function.',
  true,
  true
),
(
  'b61645ad-fef8-42d2-9a54-bbe396b332d4',
  'a6fe60c5-8b95-48a4-a6d9-3061236e56e9',
  'Which of the following is NOT a major difference between plant and animal tissues?',
  'mcq',
  '3',
  '[{"text": "Plant tissues have cell walls", "isCorrect": false}, {"text": "Animal tissues are more mobile", "isCorrect": false}, {"text": "Plant tissues cannot perform photosynthesis", "isCorrect": false}, {"text": "Both tissues have the same energy source", "isCorrect": true}]'::jsonb,
  2,
  'medium',
  'Science',
  'School/Board Exams',
  'CBSE Class 9',
  'Plant and animal tissues have different energy sources - plants use photosynthesis while animals get energy from food.',
  true,
  true
),
(
  'b61645ad-fef8-42d2-9a54-bbe396b332d4',
  'a6fe60c5-8b95-48a4-a6d9-3061236e56e9',
  'What is the significance of tissue formation in multicellular organisms?',
  'mcq',
  '1',
  '[{"text": "It allows division of labor and specialization", "isCorrect": true}, {"text": "It makes organisms larger", "isCorrect": false}, {"text": "It increases cell count", "isCorrect": false}, {"text": "It reduces energy consumption", "isCorrect": false}]'::jsonb,
  2,
  'medium',
  'Science',
  'School/Board Exams',
  'CBSE Class 9',
  'Tissue formation allows different groups of cells to specialize in specific functions, making the organism more efficient.',
  true,
  true
);

-- True/False Questions
INSERT INTO question_bank (
  topic_id,
  chapter_id,
  question_text, 
  question_type, 
  correct_answer, 
  marks, 
  difficulty,
  subject,
  exam_domain,
  exam_name,
  explanation,
  is_published,
  created_manually
) VALUES 
(
  'b61645ad-fef8-42d2-9a54-bbe396b332d4',
  'a6fe60c5-8b95-48a4-a6d9-3061236e56e9',
  'All cells in a tissue have exactly the same function.',
  'true_false',
  'true',
  1,
  'easy',
  'Science',
  'School/Board Exams',
  'CBSE Class 9',
  'True - In a tissue, all cells have similar structure and perform the same specific function.',
  true,
  true
),
(
  'b61645ad-fef8-42d2-9a54-bbe396b332d4',
  'a6fe60c5-8b95-48a4-a6d9-3061236e56e9',
  'Plant tissues and animal tissues have completely different cellular organizations.',
  'true_false',
  'true',
  1,
  'easy',
  'Science',
  'School/Board Exams',
  'CBSE Class 9',
  'True - Plant tissues have cell walls and are generally stationary, while animal tissues lack cell walls and are more mobile.',
  true,
  true
);

-- Match Column Questions
INSERT INTO question_bank (
  topic_id,
  chapter_id,
  question_text, 
  question_type, 
  correct_answer,
  left_column,
  right_column,
  marks, 
  difficulty,
  subject,
  exam_domain,
  exam_name,
  explanation,
  is_published,
  created_manually
) VALUES 
(
  'b61645ad-fef8-42d2-9a54-bbe396b332d4',
  'a6fe60c5-8b95-48a4-a6d9-3061236e56e9',
  'Match the following tissue types with their characteristics:',
  'match_column',
  '{"A": "2", "B": "1", "C": "4", "D": "3"}',
  ARRAY['A. Plant Tissue', 'B. Animal Tissue', 'C. Meristematic', 'D. Permanent'],
  ARRAY['1. Mobile cells without cell wall', '2. Has rigid cell wall', '3. Non-dividing cells', '4. Actively dividing cells'],
  4,
  'medium',
  'Science',
  'School/Board Exams',
  'CBSE Class 9',
  'Plant tissues have cell walls and can be meristematic (dividing) or permanent (non-dividing). Animal tissues are mobile and lack cell walls.',
  true,
  true
),
(
  'b61645ad-fef8-42d2-9a54-bbe396b332d4',
  'a6fe60c5-8b95-48a4-a6d9-3061236e56e9',
  'Match the tissue significance with its description:',
  'match_column',
  '{"A": "3", "B": "1", "C": "2"}',
  ARRAY['A. Division of Labor', 'B. Protection', 'C. Support'],
  ARRAY['1. Guards the body from external damage', '2. Provides structural strength', '3. Different cells perform different tasks'],
  3,
  'easy',
  'Science',
  'School/Board Exams',
  'CBSE Class 9',
  'Tissues allow organisms to have specialized functions: division of labor, protection, and structural support.',
  true,
  true
);

-- Fill in the Blanks Question
INSERT INTO question_bank (
  topic_id,
  chapter_id,
  question_text, 
  question_type, 
  correct_answer,
  marks, 
  difficulty,
  subject,
  exam_domain,
  exam_name,
  explanation,
  is_published,
  created_manually
) VALUES 
(
  'b61645ad-fef8-42d2-9a54-bbe396b332d4',
  'a6fe60c5-8b95-48a4-a6d9-3061236e56e9',
  'A _____ is a group of cells with similar _____ that work together to perform a specific _____.',
  'fill_blank',
  '["tissue", "structure", "function"]',
  3,
  'easy',
  'Science',
  'School/Board Exams',
  'CBSE Class 9',
  'The definition of tissue includes three key components: it is a group of cells, they have similar structure, and they perform a specific function.',
  true,
  true
);