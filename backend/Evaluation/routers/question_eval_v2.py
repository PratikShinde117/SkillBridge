import json
from typing import Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.question_evaluator import evaluate_submission

router = APIRouter(tags=["Question Evaluation"])


class EvaluationRequest(BaseModel):
    assignment_id: int
    student_id: str
    student_answers: Dict[str, str]


def _evaluate(request: EvaluationRequest):
    try:
        from db import get_connection

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT question_id, question_type, correct_answer, expected_points
            FROM assignment_questions
            WHERE assignment_id = %s
            ORDER BY question_id
            """,
            (request.assignment_id,)
        )
        rows = cursor.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="Questions not found for this assignment")

        questions = []
        for question_id, question_type, correct_answer, expected_points in rows:
            if isinstance(expected_points, str):
                try:
                    expected_points = json.loads(expected_points)
                except Exception:
                    expected_points = []

            questions.append({
                "question_id": question_id,
                "question_type": question_type,
                "correct_answer": correct_answer,
                "expected_points": expected_points or []
            })

        result = evaluate_submission(questions, request.student_answers)

        cursor.execute(
            """
            UPDATE assignment_submissions
            SET answers = %s,
                evaluation_result = %s,
                total_score = %s
            WHERE roll_no = %s AND assignment_id = %s
            RETURNING assignment_id
            """,
            (
                json.dumps(request.student_answers),
                json.dumps(result),
                int(round(result.get("total_score", 0))),
                request.student_id,
                request.assignment_id
            )
        )

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Submission record not found")

        cursor.close()
        return {
            "message": "Evaluation completed successfully",
            "total_score": result.get("total_score", 0),
            "evaluation_result": result
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/evaluate-question")
def evaluate_question(request: EvaluationRequest):
    return _evaluate(request)


@router.post("/evaluate")
def evaluate_legacy(request: EvaluationRequest):
    return _evaluate(request)
