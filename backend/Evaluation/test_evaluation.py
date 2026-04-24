"""
Test Script for Evaluation Service
====================================
Tests the evaluation logic directly without database dependency.
Usage: python test_evaluation.py
"""

import json
import sys

# Add parent dir to path
sys.path.insert(0, ".")

from services.question_evaluator import evaluate_submission
from services.scenario_evaluator import evaluate_scenario_submission


def test_scenario_evaluation():
    """Test scenario-based evaluation with 3 tiers of quality."""
    
    scenario = {
        "problem_statement": "Design a database indexing strategy for a large e-commerce platform",
        "context": {
            "domain": "E-Commerce",
            "description": "Large scale product catalog with millions of items"
        },
        "tasks": [
            {
                "task_id": 1,
                "title": "Index Strategy Design",
                "description": "Design an indexing strategy for efficient product search and retrieval",
                "expected_concepts": ["Indexing", "B-tree", "Hash Index", "Composite Index"],
                "marks": 5
            },
            {
                "task_id": 2,
                "title": "Transaction Management",
                "description": "Explain how to handle concurrent order transactions safely",
                "expected_concepts": ["Transactions", "ACID", "Deadlock", "Concurrency"],
                "marks": 5
            }
        ]
    }

    # TEST 1: GOOD ANSWER
    print("=" * 60)
    print("TEST 1: GOOD ANSWER")
    print("=" * 60)
    good_answers = [
        {
            "task_id": 1,
            "answer": "For the e-commerce platform, I would implement a multi-level indexing strategy. "
                      "First, B-tree indexes on the product_id (primary key) and category columns for efficient "
                      "range queries and ordered retrieval. Hash indexes would be used for exact lookups like "
                      "SKU codes where equality search is dominant. Composite indexes on (category, price) and "
                      "(brand, name) would optimize common filter combinations. Additionally, full-text indexing "
                      "on product descriptions would support search functionality. Proper index maintenance including "
                      "periodic rebuilding would prevent fragmentation."
        },
        {
            "task_id": 2,
            "answer": "Transaction management requires strict ACID compliance. Atomicity ensures that order "
                      "placement (inventory deduction + payment + order creation) either fully succeeds or fully "
                      "rolls back. Consistency maintains data integrity constraints. Isolation levels like "
                      "READ_COMMITTED prevent dirty reads while allowing reasonable concurrency. To handle deadlocks, "
                      "I would implement timeout-based detection and automatic retry logic. Optimistic concurrency "
                      "control with version columns would minimize lock contention for read-heavy product browsing "
                      "while pessimistic locking protects inventory updates during checkout."
        }
    ]
    result = evaluate_scenario_submission(scenario, good_answers)
    print_result(result)

    # TEST 2: PARTIAL ANSWER
    print("\n" + "=" * 60)
    print("TEST 2: PARTIAL ANSWER")
    print("=" * 60)
    partial_answers = [
        {
            "task_id": 1,
            "answer": "I would use indexing on the product table. B-tree index on primary key would help with queries."
        },
        {
            "task_id": 2,
            "answer": "Transactions should follow ACID properties to ensure data consistency."
        }
    ]
    result = evaluate_scenario_submission(scenario, partial_answers)
    print_result(result)

    # TEST 3: POOR ANSWER
    print("\n" + "=" * 60)
    print("TEST 3: POOR ANSWER")
    print("=" * 60)
    poor_answers = [
        {"task_id": 1, "answer": "Use a database."},
        {"task_id": 2, "answer": ""}
    ]
    result = evaluate_scenario_submission(scenario, poor_answers)
    print_result(result)


def test_question_evaluation():
    """Test question-based evaluation."""
    print("\n" + "=" * 60)
    print("TEST 4: QUESTION-BASED EVALUATION")
    print("=" * 60)

    questions = [
        {
            "question_id": 1,
            "question_type": "mcq",
            "correct_answer": "B"
        },
        {
            "question_id": 2,
            "question_type": "descriptive",
            "expected_points": [
                "Indexing improves query performance",
                "B-tree supports range queries",
                "Hash index is for equality lookups"
            ]
        }
    ]

    answers = {
        "1": "B",
        "2": "Indexing is used to improve the performance of database queries. B-tree indexes support efficient range queries by maintaining sorted order. Hash indexes are optimized for equality lookups with O(1) average time complexity."
    }

    result = evaluate_submission(questions, answers)
    print_result(result)


def print_result(result):
    """Pretty print evaluation result."""
    print(f"\n  Total Score: {result.get('total_score')} / {result.get('max_score')}")
    print(f"  Percentage:  {result.get('percentage')}%")
    
    grade = result.get('grade', {})
    if grade:
        print(f"  Grade:       {grade.get('letter', '?')} — {grade.get('label', '')}")
    
    print(f"  Overall:     {result.get('overall_feedback', '')[:100]}...")

    # Print task/question details
    items = result.get("results") or result.get("task_scores") or result.get("details") or []
    for item in items:
        item_id = item.get("task_id") or item.get("id") or item.get("question_id")
        title = item.get("title", f"Q{item_id}")
        score = item.get("score", 0)
        max_s = item.get("max_score", 0)
        print(f"\n  [{title}] {score}/{max_s}")
        
        if "concept_score" in item:
            print(f"    Concept:  {item['concept_score']}")
            print(f"    Semantic: {item.get('semantic_score', 0)}")
            print(f"    Complete: {item.get('completeness_score', 0)} ({item.get('completeness', '')})")
        
        if item.get("detected_concepts") or item.get("detected"):
            detected = item.get("detected_concepts") or item.get("detected", [])
            print(f"    Detected: {detected}")
        
        if item.get("missing_concepts") or item.get("missing"):
            missing = item.get("missing_concepts") or item.get("missing", [])
            print(f"    Missing:  {missing}")
        
        fb = item.get("feedback", {})
        if isinstance(fb, dict):
            if fb.get("strength"):
                print(f"    ✔ {fb['strength'][:80]}")
            if fb.get("weakness"):
                print(f"    ✘ {fb['weakness'][:80]}")
            if fb.get("improvement"):
                print(f"    ⚠ {fb['improvement'][:80]}")
        elif isinstance(fb, str):
            print(f"    💡 {fb[:100]}")


if __name__ == "__main__":
    print("🧪 SkillBridge Evaluation Service — Test Suite")
    print("=" * 60)
    test_scenario_evaluation()
    test_question_evaluation()
    print("\n✅ All tests completed!")
