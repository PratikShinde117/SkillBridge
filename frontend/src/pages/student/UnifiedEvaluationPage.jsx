import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import evalApi from "../../api/evaluation";

const pct = (value) => `${Math.round((value || 0) * 100)}%`;

export default function UnifiedEvaluationPage() {
  const { assignment_id, roll_no } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const response = await evalApi.get(`/student/evaluation/${roll_no}/${assignment_id}`);
        setData(response.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [assignment_id, roll_no]);

  const results = useMemo(() => data?.results || [], [data]);

  if (loading) {
    return <div style={styles.loading}>Loading evaluation...</div>;
  }

  if (!data) {
    return (
      <div style={styles.emptyWrap}>
        <h2 style={{ marginBottom: 8 }}>Evaluation not available</h2>
        <button style={styles.back} onClick={() => navigate("/student/dashboard")}>
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <button style={styles.back} onClick={() => navigate("/student/dashboard")}>
          Back to dashboard
        </button>

        <header style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>{data.assignment_type === "scenario" ? "Scenario Result" : "Assignment Result"}</div>
            <h1 style={styles.title}>{data.subject || `Assignment #${assignment_id}`}</h1>
            <p style={styles.subtitle}>{results.length} {data.assignment_type === "scenario" ? "tasks" : "questions"} evaluated</p>
          </div>
          <div style={styles.scoreCard}>
            <div style={styles.score}>{Math.round(data.percentage || 0)}%</div>
            <div style={styles.scoreMeta}>
              {data.total_score}/{data.max_score}
            </div>
          </div>
        </header>

        <section style={styles.dashboard}>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Total Score</span>
            <strong style={styles.metricValue}>{data.total_score}</strong>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Maximum</span>
            <strong style={styles.metricValue}>{data.max_score}</strong>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Grade</span>
            <strong style={styles.metricValue}>{data.grade?.letter || "-"}</strong>
          </div>
        </section>

        <section style={styles.feedbackBanner}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${Math.max(data.percentage || 0, 5)}%` }} />
          </div>
          <p style={styles.overallFeedback}>{data.overall_feedback || "Evaluation completed."}</p>
        </section>

        {data.common_feedback ? (
          <section style={styles.commonFeedbackCard}>
            <div style={styles.commonFeedbackLabel}>Faculty Common Feedback</div>
            <p style={styles.commonFeedbackText}>{data.common_feedback}</p>
          </section>
        ) : null}

        <section style={styles.results}>
          {results.map((result, index) => {
            const key = result.id || result.question_id || `${index}`;
            const open = expanded[key] ?? true;
            return (
              <article key={key} style={styles.resultCard}>
                <button
                  type="button"
                  style={styles.resultHeader}
                  onClick={() => setExpanded((prev) => ({ ...prev, [key]: !open }))}
                >
                  <div>
                    <div style={styles.resultIndex}>
                      {data.assignment_type === "scenario" ? `Task ${index + 1}` : `Question ${index + 1}`}
                    </div>
                    <h3 style={styles.resultTitle}>
                      {result.title || result.question_text || `Item ${index + 1}`}
                    </h3>
                  </div>
                  <div style={styles.resultScore}>
                    {result.score}/{result.max_score}
                  </div>
                </button>

                {open ? (
                  <div style={styles.resultBody}>
                    {result.question_text ? <p style={styles.prompt}>{result.question_text}</p> : null}
                    {result.student_answer ? (
                      <div style={styles.answerBox}>
                        <div style={styles.answerLabel}>Submitted Answer</div>
                        <p style={styles.answerText}>{result.student_answer}</p>
                      </div>
                    ) : null}

                    <div style={styles.barGrid}>
                      <MetricBar label="Concept" value={result.concept_score} color="#16a34a" />
                      <MetricBar label="Semantic" value={result.semantic_score} color="#2563eb" />
                      <MetricBar label="Completeness" value={result.completeness_score} color="#d97706" />
                    </div>

                    <div style={styles.conceptGrid}>
                      <ConceptList title="Detected" items={result.detected_concepts} tone="good" />
                      <ConceptList title="Missing" items={result.missing_concepts} tone="bad" />
                    </div>

                    <div style={styles.feedbackGrid}>
                      <FeedbackCard label="Strengths" value={result.feedback?.strength} tone="#16a34a" />
                      <FeedbackCard label="Weaknesses" value={result.feedback?.weakness} tone="#dc2626" />
                      <FeedbackCard label="Improvements" value={result.feedback?.improvement} tone="#d97706" />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function MetricBar({ label, value, color }) {
  return (
    <div>
      <div style={styles.barTop}>
        <span>{label}</span>
        <strong style={{ color }}>{pct(value)}</strong>
      </div>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${Math.max((value || 0) * 100, 2)}%`, background: color }} />
      </div>
    </div>
  );
}

