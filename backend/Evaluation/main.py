"""
SkillBridge Evaluation Service
===============================
Production-grade FastAPI evaluation engine.

Architecture:
  /routers     → Route handlers (question_eval, scenario_eval)
  /services    → Business logic (question_evaluator, scenario_evaluator)
  /utils       → Shared utilities (concept_detector, similarity, scoring, feedback)

Host: 127.0.0.1:8000
"""

import os
import json
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2

# Load environment variables
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
else:
    load_dotenv()

# ============================================================
# APP SETUP
# ============================================================

app = FastAPI(
    title="SkillBridge Evaluation Service",
    description="Hybrid evaluation engine for question-based and scenario-based assessments",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REGISTER ROUTERS
# ============================================================

from routers.question_eval_v2 import router as question_router
from routers.scenario_eval_v2 import router as scenario_router

app.include_router(question_router)
app.include_router(scenario_router)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def health():
    return {
        "service": "SkillBridge Evaluation Service",
        "version": "2.0.0",
        "status": "running",
        "endpoints": [
            "POST /evaluate-question",
            "POST /evaluate-scenario",
            "GET /student/evaluation/{student_id}/{assignment_id}"
        ]
    }


# ============================================================
# STUDENT RESULT RETRIEVAL (shared route)
# ============================================================

@app.get("/student/evaluation/{student_id}/{assignment_id}")
def get_evaluation(student_id: str, assignment_id: int):
    """
    Retrieve evaluation result for a student.
    Auto-detects whether it's a question or scenario evaluation.
    Called by the frontend ScenarioResult page and StudentDashboard.
    """
    try:
        from db import get_connection
        conn = get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                SELECT s.evaluation_result,
                       s.answers,
                       s.total_score,
                       a.assignment_type,
                       a.subject,
                       a.common_feedback
                FROM assignment_submissions s
                JOIN assignments a ON a.assignment_id = s.assignment_id
                WHERE s.roll_no = %s AND s.assignment_id = %s
                """,
                (student_id, assignment_id)
            )
            submission = cursor.fetchone()
        except psycopg2.errors.UndefinedColumn:
            conn.rollback()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT s.evaluation_result,
                       s.answers,
                       s.total_score,
                       a.assignment_type,
                       a.subject
                FROM assignment_submissions s
                JOIN assignments a ON a.assignment_id = s.assignment_id
                WHERE s.roll_no = %s AND s.assignment_id = %s
                """,
                (student_id, assignment_id)
            )
            legacy_submission = cursor.fetchone()
            if legacy_submission:
                submission = (*legacy_submission, "")
            else:
                submission = None

        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")

        evaluation_result, answers, total_score, assignment_type, subject, common_feedback = submission

        if isinstance(answers, str):
            try:
                answers = json.loads(answers)
            except Exception:
                answers = {}
        
        if isinstance(evaluation_result, str):
            try:
                evaluation_result = json.loads(evaluation_result)
            except Exception:
                evaluation_result = {}

        evaluation_result = evaluation_result or {}
        assignment_type = assignment_type or "question"

        if assignment_type == "scenario":
            cursor.close()
            return {
                "assignment_id": assignment_id,
                "student_id": student_id,
                "assignment_type": "scenario",
                "subject": subject,
                "total_score": evaluation_result.get("total_score", total_score or 0),
                "max_score": evaluation_result.get("max_score", 0),
                "percentage": evaluation_result.get("percentage", 0),
                "grade": evaluation_result.get("grade"),
                "evaluation_result": evaluation_result,
                "results": evaluation_result.get("results", []),
                "overall_feedback": evaluation_result.get("overall_feedback", ""),
                "common_feedback": common_feedback or "",
                "answers": answers
            }

        total_score_val = evaluation_result.get("total_score", total_score or 0)
        max_score_val = evaluation_result.get("max_score", 0)
        percentage_val = evaluation_result.get("percentage", 0)

        cursor.execute(
            """
            SELECT question_id, question_text, question_type, options, correct_answer, expected_points
            FROM assignment_questions
            WHERE assignment_id = %s
            ORDER BY question_id
            """,
            (assignment_id,)
        )

        questions = cursor.fetchall()
        cursor.close()

        result_map = {
            int(item.get("id")): item
            for item in evaluation_result.get("results", [])
        }

        final_questions = []
        for q in questions:
            qid = q[0]
            eval_item = result_map.get(int(qid), {})

            final_questions.append({
                "id": qid,
                "question_id": qid,
                "question_text": q[1],
                "question_type": q[2],
                "options": q[3],
                "correct_answer": q[4],
                "expected_points": q[5],
                "student_answer": (answers or {}).get(str(qid), ""),
                "score": eval_item.get("score", 0),
                "max_score": eval_item.get("max_score", 0),
                "detected_concepts": eval_item.get("detected_concepts", []),
                "missing_concepts": eval_item.get("missing_concepts", []),
                "concept_score": eval_item.get("concept_score", 0),
                "semantic_score": eval_item.get("semantic_score", 0),
                "completeness_score": eval_item.get("completeness_score", 0),
                "feedback": eval_item.get("feedback", {})
            })

        return {
            "assignment_id": assignment_id,
            "student_id": student_id,
            "assignment_type": "question",
            "subject": subject,
            "total_score": total_score_val,
            "max_score": max_score_val,
            "percentage": percentage_val,
            "grade": evaluation_result.get("grade"),
            "evaluation_result": evaluation_result,
            "results": final_questions,
            "overall_feedback": evaluation_result.get("overall_feedback", ""),
            "common_feedback": common_feedback or "",
            "answers": answers
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get evaluation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
