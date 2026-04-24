"""Scenario evaluator using the shared weighted scoring contract."""

from typing import Any, Dict, List

from utils.concept_detector import detect_concepts
from utils.feedback import generate_overall_feedback, generate_task_feedback
from utils.scoring import compute_completeness, compute_percentage, compute_weighted_score, get_grade
from utils.similarity import compute_concept_similarity


def evaluate_task(task: dict, student_answer: str, scenario_id: int | None = None) -> dict:
    task_id = task.get("task_id")
    task_title = task.get("title", f"Task {task_id}")
    task_desc = task.get("description", "")
    expected_concepts = task.get("expected_concepts", [])
    max_marks = task.get("marks", 5)

    if not student_answer or not student_answer.strip():
        concept_score = 0.0
        semantic_score = 0.0
        completeness_score = 0.0
        completeness_label = "empty"
        detected = []
        missing = expected_concepts
        final_score = 0.0
    else:
        concept_score, detected, missing = detect_concepts(student_answer, expected_concepts)
        semantic_score = compute_concept_similarity(student_answer, task_desc, expected_concepts)
        completeness_score, completeness_label = compute_completeness(student_answer)
        final_score = compute_weighted_score(
            concept_score,
            semantic_score,
            completeness_score,
            max_marks=max_marks
        )

    feedback = generate_task_feedback(
        task_title,
        concept_score,
        semantic_score,
        completeness_score,
        completeness_label,
        detected,
        missing,
        max_marks=max_marks,
        obtained_marks=final_score
    )

    result = {
        "id": task_id,
        "scenario_id": scenario_id,
        "task_id": task_id,
        "title": task_title,
        "score": final_score,
        "max_score": max_marks,
        "detected_concepts": detected,
        "missing_concepts": missing,
        "concept_score": round(concept_score, 4),
        "semantic_score": round(semantic_score, 4),
        "completeness_score": round(completeness_score, 4),
        "feedback": {
            "strength": feedback.get("strength", ""),
            "weakness": feedback.get("weakness", ""),
            "improvement": feedback.get("improvement", "")
        }
    }

    return result


def evaluate_scenario_submission(scenarios: List[dict]) -> dict:
    results: List[dict] = []
    total_score = 0.0
    max_score = 0.0

    for scenario in scenarios:
        scenario_id = scenario.get("scenario_id")
        scenario_json = scenario.get("scenario_json", {})
        tasks = scenario_json.get("tasks", [])
        answers_map: Dict[int, str] = {
            int(answer.get("task_id", 0)): answer.get("answer", "")
            for answer in scenario.get("answers", [])
        }

        for task in tasks:
            result = evaluate_task(task, answers_map.get(task.get("task_id"), ""), scenario_id=scenario_id)
            results.append(result)
            total_score += float(result["score"])
            max_score += float(result["max_score"])

    total_score = round(total_score, 1)
    percentage = compute_percentage(total_score, max_score)

    return {
        "total_score": total_score,
        "max_score": round(max_score, 1),
        "percentage": percentage,
        "grade": get_grade(percentage),
        "results": results,
        "overall_feedback": generate_overall_feedback(
            total_score,
            max_score,
            percentage,
            task_count=len(results),
            evaluation_type="scenario"
        )
    }
