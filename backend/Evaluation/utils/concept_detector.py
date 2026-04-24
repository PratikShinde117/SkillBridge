"""
Concept Detection Engine
========================
Detects concepts in student answers using a keyword dictionary.
Each concept has associated keywords/synonyms for flexible matching.
"""

import re
from typing import List, Tuple, Dict

# ============================================================
# KEYWORD DICTIONARY — expandable per subject
# ============================================================
CONCEPT_KEYWORDS: Dict[str, List[str]] = {
    # Database
    "Indexing":        ["index", "b-tree", "b tree", "btree", "hash index", "clustered", "non-clustered", "indexing"],
    "Transactions":    ["transaction", "acid", "commit", "rollback", "atomicity", "consistency", "isolation", "durability"],
    "Normalization":   ["normalization", "1nf", "2nf", "3nf", "bcnf", "normal form", "functional dependency", "decomposition"],
    "SQL":             ["sql", "select", "insert", "update", "delete", "join", "group by", "having", "subquery"],
    "ER Model":        ["er model", "entity", "relationship", "cardinality", "primary key", "foreign key", "er diagram"],
    "Concurrency":     ["concurrency", "lock", "deadlock", "two-phase", "timestamp", "serializability"],
    
    # OS
    "Process Management":    ["process", "thread", "scheduling", "context switch", "pcb", "fork", "exec"],
    "Memory Management":     ["memory", "paging", "segmentation", "virtual memory", "page table", "tlb", "page fault", "swapping"],
    "Deadlock":              ["deadlock", "mutual exclusion", "hold and wait", "circular wait", "no preemption", "banker", "resource allocation"],
    "File Systems":          ["file system", "inode", "directory", "allocation", "fat", "ntfs", "ext4", "disk scheduling"],
    "CPU Scheduling":        ["scheduling", "fcfs", "sjf", "round robin", "priority", "preemptive", "non-preemptive", "turnaround", "waiting time"],
    "Synchronization":       ["semaphore", "mutex", "monitor", "critical section", "race condition", "synchronization", "producer consumer"],
    
    # Networking
    "OSI Model":       ["osi", "physical layer", "data link", "network layer", "transport layer", "session", "presentation", "application layer"],
    "TCP/IP":          ["tcp", "ip", "udp", "three-way handshake", "flow control", "congestion", "sliding window", "ack"],
    "Routing":         ["routing", "ospf", "rip", "bgp", "distance vector", "link state", "routing table", "hop"],
    "DNS":             ["dns", "domain name", "resolver", "nameserver", "a record", "cname", "mx record"],
    "HTTP":            ["http", "https", "request", "response", "status code", "rest", "api", "get", "post"],
    "Security":        ["encryption", "decryption", "ssl", "tls", "firewall", "authentication", "authorization", "cipher"],
    
    # Data Structures
    "Sorting":         ["sort", "bubble sort", "merge sort", "quick sort", "heap sort", "insertion sort", "selection sort", "time complexity"],
    "Hashing":         ["hash", "hash table", "hash function", "collision", "chaining", "open addressing", "load factor"],
    "Trees":           ["tree", "binary tree", "bst", "avl", "red-black", "traversal", "inorder", "preorder", "postorder"],
    "Graphs":          ["graph", "bfs", "dfs", "dijkstra", "shortest path", "spanning tree", "adjacency", "vertex", "edge"],
    "Linked Lists":    ["linked list", "singly", "doubly", "circular", "node", "pointer", "head", "tail"],
    "Stacks and Queues": ["stack", "queue", "push", "pop", "enqueue", "dequeue", "lifo", "fifo"],
    
    # Software Engineering
    "SDLC":            ["sdlc", "waterfall", "agile", "scrum", "spiral", "prototype", "iterative", "lifecycle"],
    "Testing":         ["testing", "unit test", "integration test", "regression", "black box", "white box", "test case"],
    "Design Patterns": ["design pattern", "singleton", "factory", "observer", "strategy", "mvc", "adapter"],
    "UML":             ["uml", "class diagram", "sequence diagram", "use case", "activity diagram", "state diagram"],
    
    # Machine Learning
    "Regression":      ["regression", "linear regression", "polynomial", "ridge", "lasso", "gradient descent", "mse", "r-squared"],
    "Classification":  ["classification", "logistic regression", "svm", "decision tree", "random forest", "k-nn", "naive bayes"],
    "Neural Networks": ["neural network", "deep learning", "activation function", "backpropagation", "cnn", "rnn", "lstm"],
    "Clustering":      ["clustering", "k-means", "hierarchical", "dbscan", "centroid", "elbow method", "silhouette"],
}


def detect_concepts(
    answer_text: str,
    expected_concepts: List[str]
) -> Tuple[float, List[str], List[str]]:
    """
    Detect which expected concepts are covered in the student's answer.
    
    Uses a 2-tier strategy:
      1. Check the keyword dictionary for each concept
      2. If no dictionary entry, fall back to direct keyword matching
    
    Returns:
      (score: 0-1, detected: list, missing: list)
    """
    if not answer_text or not expected_concepts:
        return 0.0, [], []

    answer_lower = answer_text.lower()
    answer_words = set(re.findall(r'\b\w+\b', answer_lower))
    detected = []
    missing = []

    for concept in expected_concepts:
        concept_key = concept.strip()
        found = False

        # Tier 1: Use keyword dictionary
        dict_keywords = _find_keywords_for_concept(concept_key)
        if dict_keywords:
            for kw in dict_keywords:
                if kw.lower() in answer_lower:
                    found = True
                    break
        
        # Tier 2: Direct keyword matching
        if not found:
            # Check full concept as substring first (handles "B-tree", "TCP/IP", etc.)
            if concept_key.lower() in answer_lower:
                found = True
            else:
                # Split and check individual words
                concept_words = re.findall(r'\w+', concept_key.lower())
                matched_words = sum(1 for w in concept_words if w in answer_words)
                match_ratio = matched_words / len(concept_words) if concept_words else 0
                if match_ratio >= 0.5:
                    found = True

        if found:
            detected.append(concept)
        else:
            missing.append(concept)

    score = len(detected) / len(expected_concepts) if expected_concepts else 0.0
    return round(score, 4), detected, missing


def _find_keywords_for_concept(concept: str) -> List[str]:
    """Find keywords from dictionary, case-insensitive lookup."""
    concept_lower = concept.lower()
    for key, keywords in CONCEPT_KEYWORDS.items():
        if key.lower() == concept_lower:
            return keywords
    return []


def get_all_concept_keys() -> List[str]:
    """Return all concept names from the dictionary."""
    return list(CONCEPT_KEYWORDS.keys())
