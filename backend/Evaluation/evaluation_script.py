from dotenv import load_dotenv
import os
import re
import json
from functools import lru_cache

load_dotenv()

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Load model once (important for performance)
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


# ------------------ UTILS ------------------

def normalize(text):
    return text.strip().lower().replace("option ", "")


def split_sentences(text):
    sentences = re.split(r'[.?!]', text)
    return [s.strip() for s in sentences if s.strip()]


def get_threshold(point_length):
    if point_length < 8:
        return 0.5
    return 0.65


# Optional caching (helps performance)
@lru_cache(maxsize=1000)
def encode_text(text):
    return model.encode([text], normalize_embeddings=True)[0]


# ------------------ MCQ ------------------

def evaluate_mcq(student_answer, correct_answer, marks=1):
    if not student_answer or not correct_answer:
        return 0

    if normalize(student_answer) == normalize(correct_answer):
        return marks

    return 0


# ------------------ DESCRIPTIVE ------------------

def evaluate_descriptive(student_answer, expected_points, marks_per_point=2):

    if not student_answer or not expected_points:
        return 0, [], [], []

    matched_points = []
    total_score = 0
    strengths = []
    weak_areas = []

    student_sentences = split_sentences(student_answer)

    if not student_sentences:
        return 0, [], [], []

    sentence_embeddings = model.encode(
        student_sentences,
        normalize_embeddings=True
    )

    point_embeddings = model.encode(
        expected_points,
        normalize_embeddings=True
    )

    for idx, point in enumerate(expected_points):

        sims = cosine_similarity(
            sentence_embeddings,
            [point_embeddings[idx]]
        )

        similarity = float(np.max(sims))

        threshold = get_threshold(len(point.split()))

        if similarity >= threshold:
            total_score += marks_per_point
            matched = True
            strengths.append(point)
        else:
            matched = False
            weak_areas.append(point)

        matched_points.append({
            "point": point,
            "similarity": similarity,
            "matched": matched
        })

    return total_score, matched_points, strengths, weak_areas


# ------------------ QUESTION-BASED EVALUATION ------------------

def evaluate_submission(questions, student_answers):

    total_score = 0
    max_total = 0
    detailed_results = []

    overall_strengths = []
    overall_weaknesses = []

    for question in questions:

        qid = question.get("question_id")
        qtype = question.get("question_type")

        student_answer = student_answers.get(str(qid), "")

        # -------- MCQ --------
        if qtype == "mcq":

            score = evaluate_mcq(
                student_answer,
                question.get("correct_answer"),
                marks=1
            )

            total_score += score
            max_total += 1

            detailed_results.append({
                "question_id": qid,
                "type": "mcq",
                "score": score,
                "max_score": 1
            })

        # -------- DESCRIPTIVE --------
        elif qtype == "descriptive":

            expected_points = question.get("expected_points") or []

            score, breakdown, strengths, weaknesses = evaluate_descriptive(
                student_answer,
                expected_points,
                marks_per_point=2
            )

            max_score = len(expected_points) * 2

            total_score += score
            max_total += max_score

            overall_strengths.extend(strengths)
            overall_weaknesses.extend(weaknesses)

            detailed_results.append({
                "question_id": qid,
                "type": "descriptive",
                "score": score,
                "max_score": max_score,
                "rubric_breakdown": breakdown
            })

    # -------- PERCENTAGE --------
    percentage = (total_score / max_total) * 100 if max_total else 0

    return {
        "total_score": total_score,
        "max_score": max_total,
        "percentage": round(percentage, 2),
        "details": detailed_results,
        "summary": {
            "strengths": list(set(overall_strengths)),
            "weak_areas": list(set(overall_weaknesses))
        }
    }


# ============================================================
# SCENARIO-BASED EVALUATION (HYBRID ENGINE)
# ============================================================
#
# Score = 0.4 * concept_match + 0.4 * semantic_similarity + 0.2 * completeness
# Each task = 5 marks

def _concept_keyword_match(answer_text, expected_concepts):
    """Concept detection via keyword matching (0.4 weight)"""
    if not answer_text or not expected_concepts:
        return 0.0, [], []

    answer_lower = answer_text.lower()
    detected = []
    missing = []

    for concept in expected_concepts:
        concept_lower = concept.lower()

        # Check for exact match or partial keyword match
        keywords = concept_lower.split()
        matched_keywords = sum(1 for kw in keywords if kw in answer_lower)
        match_ratio = matched_keywords / len(keywords) if keywords else 0

        if match_ratio >= 0.5:
            detected.append(concept)
        else:
            missing.append(concept)

    score = len(detected) / len(expected_concepts) if expected_concepts else 0
    return score, detected, missing


