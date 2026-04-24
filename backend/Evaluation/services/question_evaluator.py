"""Question evaluator with the same scoring contract as scenario evaluation."""

import json
from typing import Dict, List

from utils.concept_detector import detect_concepts
from utils.feedback import generate_overall_feedback, generate_question_feedback
from utils.scoring import compute_completeness, compute_percentage, compute_weighted_score, get_grade
from utils.similarity import compute_similarity


def _normalize_expected_points(expected_points) -> List[str]:
    if not expected_points:
        return []
    if isinstance(expected_points, str):
        try:
            expected_points = json.loads(expected_points)
        except Exception:
            expected_points = []
    return [str(point).strip() for point in expected_points if str(point).strip()]


def _evaluate_mcq(question_id: int, student_answer: str, correct_answer: str, max_score: int = 1) -> dict:
    normalized_student = (student_answer or "").strip().lower()
    normalized_correct = (correct_answer or "").strip().lower()
    is_correct = normalized_student != "" and normalized_student == normalized_correct

    concept_score = 1.0 if is_correct else 0.0
    semantic_score = 1.0 if is_correct else 0.0
    completeness_score = 1.0 if is_correct else 0.0
    score = float(max_score if is_correct else 0)
    feedback = generate_question_feedback("", score, max_score, [], [], "mcq")

    return {
        "id": question_id,
        "score": score,
        "max_score": max_score,
        "detected_concepts": [correct_answer] if is_correct and correct_answer else [],
        "missing_concepts": [] if is_correct or not correct_answer else [correct_answer],
        "concept_score": concept_score,
        "semantic_score": semantic_score,
        "completeness_score": completeness_score,
        "feedback": {
            "strength": feedback.get("strength", ""),
            "weakness": feedback.get("weakness", ""),
            "improvement": feedback.get("improvement", "")
        }
    }


def _evaluate_descriptive(question_id: int, student_answer: str, expected_points: List[str], max_score: int = 5) -> dict:
    detected_concepts = []
    missing_concepts = expected_points[:]

    if student_answer and expected_points:
        concept_score, detected_concepts, missing_concepts = detect_concepts(student_answer, expected_points)
    else:
        concept_score = 0.0

    semantic_score = compute_similarity(student_answer or "", ". ".join(expected_points)) if expected_points else 0.0
    completeness_score, _ = compute_completeness(student_answer or "")
    score = compute_weighted_score(concept_score, semantic_score, completeness_score, max_marks=max_score)
    feedback = generate_question_feedback(
        "",
        score,
        max_score,
        detected_concepts,
        missing_concepts,
        "descriptive"
    )

    return {
        "id": question_id,
        "score": score,
        "max_score": max_score,
        "detected_concepts": detected_concepts,
        "missing_concepts": missing_concepts,
        "concept_score": round(concept_score, 4),
        "semantic_score": round(semantic_score, 4),
        "completeness_score": round(completeness_score, 4),
        "feedback": {
            "strength": feedback.get("strength", ""),
            "weakness": feedback.get("weakness", ""),
            "improvement": feedback.get("improvement", "")
        }
    }


def evaluate_submission(questions: List[dict], student_answers: Dict[str, str]) -> dict:
    results = []
    total_score = 0.0
    max_score = 0.0

    for question in questions:
        question_id = question.get("question_id")
        question_type = question.get("question_type", "descriptive")
        student_answer = student_answers.get(str(question_id), "")

        if question_type == "mcq":
            result = _evaluate_mcq(
                question_id,
                student_answer,
                question.get("correct_answer", ""),
                max_score=1
            )
        else:
            result = _evaluate_descriptive(
                question_id,
                student_answer,
                _normalize_expected_points(question.get("expected_points")),
                max_score=5
            )

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
            evaluation_type="question"
        )
    }
