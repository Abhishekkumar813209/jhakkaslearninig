# Topic Zone Analytics Testing Guide

## Overview
This guide provides comprehensive testing steps for the Topic Zone Analytics system, including batch recalculation, auto-recalculation triggers, parent portal tooltips, and analytics export features.

---

## Test 1: Batch Recalculation (Manual)

**Purpose:** Update all existing student topic statuses with new thresholds (>70% green, 50-70% grey, <50% red)

**Steps:**
1. Navigate to: **Admin Dashboard → Overview tab**
2. Scroll to the **"System Maintenance"** section
3. Click the **"Recalculate All Topic Statuses"** button
4. Wait for the confirmation toast notification

**Expected Results:**
- ✅ Toast displays: "Successfully recalculated X topic statuses"
- ✅ All 9 existing records in `student_topic_status` table are updated
- ✅ Topic colors in Parent Portal reflect new thresholds immediately
- ✅ `calculated_at` timestamp is updated for all recalculated records

**Verification Queries:**
```sql
-- Check all topic statuses after recalculation
SELECT student_id, topic_id, status, game_completion_rate, calculated_at 
FROM student_topic_status 
ORDER BY calculated_at DESC;

-- Verify status distribution
SELECT status, COUNT(*) as count 
FROM student_topic_status 
GROUP BY status;
```

---

## Test 2: Auto-Recalculation Triggers

**Purpose:** Verify topic statuses update automatically when students complete games

**Steps:**
1. Login as a student account
2. Navigate to a topic with games
3. Complete a game (or multiple games)
4. Check the database for automatic updates

**Expected Results:**
- ✅ Database trigger fires automatically after game completion
- ✅ `student_topic_game_progress` table is updated
- ✅ `calculate_topic_status()` function is called automatically
- ✅ `student_topic_status.calculated_at` timestamp updates
- ✅ Topic color changes in real-time (if threshold crossed)
- ✅ Parent Portal shows updated status immediately
- ✅ No manual recalculation needed

**Verification Steps:**
```sql
-- Monitor trigger execution (check recent updates)
SELECT 
  stp.student_id,
  stp.topic_id,
  sts.status,
  sts.game_completion_rate,
  sts.calculated_at,
  stp.questions_completed,
  stp.total_questions
FROM student_topic_game_progress stp
LEFT JOIN student_topic_status sts ON stp.student_id = sts.student_id AND stp.topic_id = sts.topic_id
WHERE sts.calculated_at > NOW() - INTERVAL '5 minutes'
ORDER BY sts.calculated_at DESC;
```

**Database Logs:**
- Monitor Supabase logs for trigger execution
- Path: **Supabase Dashboard → Database → Functions**
- Look for: `auto_recalculate_topic_status` execution logs

---

## Test 3: Topic Zone Analytics Dashboard

**Purpose:** View distribution of topics across green/grey/red zones

**Navigation:**
1. Login as admin
2. Navigate to: **Admin Dashboard → Topic Zone Analytics tab**

**Features to Test:**

### 3.1 Summary Cards
**Expected Display:**
- Total Topics count
- Green Zone (>70%) - count and percentage
- Grey Zone (50-70%) - count and percentage  
- Red Zone (<50%) - count and percentage - **highlighted if >30%**

