import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import api from "../../api/axios";

const SUMMARY_CARD_CONFIG = [
  { key: "total_students", label: "Total Students", accent: "#2563eb" },
  { key: "attempted", label: "Attempted", accent: "#0f766e" },
  { key: "average_score", label: "Average Score", accent: "#7c3aed" },
  { key: "highest_score", label: "Highest Score", accent: "#ca8a04" },
  { key: "lowest_score", label: "Lowest Score", accent: "#dc2626" }
];

const PIE_COLORS = ["#2563eb", "#e2e8f0"];

export default function FacultyAnalytics() {
  const { assignment_id } = useParams();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(Boolean(assignment_id));
  const [feedback, setFeedback] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "score", direction: "desc" });

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const res = await api.get("/faculty/view-assignments");
        setAssignments(res.data.assignments || []);
      } catch (err) {
        console.error("Failed to fetch assignments", err);
      } finally {
        setLoadingAssignments(false);
      }
    };

    loadAssignments();
  }, []);

  useEffect(() => {
    if (!assignment_id) {
      setAnalytics(null);
      setFeedback("");
      setLoadingAnalytics(false);
      return;
    }

    const loadAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        const res = await api.get(`/api/analytics/assignment/${assignment_id}`);
        setAnalytics(res.data);
        setFeedback(res.data.common_feedback || "");
      } catch (err) {
        console.error("Failed to fetch analytics", err);
        setAnalytics(null);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    loadAnalytics();
  }, [assignment_id]);

  const selectedAssignment = useMemo(
    () => assignments.find((item) => String(item.assignment_id) === String(assignment_id)),
    [assignments, assignment_id]
  );

  const pieData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: "Attempted", value: analytics.attempted || 0 },
      { name: "Not Attempted", value: analytics.not_attempted || 0 }
    ];
  }, [analytics]);

  const sortedStudents = useMemo(() => {
    const students = [...(analytics?.students || [])];
    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;

    students.sort((left, right) => {
      const a = left[key];
      const b = right[key];

      if (typeof a === "number" && typeof b === "number") {
        return (a - b) * multiplier;
      }

      return String(a || "").localeCompare(String(b || "")) * multiplier;
    });

    return students;
  }, [analytics, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }

      return { key, direction: key === "name" || key === "roll_no" || key === "status" ? "asc" : "desc" };
    });
  };

  const handleFeedbackSubmit = async () => {
    if (!assignment_id || !feedback.trim()) {
      return;
    }

    try {
      setFeedbackSaving(true);
      const res = await api.post(`/api/analytics/assignment/${assignment_id}/feedback`, {
        feedback: feedback.trim()
      });

      setFeedback(res.data.common_feedback || feedback.trim());
      setAnalytics((current) =>
        current
          ? {
              ...current,
              common_feedback: res.data.common_feedback || feedback.trim()
            }
          : current
      );
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save feedback");
    } finally {
      setFeedbackSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Faculty Analytics</div>
            <h1 style={styles.title}>Assignment Performance Dashboard</h1>
            <p style={styles.subtitle}>
              Review attempt trends, compare student scores, and send one shared feedback note for the assignment.
            </p>
          </div>
          <button style={styles.backButton} onClick={() => navigate("/faculty/dashboard")}>
            Back to dashboard
          </button>
        </header>

        <section style={styles.selectorCard}>
          <div style={styles.selectorTop}>
            <div>
              <h2 style={styles.sectionTitle}>Choose Assignment</h2>
              <p style={styles.sectionHint}>
                Open analytics from here or jump directly from each assignment.
              </p>
            </div>
          </div>

          {loadingAssignments ? (
            <div style={styles.placeholder}>Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div style={styles.placeholder}>No assignments available yet.</div>
          ) : (
            <div style={styles.assignmentGrid}>
              {assignments.map((item) => {
                const active = String(item.assignment_id) === String(assignment_id);
                return (
                  <button
                    key={item.assignment_id}
                    type="button"
                    style={active ? styles.assignmentTileActive : styles.assignmentTile}
                    onClick={() => navigate(`/faculty/analytics/${item.assignment_id}`)}
                  >
                    <div style={styles.assignmentTileTop}>
                      <span style={styles.assignmentBadge}>#{item.assignment_id}</span>
                      <span style={item.status === "published" ? styles.statusPublished : styles.statusDraft}>
                        {item.status}
                      </span>
                    </div>
                    <strong style={styles.assignmentSubject}>{item.subject}</strong>
                    <span style={styles.assignmentMeta}>
                      {item.department} • Div {item.division} • Year {item.year}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {!assignment_id ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Select an assignment to view analytics</h2>
            <p style={styles.emptyText}>
              Once selected, you’ll see summary stats, charts, student performance, and a common feedback composer.
            </p>
          </section>
        ) : loadingAnalytics ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Loading analytics...</h2>
          </section>
        ) : !analytics ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Analytics unavailable</h2>
            <p style={styles.emptyText}>This assignment could not be loaded right now.</p>
          </section>
        ) : (
          <>
            <section style={styles.heroCard}>
              <div>
                <div style={styles.heroLabel}>Now Viewing</div>
                <h2 style={styles.heroTitle}>{selectedAssignment?.subject || analytics.subject || `Assignment #${assignment_id}`}</h2>
                <p style={styles.heroMeta}>
                  Assignment #{assignment_id} • {analytics.attempted} attempted • {analytics.not_attempted} pending
                </p>
              </div>
              <div style={styles.heroAside}>
                <span style={styles.heroStatLabel}>Response Rate</span>
                <strong style={styles.heroStatValue}>
                  {analytics.total_students > 0
                    ? Math.round((analytics.attempted / analytics.total_students) * 100)
                    : 0}
                  %
                </strong>
              </div>
            </section>

            <section style={styles.summaryGrid}>
              {SUMMARY_CARD_CONFIG.map((card) => (
                <article key={card.key} style={styles.summaryCard}>
                  <span style={{ ...styles.summaryAccent, background: card.accent }} />
                  <span style={styles.summaryLabel}>{card.label}</span>
                  <strong style={styles.summaryValue}>{analytics[card.key]}</strong>
                </article>
              ))}
            </section>

            <section style={styles.chartGrid}>
              <article style={styles.chartCard}>
                <div style={styles.chartHeading}>
                  <h3 style={styles.cardTitle}>Score Distribution</h3>
                  <span style={styles.chartCaption}>Performance spread across score bands</span>
                </div>
                <div style={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.score_distribution || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="range" stroke="#64748b" />
                      <YAxis allowDecimals={false} stroke="#64748b" />
                      <Tooltip />
                      <Bar dataKey="count" radius={[12, 12, 0, 0]} fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article style={styles.chartCard}>
                <div style={styles.chartHeading}>
                  <h3 style={styles.cardTitle}>Attempt Status</h3>
                  <span style={styles.chartCaption}>Attempted vs not attempted</span>
                </div>
                <div style={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={styles.legendRow}>
                  {pieData.map((item, index) => (
                    <div key={item.name} style={styles.legendItem}>
                      <span style={{ ...styles.legendDot, background: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section style={styles.tableCard}>
              <div style={styles.tableHeader}>
                <div>
                  <h3 style={styles.cardTitle}>Student Performance</h3>
                  <p style={styles.sectionHint}>Click column headers to sort the table.</p>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <SortableTh label="Roll No" sortKey="roll_no" sortConfig={sortConfig} onClick={handleSort} />
                      <SortableTh label="Name" sortKey="name" sortConfig={sortConfig} onClick={handleSort} />
                      <SortableTh label="Score" sortKey="score" sortConfig={sortConfig} onClick={handleSort} />
                      <SortableTh label="Percentage" sortKey="percentage" sortConfig={sortConfig} onClick={handleSort} />
                      <SortableTh label="Status" sortKey="status" sortConfig={sortConfig} onClick={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={styles.emptyTableCell}>No submitted attempts yet.</td>
                      </tr>
                    ) : (
                      sortedStudents.map((student) => (
                        <tr key={student.roll_no}>
                          <td style={styles.td}>{student.roll_no}</td>
                          <td style={styles.td}>{student.name}</td>
                          <td style={styles.td}>{student.score}</td>
                          <td style={styles.td}>{student.percentage}%</td>
                          <td style={styles.td}>
                            <span style={styles.tableStatus}>{student.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={styles.feedbackCard}>
              <div style={styles.feedbackHeader}>
                <div>
                  <h3 style={styles.cardTitle}>Common Feedback</h3>
                  <p style={styles.sectionHint}>
                    This message will be shown to every student who opens their evaluation for this assignment.
                  </p>
                </div>
              </div>

              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Add shared guidance for the class, such as recurring misconceptions or next-step advice."
                style={styles.textarea}
              />

              <div style={styles.feedbackActions}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  disabled={feedbackSaving || !feedback.trim()}
                  onClick={handleFeedbackSubmit}
                >
                  {feedbackSaving ? "Saving..." : "Send Feedback"}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SortableTh({ label, sortKey, sortConfig, onClick }) {
  const active = sortConfig.key === sortKey;
  const arrow = !active ? "↕" : sortConfig.direction === "asc" ? "↑" : "↓";

  return (
    <th style={styles.th}>
      <button type="button" style={styles.thButton} onClick={() => onClick(sortKey)}>
        <span>{label}</span>
        <span style={active ? styles.sortArrowActive : styles.sortArrow}>{arrow}</span>
      </button>
    </th>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(37,99,235,0.16), transparent 24%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 45%, #f8fafc 100%)",
    padding: "28px 18px 56px"
  },
  container: {
    maxWidth: 1280,
    margin: "0 auto"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    marginBottom: 22
  },
  eyebrow: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  title: {
    margin: "12px 0 8px",
    fontSize: 34,
    color: "#0f172a"
  },
  subtitle: {
    margin: 0,
    maxWidth: 760,
    color: "#475569",
    lineHeight: 1.7
  },
  backButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    padding: "12px 16px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 600
  },
  selectorCard: {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 28,
    padding: 24,
    boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
    marginBottom: 22
  },
  selectorTop: {
    marginBottom: 16
  },
  sectionTitle: {
    margin: 0,
    fontSize: 20,
    color: "#0f172a"
  },
  sectionHint: {
    margin: "6px 0 0",
    color: "#64748b",
    lineHeight: 1.6
  },
  placeholder: {
    padding: "24px 0",
    color: "#64748b"
  },
  assignmentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 14
  },
  assignmentTile: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    padding: 18,
    textAlign: "left",
    cursor: "pointer"
  },
  assignmentTileActive: {
    background: "linear-gradient(135deg, #eff6ff, #eef2ff)",
    border: "1px solid #93c5fd",
    borderRadius: 20,
    padding: 18,
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 14px 30px rgba(37,99,235,0.12)"
  },
  assignmentTileTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12
  },
  assignmentBadge: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "#e2e8f0",
    color: "#334155",
    fontSize: 12,
    fontWeight: 700
  },
  assignmentSubject: {
    display: "block",
    fontSize: 17,
    color: "#0f172a",
    marginBottom: 8
  },
  assignmentMeta: {
    color: "#64748b",
    fontSize: 13
  },
  statusPublished: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize"
  },
  statusDraft: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "#fef3c7",
    color: "#92400e",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize"
  },
  emptyState: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 28,
    padding: "56px 24px",
    textAlign: "center"
  },
  emptyTitle: {
    margin: 0,
    color: "#0f172a"
  },
  emptyText: {
    margin: "10px 0 0",
    color: "#64748b"
  },
  heroCard: {
    background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
    color: "#ffffff",
    borderRadius: 28,
    padding: 26,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    marginBottom: 22
  },
  heroLabel: {
    color: "#bfdbfe",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
    fontWeight: 700
  },
  heroTitle: {
    margin: "10px 0 8px",
    fontSize: 28
  },
  heroMeta: {
    margin: 0,
    color: "#dbeafe"
  },
  heroAside: {
    minWidth: 140,
    padding: "18px 20px",
    borderRadius: 22,
    background: "rgba(255,255,255,0.12)"
  },
  heroStatLabel: {
    color: "#bfdbfe",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  heroStatValue: {
    display: "block",
    marginTop: 8,
    fontSize: 36
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 22
  },
  summaryCard: {
    position: "relative",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    padding: "22px 20px",
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)"
  },
  summaryAccent: {
    width: 42,
    height: 6,
    borderRadius: 999,
    display: "block",
    marginBottom: 18
  },
  summaryLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 13
  },
  summaryValue: {
    display: "block",
    marginTop: 8,
    fontSize: 30,
    color: "#0f172a"
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
    marginBottom: 22
  },
  chartCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)"
  },
  chartHeading: {
    marginBottom: 12
  },
  cardTitle: {
    margin: 0,
    fontSize: 20,
    color: "#0f172a"
  },
  chartCaption: {
    display: "block",
    marginTop: 6,
    color: "#64748b",
    fontSize: 13
  },
  chartWrap: {
    width: "100%",
    height: 300
  },
  legendRow: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    color: "#475569",
    fontSize: 13
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 999
  },
  tableCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    marginBottom: 22
  },
  tableHeader: {
    marginBottom: 14
  },
  tableWrap: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc"
  },
  thButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "none",
    background: "transparent",
    padding: 0,
    color: "#334155",
    fontWeight: 700,
    cursor: "pointer"
  },
  sortArrow: {
    color: "#94a3b8"
  },
  sortArrowActive: {
    color: "#2563eb"
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155"
  },
  tableStatus: {
    display: "inline-flex",
    padding: "4px 10px",
    borderRadius: 999,
    background: "#e0f2fe",
    color: "#075985",
    fontSize: 12,
    fontWeight: 700
  },
  emptyTableCell: {
    padding: "30px 16px",
    textAlign: "center",
    color: "#64748b"
  },
  feedbackCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)"
  },
  feedbackHeader: {
    marginBottom: 14
  },
  textarea: {
    width: "100%",
    minHeight: 150,
    borderRadius: 20,
    border: "1px solid #cbd5e1",
    padding: 16,
    fontSize: 15,
    resize: "vertical",
    boxSizing: "border-box"
  },
  feedbackActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 14
  },
  primaryButton: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    border: "none",
    borderRadius: 14,
    padding: "12px 18px",
    fontWeight: 700,
    cursor: "pointer"
  }
};
