import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";

export default function ScenarioModify() {
  const navigate = useNavigate();
  const location = useLocation();
  const scenarioId = location.state?.scenario_id;

  const [original, setOriginal] = useState(null);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState("update"); // update | new
  const [editMode, setEditMode] = useState(true);
  const [toast, setToast] = useState(null);

  // AI modification
  const [modInstructions, setModInstructions] = useState("");
  const [modifying, setModifying] = useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!scenarioId) { navigate("/faculty/scenarios"); return; }
    api.get(`/api/scenarios/detail/${scenarioId}`)
      .then(res => {
        const sc = res.data.scenario;
        const sj = typeof sc.scenario_json === "string" ? JSON.parse(sc.scenario_json) : sc.scenario_json;
        const concepts = typeof sc.concepts === "string" ? JSON.parse(sc.concepts) : sc.concepts || [];
        const data = {
          title: sc.title,
          subject: sc.subject,
          year_level: sc.year_level,
          difficulty_level: sc.difficulty_level,
          concepts,
          scenario_json: sj,
        };
        setOriginal({ ...data });
        setEditData({ ...data });
        setLoading(false);
      })
      .catch(() => { showToast("Failed to load", "error"); setLoading(false); });
  }, [scenarioId]);

  const handleFieldChange = (field, value) => setEditData(prev => ({ ...prev, [field]: value }));

  const handleContextChange = (key, value) => {
    setEditData(prev => ({
      ...prev,
      scenario_json: { ...prev.scenario_json, context: { ...prev.scenario_json.context, [key]: value } },
    }));
  };

  const handleTaskChange = (idx, key, value) => {
    setEditData(prev => {
      const tasks = [...prev.scenario_json.tasks];
      tasks[idx] = { ...tasks[idx], [key]: value };
      return { ...prev, scenario_json: { ...prev.scenario_json, tasks } };
    });
  };

  const handleConceptsChange = (idx, value) => {
    const arr = value.split(",").map(s => s.trim()).filter(Boolean);
    handleTaskChange(idx, "expected_concepts", arr);
  };

  const recalcConcepts = () => {
    const all = [];
    (editData.scenario_json.tasks || []).forEach(t => (t.expected_concepts || []).forEach(c => { if (!all.includes(c)) all.push(c); }));
    setEditData(prev => ({ ...prev, concepts: all }));
  };

  // AI Modify
  const handleAIModify = async () => {
    if (!modInstructions.trim()) { showToast("Enter instructions", "error"); return; }
    setModifying(true);
    try {
      const res = await api.post("/api/scenarios/modify", {
        scenario_json: editData.scenario_json,
        instructions: modInstructions,
      });
      setEditData(prev => ({ ...prev, scenario_json: res.data.modified_scenario }));
      const all = [];
      (res.data.modified_scenario.tasks || []).forEach(t => (t.expected_concepts || []).forEach(c => { if (!all.includes(c)) all.push(c); }));
      setEditData(prev => ({ ...prev, concepts: all }));
      setModInstructions("");
      showToast("AI modification applied!", "success");
    } catch { showToast("AI modification failed", "error"); }
    setModifying(false);
  };

  // Reset
  const handleReset = () => {
    if (!original) return;
    setEditData({ ...original, scenario_json: JSON.parse(JSON.stringify(original.scenario_json)) });
    showToast("Reset to original", "info");
  };

  // Save
  const handleSave = async () => {
    recalcConcepts();
    setSaving(true);
    try {
      if (saveMode === "update") {
        await api.put(`/api/scenarios/${scenarioId}`, editData);
        showToast("Scenario updated!", "success");
      } else {
        await api.post("/api/scenarios/save", { ...editData, title: editData.title + " (Copy)" });
        showToast("Saved as new scenario!", "success");
      }
      setTimeout(() => navigate("/faculty/scenarios"), 1200);
    } catch { showToast("Save failed", "error"); }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={S.shell}>
        <div style={S.loadCenter}>
          <div style={S.bigSpinner} />
          <p style={{ color: "#94a3b8", marginTop: 16 }}>Loading scenario...</p>
        </div>
      </div>
    );
  }

  if (!editData) return null;
  const sj = editData.scenario_json;

  return (
    <div style={S.shell}>
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "#fef2f2" : toast.type === "success" ? "#f0fdf4" : "#eff6ff", color: toast.type === "error" ? "#dc2626" : toast.type === "success" ? "#16a34a" : "#2563eb", borderColor: toast.type === "error" ? "#fecaca" : toast.type === "success" ? "#bbf7d0" : "#bfdbfe" }}>
          {toast.msg}
        </div>
      )}

      <div style={S.container}>
        <button style={S.back} onClick={() => navigate("/faculty/scenarios")}>← Back to Library</button>

        {/* Page Header */}
        <div style={S.pageHeader}>
          <div>
            <h1 style={S.pageTitle}>Edit Scenario</h1>
            <p style={S.pageSub}>Modify manually or use AI — then save or save as copy</p>
          </div>
          <div style={S.headerActions}>
            <button style={editMode ? S.editBtnActive : S.editBtn} onClick={() => setEditMode(!editMode)}>
              {editMode ? "📖 Preview" : "✏️ Edit"}
            </button>
            <button style={S.resetBtn} onClick={handleReset}>↩ Reset</button>
          </div>
        </div>

        {/* Meta + Content */}
        <div style={S.card}>
          <div style={S.formGrid}>
            <div style={{ ...S.field, gridColumn: "1 / -1" }}>
              <label style={S.label}>Title</label>
              {editMode ? <input style={S.input} value={editData.title} onChange={e => handleFieldChange("title", e.target.value)} /> : <h3 style={{ margin: 0, color: "#0f172a" }}>{editData.title}</h3>}
            </div>
            <div style={S.field}>
              <label style={S.label}>Subject</label>
              {editMode ? <input style={S.input} value={editData.subject} onChange={e => handleFieldChange("subject", e.target.value)} /> : <span style={S.metaBadge}>{editData.subject}</span>}
            </div>
            <div style={S.field}>
              <label style={S.label}>Year</label>
              {editMode ? (
                <select style={S.input} value={editData.year_level} onChange={e => handleFieldChange("year_level", Number(e.target.value))}>
                  <option value={1}>1st</option><option value={2}>2nd</option><option value={3}>3rd</option><option value={4}>4th</option>
                </select>
              ) : <span style={S.yearBadge}>Year {editData.year_level}</span>}
            </div>
            <div style={S.field}>
              <label style={S.label}>Difficulty</label>
              {editMode ? (
                <select style={S.input} value={editData.difficulty_level} onChange={e => handleFieldChange("difficulty_level", e.target.value)}>
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              ) : <span style={S.diffBadge}>{editData.difficulty_level}</span>}
            </div>
          </div>
        </div>

        {/* Context */}
        <div style={S.card}>
          <h3 style={S.sectionLabel}>🏢 Context</h3>
          {editMode ? (
            <div style={S.editFields}>
              <div style={S.field}><label style={S.labelSm}>Domain</label><input style={S.input} value={sj.context?.domain || ""} onChange={e => handleContextChange("domain", e.target.value)} /></div>
              <div style={S.field}><label style={S.labelSm}>Description</label><textarea style={{ ...S.input, minHeight: 80 }} value={sj.context?.description || ""} onChange={e => handleContextChange("description", e.target.value)} /></div>
              <div style={S.field}><label style={S.labelSm}>Scale</label><input style={S.input} value={sj.context?.scale || ""} onChange={e => handleContextChange("scale", e.target.value)} /></div>
            </div>
          ) : (
            <div>
              <p style={S.readText}><strong>{sj.context?.domain}</strong> — {sj.context?.description}</p>
              {sj.context?.scale && <p style={S.scaleNote}>📏 {sj.context.scale}</p>}
            </div>
          )}
        </div>

        {/* Problem */}
        <div style={S.card}>
          <h3 style={S.sectionLabel}>🎯 Problem Statement</h3>
          {editMode ? (
            <textarea style={{ ...S.input, minHeight: 70 }} value={sj.problem_statement || ""} onChange={e => setEditData(prev => ({ ...prev, scenario_json: { ...prev.scenario_json, problem_statement: e.target.value } }))} />
          ) : (
            <p style={S.readText}>{sj.problem_statement}</p>
          )}
        </div>

        {/* Tasks */}
        <div style={S.card}>
          <h3 style={S.sectionLabel}>📋 Tasks</h3>
          {(sj.tasks || []).map((task, idx) => (
            <div key={task.task_id || idx} style={S.taskCard}>
              <div style={S.taskHeader}>
                <span style={S.taskId}>Task {task.task_id || idx + 1}</span>
                <span style={S.taskMarks}>{task.marks || 5} marks</span>
              </div>
              {editMode ? (
                <div style={S.editFields}>
                  <div style={S.field}><label style={S.labelSm}>Title</label><input style={S.input} value={task.title || ""} onChange={e => handleTaskChange(idx, "title", e.target.value)} /></div>
                  <div style={S.field}><label style={S.labelSm}>Description</label><textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={task.description || ""} onChange={e => handleTaskChange(idx, "description", e.target.value)} /></div>
                  <div style={S.field}><label style={S.labelSm}>Expected Concepts <span style={S.hint}>(comma separated)</span></label><input style={S.input} value={(task.expected_concepts || []).join(", ")} onChange={e => handleConceptsChange(idx, e.target.value)} /></div>
                </div>
              ) : (
                <>
                  <strong style={S.taskName}>{task.title}</strong>
                  <p style={S.taskDesc}>{task.description}</p>
                  <div style={S.chipRow}>
                    {(task.expected_concepts || []).map((c, i) => <span key={i} style={S.chip}>{c}</span>)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* AI Modification */}
        <div style={{ ...S.card, borderColor: "#fde68a" }}>
          <h3 style={S.cardTitle}>🤖 Modify with AI</h3>
          <p style={S.helperText}>Describe changes — AI will restructure the entire scenario accordingly.</p>
          <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} placeholder="e.g. Change context to banking industry, add a security-related task, make it harder..." value={modInstructions} onChange={e => setModInstructions(e.target.value)} />
          <button style={S.modifyBtn} onClick={handleAIModify} disabled={modifying}>
            {modifying ? <><span style={S.spinner} /> Modifying...</> : "✨ Apply AI Changes"}
          </button>
        </div>

        {/* Save Bar */}
        <div style={S.saveBar}>
          <div style={S.saveOptions}>
            <label style={S.radioLabel}>
              <input type="radio" name="saveMode" checked={saveMode === "update"} onChange={() => setSaveMode("update")} />
              <span>Update original</span>
            </label>
            <label style={S.radioLabel}>
              <input type="radio" name="saveMode" checked={saveMode === "new"} onChange={() => setSaveMode("new")} />
              <span>Save as new copy</span>
            </label>
          </div>
          <div style={S.saveActions}>
            <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : saveMode === "update" ? "💾 Update Scenario" : "📋 Save as New"}
            </button>
            <button style={S.cancelBtn} onClick={() => navigate("/faculty/scenarios")}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== STYLES ===== */
const S = {
  shell: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" },
  container: { maxWidth: 880, margin: "0 auto", padding: "32px 24px" },
  back: { background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, display: "block" },
  loadCenter: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" },
  bigSpinner: { width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" },

  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" },
  pageSub: { fontSize: 13, color: "#64748b", margin: 0 },
  headerActions: { display: "flex", gap: 8 },
  editBtn: { padding: "8px 18px", background: "#f1f5f9", color: "#475569", border: "1.5px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 12 },
  editBtnActive: { padding: "8px 18px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 12 },
  resetBtn: { padding: "8px 16px", background: "#fef3c7", color: "#b45309", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 12 },

  card: { background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 16, border: "1.5px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.03)" },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 14px" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  editFields: { display: "flex", flexDirection: "column", gap: 12 },
  label: { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .5 },
  labelSm: { fontSize: 11, fontWeight: 600, color: "#64748b" },
  hint: { fontWeight: 400, color: "#94a3b8", fontSize: 10, textTransform: "none" },
  input: { padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, background: "#f8fafc", color: "#1e293b", outline: "none", fontFamily: "inherit", boxSizing: "border-box", width: "100%" },

  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#6366f1", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: .8 },
  readText: { fontSize: 13, color: "#334155", lineHeight: 1.7, margin: 0 },
  scaleNote: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  metaBadge: { background: "#ede9fe", color: "#6d28d9", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block" },
  yearBadge: { background: "#dbeafe", color: "#1d4ed8", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block" },
  diffBadge: { background: "#fef3c7", color: "#b45309", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block", textTransform: "capitalize" },

  taskCard: { background: "#fafbfe", border: "1px solid #e2e8f0", borderRadius: 11, padding: "16px 20px", marginBottom: 10 },
  taskHeader: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  taskId: { fontSize: 10, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" },
  taskMarks: { fontSize: 11, color: "#64748b", fontWeight: 600 },
  taskName: { fontSize: 14, color: "#1e293b", display: "block", marginBottom: 4, fontWeight: 600 },
  taskDesc: { fontSize: 12, color: "#475569", lineHeight: 1.6, margin: "0 0 8px" },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 5 },
  chip: { background: "#f0fdf4", color: "#166534", padding: "3px 9px", borderRadius: 5, fontSize: 11, fontWeight: 500, border: "1px solid #bbf7d0" },

  helperText: { fontSize: 12, color: "#94a3b8", margin: "0 0 12px" },
  modifyBtn: { marginTop: 12, padding: "10px 24px", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 10px rgba(245,158,11,.3)", display: "flex", alignItems: "center", gap: 8 },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2.5px solid rgba(255,255,255,.3)", borderTop: "2.5px solid #fff", borderRadius: "50%", animation: "spin .6s linear infinite" },

  saveBar: { marginTop: 8, padding: "20px 24px", background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  saveOptions: { display: "flex", gap: 20 },
  radioLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#334155", cursor: "pointer" },
  saveActions: { display: "flex", gap: 10 },
  saveBtn: { padding: "12px 28px", background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(5,150,105,.3)" },
  cancelBtn: { padding: "12px 20px", background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 11, fontWeight: 600, fontSize: 14, cursor: "pointer" },

  toast: { position: "fixed", top: 20, right: 20, padding: "12px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, border: "1.5px solid", boxShadow: "0 4px 16px rgba(0,0,0,.08)" },
};
