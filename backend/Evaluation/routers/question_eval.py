"""
Question Evaluation Router
===========================
POST /evaluate — evaluate question-based submission (called by Node.js backend)
"""

import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional

from services.question_evaluator import evaluate_submission

router = APIRouter(tags=["Question Evaluation"])


# ============================================================
# MODELS
# ============================================================

class EvaluationRequest(BaseModel):
    assignment_id: int
    student_id: str
    student_answers: Dict[str, str]


# ============================================================
# ROUTE: POST /evaluate
# ============================================================

@router.post("/evaluate")
def evaluate(request: EvaluationRequest):
    """
    Evaluate a question-based submission.
    
    Called by Node.js backend with:
    - assignment_id
    - student_id (roll_no)
    - student_answers: {question_id: answer_str}
    
    This route fetches questions from DB, runs evaluation, and stores results.
    """
    try:
        print(f"📝 Question evaluation — assignment:{request.assignment_id}, student:{request.student_id}")

        from db import get_connection
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Fetch questions from DB
        cursor.execute(
            """
            SELECT question_id, question_type, correct_answer, expected_points
            FROM assignment_questions
            WHERE assignment_id = %s
            """,
            (request.assignment_id,)
        )

        db_questions = cursor.fetchall()

        if not db_questions:
            raise HTTPException(status_code=404, detail="Questions not found for this assignment")

        # 2. Prepare question objects
        questions = []
        for q in db_questions:
            qid, qtype, correct_answer, expected_points = q

            question_obj = {
                "question_id": qid,
                "question_type": qtype
            }

            if qtype == "mcq":
                question_obj["correct_answer"] = correct_answer
            elif qtype == "descriptive":
                if isinstance(expected_points, str):
                    try:
                        expected_points = json.loads(expected_points)
                    except Exception:
                        expected_points = []
                question_obj["expected_points"] = expected_points or []

            questions.append(question_obj)

        # 3. Run evaluation
        result = evaluate_submission(
            questions=questions,
            student_answers=request.student_answers
        )

        if not result or not isinstance(result, dict):
            raise HTTPException(status_code=500, detail="Evaluation failed — no result returned")

        total_score_val = int(result.get("total_score", 0))

        # 4. Store result in DB
        cursor.execute(
            """
            UPDATE assignment_submissions
            SET 
                answers = %s,
                evaluation_result = %s,
                total_score = %s
            WHERE roll_no = %s AND assignment_id = %s
            RETURNING assignment_id
            """,
            (
                json.dumps(request.student_answers),
                json.dumps(result),
                total_score_val,
                request.student_id,
                request.assignment_id
            )
        )

        updated = cursor.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Submission record not found")

        cursor.close()

        print(f"✅ Question evaluation complete — score: {total_score_val}/{result.get('max_score', 0)}")

        return {
            "message": "Evaluation completed successfully",
            "total_score": total_score_val,
            "evaluation_result": result
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Question evaluation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
