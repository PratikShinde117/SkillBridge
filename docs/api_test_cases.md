# SkillBridge API Test Cases — Scenario System

## 1. Search Scenarios

```bash
# Search by subject
curl -b cookies.txt http://localhost:5000/api/scenarios/search?subject=Operating%20Systems

# Search by subject + year
curl -b cookies.txt http://localhost:5000/api/scenarios/search?subject=Operating%20Systems&year_level=3

# Search by concepts
curl -b cookies.txt http://localhost:5000/api/scenarios/search?concepts=sorting,graph

# All scenarios
curl -b cookies.txt http://localhost:5000/api/scenarios/search
```

**Expected Response:**
```json
{
  "success": true,
  "scenarios": [
    {
      "scenario_id": 1,
      "title": "Cloud VM Resource Manager",
      "subject": "Operating Systems",
      "concepts": ["process scheduling", "memory management", "CPU allocation", "deadlock"],
      "year_level": 3,
      "difficulty_level": "medium",
      "created_by": "system",
      "created_at": "2026-04-06T..."
    }
  ]
}
```

---

## 2. Get Scenario Detail

```bash
curl -b cookies.txt http://localhost:5000/api/scenarios/1
```

**Expected Response:**
```json
{
  "success": true,
  "scenario": {
    "scenario_id": 1,
    "title": "Cloud VM Resource Manager",
    "scenario_json": {
      "context": { "domain": "Cloud Infrastructure", "description": "...", "scale": "..." },
      "problem_statement": "...",
      "tasks": [
        { "task_id": 1, "title": "CPU Scheduling Strategy", "marks": 5, "expected_concepts": [...] },
        { "task_id": 2, "title": "Memory Allocation Design", "marks": 5, "expected_concepts": [...] },
        { "task_id": 3, "title": "Deadlock Prevention", "marks": 5, "expected_concepts": [...] }
      ]
    }
  }
}
```

---

## 3. Modify Scenario via Gemini

```bash
curl -X POST -b cookies.txt http://localhost:5000/api/scenarios/modify \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_json": {
      "context": { "domain": "Cloud Infrastructure", "description": "...", "scale": "..." },
      "problem_statement": "...",
      "tasks": [...]
    },
    "instructions": "Make the scenario focus on embedded systems instead of cloud. Reduce complexity for year 2 students."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "modified_scenario": {
    "context": { "domain": "Embedded Systems", "description": "modified...", "scale": "..." },
    "problem_statement": "modified...",
    "tasks": [
      { "task_id": 1, "title": "Modified Title", "description": "...", "marks": 5, "expected_concepts": [...] }
    ]
  }
}
```

---

## 4. Save Modified Scenario

```bash
curl -X POST -b cookies.txt http://localhost:5000/api/scenarios/save \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Embedded System Controller (Modified)",
    "subject": "Operating Systems",
    "concepts": ["embedded scheduling", "RTOS", "interrupt handling"],
    "year_level": 2,
    "difficulty_level": "easy",
    "scenario_json": { "context": {...}, "problem_statement": "...", "tasks": [...] }
  }'
```

---

## 5. Create Scenario Assignment

```bash
curl -X POST -b cookies.txt http://localhost:5000/api/scenarios/create-assignment \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Operating Systems",
    "department": "Computer Engineering",
    "division": "A",
    "batch": "all batches",
    "year": 3,
    "duration_minutes": 45,
    "deadline": "2026-04-30",
    "difficulty_level": "medium",
    "scenario_ids": [1, 2]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "assignment": {
    "assignment_id": 15,
    "assignment_type": "scenario",
    "scenario_ids": [1, 2],
    "status": "draft"
  }
}
```

---

## 6. Publish Scenario Assignment

```bash
curl -X POST -b cookies.txt http://localhost:5000/api/scenarios/publish-assignment \
  -H "Content-Type: application/json" \
  -d '{ "assignment_id": 15 }'
```

---

## 7. Student: Get Scenarios for Assignment

```bash
curl -b cookies.txt http://localhost:5000/api/scenarios/assignment/15/scenarios
```

---

## 8. Student: Submit Scenario Test

```bash
curl -X POST -b cookies.txt http://localhost:5000/assignments/15/submit \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_id": 1,
    "answers": [
      { "task_id": 1, "answer": "I would recommend using a multi-level feedback queue with round robin scheduling for each priority level. The time quantum should be adaptive based on workload. Context switching overhead is minimized by using a preemptive approach with priority aging to prevent starvation." },
      { "task_id": 2, "answer": "The VM orchestrator should implement demand paging with a modified LRU page replacement algorithm. Virtual memory addresses are translated via a TLB cache. Memory fragmentation is handled using compaction during low-usage periods." },
      { "task_id": 3, "answer": "I would implement the banker algorithm for deadlock prevention. We maintain a resource allocation graph and check for circular wait conditions before granting resources. The system checks for safe state before each allocation." }
    ]
  }'
```

---

## 9. Evaluation Result (FastAPI)

```bash
# Scenario evaluation
curl http://localhost:8000/student/evaluation/2201/15
```

**Expected Response:**
```json
{
  "assignment_id": 15,
  "student_id": "2201",
  "total_score": 12.5,
  "max_score": 15,
  "percentage": 83.33,
  "evaluation_type": "scenario",
  "evaluation_result": {
    "task_scores": [
      {
        "task_id": 1,
        "title": "CPU Scheduling Strategy",
        "score": 4.2,
        "max_score": 5,
        "concept_score": 0.8,
        "semantic_score": 0.75,
        "completeness_score": 1.0,
        "detected_concepts": ["round robin", "priority scheduling", "context switching", "preemptive scheduling"],
        "missing_concepts": ["time quantum"],
        "feedback": "Good concept coverage... Consider covering: time quantum."
      }
    ]
  }
}
```
