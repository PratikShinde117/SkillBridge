import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";

export default function CreateScenarioAssignment() {
  const navigate = useNavigate();
  const location = useLocation();
  const scenarioIds = location.state?.scenario_ids || [];
  const defaultSubject = location.state?.subject || "";
  const assignmentDraft = location.state?.assignmentDraft || null;

  const [scenarioDetails, setScenarioDetails] = useState([]);
  const [form, setForm] = useState({
    subject: assignmentDraft?.subject || defaultSubject,
    department: assignmentDraft?.department || "",
    division: assignmentDraft?.division || "",
    batch: assignmentDraft?.batch || "all batches",
    year: assignmentDraft?.year ?? "",
    duration_minutes: assignmentDraft?.duration_minutes || 45,
    deadline: assignmentDraft?.deadline || "",
    difficulty_level: assignmentDraft?.difficulty_level || "medium",
  });
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load scenario details
  useEffect(() => {
    if (scenarioIds.length > 0) {
      Promise.all(scenarioIds.map(id => api.get(`/api/scenarios/detail/${id}`).then(r => r.data.scenario).catch(() => null)))
        .then(results => setScenarioDetails(results.filter(Boolean)));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["year", "duration_minutes"].includes(name)) {
      setForm({ ...form, [name]: Number(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleCreate = async () => {
    if (!form.department || !form.division || !form.year || !form.deadline) {
      showToast("Fill department, division, year, and deadline", "error"); return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/scenarios/create-assignment", { ...form, scenario_ids: scenarioIds });
      setCreated(res.data.assignment);
      showToast("Assignment created as draft!", "success");
    } catch { showToast("Failed to create assignment", "error"); }
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!created) return;
    setPublishing(true);
    try {
      await api.post("/api/scenarios/publish-assignment", { assignment_id: created.assignment_id });
      showToast("Published successfully!", "success");
      setTimeout(() => navigate("/faculty/view-assignments"), 1500);
    } catch (err) { showToast(err.response?.data?.error || "Publish failed", "error"); }
    setPublishing(false);
  };

  const parseSj = (sc) => {
    const sj = typeof sc.scenario_json === "string" ? JSON.parse(sc.scenario_json) : sc.scenario_json;
    return sj;
  };

  return (
    <div style={S.shell}>
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "#fef2f2" : toast.type === "success" ? "#f0fdf4" : "#eff6ff", color: toast.type === "error" ? "#dc2626" : toast.type === "success" ? "#16a34a" : "#2563eb", borderColor: toast.type === "error" ? "#fecaca" : toast.type === "success" ? "#bbf7d0" : "#bfdbfe" }}>
          {toast.msg}
        </div>
      )}
      <div style={S.container}>
        <button style={S.back} onClick={() => navigate("/faculty/scenarios")}>← Back to Library</button>

        <h1 style={S.pageTitle}>📦 Create Scenario Assignment</h1>
        <p style={S.pageSub}>{scenarioIds.length} scenario{scenarioIds.length !== 1 ? "s" : ""} selected — configure assignment details below</p>

        {/* Selected Scenarios Summary */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>Selected Scenarios</h3>
          <div style={S.scenarioList}>
            {scenarioDetails.length > 0 ? scenarioDetails.map(sc => {
              const sj = parseSj(sc);
              return (
                <div key={sc.scenario_id} style={S.scItem}>
                  <div style={S.scTop}>
                    <strong style={S.scTitle}>{sc.title}</strong>
                    <span style={S.scBadge}>{sj.tasks?.length || 0} tasks · {(sj.tasks || []).reduce((a, t) => a + (t.marks || 5), 0)} marks</span>
                  </div>
                  <p style={S.scDomain}>{sj.context?.domain} · Year {sc.year_level}</p>
                </div>
              );
            }) : scenarioIds.map(id => (
              <span key={id} style={S.idChip}>Scenario #{id}</span>
            ))}
          </div>
        </div>

        {/* Assignment Config */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>Assignment Configuration</h3>
          <p style={S.helperText}>
            Faculty must choose the exact department, division, and year before publishing this scenario assignment.
          </p>
          <div style={S.formGrid}>
            <div style={S.field}>
              <label style={S.label}>Subject</label>
              <input style={S.input} name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Department *</label>
              <input style={S.input} name="department" value={form.department} onChange={handleChange} placeholder="e.g. Computer Engineering" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Division *</label>
              <input style={S.input} name="division" value={form.division} onChange={handleChange} placeholder="e.g. A" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Year *</label>
              <select style={S.input} name="year" value={form.year} onChange={handleChange}>
                <option value="" disabled>Select year</option>
                <option value={1}>1st Year</option><option value={2}>2nd Year</option><option value={3}>3rd Year</option><option value={4}>4th Year</option>
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Batch</label>
              <select style={S.input} name="batch" value={form.batch} onChange={handleChange}>
                <option value="all batches">All Batches</option><option value="A">Batch A</option><option value="B">Batch B</option>
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Difficulty</label>
              <select style={S.input} name="difficulty_level" value={form.difficulty_level} onChange={handleChange}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Duration (minutes)</label>
              <input style={S.input} type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Deadline</label>
              <input style={S.input} type="date" name="deadline" value={form.deadline} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={S.actionArea}>
          {!created ? (
            <button style={S.createBtn} onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "📝 Create Draft Assignment"}
            </button>
          ) : (
            <>
              <div style={S.successBox}>
                <div style={S.successIcon}>✅</div>
                <div>
                  <strong style={S.successTitle}>Assignment Created</strong>
                  <p style={S.successMeta}>ID: {created.assignment_id} · Status: {created.status}</p>
                </div>
              </div>
              <div style={S.pubRow}>
                <button style={S.publishBtn} onClick={handlePublish} disabled={publishing}>
                  {publishing ? "Publishing..." : "🚀 Publish to Students"}
                </button>
                <button style={S.laterBtn} onClick={() => navigate("/faculty/view-assignments")}>
                  Save as Draft & Exit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  shell: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" },
  container: { maxWidth: 880, margin: "0 auto", padding: "32px 24px" },
  back: { background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, display: "block" },
  pageTitle: { fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" },
  pageSub: { fontSize: 13, color: "#64748b", margin: "0 0 28px" },
  card: { background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 20, border: "1.5px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.03)" },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" },
  helperText: { margin: "0 0 16px", color: "#64748b", fontSize: 13, lineHeight: 1.6 },
  scenarioList: { display: "flex", flexDirection: "column", gap: 10 },
  scItem: { background: "#fafbfe", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px" },
  scTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  scTitle: { fontSize: 14, color: "#0f172a" },
  scBadge: { fontSize: 11, fontWeight: 600, color: "#6366f1", background: "#ede9fe", padding: "3px 10px", borderRadius: 6 },
  scDomain: { fontSize: 12, color: "#64748b", margin: 0 },
  idChip: { background: "#ede9fe", color: "#6d28d9", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "inline-block" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .5 },
  input: { padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, background: "#f8fafc", color: "#1e293b", outline: "none" },
  actionArea: { marginTop: 4 },
  createBtn: { padding: "14px 32px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,.3)" },
  successBox: { display: "flex", alignItems: "center", gap: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "18px 22px", marginBottom: 16 },
  successIcon: { fontSize: 32 },
  successTitle: { fontSize: 15, color: "#166534", display: "block" },
  successMeta: { fontSize: 12, color: "#4ade80", margin: "2px 0 0" },
  pubRow: { display: "flex", gap: 12 },
  publishBtn: { padding: "14px 28px", background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(5,150,105,.3)" },
  laterBtn: { padding: "14px 24px", background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 11, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  toast: { position: "fixed", top: 20, right: 20, padding: "12px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, border: "1.5px solid", boxShadow: "0 4px 16px rgba(0,0,0,.08)" },
};
