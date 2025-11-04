-- Insert 8 sample questions for Tissues topic
INSERT INTO question_bank (
  question_text, 
  question_type, 
  correct_answer, 
  options, 
  marks, 
  difficulty,
  subject,
  explanation,
  created_manually,
  left_column,
  right_column
) VALUES 
('What is a tissue?', 'mcq', '1', '[{"text": "A single cell", "isCorrect": false}, {"text": "A group of cells with similar structure performing a specific function", "isCorrect": true}, {"text": "An organ system", "isCorrect": false}, {"text": "A type of protein", "isCorrect": false}]'::jsonb, 1, 'easy', 'Science', 'A tissue is a group of cells with similar structure working together.', true, NULL, NULL),
('Which of the following is NOT a major difference between plant and animal tissues?', 'mcq', '3', '[{"text": "Plant tissues have cell walls", "isCorrect": false}, {"text": "Animal tissues are more mobile", "isCorrect": false}, {"text": "Plant tissues cannot perform photosynthesis", "isCorrect": false}, {"text": "Both tissues have the same energy source", "isCorrect": true}]'::jsonb, 2, 'medium', 'Science', 'Plant and animal tissues have different energy sources.', true, NULL, NULL),
('What is the significance of tissue formation in multicellular organisms?', 'mcq', '1', '[{"text": "It allows division of labor and specialization", "isCorrect": true}, {"text": "It makes organisms larger", "isCorrect": false}, {"text": "It increases cell count", "isCorrect": false}, {"text": "It reduces energy consumption", "isCorrect": false}]'::jsonb, 2, 'medium', 'Science', 'Tissue formation allows specialization of functions.', true, NULL, NULL),
('All cells in a tissue have exactly the same function.', 'true_false', 'true', NULL, 1, 'easy', 'Science', 'Cells in a tissue perform the same specific function.', true, NULL, NULL),
('Plant tissues and animal tissues have completely different cellular organizations.', 'true_false', 'true', NULL, 1, 'easy', 'Science', 'Plant and animal tissues have different organizations.', true, NULL, NULL),
('Match the following tissue types with their characteristics:', 'match_column', '{"A": "2", "B": "1", "C": "4", "D": "3"}', NULL, 4, 'medium', 'Science', 'Matching tissue types and characteristics.', true, ARRAY['A. Plant Tissue', 'B. Animal Tissue', 'C. Meristematic', 'D. Permanent'], ARRAY['1. Mobile cells without cell wall', '2. Has rigid cell wall', '3. Non-dividing cells', '4. Actively dividing cells']),
('Match the tissue significance with its description:', 'match_column', '{"A": "3", "B": "1", "C": "2"}', NULL, 3, 'easy', 'Science', 'Tissue functions and significance.', true, ARRAY['A. Division of Labor', 'B. Protection', 'C. Support'], ARRAY['1. Guards body from damage', '2. Provides strength', '3. Different tasks by cells']),
('A _____ is a group of cells with similar _____ that work together to perform a specific _____.', 'fill_blank', '["tissue", "structure", "function"]', NULL, 3, 'easy', 'Science', 'Definition of tissue components.', true, NULL, NULL);