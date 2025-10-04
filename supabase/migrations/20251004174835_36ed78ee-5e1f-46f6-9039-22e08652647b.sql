-- Add CHECK constraints for game_type and svg_type in topic_learning_content table

-- Ensure game_type is set when lesson_type is 'game'
ALTER TABLE topic_learning_content
DROP CONSTRAINT IF EXISTS game_type_required;

ALTER TABLE topic_learning_content
ADD CONSTRAINT game_type_required
CHECK (
  (lesson_type = 'game' AND game_type IS NOT NULL AND game_data IS NOT NULL)
  OR lesson_type != 'game'
);

-- Ensure svg_type is set when lesson_type is 'interactive_svg'
ALTER TABLE topic_learning_content
DROP CONSTRAINT IF EXISTS svg_type_required;

ALTER TABLE topic_learning_content
ADD CONSTRAINT svg_type_required
CHECK (
  (lesson_type = 'interactive_svg' AND svg_type IS NOT NULL AND svg_data IS NOT NULL)
  OR lesson_type != 'interactive_svg'
);

-- Add comments for documentation
COMMENT ON CONSTRAINT game_type_required ON topic_learning_content IS 'Ensures game_type and game_data are set when lesson_type is game';
COMMENT ON CONSTRAINT svg_type_required ON topic_learning_content IS 'Ensures svg_type and svg_data are set when lesson_type is interactive_svg';