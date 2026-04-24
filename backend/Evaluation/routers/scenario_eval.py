"""
Scenario Evaluation Router
============================
POST /evaluate-scenario — evaluate scenario-based submission (called by Node.js backend)
"""

import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from services.scenario_evaluator import evaluate_scenario_submission

router = APIRouter(tags=["Scenario Evaluation"])


# ============================================================
# MODELS
# ============================================================

class ScenarioAnswer(BaseModel):
    task_id: int
    answer: str


class ScenarioEvaluationRequest(BaseModel):
    assignment_id: int
    student_id: str
    scenario_id: int
    answers: List[ScenarioAnswer]


# ============================================================
# ROUTE: POST /evaluate-scenario
# ============================================================

@router.post("/evaluate-scenario")
def evaluate_scenario(request: ScenarioEvaluationRequest):
    """
    Evaluate a scenario-based submission.
    
    Called by Node.js backend with:
    - assignment_id
    - student_id (roll_no)
    - scenario_id
    - answers: [{task_id, answer}]
    
    This route fetches scenario from DB, runs hybrid evaluation, and stores results.
    """
    try:
        print(f"🎯 Scenario evaluation — assignment:{request.assignment_id}, scenario:{request.scenario_id}, student:{request.student_id}")

        from db import get_connection
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Fetch scenario JSON from DB
        cursor.execute(
            "SELECT scenario_json FROM scenarios WHERE scenario_id = %s",
            (request.scenario_id,)
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Scenario not found")

        scenario_json = row[0]
        if isinstance(scenario_json, str):
            scenario_json = json.loads(scenario_json)

        print(f"  → Scenario loaded: {scenario_json.get('problem_statement', '')[:60]}...")

        # 2. Prepare answers
        answers_list = [
            {"task_id": ans.task_id, "answer": ans.answer}
            for ans in request.answers
        ]

        # 3. Run evaluation
        result = evaluate_scenario_submission(
            scenario_json=scenario_json,
            student_answers=answers_list
        )

        if not result or not isinstance(result, dict):
            raise HTTPException(status_code=500, detail="Scenario evaluation failed")

        total_score_val = round(result.get("total_score", 0), 1)

        # 4. Store result in DB
        answers_store = {str(a.task_id): a.answer for a in request.answers}

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
                json.dumps(answers_store),
                json.dumps(result),
                int(total_score_val),
                request.student_id,
                request.assignment_id
            )
        )

        updated = cursor.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Submission record not found")

        cursor.close()

        print(f"✅ Scenario evaluation complete — score: {total_score_val}/{result.get('max_score', 0)}")

        return {
            "message": "Scenario evaluation completed",
            "total_score": total_score_val,
            "evaluation_result": result
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Scenario evaluation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