function ConceptList({ title, items = [], tone }) {
  const style = tone === "good" ? styles.goodChip : styles.badChip;
  return (
    <div style={styles.conceptList}>
      <div style={styles.answerLabel}>{title}</div>
      <div style={styles.chips}>
        {items.length ? items.map((item) => <span key={item} style={style}>{item}</span>) : <span style={styles.emptyChip}>None</span>}
      </div>
    </div>
  );
}

function FeedbackCard({ label, value, tone }) {
  return (
    <div style={{ ...styles.feedbackCard, borderTopColor: tone }}>
      <div style={styles.answerLabel}>{label}</div>
      <p style={styles.feedbackText}>{value || "No feedback available."}</p>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
    padding: "32px 20px 64px"
  },
  shell: {
    maxWidth: 980,
    margin: "0 auto"
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f8fafc"
  },
  emptyWrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f8fafc",
    textAlign: "center"
  },
  back: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
    marginBottom: 18
  },
  hero: {
    background: "#0f172a",
    color: "#fff",
    borderRadius: 28,
    padding: 28,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20
  },
  eyebrow: {
    color: "#93c5fd",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: 700
  },
  title: {
    margin: "8px 0 6px",
    fontSize: 34
  },
  subtitle: {
    margin: 0,
    color: "#cbd5e1"
  },
  scoreCard: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: "24px 28px",
    minWidth: 160,
    textAlign: "center"
  },
  score: {
    fontSize: 42,
    fontWeight: 900
  },
  scoreMeta: {
    color: "#bfdbfe"
  },
  dashboard: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginTop: 20
  },
  metricCard: {
    background: "#fff",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)"
  },
  metricLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 13
  },
  metricValue: {
    display: "block",
    marginTop: 8,
    fontSize: 28
  },
  feedbackBanner: {
    marginTop: 20,
    background: "#fff",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)"
  },
  progressTrack: {
    height: 12,
    background: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #16a34a 0%, #2563eb 100%)"
  },
  overallFeedback: {
    margin: "16px 0 0",
    color: "#334155",
    lineHeight: 1.7
  },
  commonFeedbackCard: {
    marginTop: 20,
    background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
    borderRadius: 22,
    padding: 22,
    border: "1px solid #bfdbfe",
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)"
  },
  commonFeedbackLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#1d4ed8",
    fontWeight: 700,
    marginBottom: 8
  },
  commonFeedbackText: {
    margin: 0,
    color: "#1e293b",
    lineHeight: 1.7
  },
  results: {
    display: "grid",
    gap: 16,
    marginTop: 20
  },
  resultCard: {
    background: "#fff",
    borderRadius: 24,
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)"
  },
  resultHeader: {
    width: "100%",
    background: "transparent",
    border: "none",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    textAlign: "left",
    cursor: "pointer"
  },
  resultIndex: {
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
    fontWeight: 700
  },
  resultTitle: {
    margin: "8px 0 0",
    fontSize: 21,
    color: "#0f172a"
  },
  resultScore: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a"
  },
  resultBody: {
    padding: "0 24px 24px"
  },
  prompt: {
    color: "#334155",
    lineHeight: 1.7
  },
  answerBox: {
    background: "#f8fafc",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18
  },
  answerLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#64748b",
    fontWeight: 700,
    marginBottom: 8
  },
  answerText: {
    margin: 0,
    color: "#0f172a",
    lineHeight: 1.7
  },
  barGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14
  },
  barTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
    color: "#475569",
    fontSize: 13
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden"
  },
  barFill: {
    height: "100%"
  },
  conceptGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    marginTop: 18
  },
  conceptList: {
    background: "#f8fafc",
    borderRadius: 18,
    padding: 18
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  goodChip: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 13
  },
  badChip: {
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 13
  },
  emptyChip: {
    color: "#94a3b8"
  },
  feedbackGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginTop: 18
  },
  feedbackCard: {
    background: "#fff",
    borderRadius: 18,
    padding: 18,
    borderTop: "4px solid",
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)"
  },
  feedbackText: {
    margin: 0,
    color: "#334155",
    lineHeight: 1.7
  }
};