### 3.2 Zone Distribution Pie Chart
**Expected Display:**
- Visual pie chart with three segments
- Colors: Green (#22c55e), Grey (#6b7280), Red (#ef4444)
- Hover shows: count and percentage for each zone

### 3.3 Subject-wise Distribution Bar Chart
**Expected Display:**
- Stacked bar chart
- X-axis: Subjects (Physics, Chemistry, Mathematics, etc.)
- Y-axis: Topic count
- Stacked colors for green/grey/red zones

### 3.4 Batch Comparison Table
**Expected Display:**
- Table showing each batch's zone distribution
- Columns: Batch Name, Green, Grey, Red, Total, Green %, Red %
- Sortable by each column
- Highlights batches with >40% red zone topics

### 3.5 Problem Topics Table
**Expected Display:**
- Topics with <50% average completion (red zone)
- Columns: Topic Name, Subject, Chapter, Avg Completion %, Struggling Students
- Sortable by completion rate (lowest first)
- Limited to top 20 problem topics

### 3.6 Filters
**Available Filters:**
- Subject filter: All / Physics / Chemistry / Mathematics / Biology
- Updates problem topics table based on selection

---

## Test 4: CSV Export

**Steps:**
1. Navigate to: **Admin Dashboard → Topic Zone Analytics**
2. Click **"Export CSV"** button
3. Wait for file download

**Expected Results:**
- ✅ CSV file downloads automatically
- ✅ Filename format: `topic-zone-analytics-YYYY-MM-DD.csv`
- ✅ Toast notification: "Analytics exported to CSV successfully"

**CSV Content Verification:**
File should contain these sections:

```csv
Topic Zone Analytics Report
Generated: [timestamp]

OVERALL DISTRIBUTION
Zone,Count,Percentage
Green (>70%),45,45.0%
Grey (50-70%),30,30.0%
Red (<50%),25,25.0%

SUBJECT-WISE DISTRIBUTION
Subject,Green,Grey,Red,Total
Physics,12,8,5,25
Chemistry,10,7,6,23
Mathematics,15,10,8,33

BATCH-WISE DISTRIBUTION
Batch,Green,Grey,Red,Total
JEE 2025 - Morning,20,15,10,45
NEET 2025,18,12,8,38

PROBLEM TOPICS (Red Zone)
Topic,Subject,Chapter,Avg Completion %,Struggling Students
"Newton's Laws","Physics","Mechanics",45.2%,45
...
```

**Open in Excel/Google Sheets:**
- Verify data is properly formatted
- Check percentages are accurate
- Verify all subjects/batches are included

---

## Test 5: PDF Export

**Steps:**
1. Navigate to: **Admin Dashboard → Topic Zone Analytics**
2. Click **"Export PDF"** button
3. Wait for file download

**Expected Results:**
- ✅ PDF file downloads automatically
- ✅ Filename format: `topic-zone-analytics-YYYY-MM-DD.pdf`
- ✅ Toast notification: "Analytics exported to PDF successfully"

**PDF Content Verification:**

**Page 1:**
- Header: "Topic Zone Analytics Report"
- Date/time stamp
- Overall Distribution Table (Zone, Count, Percentage)
- Subject-wise Distribution Table (Subject, Green, Grey, Red, Total)

**Page 2:**
- Problem Topics Table (Top 20 red zone topics)
- Formatted with headers and proper spacing
- Footer: Page numbers (e.g., "Page 1 of 2")

**Visual Quality:**
- Tables have grid borders
- Headers use blue background (#3b82f6 for overall/subject, #ef4444 for problem topics)
- Text is readable and properly sized
- Page breaks are appropriate

---

## Test 6: Parent Portal Tooltips

**Purpose:** Show exact completion percentages on hover

### 6.1 ParentRoadmapCalendar Tooltips

**Steps:**
1. Login as parent account
2. Navigate to: **Parent Dashboard → Roadmap Calendar**
3. Hover over any topic card (green/grey/red colored)

**Expected Tooltip Display:**
```
Progress Details
Game Completion: 65.5%
Games: 5/8
Status: Grey
```

**Test Different Statuses:**
- Green topics (>70%) - verify tooltip shows green status
- Grey topics (50-70%) - verify tooltip shows grey status  
- Red topics (<50%) - verify tooltip shows red status

### 6.2 RoadmapDailyCalendar Tooltips

**Steps:**
1. Navigate to: **Parent Dashboard → Daily Calendar View**
2. Expand any day's accordion
3. Hover over topic cards

**Expected Tooltip Display:**
```
Progress Details
Game Completion: 45.2%
Games: 3/10
Chapter: Mechanics
Status: Red
```

### 6.3 TopicWiseBreakdown Tooltips

**Steps:**
1. Navigate to: **Parent Dashboard → Topic-wise Breakdown**
2. Hover over individual topic performance cards

**Expected Tooltip Display:**
```
Topic Performance
Average Score: 75%
XP Earned: 120
Mastery Level: Intermediate
Time Spent: 45 min
Practice Count: 8
```

**Tooltip Behavior:**
- ✅ Appears on hover within 200-300ms
- ✅ Positioned intelligently (top/bottom based on viewport)
- ✅ Disappears when mouse leaves
- ✅ Readable on all backgrounds (light/dark mode)
- ✅ Shows accurate data from database

---

## Test 7: Dialog Scrollability Fix

**Purpose:** Ensure lecture addition dialog is fully accessible

**Steps:**
1. Navigate to: **Admin Dashboard → Chapter Lectures**
2. Select: Domain → Board → Class → Batch → Subject → Chapter
3. Click **"Add Lecture"** button
4. Paste a YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
5. Click **"Auto-Fetch"** button

**Expected Results:**
- ✅ Dialog opens with fixed height (~90vh max)
- ✅ When video details load, vertical scrollbar appears
- ✅ Can scroll to see all fields:
  - Video thumbnail preview
  - Title (auto-filled)
  - Description textarea
  - XP Reward input
  - Save Lecture button
- ✅ Save button is always accessible (not cut off)
- ✅ Dialog is responsive on mobile/tablet

**Test on Different Screen Sizes:**
- Desktop (1920x1080)
- Laptop (1366x768)
- Tablet (768x1024)
- Mobile (375x667)

---

## Test 8: Student Lecture Access

**Purpose:** Verify students can find and watch lectures

### 8.1 Via Roadmap

**Steps:**
1. Login as student
2. Navigate to: **Student Dashboard → My Roadmap**
3. Select any chapter that has lectures
4. Look for **"View Lectures"** button
5. Click it

**Expected Results:**
- ✅ Opens `ChapterLecturePlaylist` component
- ✅ Shows list of all lectures in the chapter
- ✅ Displays for each lecture:
  - Thumbnail image
  - Title
  - Duration (formatted as MM:SS)
  - Progress bar
  - Completion status badge
  - XP reward

### 8.2 Watching Lectures

**Steps:**
1. From lecture playlist, click any lecture
2. Navigate to: `/student/roadmap/:roadmapId/chapter/:chapterId/lectures`

**Expected Results:**
- ✅ Opens `LecturePlayerPage` with YouTube embed
- ✅ Video plays properly
- ✅ Watch progress tracks automatically
- ✅ Progress bar updates in real-time
- ✅ When 80% watched:
  - XP is awarded automatically
  - Completion status updates
  - Toast notification appears
- ✅ Next/Previous lecture navigation buttons work
- ✅ Can return to lecture list

---

## Edge Cases & Error Scenarios

### Invalid Data
**Test:** Trigger recalculation with no data in `student_topic_status`
**Expected:** Toast shows "No topic statuses to recalculate"

### Network Errors
**Test:** Disconnect network and try exporting
**Expected:** Error toast with clear message

### Empty Analytics
**Test:** View analytics dashboard with no student data
**Expected:** Shows "No analytics data available" message

### Permission Errors
**Test:** Student trying to access admin analytics
**Expected:** Redirected or access denied

---

## Performance Benchmarks

### Batch Recalculation
- Should complete in <5 seconds for 9 records
- Should show progress if >50 records

### Auto-Recalculation
- Should trigger within 100ms of game completion
- Should not cause UI lag

### Analytics Dashboard
- Should load in <2 seconds
- Charts should render smoothly

### Export Functions
- CSV: Should generate in <1 second
- PDF: Should generate in <3 seconds (includes chart rendering)

---

## Rollback Plan

If any issues are found:

1. **Disable Auto-Recalculation Trigger:**
```sql
DROP TRIGGER IF EXISTS trigger_auto_recalculate_topic_status ON student_topic_game_progress;
```

2. **Revert to Manual Recalculation:**
- Use the batch recalculation button only
- Monitor database load

3. **Export Issues:**
- Falls back to manual data export
- Users can still view analytics on dashboard

---

## Success Criteria

✅ All 9 existing student topic statuses recalculated successfully  
✅ Auto-recalculation triggers work without manual intervention  
✅ Parent portal tooltips show accurate completion data  
✅ Analytics dashboard displays all zone distributions  
✅ CSV export contains all required data sections  
✅ PDF export is professionally formatted  
✅ Dialog scrollability allows access to all form fields  
✅ Students can find and watch lectures via roadmap  
✅ No performance degradation or database errors  
✅ All security policies remain intact

---

## Support & Troubleshooting

**Database Issues:**
- Check Supabase logs: Dashboard → Database → Logs
- Verify trigger exists: `\df auto_recalculate_topic_status`

**Edge Function Issues:**
- Check function logs: Dashboard → Edge Functions → [function-name] → Logs
- Verify CORS headers are set correctly

**Export Issues:**
- Clear browser cache
- Try incognito/private window
- Check browser console for errors

**Contact:**
For any issues during testing, check:
1. Browser console errors
2. Supabase dashboard logs
3. Network tab for failed requests
