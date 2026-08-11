# Education Module: Ultimate Student Productivity Stack

## Architecture Overview

All 5 feature areas integrate into the existing EduSync module without breaking current functionality.

## Feature Matrix

| Feature | New Entity | New Page | New Component | Modified |
|---|---|---|---|---|
| 1. AI Syllabus Parsing | — | `EduSyllabusParse` | `SyllabusUploader` `SyllabusParseResult` | — |
| 2. Flashcards + Spaced Repetition | FlashcardDeck, Flashcard | `EduFlashcards` | `FlashcardReview` `FlashcardDeckList` `SM2Engine` | — |
| 3. Grade Analytics | — | `EduAnalyticsPage` | `GradeProjection` `PerformanceRadar` `ProgressTimeline` | EduVault (enhance) |
| 4. Workload Analyzer | — | — | `WorkloadGauge` `BurnoutWarning` | EduHome, EduFocusHub |
| 5. Unified Dashboard + Gamification | — | — | `StreakCalendar` `XpBar` `CompletionRing` | EduHome |

## Implementation Order

1. Create entity schemas (FlashcardDeck, Flashcard) + SM-2 engine
2. Build Flashcards page (spaced repetition)
3. Build AI Syllabus Parser
4. Build enhanced Grade Analytics page
5. Enhance dashboard with gamification + workload gauge
6. Register routes + nav
7. Lint + build

## Base44 Entity Schema: FlashcardDeck

```
name: string (e.g. "ECE 243 - Midterm Prep")
course_id: string (optional, links to Course)
description: string
card_count: number (derived)
created_date: date-time
```

## Base44 Entity Schema: Flashcard

```
deck_id: string (links to FlashcardDeck)
front: string (question / term)
back: string (answer / definition)
easiness: number (SM-2, default 2.5)
interval: number (days, default 0)
repetitions: number (default 0)
next_review: string (date, ISO)
last_reviewed: string (date-time, optional)
created_date: date-time
```

## SM-2 Algorithm

Standard SuperMemo SM-2:
- Grade 0-5 (0=complete blackout, 5=perfect recall)
- EF updated: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
- If grade ≥ 3: interval = prevInterval * EF; reps++
- If grade < 3: reset interval=1, reps=0
- Clamp EF to min 1.3

## AI Syllabus Parsing Flow

1. User uploads PDF/image file
2. File uploaded via Core.UploadFile
3. AI invoked with syllabus parsing prompt
4. Results shown in review table (courses + deliverables)
5. User confirms → batch create courses + deliverables via existing mutators