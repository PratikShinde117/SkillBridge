# SkillBridge — AI Powered Competency Based Learning Platform

SkillBridge is a full-stack competency-based learning and assessment platform designed to bridge the gap between academic learning and real-world industry problem solving.

The platform supports both traditional question-based assessments and AI-generated scenario-based evaluations. It provides automated semantic evaluation using NLP techniques, secure online assessment workflows, faculty analytics, and role-based access for students, faculty, and administrators.

---

# Features

## Student Features
- Secure login and authentication
- Attempt question-based and scenario-based assignments
- Auto-save progress during assessments
- AI-generated evaluation reports
- View strengths, weaknesses, and improvement suggestions
- Resume analysis module
- Fullscreen monitoring and violation tracking

---

## Faculty Features
- Create and publish assignments
- Generate AI-powered scenarios
- Maintain scenario library
- View assignment analytics
- Provide common feedback to students
- Track submissions and evaluations

---

## Admin Features
- Onboard students and faculty
- Manage institutional users
- View platform statistics

---

# Tech Stack

## Frontend
- React.js
- Axios
- Lucide React Icons

## Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication

## AI Evaluation Service
- FastAPI
- Python
- Sentence Transformers (MiniLM)

## Scalability & Infrastructure
- Redis
- BullMQ
- Docker

---

# System Architecture

```text
Frontend (React)
        ↓
Node.js Backend (Express)
        ↓
Redis Queue (BullMQ)
        ↓
Python Evaluation Worker (FastAPI + MiniLM)
        ↓
PostgreSQL
```

---

# AI Evaluation Workflow

SkillBridge uses an asynchronous AI evaluation pipeline.

When a student submits a test:

1. Submission is stored in PostgreSQL
2. Evaluation job is pushed into Redis queue
3. Student immediately receives submission confirmation
4. BullMQ worker processes evaluation in background
5. Python evaluation service performs:
   - keyword matching
   - semantic similarity scoring
   - completeness analysis
   - rubric-based scoring
6. Results are stored back in database

This architecture prevents blocking the main backend server and improves scalability for concurrent users.

---

# Redis Integration

Redis is integrated in the project for:
- asynchronous background evaluation
- queue management using BullMQ
- scalable AI processing pipeline

The evaluation engine runs independently from the request-response cycle, allowing faster submissions and improved system responsiveness.

---

# Project Structure

```text
SkillBridge_UUU/
│
├── frontend/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── queues/
│   ├── workers/
│   ├── services/
│   ├── redisConnection.js
│   ├── db.js
│   └── server.js
│
├── Evaluation/
│   ├── services/
│   ├── models/
│   └── main.py
│
└── README.md
```

---

# Installation & Setup

## 1. Clone Repository

```bash
git clone https://github.com/PratikShinde117/SkillBridge
cd SkillBridge_UUU
```

---

# Backend Setup

## 2. Navigate to backend

```bash
cd backend
```

---

## 3. Install dependencies

```bash
npm install
```

---

## 4. Configure environment variables

Create `.env` inside backend folder:

```env
DB_HOST = localhost
DB_NAME = skillbridge
DB_USER = postgres
DB_PASS = *****
DB_PORT = 5432
GEMINI_API_KEY = ********
JWT_SECRET = ********
FRONTEND_URL = http://localhost:5173
BACKEND_URL = http://localhost:5000
BACKEND_PORT = 5000
EVALUATION_SERVICE_URL = http://127.0.0.1:8000

```

---

## 5. Start backend server

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

---

# Frontend Setup

## 6. Navigate to frontend

```bash
cd frontend
```

---

## 7. Install dependencies

```bash
npm install
```

---

## 8. Start frontend

```bash
bun dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# Python Evaluation Service Setup

## 9. Navigate to evaluation service

```bash
cd Evaluation
```

---

## 10. Create virtual environment

```bash
python -m venv venv
```

---

## 11. Activate virtual environment

### Windows

```bash
venv\Scripts\activate
```

### Linux / Mac

```bash
source venv/bin/activate
```

---

## 12. Install required dependencies manually

```bash
pip install fastapi uvicorn sentence-transformers torch numpy scikit-learn python-dotenv psycopg2-binary
```

---

## 13. Start FastAPI evaluation service

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Evaluation service runs on:

```text
http://127.0.0.1:8000
```

---

# Redis Setup (Docker)

SkillBridge uses Redis for background evaluation processing.

## 14. Start Redis using Docker

```bash
docker run -d --name redis-server -p 6379:6379 redis
```

---

## Verify Redis container

```bash
docker ps
```

---

# Start BullMQ Worker

## 15. Run evaluation worker

Open another terminal inside backend folder:

```bash
node workers/evaluationWorker.js
```

The worker processes AI evaluation jobs asynchronously.

---

# Running Complete System

You should have the following running simultaneously:

| Service | Port |
|---|---|
| React Frontend | 5173 |
| Node.js Backend | 5000 |
| FastAPI Evaluation Service | 8000 |
| Redis | 6379 |
| BullMQ Worker | background process |

---

# Security Features

- JWT Authentication
- Role-based access control
- HTTP-only cookies
- Rate limiting
- Fullscreen enforcement during assessments
- Violation tracking
- Token blacklisting

---

# Future Improvements

- Multi-tenant institutional architecture
- WebSocket-based live evaluation updates
- Redis caching for analytics
- AI-based adaptive learning paths
- Deployment using Docker Compose
- Kubernetes orchestration

---

# Contributors

Developed as part of a competency-based AI learning platform project focused on scalable assessment systems and industry-oriented education workflows.

---

# License

This project is intended for educational and research purposes.
