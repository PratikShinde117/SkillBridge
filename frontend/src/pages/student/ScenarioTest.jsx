import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ScenarioTest() {
  const { assignment_id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [duration, setDuration] = useState(null);
  const [activeScenario, setActiveScenario] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const startRes = await api.get(`/assignments/${assignment_id}/start`);
        setDuration(startRes.data.duration_minutes);
        const scenRes = await api.get(`/api/scenarios/assignment/${assignment_id}/scenarios`);
        setAssignment(scenRes.data.assignment);
        setScenarios(scenRes.data.scenarios || []);
        const start = new Date(startRes.data.started_at);
        const end = new Date(start.getTime() + startRes.data.duration_minutes * 60000);
        const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
        setTimeLeft(remaining);
      } catch (err) {
        console.error("Failed to start scenario test", err);
      }
    };
    init();
  }, [assignment_id]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft !== null]);

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const timePercent = duration ? ((timeLeft || 0) / (duration * 60)) * 100 : 100;
  const isUrgent = timeLeft !== null && timeLeft < 120;

  const handleAnswerChange = (scenarioId, taskId, value) => {
    setAnswers((prev) => ({ ...prev, [`${scenarioId}_${taskId}`]: value }));
  };

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    if (!auto && !window.confirm("Are you sure you want to submit?")) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      for (const sc of scenarios) {
        const sj = typeof sc.scenario_json === "string" ? JSON.parse(sc.scenario_json) : sc.scenario_json;
        const taskAnswers = (sj.tasks || []).map((t) => ({
          task_id: t.task_id,
          answer: answers[`${sc.scenario_id}_${t.task_id}`] || "",
        }));
        await api.post(`/assignments/${assignment_id}/submit`, { answers: taskAnswers, scenario_id: sc.scenario_id });
      }
      navigate("/student/dashboard", { state: { refresh: true } });
    } catch (err) {
      console.error("Submission failed", err);
      setSubmitting(false);
    }
  };

  // Auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        api.patch(`/assignments/${assignment_id}/save-progress`, { answers }).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [answers]);

  if (scenarios.length === 0) {
    return (
      <div style={S.loadWrap}>
        <div style={S.spinner} />
        <p style={{ color: "#94a3b8", marginTop: 16, fontSize: 14 }}>Loading scenario test...</p>
      </div>
    );
  }

  const currentScenario = scenarios[activeScenario];
  const cj = typeof currentScenario.scenario_json === "string"
    ? JSON.parse(currentScenario.scenario_json)
    : currentScenario.scenario_json;

  const answeredCount = (cj.tasks || []).filter(t => (answers[`${currentScenario.scenario_id}_${t.task_id}`] || "").trim()).length;
  const totalTasks = (cj.tasks || []).length;

  return (
    <div style={S.shell}>
      {/* Timer Bar */}
      <div style={S.timerBar}>
        <div style={{ ...S.timerFill, width: `${timePercent}%`, background: isUrgent ? "#ef4444" : "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
      </div>

      {/* Top Nav */}
      <div style={S.topNav}>
        <div style={S.topLeft}>
          <h2 style={S.topTitle}>{assignment?.subject || "Scenario Test"}</h2>
          <span style={S.topMeta}>Assignment #{assignment_id} · {answeredCount}/{totalTasks} answered</span>
        </div>
        <div style={{ ...S.timerBox, borderColor: isUrgent ? "#fca5a5" : "#c4b5fd", background: isUrgent ? "#fef2f2" : "#f5f3ff" }}>
          <span style={{ ...S.timerText, color: isUrgent ? "#dc2626" : "#6366f1" }}>⏱ {formatTime(timeLeft)}</span>
        </div>
      </div>

      <div style={S.mainArea}>
        {/* Scenario Tabs */}
        {scenarios.length > 1 && (
          <div style={S.tabRow}>
            {scenarios.map((sc, idx) => (
              <button key={sc.scenario_id} style={idx === activeScenario ? S.tabActive : S.tab} onClick={() => setActiveScenario(idx)}>
                Scenario {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Context */}
        <div style={S.contextCard}>
          <div style={S.contextHeader}>
            <span style={S.contextLabel}>📖 Scenario Context</span>
            <span style={S.domainBadge}>{cj.context?.domain}</span>
          </div>
          <p style={S.contextText}>{cj.context?.description}</p>
          {cj.context?.scale && <p style={S.scaleText}>📏 {cj.context.scale}</p>}
          <div style={S.problemBox}>
            <h4 style={S.problemLabel}>🎯 Problem Statement</h4>
            <p style={S.problemText}>{cj.problem_statement}</p>
          </div>
        </div>

        {/* Tasks */}
        <h3 style={S.tasksHeading}>Your Tasks</h3>
        {(cj.tasks || []).map((task) => {
          const key = `${currentScenario.scenario_id}_${task.task_id}`;
          const wordCount = (answers[key] || "").split(/\s+/).filter(Boolean).length;
          const hasAnswer = (answers[key] || "").trim().length > 0;
          return (
            <div key={task.task_id} style={{ ...S.taskCard, borderLeft: hasAnswer ? "4px solid #059669" : "4px solid #e2e8f0" }}>
              <div style={S.taskHeader}>
                <div>
                  <span style={S.taskNum}>Task {task.task_id}</span>
                  <h4 style={S.taskTitle}>{task.title}</h4>
                </div>
                <span style={S.marksBadge}>{task.marks} marks</span>
              </div>
              <p style={S.taskDesc}>{task.description}</p>
              <textarea
                style={S.answerArea}
                rows={6}
                placeholder="Type your answer here... Be detailed and reference relevant concepts."
                value={answers[key] || ""}
                onChange={(e) => handleAnswerChange(currentScenario.scenario_id, task.task_id, e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
              />
              <div style={S.wordRow}>
                <span style={S.wordCount}>{wordCount} words</span>
                {hasAnswer && <span style={S.savedText}>✓ Saved</span>}
              </div>
            </div>
          );
        })}

        {/* Submit */}
        <div style={S.submitRow}>
          <button style={S.submitBtn} onClick={() => handleSubmit(false)} disabled={submitting}>
            {submitting ? "Submitting..." : "📤 Submit Test"}
          </button>
          <span style={S.submitHint}>{answeredCount}/{totalTasks} tasks answered</span>
        </div>
      </div>
    </div>
  );
}

const S = {
  shell: { minHeight: "100vh", background: "#f1f5f9" },
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh" },
  spinner: { width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" },

  timerBar: { height: 4, background: "#e2e8f0", position: "sticky", top: 0, zIndex: 50 },
  timerFill: { height: "100%", transition: "width 1s linear, background .3s" },
  topNav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 4, zIndex: 49 },
  topLeft: {},
  topTitle: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 },
  topMeta: { fontSize: 12, color: "#94a3b8" },
  timerBox: { display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, border: "1.5px solid" },
  timerText: { fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" },

  mainArea: { maxWidth: 860, margin: "0 auto", padding: "28px 24px 64px" },
  tabRow: { display: "flex", gap: 8, marginBottom: 20 },
  tab: { padding: "8px 20px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13, color: "#64748b" },
  tabActive: { padding: "8px 20px", background: "#6366f1", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13, color: "#fff" },

  contextCard: { background: "#fff", borderRadius: 16, padding: "28px 32px", marginBottom: 24, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.03)" },
  contextHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  contextLabel: { fontSize: 13, fontWeight: 700, color: "#6366f1" },
  domainBadge: { background: "#ede9fe", color: "#6d28d9", padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 },
  contextText: { fontSize: 14, color: "#334155", lineHeight: 1.8, margin: "0 0 10px" },
  scaleText: { fontSize: 12, color: "#94a3b8" },
  problemBox: { marginTop: 16, padding: "18px 22px", background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a" },
  problemLabel: { fontSize: 13, fontWeight: 700, color: "#b45309", margin: "0 0 6px" },
  problemText: { fontSize: 14, color: "#78350f", lineHeight: 1.7, margin: 0 },

  tasksHeading: { fontSize: 16, fontWeight: 700, color: "#334155", margin: "0 0 14px" },
  taskCard: { background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.03)", transition: "border-color .2s" },
  taskHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  taskNum: { fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: .5 },
  taskTitle: { fontSize: 16, fontWeight: 600, color: "#0f172a", margin: "4px 0 0" },
  marksBadge: { background: "#dbeafe", color: "#1d4ed8", padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, flexShrink: 0 },
  taskDesc: { fontSize: 14, color: "#475569", lineHeight: 1.7, margin: "0 0 14px" },
  answerArea: { width: "100%", padding: "14px 16px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", background: "#f8fafc", color: "#1e293b", boxSizing: "border-box", transition: "border-color .2s, box-shadow .2s" },
  wordRow: { display: "flex", justifyContent: "space-between", marginTop: 6 },
  wordCount: { fontSize: 12, color: "#94a3b8" },
  savedText: { fontSize: 12, color: "#059669", fontWeight: 500 },

  submitRow: { textAlign: "center", paddingTop: 16 },
  submitBtn: { padding: "14px 40px", background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer", boxShadow: "0 4px 18px rgba(5,150,105,.25)" },
  submitHint: { display: "block", fontSize: 12, color: "#94a3b8", marginTop: 8 },
};
