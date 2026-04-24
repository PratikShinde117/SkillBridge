import json
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.scenario_evaluator import evaluate_scenario_submission

router = APIRouter(tags=["Scenario Evaluation"])


class ScenarioAnswer(BaseModel):
    task_id: int
    answer: str


class ScenarioSubmission(BaseModel):
    scenario_id: int
    answers: List[ScenarioAnswer]


class ScenarioEvaluationRequest(BaseModel):
    assignment_id: int
    student_id: str
    scenarios: List[ScenarioSubmission]


@router.post("/evaluate-scenario")
def evaluate_scenario(request: ScenarioEvaluationRequest):
    try:
        from db import get_connection

        conn = get_connection()
        cursor = conn.cursor()

        scenario_ids = [scenario.scenario_id for scenario in request.scenarios]
        cursor.execute(
            """
            SELECT scenario_id, scenario_json
            FROM scenarios
            WHERE scenario_id = ANY(%s)
            ORDER BY scenario_id
            """,
            (scenario_ids,)
        )
        rows = cursor.fetchall()

        scenario_map = {}
        for scenario_id, scenario_json in rows:
            if isinstance(scenario_json, str):
                scenario_json = json.loads(scenario_json)
            scenario_map[scenario_id] = scenario_json

        if len(scenario_map) != len(scenario_ids):
            raise HTTPException(status_code=404, detail="One or more scenarios were not found")

        evaluation_input = []
        stored_answers = {}
        for scenario in request.scenarios:
            answers = []
            for answer in scenario.answers:
                answers.append({"task_id": answer.task_id, "answer": answer.answer})
                stored_answers[f"{scenario.scenario_id}_{answer.task_id}"] = answer.answer

            evaluation_input.append({
                "scenario_id": scenario.scenario_id,
                "scenario_json": scenario_map[scenario.scenario_id],
                "answers": answers
            })

        result = evaluate_scenario_submission(evaluation_input)

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
                json.dumps(stored_answers),
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
            "message": "Scenario evaluation completed successfully",
            "total_score": result.get("total_score", 0),
            "evaluation_result": result
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
