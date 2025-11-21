# 🎥 Centralized Question Bank - Complete Video Walkthrough

## Overview
This guide walks you through the entire workflow of the Centralized Question Bank system - from initial setup to students playing games.

---

## 📹 Part 1: Initial Setup (One-Time Process)

### Step 1.1: Populate Chapter Library
**Location:** Admin Dashboard → Questions Tab → "Centralized Bank" → "Chapter Library"

1. **Select Filters:**
   - Exam Domain (e.g., "school")
   - Board (e.g., "CBSE")
   - Class (e.g., "Class 12")
   - Subject (e.g., "Chemistry")

2. **Generate Chapters:**
   - Click "Generate Chapters" button
   - AI (Gemini) will fetch comprehensive chapter list
   - Chapters appear as cards with metadata

3. **Generate Topics for Each Chapter:**
   - Click "Generate Topics" on any chapter card
   - AI generates 10-15 comprehensive topics
   - Topics appear in expandable table inside chapter card

**Expected Result:**
```
chapter_library table populated:
- id: uuid
- exam_type: "school"
- subject: "Chemistry"
- class_level: "Class 12"
- chapter_name: "States of Matter"
- full_topics: [
    {topic_name: "Intermolecular Forces", difficulty: "medium"},
    {topic_name: "Gas Laws", difficulty: "hard"},
    ...
  ]
```

---

### Step 1.2: Add Questions to Centralized Topics
**Location:** Chapter Library → Click "Manage Questions" on any topic

1. **Upload PDF/Document:**
   - Click "Upload PDF/Word" tab
   - Upload question bank document
   - AI extracts questions with OCR

2. **Review & Edit Questions:**
   - Questions appear in grid view
   - Edit text, options, correct answer
   - Set difficulty, marks, game type

3. **Save to Centralized Bank:**
   - Select questions (checkbox)
   - Click "Add to Lesson Library"
   - Questions saved with metadata:
     - `is_centralized: true`
     - `chapter_library_id`
     - `centralized_topic_name`
     - `applicable_classes: ["Class 11", "Class 12"]`
     - `applicable_exams: ["JEE", "NEET", "CBSE"]`

**Expected Result:**
```
question_bank table populated:
- id: uuid
- question_text: "What is Boyle's Law?"
- is_centralized: true
- chapter_library_id: <chapter-uuid>
- centralized_topic_name: "Gas Laws"
- applicable_classes: ["Class 11", "Class 12"]
- applicable_exams: ["JEE", "NEET"]
```

---

## 📹 Part 2: Creating New Roadmap (Per Batch)

### Step 2.1: Start Roadmap Creation
**Location:** Admin Dashboard → Roadmaps Tab → "Create Roadmap"

1. **Select Exam Details:**
   - Exam Type: "JEE"
   - Board: "CBSE" (if required)
   - Class: "Class 12"

2. **Enable Centralized Library:**
   - ✅ Check "Use Centralized Chapter Library"
   - This checkbox appears in wizard

3. **Select Subjects & Days:**
   - Choose subjects (e.g., Physics, Chemistry)
   - Allocate days per subject (e.g., 120 days)

---

### Step 2.2: Chapter Selection (Centralized Mode)
**When "Use Centralized Chapter Library" is checked:**

1. **Chapters Auto-Fetched:**
   - System queries `chapter_library` table
   - Filters by: exam_type + class_level + subject
   - Shows chapters in selection UI

2. **Admin Selects Chapters:**
   - Check/uncheck desired chapters
   - System shows suggested_days per chapter
   - Admin adjusts day allocation if needed

---

### Step 2.3: AI Generates Topics
**After chapter selection:**

1. **AI Creates Batch-Specific Topics:**
   - Based on allocated days per chapter
   - Example: "Introduction to States of Matter" (3 days)
   - Topics are DIFFERENT from centralized topics (subset/rephrased)

