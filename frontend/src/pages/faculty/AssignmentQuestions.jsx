import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";

export default function AssignmentQuestions() {
  const { assignment_id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignmentDetails = async () => {
      try {
        const res = await api.get(`/faculty/assignment/${assignment_id}`);
        setAssignment(res.data.assignment || null);
        setQuestions(res.data.questions || []);
        setScenarios(res.data.scenarios || []);
      } catch (err) {
        console.error("Failed to load assignment details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignmentDetails();
  }, [assignment_id]);

  const isScenarioAssignment = assignment?.assignment_type === "scenario";

  const scenarioCards = useMemo(
    () =>
      scenarios.map((scenario) => ({
        ...scenario,
        scenarioJson:
          typeof scenario.scenario_json === "string"
            ? JSON.parse(scenario.scenario_json)
            : scenario.scenario_json
      })),
    [scenarios]
  );

  if (loading) {
    return <div style={styles.loading}>Loading assignment...</div>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Assignment Details</div>
          <h1 style={styles.title}>
            {isScenarioAssignment ? "Scenario Assignment" : "Questions"}
          </h1>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.analyticsBtn}
            onClick={() => navigate(`/faculty/analytics/${assignment_id}`)}
          >
            View Analytics
          </button>
          <button style={styles.backBtn} onClick={() => navigate("/faculty/view-assignments")}>
            Back
          </button>
        </div>
      </header>

      {assignment && (
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>{assignment.subject}</h3>
          <p style={styles.meta}>Type: {isScenarioAssignment ? "Scenario" : "Question"}</p>
          <p style={styles.meta}>Department: {assignment.department}</p>
          <p style={styles.meta}>Division: {assignment.division}</p>
          <p style={styles.meta}>Year: {assignment.year}</p>
          <p style={styles.meta}>Duration: {assignment.duration_minutes} mins</p>
          <p style={styles.meta}>Status: {assignment.status}</p>
        </section>
      )}

      <main style={styles.list}>
        {isScenarioAssignment
          ? scenarioCards.map((scenario, index) => (
              <div key={scenario.scenario_id} style={styles.card}>
                <span style={styles.index}>Scenario {index + 1}</span>
                <h3 style={styles.cardTitle}>{scenario.title}</h3>
                <p style={styles.text}>{scenario.scenarioJson?.context?.description}</p>
                <p style={styles.problem}>{scenario.scenarioJson?.problem_statement}</p>

                <div style={styles.section}>
                  <strong>Tasks</strong>
                  <ul>
                    {(scenario.scenarioJson?.tasks || []).map((task) => (
                      <li key={task.task_id} style={styles.li}>
                        <strong>{task.title}</strong>: {task.description}
                        <div>Marks: {task.marks}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          : questions.map((q, index) => (
              <div key={q.question_id} style={styles.card}>
                <span style={styles.index}>Q{index + 1}</span>
                <p style={styles.text}>{q.question_text}</p>

                {q.question_type === "mcq" && (
                  <div style={styles.options}>
                    {q.options?.map((opt, i) => (
                      <div key={i} style={styles.option}>
                        {opt} {opt === q.correct_answer ? "✓" : ""}
                      </div>
                    ))}
                  </div>
                )}

                {q.question_type === "descriptive" && (
                  <div style={styles.section}>
                    <strong>Expected Points</strong>
                    <ul>
                      {q.expected_points?.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
    padding: 24,
    fontFamily: "Inter, system-ui, sans-serif"
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center"
  },
  header: {
    maxWidth: 900,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  headerActions: {
    display: "flex",
    gap: 10
  },
  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#2563eb",
    fontWeight: 700
  },
  title: {
    fontSize: 28
  },
  backBtn: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer"
  },
  analyticsBtn: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    cursor: "pointer"
  },
  list: {
    maxWidth: 900,
    margin: "auto",
    display: "grid",
    gap: 20
  },
  card: {
    background: "#fff",
    padding: 30,
    marginBottom: 30,
    textAlign: "center",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
  },
  cardTitle: {
    marginBottom: 8
  },
  meta: {
    color: "#64748b",
    fontSize: 14
  },
  index: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: 700
  },
  text: {
    marginTop: 10,
    color: "#334155"
  },
  problem: {
    marginTop: 10,
    fontWeight: 500
  },
  section: {
    marginTop: 12
  },
  li: {
    marginBottom: 8
  },
  options: {
    marginTop: 10,
    display: "grid",
    gap: 8
  },
  option: {
    padding: 10,
    borderRadius: 10,
    background: "#f1f5f9"
  }
};
