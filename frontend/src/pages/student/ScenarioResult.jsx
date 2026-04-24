import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import eval_api from "../../api/evaluation";

export default function ScenarioResult() {
  const { roll_no, assignment_id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    eval_api
      .get(`/student/evaluation/${roll_no}/${assignment_id}`)
      .then((res) => { setData(res.data); setLoading(false); })
      .catch(() => { alert("Failed to load results"); setLoading(false); });
  }, [roll_no, assignment_id]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) {
    return (
      <div style={S.loadWrap}>
        <div style={S.spinner} />
        <p style={{ color: "#94a3b8", marginTop: 16, fontSize: 14 }}>Loading results...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={S.loadWrap}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <h3 style={{ color: "#334155", marginBottom: 4 }}>No evaluation data found</h3>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>This assignment may not have been evaluated yet.</p>
          <button style={S.backBtn} onClick={() => navigate("/student/dashboard")}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const evalResult = data.evaluation_result || {};
  const isScenario = data.evaluation_type === "scenario" || !!evalResult.task_scores;
  const taskScores = evalResult.task_scores || evalResult.results || [];
  const totalScore = evalResult.total_score || data.total_score || 0;
  const maxScore = evalResult.max_score || 0;
  const percentage = evalResult.percentage || 0;
  const gradeInfo = evalResult.grade || {};
  const overallFeedback = data.overall_feedback || evalResult.overall_feedback || "";

  const getGradeLocal = (pct) => {
    if (pct >= 90) return { letter: "A+", color: "#059669", bg: "#ecfdf5" };
    if (pct >= 80) return { letter: "A", color: "#059669", bg: "#ecfdf5" };
    if (pct >= 70) return { letter: "B+", color: "#2563eb", bg: "#eff6ff" };
    if (pct >= 60) return { letter: "B", color: "#2563eb", bg: "#eff6ff" };
    if (pct >= 50) return { letter: "C", color: "#d97706", bg: "#fffbeb" };
    return { letter: "F", color: "#dc2626", bg: "#fef2f2" };
  };

  const grade = gradeInfo?.letter ? gradeInfo : getGradeLocal(percentage);

  const getScoreColor = (score, max) => {
    if (max === 0) return "#94a3b8";
    const pct = (score / max) * 100;
    if (pct >= 80) return "#059669";
    if (pct >= 60) return "#2563eb";
    if (pct >= 40) return "#d97706";
    return "#dc2626";
  };

  const MetricBar = ({ label, value, color, icon }) => (
    <div style={S.metric}>
      <div style={S.metricTop}>
        <span style={S.metricLabel}>{icon} {label}</span>
        <span style={{ ...S.metricPct, color }}>{Math.round((value || 0) * 100)}%</span>
      </div>
      <div style={S.metricBarBg}>
        <div style={{ ...S.metricBarFill, width: `${(value || 0) * 100}%`, background: color }} />
      </div>
    </div>
  );

  return (
    <div style={S.shell}>
      <div style={S.container}>
        {/* Back */}
        <button style={S.backBtn} onClick={() => navigate("/student/dashboard")}>
          ← Back to Dashboard
        </button>

        <header style={S.header}>
          <div>
            <h1 style={S.pageTitle}>📊 Evaluation Results</h1>
            <p style={S.pageSub}>Assignment #{assignment_id} · {isScenario ? "Scenario-Based" : "Question-Based"}</p>
          </div>
        </header>

        {/* Score Overview Card */}
        <div style={S.overviewCard}>
          <div style={S.scoreCircleOuter}>
            <div style={{ ...S.scoreCircle, borderColor: grade.color || "#6366f1" }}>
              <span style={{ ...S.scorePct, color: grade.color || "#6366f1" }}>{Math.round(percentage)}%</span>
              <span style={S.scoreWord}>Score</span>
            </div>
          </div>
          <div style={S.overviewMeta}>
            <div style={{ ...S.gradeBadge, background: grade.bg || "#ede9fe", color: grade.color || "#6366f1" }}>
              Grade: {grade.letter} {gradeInfo.label && `— ${gradeInfo.label}`}
            </div>
            <div style={S.scoreRow}>
              <div style={S.scoreBlock}>
                <div style={S.scoreNum}>{totalScore}</div>
                <div style={S.scoreLabel}>Obtained</div>
              </div>
              <div style={S.divider} />
              <div style={S.scoreBlock}>
                <div style={S.scoreNum}>{maxScore}</div>
                <div style={S.scoreLabel}>Maximum</div>
              </div>
              <div style={S.divider} />
              <div style={S.scoreBlock}>
                <div style={S.scoreNum}>{taskScores.length}</div>
                <div style={S.scoreLabel}>{isScenario ? "Tasks" : "Questions"}</div>
              </div>
            </div>
            {/* Progress bar */}
            <div style={S.progressBg}>
              <div style={{ ...S.progressFill, width: `${percentage}%`, background: grade.color || "#6366f1" }} />
            </div>
          </div>
        </div>

        {/* Overall Feedback */}
        {overallFeedback && (
          <div style={S.feedbackBanner}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
            <p style={S.feedbackBannerText}>{overallFeedback}</p>
          </div>
        )}

        {/* Score Breakdown */}
        {isScenario && taskScores.length > 0 && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>Score Breakdown</h3>
            <div style={S.barList}>
              {taskScores.map((ts) => {
                const pct = ts.max_score > 0 ? (ts.score / ts.max_score) * 100 : 0;
                return (
                  <div key={ts.task_id || ts.id} style={S.barItem}>
                    <div style={S.barTop}>
                      <span style={S.barName}>Task {ts.task_id || ts.id}: {ts.title}</span>
                      <span style={{ ...S.barScore, color: getScoreColor(ts.score, ts.max_score) }}>
                        {ts.score}/{ts.max_score}
                      </span>
                    </div>
                    <div style={S.barBg}>
                      <div style={{ ...S.barFill, width: `${pct}%`, background: getScoreColor(ts.score, ts.max_score) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Task Results */}
        {isScenario && taskScores.map((ts) => {
          const isExp = expanded[ts.task_id || ts.id];
          const fb = ts.feedback || {};
          const feedbackIsObj = typeof fb === "object" && fb !== null;
          const feedbackStr = feedbackIsObj ? "" : fb;

          return (
            <div key={ts.task_id || ts.id} style={S.taskCard}>
              <div
                style={S.taskHeader}
                onClick={() => toggleExpand(ts.task_id || ts.id)}
              >
                <div>
                  <span style={S.taskNum}>Task {ts.task_id || ts.id}</span>
                  <h4 style={S.taskTitle}>{ts.title || `Task ${ts.task_id || ts.id}`}</h4>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    ...S.taskScoreBadge,
                    background: getScoreColor(ts.score, ts.max_score) + "18",
                    color: getScoreColor(ts.score, ts.max_score)
                  }}>
                    {ts.score} / {ts.max_score}
                  </div>
                  <span style={{ color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>{isExp ? "▲" : "▼"}</span>
                </div>
              </div>

              {isExp && (
                <div style={S.taskBody}>
                  {/* Metrics Row */}
                  <div style={S.metricsRow}>
                    <MetricBar label="Concept Match" value={ts.concept_score} color="#8b5cf6" icon="🧠" />
                    <MetricBar label="Semantic Similarity" value={ts.semantic_score} color="#06b6d4" icon="🔗" />
                    <MetricBar label="Completeness" value={ts.completeness_score} color="#f59e0b" icon="📝" />
                  </div>

                  {/* Concepts */}
                  <div style={S.conceptsRow}>
                    {(ts.detected_concepts || ts.detected || []).length > 0 && (
                      <div style={S.conceptGroup}>
                        <span style={S.conceptLabel}>✅ Detected Concepts</span>
                        <div style={S.chipRow}>
                          {(ts.detected_concepts || ts.detected || []).map((c, i) => <span key={i} style={S.chipGreen}>{c}</span>)}
                        </div>
                      </div>
                    )}
                    {(ts.missing_concepts || ts.missing || []).length > 0 && (
                      <div style={S.conceptGroup}>
                        <span style={S.conceptLabel}>❌ Missing Concepts</span>
                        <div style={S.chipRow}>
                          {(ts.missing_concepts || ts.missing || []).map((c, i) => <span key={i} style={S.chipRed}>{c}</span>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Structured Feedback */}
                  {feedbackIsObj && (
                    <div style={S.feedbackGrid}>
                      {fb.strength && fb.strength !== "No major strengths identified" && (
                        <div style={{ ...S.feedbackItem, borderLeft: "3px solid #10b981" }}>
                          <div style={S.fbLabel}>✔ Strengths</div>
                          <p style={S.fbText}>{fb.strength}</p>
                        </div>
                      )}
                      {fb.weakness && fb.weakness !== "No significant weaknesses" && (
                        <div style={{ ...S.feedbackItem, borderLeft: "3px solid #ef4444" }}>
                          <div style={S.fbLabel}>✘ Weaknesses</div>
                          <p style={S.fbText}>{fb.weakness}</p>
                        </div>
                      )}
                      {fb.improvement && fb.improvement !== "Continue with your current approach" && (
                        <div style={{ ...S.feedbackItem, borderLeft: "3px solid #f59e0b" }}>
                          <div style={S.fbLabel}>⚠ Improvements</div>
                          <p style={S.fbText}>{fb.improvement}</p>
                        </div>
                      )}
                      {fb.summary && (
                        <div style={{ ...S.feedbackItem, borderLeft: "3px solid #6366f1", gridColumn: "1 / -1" }}>
                          <div style={S.fbLabel}>📋 Summary</div>
                          <p style={S.fbText}>{fb.summary}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback string feedback */}
                  {feedbackStr && (
                    <div style={S.feedbackBox}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                      <p style={S.feedbackBoxText}>{feedbackStr}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Non-scenario fallback */}
        {!isScenario && data.questions && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>Question Results</h3>
            {data.questions.map((q) => {
              const fb = q.feedback || {};
              const feedbackIsObj = typeof fb === "object" && fb !== null;

              return (
                <div key={q.question_id} style={S.qCard}>
                  <div style={S.qTop}>
                    <div style={{ flex: 1 }}>
                      <span style={S.qType}>{q.question_type === "mcq" ? "MCQ" : "Descriptive"}</span>
                      <p style={S.qText}>Q{q.question_id}: {q.question_text?.slice(0, 120)}{q.question_text?.length > 120 ? "..." : ""}</p>
                    </div>
                    <span style={{ fontWeight: 700, color: getScoreColor(q.score, q.max_score || 1), fontSize: 15 }}>
                      {q.score}/{q.max_score || 1}
                    </span>
                  </div>
                  {q.semantic_score !== undefined && (
                    <div style={{ marginTop: 8 }}>
                      <MetricBar label="Semantic Score" value={q.semantic_score} color="#06b6d4" icon="🔗" />
                    </div>
                  )}
                  {feedbackIsObj && fb.summary && (
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>💡 {fb.summary}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  shell: { minHeight: "100vh", background: "#f1f5f9" },
  container: { maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" },
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh" },
  spinner: { width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" },
  backBtn: { background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20, display: "block" },

  header: { marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" },
  pageSub: { fontSize: 14, color: "#64748b", margin: 0 },

  // Score Overview
  overviewCard: { display: "flex", alignItems: "center", gap: 40, background: "#fff", borderRadius: 20, padding: "36px 44px", marginBottom: 20, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,.04)" },
  scoreCircleOuter: {},
  scoreCircle: { width: 130, height: 130, borderRadius: "50%", border: "5px solid", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  scorePct: { fontSize: 36, fontWeight: 900 },
  scoreWord: { fontSize: 12, color: "#94a3b8", fontWeight: 500, marginTop: -2 },
  overviewMeta: { flex: 1 },
  gradeBadge: { display: "inline-block", padding: "6px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, marginBottom: 16 },
  scoreRow: { display: "flex", gap: 28, alignItems: "center", marginBottom: 16 },
  scoreBlock: { textAlign: "center" },
  scoreNum: { fontSize: 28, fontWeight: 800, color: "#0f172a", display: "block", lineHeight: 1 },
  scoreLabel: { fontSize: 12, color: "#94a3b8", fontWeight: 500, marginTop: 3 },
  divider: { width: 1, height: 44, background: "#e2e8f0" },
  progressBg: { height: 8, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 10, transition: "width .8s ease" },

  // Feedback Banner
  feedbackBanner: { display: "flex", gap: 14, background: "#f5f3ff", borderRadius: 14, padding: "18px 24px", border: "1px solid #ddd6fe", marginBottom: 20 },
  feedbackBannerText: { fontSize: 14, color: "#4338ca", lineHeight: 1.7, margin: 0 },

  // Cards
  card: { background: "#fff", borderRadius: 16, padding: "28px 32px", marginBottom: 20, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.03)" },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#334155", margin: "0 0 18px" },

  // Bar Breakdown
  barList: { display: "flex", flexDirection: "column", gap: 16 },
  barItem: {},
  barTop: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  barName: { fontSize: 13, fontWeight: 600, color: "#334155" },
  barScore: { fontSize: 13, fontWeight: 700 },
  barBg: { height: 10, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 10, transition: "width .6s ease" },

  // Task Card
  taskCard: { background: "#fff", borderRadius: 16, marginBottom: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.03)", overflow: "hidden" },
  taskHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 28px", cursor: "pointer" },
  taskNum: { fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: .5 },
  taskTitle: { fontSize: 16, fontWeight: 600, color: "#0f172a", margin: "4px 0 0" },
  taskScoreBadge: { padding: "6px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700, flexShrink: 0 },
  taskBody: { padding: "0 28px 28px", borderTop: "1px solid #f1f5f9" },

  metricsRow: { display: "flex", gap: 20, marginTop: 18, marginBottom: 18 },
  metric: { flex: 1 },
  metricTop: { display: "flex", justifyContent: "space-between", marginBottom: 5 },
  metricLabel: { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: .3 },
  metricPct: { fontSize: 13, fontWeight: 700 },
  metricBarBg: { height: 8, background: "#f1f5f9", borderRadius: 6, overflow: "hidden" },
  metricBarFill: { height: "100%", borderRadius: 6, transition: "width .5s ease" },

  conceptsRow: { display: "flex", gap: 20, marginBottom: 18 },
  conceptGroup: { flex: 1 },
  conceptLabel: { fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8, display: "block" },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  chipGreen: { background: "#ecfdf5", color: "#059669", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "1px solid #a7f3d0" },
  chipRed: { background: "#fef2f2", color: "#dc2626", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "1px solid #fecaca" },

  // Structured Feedback Grid
  feedbackGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  feedbackItem: { background: "#fafbfe", borderRadius: 10, padding: "14px 16px" },
  fbLabel: { fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 },
  fbText: { fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 },

  feedbackBox: { display: "flex", gap: 12, background: "#f5f3ff", borderRadius: 12, padding: "16px 20px", border: "1px solid #ddd6fe" },
  feedbackBoxText: { fontSize: 13, color: "#4338ca", lineHeight: 1.7, margin: 0 },

  // Question Cards
  qCard: { padding: "18px 22px", background: "#f8fafc", borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" },
  qTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  qType: { fontSize: 10, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: .5 },
  qText: { fontSize: 13, color: "#334155", lineHeight: 1.6, margin: "4px 0 0" },
};
