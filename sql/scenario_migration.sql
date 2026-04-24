-- =============================================
-- SKILLBRIDGE: SCENARIO-BASED SYSTEM MIGRATION
-- Paste this entire file into pgAdmin and run
-- =============================================

-- 1. CREATE SCENARIOS TABLE
CREATE TABLE IF NOT EXISTS scenarios (
    scenario_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    concepts JSONB NOT NULL DEFAULT '[]',
    year_level INTEGER NOT NULL,
    difficulty_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    scenario_json JSONB NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. ADD scenario_ids COLUMN TO assignments (backward compatible)
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS scenario_ids JSONB DEFAULT NULL;

-- 3. ADD assignment_type TO assignments (question / scenario)
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(20) DEFAULT 'question';

-- 4. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_scenarios_subject ON scenarios(subject);
CREATE INDEX IF NOT EXISTS idx_scenarios_year_level ON scenarios(year_level);
CREATE INDEX IF NOT EXISTS idx_scenarios_concepts ON scenarios USING GIN (concepts);
CREATE INDEX IF NOT EXISTS idx_assignments_type ON assignments(assignment_type);

-- 5. SEED SCENARIOS (sample data for testing)

INSERT INTO scenarios (title, subject, concepts, year_level, difficulty_level, scenario_json, created_by) VALUES

-- Operating Systems Scenario
('Cloud VM Resource Manager', 'Operating Systems', '["process scheduling", "memory management", "CPU allocation", "deadlock"]', 3, 'medium',
'{
  "context": {
    "domain": "Cloud Infrastructure",
    "description": "A mid-size cloud provider manages 500+ virtual machines across 3 data centers. Each VM runs customer workloads with varying CPU and memory requirements. The system must handle dynamic resource allocation, prevent resource starvation, and maintain SLA guarantees of 99.9% uptime.",
    "scale": "500 VMs, 3 data centers, 10000 concurrent requests"
  },
  "problem_statement": "Design an efficient resource management strategy for the VM orchestrator that handles process scheduling, memory allocation, and deadlock prevention while maintaining performance SLAs.",
  "tasks": [
    {
      "task_id": 1,
      "title": "CPU Scheduling Strategy",
      "description": "Propose a CPU scheduling algorithm for the VM orchestrator. Explain why your chosen algorithm is suitable for this cloud environment and how it handles priority-based workloads.",
      "marks": 5,
      "expected_concepts": ["round robin", "priority scheduling", "context switching", "time quantum", "preemptive scheduling"]
    },
    {
      "task_id": 2,
      "title": "Memory Allocation Design",
      "description": "Design the memory allocation strategy for VMs. Address how the system handles memory requests that exceed available physical memory and explain the paging mechanism.",
      "marks": 5,
      "expected_concepts": ["virtual memory", "paging", "page replacement", "TLB", "memory fragmentation"]
    },
    {
      "task_id": 3,
      "title": "Deadlock Prevention",
      "description": "Multiple VMs compete for shared storage and network resources. Explain how you would detect and prevent deadlocks in this multi-resource environment.",
      "marks": 5,
      "expected_concepts": ["resource allocation graph", "bankers algorithm", "deadlock detection", "circular wait", "safe state"]
    }
  ]
}', 'system'),

-- Database Management Scenario
('E-Commerce Database Scaling', 'Database Management Systems', '["normalization", "indexing", "transactions", "query optimization"]', 3, 'medium',
'{
  "context": {
    "domain": "E-Commerce Platform",
    "description": "An online marketplace processes 50,000 orders daily with a product catalog of 2 million items. The database handles concurrent transactions from buyers, sellers, and inventory management systems. During flash sales, query load increases 10x.",
    "scale": "50000 daily orders, 2M products, 500 concurrent users"
  },
  "problem_statement": "Optimize the database architecture to handle high-concurrency transactions, ensure data consistency during flash sales, and improve query performance for product search and order processing.",
  "tasks": [
    {
      "task_id": 1,
      "title": "Schema Normalization",
      "description": "Analyze the current denormalized schema and propose a normalized design. Explain the trade-offs between normalization levels (2NF vs 3NF) for this e-commerce context.",
      "marks": 5,
      "expected_concepts": ["functional dependency", "2NF", "3NF", "decomposition", "data redundancy"]
    },
    {
      "task_id": 2,
      "title": "Indexing Strategy",
      "description": "Design an indexing strategy for the product catalog and order tables. Explain which columns to index and the type of index (B-tree, hash, composite) for each use case.",
      "marks": 5,
      "expected_concepts": ["B-tree index", "composite index", "covering index", "index selectivity", "query plan"]
    },
    {
      "task_id": 3,
      "title": "Transaction Management",
      "description": "During a flash sale, multiple buyers attempt to purchase the last item simultaneously. Design the transaction isolation and locking strategy to prevent overselling.",
      "marks": 5,
      "expected_concepts": ["ACID properties", "isolation levels", "optimistic locking", "serializable", "phantom reads"]
    }
  ]
}', 'system'),

-- Data Structures Scenario
('Social Media Feed Engine', 'Data Structures and Algorithms', '["graph traversal", "hashing", "sorting", "tree structures"]', 2, 'medium',
'{
  "context": {
    "domain": "Social Media Platform",
    "description": "A social media application with 100,000 users needs to generate personalized feeds. Users follow other users, like posts, and share content. The feed algorithm must rank posts by relevance and display them in real-time.",
    "scale": "100000 users, 1M posts daily, real-time feed generation"
  },
  "problem_statement": "Design the data structures and algorithms needed to efficiently generate personalized user feeds, handle friend-of-friend suggestions, and implement trending topic detection.",
  "tasks": [
    {
      "task_id": 1,
      "title": "Social Graph Representation",
      "description": "Choose an appropriate data structure to represent the social network graph. Explain how you would efficiently find mutual friends and suggest new connections.",
      "marks": 5,
      "expected_concepts": ["adjacency list", "BFS", "graph traversal", "mutual connections", "space complexity"]
    },
    {
      "task_id": 2,
      "title": "Feed Ranking Algorithm",
      "description": "Design a sorting/ranking mechanism for the user feed. Posts should be ranked by recency, engagement, and relevance to the user.",
      "marks": 5,
      "expected_concepts": ["priority queue", "heap sort", "weighted scoring", "time complexity", "comparison-based sorting"]
    },
    {
      "task_id": 3,
      "title": "Trending Topics Detection",
      "description": "Implement a system to detect trending hashtags in real-time from the stream of posts. Explain your choice of data structure and how it handles the sliding time window.",
      "marks": 5,
      "expected_concepts": ["hash map", "frequency counting", "sliding window", "min-heap", "stream processing"]
    }
  ]
}', 'system'),

-- Computer Networks Scenario
('CDN Architecture Design', 'Computer Networks', '["TCP/IP", "DNS", "load balancing", "caching", "HTTP"]', 4, 'hard',
'{
  "context": {
    "domain": "Content Delivery Network",
    "description": "A video streaming platform serves content to 10 million users globally through a CDN with edge servers in 50 locations. The system must minimize latency, handle peak loads during popular live events, and ensure content availability even when origin servers are under maintenance.",
    "scale": "10M users, 50 edge locations, 4K video streaming"
  },
  "problem_statement": "Design the networking architecture for the CDN including DNS-based routing, TCP optimization for video delivery, load balancing across edge servers, and caching strategies.",
  "tasks": [
    {
      "task_id": 1,
      "title": "DNS-Based Request Routing",
      "description": "Explain how DNS can be used to route user requests to the nearest edge server. Discuss the role of GeoDNS and TTL configuration in this architecture.",
      "marks": 5,
      "expected_concepts": ["DNS resolution", "GeoDNS", "TTL", "anycast", "latency-based routing"]
    },
    {
      "task_id": 2,
      "title": "TCP Optimization for Streaming",
      "description": "Video streaming over TCP can suffer from head-of-line blocking. Propose TCP-level optimizations for improving streaming quality and reducing buffering.",
      "marks": 5,
      "expected_concepts": ["TCP window scaling", "congestion control", "slow start", "adaptive bitrate", "RTT optimization"]
    },
    {
      "task_id": 3,
      "title": "Edge Caching Strategy",
      "description": "Design the caching architecture for edge servers. Address cache invalidation, cache hit ratio optimization, and handling of personalized content.",
      "marks": 5,
      "expected_concepts": ["cache invalidation", "LRU eviction", "cache hierarchy", "cache-control headers", "origin shielding"]
    }
  ]
}', 'system'),

-- Programming Fundamentals Scenario (Year 1)
('Student Grade Calculator', 'Programming Fundamentals', '["variables", "loops", "conditionals", "arrays", "functions"]', 1, 'easy',
'{
  "context": {
    "domain": "Education Management",
    "description": "A school needs a simple program to manage student grades. The system stores marks for 5 subjects, calculates averages, determines pass/fail status, and generates a basic report card. There are 30 students in a class.",
    "scale": "30 students, 5 subjects, basic calculations"
  },
  "problem_statement": "Design and explain the logic for a student grade calculator that handles input validation, grade calculation, and result display using fundamental programming concepts.",
  "tasks": [
    {
      "task_id": 1,
      "title": "Data Storage Design",
      "description": "Explain how you would store marks for 30 students across 5 subjects. What data structure would you use and why?",
      "marks": 5,
      "expected_concepts": ["array", "2D array", "variable declaration", "data types", "initialization"]
    },
    {
      "task_id": 2,
      "title": "Grade Calculation Logic",
      "description": "Write the logic for calculating average marks and assigning grades (A/B/C/D/F). Use appropriate control structures.",
      "marks": 5,
      "expected_concepts": ["loop iteration", "sum calculation", "if-else conditions", "grade boundaries", "average formula"]
    },
    {
      "task_id": 3,
      "title": "Function Design",
      "description": "Break down the grade calculator into reusable functions. Explain each function''s purpose, parameters, and return value.",
      "marks": 5,
      "expected_concepts": ["function definition", "parameters", "return value", "modular design", "function call"]
    }
  ]
}', 'system');

-- DONE! All changes applied successfully.
-- Old assignments continue to work (assignment_type = 'question', scenario_ids = NULL)
-- New scenario-based assignments will use assignment_type = 'scenario'
