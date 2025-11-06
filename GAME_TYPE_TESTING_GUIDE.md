# Game Type Publishing Test Guide

## Quick Test (1 minute)

1. **Check Normalization Test Panel**
   - Go to Admin → Lesson Content Builder
   - Click on "📊 Analytics" tab
   - Review the "Game Type Normalization Test" panel
   - All 8 game types should show ✅ green checkmarks
   - Score should be **8/8 Passed**

## Full Publishing Test (5 minutes)

### Prerequisites
- You must have a Batch, Subject, Chapter, and Topic selected
- You should be logged in as admin

### Test Each Game Type

#### 1. Match Column Test
- **Create:**
  - Type: `game`
  - Game Type: `match_column`
  - Add sample game data
- **Expected:**
  - ✅ Saves to `topic_learning_content` with `game_type = "match_columns"` (plural)
- **Approve:** Click "Approve" button
- **Publish:** Select lesson → Click "Publish Selected"
- **Expected:**
  - ✅ Creates `topic_content_mapping` with `content_type = "match_column"` (singular)
  - ✅ Success toast shows
  - ❌ NO 400 error

#### 2. Drag-Drop Sort Test
- **Create:**
  - Game Type: `drag_drop`
- **Expected:**
  - Saves with `game_type = "drag_drop"`
- **Publish:**
  - Creates mapping with `content_type = "drag_drop_sort"`

#### 3. Sequence Order Test
- **Create:**
  - Game Type: `sequence_order`
- **Expected:**
  - Saves with `game_type = "sequence_order"`
- **Publish:**
  - Creates mapping with `content_type = "drag_drop_sequence"`

#### 4. Word Puzzle Test
- **Create:**
  - Game Type: `word_puzzle`
- **Expected:**
  - Saves with `game_type = "word_puzzle"`
- **Publish:**
  - Creates mapping with `content_type = "crossword"`

#### 5. Fill Blanks Test
- **Create:**
  - Game Type: `fill_blanks`
- **Expected:**
  - Saves with `game_type = "fill_blanks"`
- **Publish:**
  - Creates mapping with `content_type = "fill_blanks"` (same)

#### 6. Match Pairs Test
- **Create:**
  - Game Type: `match_pairs`
- **Expected:**
  - Both tables use `match_pairs` (same)

#### 7. MCQ Test
- **Create:**
  - Game Type: `mcq`
- **Expected:**
  - Both tables use `mcq` (same)

#### 8. True/False Test
- **Create:**
  - Game Type: `true_false`
- **Expected:**
  - Both tables use `true_false` (same)

## Debugging Published Games

### Console Logs to Watch
When publishing, you should see:
```
🎮 Game type normalization for mapping: {
  lesson_id: "...",
  raw: "match_column",
  normalized_for_mapping: "match_column"
}
✅ Created new mapping: [mapping_id]
```

### Check Database (Optional)
```sql
-- Check topic_learning_content
SELECT id, game_type, approved_at 
FROM topic_learning_content 
WHERE topic_id = 'YOUR_TOPIC_ID' 
AND lesson_type = 'game';

-- Check topic_content_mapping
SELECT id, content_type, order_num 
FROM topic_content_mapping 
WHERE topic_id = 'YOUR_TOPIC_ID';

-- Check gamified_exercises
SELECT id, exercise_type, question_text 
FROM gamified_exercises 
WHERE topic_content_id IN (
  SELECT id FROM topic_content_mapping WHERE topic_id = 'YOUR_TOPIC_ID'
);
```

## Common Issues & Solutions

### ❌ "Unsupported game type" error
**Cause:** Game type not in central mapping
**Solution:** Check `src/lib/gameTypeMapping.ts` for allowed types

### ❌ 400 Bad Request on publish
**Cause:** Invalid column in payload or wrong normalization
**Solution:** 
1. Check console logs for exact error
2. Verify Analytics tab shows 8/8 passed
3. Check network tab for response body

### ❌ Lesson saves but won't publish
**Cause:** Lesson not approved (human_reviewed = false)
**Solution:** Click "Approve" button before publishing

### ❌ Toast shows error but DB query succeeds
**Cause:** Stale error from previous failed request
**Solution:** Hard refresh page (Ctrl+Shift+R)

## Success Criteria

✅ All 8 game types in Analytics tab show green checkmarks  
✅ Match Column publishes without 400 error  
✅ Drag-Drop publishes with correct `drag_drop_sort` mapping  
✅ Sequence publishes with correct `drag_drop_sequence` mapping  
✅ Word Puzzle publishes with correct `crossword` mapping  
✅ Console shows no ❌ red error logs during publish  
✅ Success toasts appear for all publish operations  
✅ Students can see published games in their learning path  

## Regression Test Checklist

Run this after any changes to game type mapping:

- [ ] Analytics tab shows 8/8 passed
- [ ] Can create and approve all 8 game types
- [ ] All 8 game types publish successfully
- [ ] No 400 errors in network tab
- [ ] No console errors during create/publish
- [ ] Toast messages are descriptive
- [ ] Database constraints don't fail
- [ ] Students can play published games

## Quick Reference: Game Type Mappings

| UI Name | Input | Content Table | Mapping Table |
|---------|-------|---------------|---------------|
| Match Column | `match_column` | `match_columns` | `match_column` |
| Drag-Drop | `drag_drop` | `drag_drop` | `drag_drop_sort` |
| Sequence | `sequence_order` | `sequence_order` | `drag_drop_sequence` |
| Word Puzzle | `word_puzzle` | `word_puzzle` | `crossword` |
| Fill Blanks | `fill_blanks` | `fill_blanks` | `fill_blanks` |
| Match Pairs | `match_pairs` | `match_pairs` | `match_pairs` |
| MCQ | `mcq` | `mcq` | `mcq` |
| True/False | `true_false` | `true_false` | `true_false` |