2. **Roadmap Created:**
   ```
   batch_roadmaps:
   - id: <roadmap-uuid>
   - batch_id: <batch-uuid>
   
   roadmap_chapters:
   - id: <chapter-uuid>
   - roadmap_id: <roadmap-uuid>
   - chapter_library_id: <central-chapter-uuid> ✅ (LINKED!)
   - chapter_name: "States of Matter"
   
   roadmap_topics:
   - id: <topic-uuid>
   - chapter_id: <chapter-uuid>
   - topic_name: "Introduction to States of Matter"
   - estimated_days: 3
   ```

**Key Point:** `chapter_library_id` is now populated, enabling question fetching!

---

## 📹 Part 3: Adding Questions to Batch Topics

### Step 3.1: Navigate to Batch-Specific Topic
**Location:** Admin Dashboard → Questions Tab → "Batch-Specific"

1. **Select Batch & Subject:**
   - Choose your batch from dropdown
   - Select subject (e.g., Chemistry)

2. **Pick a Topic:**
   - Topics list appears
   - Click on "Introduction to States of Matter"

---

### Step 3.2: Browse Centralized Questions
**NEW: "Centralized" Tab in QuestionBankBuilder**

1. **System Auto-Matches:**
   - Reads `chapter_library_id` from current roadmap chapter
   - Fetches ALL topics from that chapter's `full_topics`
   - Example: Shows "Gas Laws", "Intermolecular Forces", etc.

2. **Admin Browses Topics:**
   - Expandable cards for each centralized topic
   - Click to expand and see questions
   - Questions displayed in grid with:
     - Question text preview
     - Difficulty badge
     - Game type
     - Multi-select checkbox

3. **Select Relevant Questions:**
   - Admin uses their understanding
   - Selects questions that fit "Introduction to States of Matter"
   - Can pick from ANY centralized topic (no forced mapping)

---

### Step 3.3: Assign Questions to Batch Topic

1. **Click "Add to Topic" Button:**
   - Selected questions get assigned
   - System calls `topic-questions-api` → `assign_to_batch` action

2. **What Happens Behind the Scenes:**
   ```
   batch_question_assignments table:
   - id: uuid
   - batch_id: <batch-uuid>
   - roadmap_topic_id: <topic-uuid>
   - question_id: <centralized-question-uuid>
   - chapter_library_id: <chapter-uuid>
   - assignment_order: 1, 2, 3...
   ```

**Critical: NO DATA DUPLICATION!**
- Questions NOT copied to `gamified_exercises`
- Only references stored in `batch_question_assignments`

---

## 📹 Part 4: Student Experience (Zero Changes Needed)

### Step 4.1: Student Opens Topic

**Location:** Student Dashboard → Roadmap → Topic → "Play Games"

1. **System Fetches Games (gameNavigation.ts with JOINs):**
   ```sql
   -- Lesson Library Games (existing)
   SELECT * FROM gamified_exercises
   WHERE topic_content_id IN (
     SELECT id FROM topic_content_mapping WHERE topic_id = <topic-uuid>
   )
   
   UNION
   
   -- Centralized Assigned Questions (NEW)
   SELECT 
     bqa.id,
     bqa.assignment_order as game_order,
     qb.question_text,
     qb.question_type as exercise_type,
     qb.options,
     qb.correct_answer,
     qb.marks,
     qb.difficulty,
     qb.explanation
   FROM batch_question_assignments bqa
   JOIN question_bank qb ON bqa.question_id = qb.id
   WHERE bqa.roadmap_topic_id = <topic-uuid>
     AND bqa.is_active = true
   ORDER BY bqa.assignment_order
   ```

2. **Merged Game List:**
   - Lesson library games + Assigned centralized questions
   - Ordered by `game_order` / `assignment_order`
   - Deduplicated by ID

---

### Step 4.2: Student Plays Game

1. **GamePlayerPage.tsx:**
   - Receives question data from gameNavigation.ts
   - Renders appropriate game component (MCQ, FillBlanks, etc.)
   - No changes needed - works with both sources!

