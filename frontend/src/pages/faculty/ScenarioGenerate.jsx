import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ScenarioGenerate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    subject: "",
    year_level: "3",
    difficulty_level: "medium",
    topic: "",
    additional_instructions: "",
    department: "",
    division: "",
    assignment_year: "3",
    batch: "all batches",
    duration_minutes: "45",
    deadline: "",
  });

  const [generated, setGenerated] = useState(null);
  const [editData, setEditData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [saveAction, setSaveAction] = useState("library");

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = async () => {
    if (!form.subject.trim()) { showToast("Subject is required", "error"); return; }
    setGenerating(true);
    setGenerated(null);
    setEditData(null);
    setEditMode(false);
    try {
      const res = await api.post("/api/scenarios/generate", form);
      const g = res.data.generated;
      setGenerated(g);
      setEditData({
        title: g.title,
        subject: g.subject,
        year_level: Number(g.year_level),
        difficulty_level: g.difficulty_level,
        concepts: g.concepts || [],
        scenario_json: g.scenario_json,
      });
      showToast("Scenario generated! Review and edit below.", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Generation failed. Try again.", "error");
    }
    setGenerating(false);
  };

  const handleFieldChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleContextChange = (key, value) => {
    setEditData(prev => ({
      ...prev,
      scenario_json: {
        ...prev.scenario_json,
        context: { ...prev.scenario_json.context, [key]: value },
      },
    }));
  };

  const handleTaskChange = (taskIdx, key, value) => {
    setEditData(prev => {
      const tasks = [...prev.scenario_json.tasks];
      tasks[taskIdx] = { ...tasks[taskIdx], [key]: value };
      return { ...prev, scenario_json: { ...prev.scenario_json, tasks } };
    });
  };

  const handleConceptsChange = (taskIdx, value) => {
    const arr = value.split(",").map(s => s.trim()).filter(Boolean);
    handleTaskChange(taskIdx, "expected_concepts", arr);
  };

  // Modify via Gemini
  const [modInstructions, setModInstructions] = useState("");
  const [modifying, setModifying] = useState(false);

  const handleAIModify = async () => {
    if (!modInstructions.trim()) { showToast("Enter modification instructions", "error"); return; }
    setModifying(true);
    try {
      const res = await api.post("/api/scenarios/modify", {
        scenario_json: editData.scenario_json,
        instructions: modInstructions,
      });
      setEditData(prev => ({
        ...prev,
        scenario_json: res.data.modified_scenario,
      }));
      // Recalculate concepts
      const allConcepts = [];
      (res.data.modified_scenario.tasks || []).forEach(t => (t.expected_concepts || []).forEach(c => { if (!allConcepts.includes(c)) allConcepts.push(c); }));
      setEditData(prev => ({ ...prev, concepts: allConcepts }));
      setModInstructions("");
      showToast("Scenario modified by AI!", "success");
    } catch { showToast("AI modification failed", "error"); }
    setModifying(false);
  };

  // Save to database
  const handleSave = async () => {
    if (!editData.title || !editData.subject) { showToast("Title and subject are required", "error"); return; }
    if (saveAction === "assignment" && (!form.department || !form.division || !form.assignment_year || !form.deadline)) {
      showToast("Department, division, year, and deadline are required to create an assignment", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/api/scenarios/save", editData);
      const savedScenario = res.data.scenario;

      if (saveAction === "assignment") {
        showToast("Scenario saved. Continue to create and publish the assignment.", "success");
        setTimeout(() => navigate("/faculty/scenarios/create-assignment", {
          state: {
            scenario_ids: [savedScenario.scenario_id],
            subject: editData.subject,
            assignmentDraft: {
              subject: editData.subject,
              department: form.department,
              division: form.division,
              batch: form.batch,
              year: Number(form.assignment_year),
              duration_minutes: Number(form.duration_minutes || 45),
              deadline: form.deadline,
              difficulty_level: editData.difficulty_level,
            }
          }
        }), 900);
      } else {
        showToast("Scenario saved to library!", "success");
        setTimeout(() => navigate("/faculty/scenarios"), 1500);
      }
    } catch { showToast("Save failed", "error"); }
    setSaving(false);
  };

  const sj = editData?.scenario_json;

  return (
    <div style={S.shell}>
      {/* Toast */}
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "#fef2f2" : toast.type === "success" ? "#f0fdf4" : "#eff6ff", color: toast.type === "error" ? "#dc2626" : toast.type === "success" ? "#16a34a" : "#2563eb", borderColor: toast.type === "error" ? "#fecaca" : toast.type === "success" ? "#bbf7d0" : "#bfdbfe" }}>
          {toast.msg}
        </div>
      )}

      <div style={S.container}>
        {/* Breadcrumb */}
        <button style={S.back} onClick={() => navigate("/faculty/scenarios")}>← Back to Library</button>

        <h1 style={S.pageTitle}>✨ Generate New Scenario</h1>
        <p style={S.pageSub}>Provide details and AI will create a complete scenario. You can then review, edit manually or with AI, and save.</p>

        {/* ============ STEP 1: Generation Form ============ */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>1. Scenario Parameters</h2>
          <div style={S.formGrid}>
            <div style={S.field}>
              <label style={S.label}>Subject *</label>
              <input style={S.input} placeholder="e.g. Operating Systems" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Year Level</label>
              <select style={S.input} value={form.year_level} onChange={e => setForm({ ...form, year_level: e.target.value })}>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Difficulty</label>
              <select style={S.input} value={form.difficulty_level} onChange={e => setForm({ ...form, difficulty_level: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Focus Topic</label>
              <input style={S.input} placeholder="e.g. Memory Management, TCP/IP" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
            </div>
          </div>
          <div style={{ ...S.field, marginTop: 14 }}>
            <label style={S.label}>Additional Instructions <span style={S.hint}>(optional)</span></label>
            <textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }} placeholder="e.g. Focus on real-time systems, include a task about fault tolerance, make it suitable for FinTech industry..." value={form.additional_instructions} onChange={e => setForm({ ...form, additional_instructions: e.target.value })} />
          </div>
          <div style={{ ...S.field, marginTop: 18 }}>
            <label style={S.label}>Assignment Access Targeting <span style={S.hint}>(capture audience now, use it when creating and publishing the scenario assignment)</span></label>
            <div style={S.formGrid}>
              <div style={S.field}>
                <label style={S.labelSmall}>Department</label>
                <input style={S.input} placeholder="e.g. Computer Engineering" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
              <div style={S.field}>
                <label style={S.labelSmall}>Division</label>
                <input style={S.input} placeholder="e.g. A" value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} />
              </div>
              <div style={S.field}>
                <label style={S.labelSmall}>Assignment Year</label>
                <select style={S.input} value={form.assignment_year} onChange={e => setForm({ ...form, assignment_year: e.target.value })}>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.labelSmall}>Batch</label>
                <select style={S.input} value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })}>
                  <option value="all batches">All Batches</option>
                  <option value="A">Batch A</option>
                  <option value="B">Batch B</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.labelSmall}>Duration (minutes)</label>
                <input style={S.input} type="number" min="1" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
              </div>
              <div style={S.field}>
                <label style={S.labelSmall}>Deadline</label>
                <input style={S.input} type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
          </div>
          <button style={S.genBtn} onClick={handleGenerate} disabled={generating}>
            {generating ? <><span style={S.spinner} /> Generating with AI...</> : "🤖 Generate Scenario"}
          </button>
        </div>

        {/* ============ STEP 2: Review & Edit ============ */}
        {editData && sj && (
          <>
            <div style={{ ...S.card, borderColor: "#c4b5fd" }}>
              <div style={S.reviewHeader}>
                <h2 style={S.cardTitle}>2. Review & Edit</h2>
                <div style={S.reviewActions}>
                  <button style={editMode ? S.editBtnActive : S.editBtn} onClick={() => setEditMode(!editMode)}>
                    {editMode ? "📖 Read Only" : "✏️ Edit Mode"}
                  </button>
                  <span style={S.aiBadge}>AI Generated</span>
                </div>
              </div>

              {/* Title & Meta */}
              <div style={S.section}>
                <div style={S.formGrid}>
                  <div style={{ ...S.field, gridColumn: "1 / -1" }}>
                    <label style={S.label}>Scenario Title</label>
                    {editMode ? <input style={S.input} value={editData.title} onChange={e => handleFieldChange("title", e.target.value)} /> : <p style={S.readText}>{editData.title}</p>}
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Subject</label>
                    {editMode ? <input style={S.input} value={editData.subject} onChange={e => handleFieldChange("subject", e.target.value)} /> : <span style={S.metaBadge}>{editData.subject}</span>}
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Year</label>
                    {editMode ? (
                      <select style={S.input} value={editData.year_level} onChange={e => handleFieldChange("year_level", Number(e.target.value))}>
                        <option value={1}>1st Year</option><option value={2}>2nd Year</option><option value={3}>3rd Year</option><option value={4}>4th Year</option>
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
              <div style={S.section}>
                <h3 style={S.sectionLabel}>🏢 Context</h3>
                {editMode ? (
                  <>
                    <div style={{ ...S.field, marginBottom: 10 }}>
                      <label style={S.labelSmall}>Domain</label>
                      <input style={S.input} value={sj.context?.domain || ""} onChange={e => handleContextChange("domain", e.target.value)} />
                    </div>
                    <div style={{ ...S.field, marginBottom: 10 }}>
                      <label style={S.labelSmall}>Description</label>
                      <textarea style={{ ...S.input, minHeight: 80 }} value={sj.context?.description || ""} onChange={e => handleContextChange("description", e.target.value)} />
                    </div>
                    <div style={S.field}>
                      <label style={S.labelSmall}>Scale</label>
                      <input style={S.input} value={sj.context?.scale || ""} onChange={e => handleContextChange("scale", e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <p style={S.readText}><strong>{sj.context?.domain}</strong> — {sj.context?.description}</p>
                    {sj.context?.scale && <p style={S.scaleNote}>📏 {sj.context.scale}</p>}
                  </>
                )}
              </div>

              {/* Problem */}
              <div style={S.section}>
                <h3 style={S.sectionLabel}>🎯 Problem Statement</h3>
                {editMode ? (
                  <textarea style={{ ...S.input, minHeight: 70 }} value={sj.problem_statement || ""} onChange={e => setEditData(prev => ({ ...prev, scenario_json: { ...prev.scenario_json, problem_statement: e.target.value } }))} />
                ) : (
                  <p style={S.readText}>{sj.problem_statement}</p>
                )}
              </div>

              {/* Tasks */}
              <div style={S.section}>
                <h3 style={S.sectionLabel}>📋 Tasks</h3>
                {(sj.tasks || []).map((task, idx) => (
                  <div key={task.task_id || idx} style={S.taskCard}>
                    <div style={S.taskHeader}>
                      <span style={S.taskId}>Task {task.task_id || idx + 1}</span>
                      <span style={S.taskMarks}>{task.marks || 5} marks</span>
                    </div>
                    {editMode ? (
                      <>
                        <div style={{ ...S.field, marginBottom: 8 }}>
                          <label style={S.labelSmall}>Title</label>
                          <input style={S.input} value={task.title || ""} onChange={e => handleTaskChange(idx, "title", e.target.value)} />
                        </div>
                        <div style={{ ...S.field, marginBottom: 8 }}>
                          <label style={S.labelSmall}>Description</label>
                          <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={task.description || ""} onChange={e => handleTaskChange(idx, "description", e.target.value)} />
                        </div>
                        <div style={S.field}>
                          <label style={S.labelSmall}>Expected Concepts <span style={S.hint}>(comma separated)</span></label>
                          <input style={S.input} value={(task.expected_concepts || []).join(", ")} onChange={e => handleConceptsChange(idx, e.target.value)} />
                        </div>
                      </>
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
            </div>

            {/* ============ STEP 2B: AI Modification ============ */}
            <div style={S.card}>
              <h2 style={S.cardTitle}>🤖 Modify with AI <span style={S.hint}>(optional)</span></h2>
              <p style={S.helperText}>Describe changes in natural language — AI will restructure the scenario.</p>
              <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} placeholder="e.g. Change domain to healthcare, add a task about HIPAA compliance, reduce difficulty..." value={modInstructions} onChange={e => setModInstructions(e.target.value)} />
              <button style={S.modifyBtn} onClick={handleAIModify} disabled={modifying}>
                {modifying ? <><span style={S.spinner} /> Modifying...</> : "✨ Apply AI Changes"}
              </button>
            </div>

            {/* ============ STEP 3: Save ============ */}
            <div style={S.saveBar}>
              <div style={S.saveModeWrap}>
                <label style={S.radioLabel}>
                  <input type="radio" name="saveAction" checked={saveAction === "library"} onChange={() => setSaveAction("library")} />
                  <span>Save only to library</span>
                </label>
                <label style={S.radioLabel}>
                  <input type="radio" name="saveAction" checked={saveAction === "assignment"} onChange={() => setSaveAction("assignment")} />
                  <span>Save and continue to create/publish assignment</span>
                </label>
              </div>
              <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : saveAction === "assignment" ? "🚀 Save and Continue" : "💾 Save to Scenario Library"}
              </button>
              <button style={S.discardBtn} onClick={() => { setGenerated(null); setEditData(null); }}>
                Discard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===== STYLES ===== */
const S = {
  shell: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" },
  container: { maxWidth: 880, margin: "0 auto", padding: "32px 24px" },
  back: { background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, display: "block" },
  pageTitle: { fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" },
  pageSub: { fontSize: 13, color: "#64748b", margin: "0 0 28px", lineHeight: 1.6 },

  card: { background: "#fff", borderRadius: 16, padding: "28px 32px", marginBottom: 20, border: "1.5px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.03)" },
  cardTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 18px" },

  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .5 },
  labelSmall: { fontSize: 11, fontWeight: 600, color: "#64748b" },
  hint: { fontWeight: 400, color: "#94a3b8", fontSize: 11, textTransform: "none" },
  input: { padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, background: "#f8fafc", color: "#1e293b", outline: "none", fontFamily: "inherit", boxSizing: "border-box", width: "100%" },

  genBtn: { marginTop: 20, padding: "13px 30px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,.3)", display: "flex", alignItems: "center", gap: 8 },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2.5px solid rgba(255,255,255,.3)", borderTop: "2.5px solid #fff", borderRadius: "50%", animation: "spin .6s linear infinite" },

  reviewHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  reviewActions: { display: "flex", gap: 10, alignItems: "center" },
  editBtn: { padding: "7px 16px", background: "#f1f5f9", color: "#475569", border: "1.5px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 12 },
  editBtnActive: { padding: "7px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 12 },
  aiBadge: { background: "#ede9fe", color: "#6d28d9", padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700 },

  section: { marginBottom: 20, padding: "18px 22px", background: "#fafbfe", borderRadius: 12, border: "1px solid #f1f5f9" },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#6366f1", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: .8 },

  readText: { fontSize: 13, color: "#334155", lineHeight: 1.7, margin: 0 },
  scaleNote: { fontSize: 11, color: "#94a3b8", marginTop: 4 },

  metaBadge: { background: "#ede9fe", color: "#6d28d9", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block" },
  yearBadge: { background: "#dbeafe", color: "#1d4ed8", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block" },
  diffBadge: { background: "#fef3c7", color: "#b45309", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block", textTransform: "capitalize" },

  taskCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 11, padding: "16px 20px", marginBottom: 10 },
  taskHeader: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  taskId: { fontSize: 10, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" },
  taskMarks: { fontSize: 11, color: "#64748b", fontWeight: 600 },
  taskName: { fontSize: 14, color: "#1e293b", display: "block", marginBottom: 4, fontWeight: 600 },
  taskDesc: { fontSize: 12, color: "#475569", lineHeight: 1.6, margin: "0 0 8px" },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 5 },
  chip: { background: "#f0fdf4", color: "#166534", padding: "3px 9px", borderRadius: 5, fontSize: 11, fontWeight: 500, border: "1px solid #bbf7d0" },

  helperText: { fontSize: 12, color: "#94a3b8", margin: "0 0 12px" },
  modifyBtn: { marginTop: 12, padding: "10px 24px", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 10px rgba(245,158,11,.3)", display: "flex", alignItems: "center", gap: 8 },

  saveBar: { display: "flex", gap: 12, marginTop: 8, alignItems: "center", justifyContent: "space-between" },
  saveModeWrap: { display: "flex", flexDirection: "column", gap: 8 },
  radioLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" },
  saveBtn: { padding: "14px 32px", background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 16px rgba(5,150,105,.3)" },
  discardBtn: { padding: "14px 24px", background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 11, fontWeight: 600, fontSize: 14, cursor: "pointer" },

  toast: { position: "fixed", top: 20, right: 20, padding: "12px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, border: "1.5px solid", boxShadow: "0 4px 16px rgba(0,0,0,.08)" },
};