def _semantic_similarity_score(answer_text, task_description, expected_concepts):
    """Semantic similarity using MiniLM (0.4 weight)"""
    if not answer_text:
        return 0.0

    # Create reference text from task description + concepts
    reference_parts = [task_description] + (expected_concepts or [])
    reference_text = ". ".join(reference_parts)

    answer_sentences = split_sentences(answer_text)
    if not answer_sentences:
        return 0.0

    # Encode
    answer_embeddings = model.encode(answer_sentences, normalize_embeddings=True)
    ref_embedding = model.encode([reference_text], normalize_embeddings=True)

    # Max similarity across answer sentences
    sims = cosine_similarity(answer_embeddings, ref_embedding)
    avg_sim = float(np.mean(np.max(sims, axis=1)))

    # Also check per-concept similarity
    if expected_concepts:
        concept_embeddings = model.encode(expected_concepts, normalize_embeddings=True)
        concept_sims = cosine_similarity(answer_embeddings, concept_embeddings)
        concept_max = float(np.mean(np.max(concept_sims, axis=0)))
        # Blend average
        return (avg_sim + concept_max) / 2
    
    return avg_sim


def _completeness_score(answer_text, min_length=30):
    """Completeness check (0.2 weight)"""
    if not answer_text or not answer_text.strip():
        return 0.0

    text = answer_text.strip()
    word_count = len(text.split())

    if word_count < 5:
        return 0.1
    elif word_count < 15:
        return 0.4
    elif word_count < min_length:
        return 0.7
    else:
        return 1.0


def _generate_task_feedback(task_title, concept_score, semantic_score, completeness, detected, missing):
    """Rule-based feedback generation"""
    feedback_parts = []

    # Concept feedback
    if concept_score >= 0.8:
        feedback_parts.append(f"Excellent concept coverage in '{task_title}'.")
    elif concept_score >= 0.5:
        feedback_parts.append(f"Good concept coverage, but some key concepts were missed.")
    else:
        feedback_parts.append(f"Weak concept coverage — review the core concepts for this task.")

    # Semantic feedback
    if semantic_score >= 0.6:
        feedback_parts.append("Your explanation aligns well with the expected reasoning.")
    elif semantic_score >= 0.4:
        feedback_parts.append("The answer shows partial understanding but could be more precisely aligned.")
    else:
        feedback_parts.append("The answer lacks depth — try to explain the reasoning behind your approach.")

    # Completeness feedback
    if completeness < 0.5:
        feedback_parts.append("Answer is too brief. Please elaborate with more detail.")

    # Missing concepts
    if missing:
        missing_str = ", ".join(missing[:3])
        feedback_parts.append(f"Consider covering: {missing_str}.")

    return " ".join(feedback_parts)


def evaluate_scenario_submission(scenario_json, student_answers):
    """
    Evaluate scenario-based submission.
    
    student_answers: list of { "task_id": 1, "answer": "..." }
    scenario_json: the scenario object with tasks
    """
    tasks = scenario_json.get("tasks", [])
    task_scores = []
    total_score = 0
    max_score = 0

    # Build answers lookup
    answers_map = {}
    if isinstance(student_answers, list):
        for ans in student_answers:
            answers_map[int(ans.get("task_id", 0))] = ans.get("answer", "")
    elif isinstance(student_answers, dict):
        for k, v in student_answers.items():
            answers_map[int(k)] = v if isinstance(v, str) else v.get("answer", "")

    for task in tasks:
        task_id = task.get("task_id")
        task_marks = task.get("marks", 5)
        task_title = task.get("title", "")
        task_desc = task.get("description", "")
        expected_concepts = task.get("expected_concepts", [])

        student_answer = answers_map.get(task_id, "")

        max_score += task_marks

        if not student_answer or not student_answer.strip():
            task_scores.append({
                "task_id": task_id,
                "title": task_title,
                "score": 0,
                "max_score": task_marks,
                "concept_score": 0,
                "semantic_score": 0,
                "completeness_score": 0,
                "detected_concepts": [],
                "missing_concepts": expected_concepts,
                "feedback": "No answer provided for this task."
            })
            continue

        # 1. Concept Detection (weight: 0.4)
        concept_score, detected, missing = _concept_keyword_match(
            student_answer, expected_concepts
        )

        # 2. Semantic Similarity (weight: 0.4)
        semantic_score = _semantic_similarity_score(
            student_answer, task_desc, expected_concepts
        )

        # 3. Completeness (weight: 0.2)
        completeness = _completeness_score(student_answer)

        # Final weighted score
        weighted = (0.4 * concept_score) + (0.4 * semantic_score) + (0.2 * completeness)
        task_score = round(weighted * task_marks, 1)
        task_score = min(task_score, task_marks)  # cap at max

        total_score += task_score

        # Generate feedback
        feedback = _generate_task_feedback(
            task_title, concept_score, semantic_score,
            completeness, detected, missing
        )

        task_scores.append({
            "task_id": task_id,
            "title": task_title,
            "score": task_score,
            "max_score": task_marks,
            "concept_score": round(concept_score, 3),
            "semantic_score": round(semantic_score, 3),
            "completeness_score": round(completeness, 3),
            "detected_concepts": detected,
            "missing_concepts": missing,
            "feedback": feedback
        })

    percentage = (total_score / max_score) * 100 if max_score else 0

    return {
        "task_scores": task_scores,
        "total_score": round(total_score, 1),
        "max_score": max_score,
        "percentage": round(percentage, 2)
    }