2. **Progress Tracking (Existing Logic):**
   ```
   student_question_attempts:
   - student_id
   - question_id (from either source)
   - is_correct
   - time_spent
   
   game-xp-award edge function:
   - Awards XP based on question_id
   - Source-agnostic (doesn't care where question came from)
   ```

---

## 🎯 Key Benefits Recap

### For Admins:
✅ Create questions once, use across multiple batches  
✅ No manual copy-paste or duplication  
✅ Flexible question assignment (mix centralized + custom)  
✅ Cross-exam question reuse (JEE questions for NEET batch)  

### For System:
✅ Zero data duplication (only references stored)  
✅ Efficient storage and queries  
✅ Single source of truth for questions  
✅ Easy updates (edit once, reflects everywhere)  

### For Students:
✅ Seamless experience (no difference in gameplay)  
✅ Access to high-quality centralized question bank  
✅ Consistent progress tracking  

---

## 🔧 Troubleshooting Common Issues

### Issue 1: "No centralized topics found"
**Cause:** `chapter_library_id` not populated in roadmap_chapters  
**Fix:** Recreate roadmap with "Use Centralized Chapter Library" checked

### Issue 2: "Questions not appearing for students"
**Cause:** `is_active` flag in batch_question_assignments is false  
**Fix:** Check assignment records, set is_active = true

### Issue 3: "Duplicate questions showing"
**Cause:** Question exists in both lesson library AND assignments  
**Fix:** gameNavigation.ts deduplicates by ID automatically

---

## 📊 Database Schema Summary

```
┌─────────────────────┐
│  chapter_library    │ (Centralized)
├─────────────────────┤
│ id                  │
│ exam_type           │
│ subject             │
│ class_level         │
│ chapter_name        │
│ full_topics (JSONB) │ ← 10-15 topics with difficulty
└─────────────────────┘
         ↓ links to
┌─────────────────────┐
│  roadmap_chapters   │ (Batch-Specific)
├─────────────────────┤
│ id                  │
│ roadmap_id          │
│ chapter_library_id  │ ← KEY LINK! 🔑
│ chapter_name        │
└─────────────────────┘
         ↓ contains
┌─────────────────────┐
│  roadmap_topics     │ (Batch-Specific, AI-Generated)
├─────────────────────┤
│ id                  │
│ chapter_id          │
│ topic_name          │
│ estimated_days      │
└─────────────────────┘
         ↓ gets questions via
┌─────────────────────────────┐
│  batch_question_assignments │ (REFERENCE TABLE)
├─────────────────────────────┤
│ id                          │
│ batch_id                    │
│ roadmap_topic_id            │ ← Batch topic
│ question_id                 │ ← Centralized question
│ chapter_library_id          │
│ assignment_order            │
└─────────────────────────────┘
         ↓ references
┌─────────────────────┐
│  question_bank      │ (Centralized Questions)
├─────────────────────┤
│ id                  │
│ is_centralized      │
│ chapter_library_id  │
│ centralized_topic_name │
│ question_text       │
│ options             │
│ correct_answer      │
│ applicable_classes  │
│ applicable_exams    │
└─────────────────────┘
```

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Chapter library has chapters with generated topics
- [ ] Question bank has centralized questions with metadata
- [ ] New roadmap has `chapter_library_id` populated
- [ ] Batch-specific topic shows centralized questions in "Centralized" tab
- [ ] Questions assigned create records in `batch_question_assignments`
- [ ] Students can see and play assigned questions
- [ ] Progress tracking works (XP awarded, attempts logged)
- [ ] No duplicate questions showing to students

---

## 🚀 Next Steps

1. **Populate your chapter library** for key exam types
2. **Add questions** to centralized topics (upload PDFs)
3. **Create a test roadmap** with centralized library enabled
4. **Assign questions** to a batch topic
5. **Test as student** - play games and verify experience

---

**Questions or Issues?** Check WorkflowDiagrams.tsx for detailed technical flow!
