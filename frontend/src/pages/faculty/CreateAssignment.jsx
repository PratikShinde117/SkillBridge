




import { useState } from "react";
import api from "../../api/axios";
import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/faculty/dashboard" },
  { label: "Scenario Library", path: "/faculty/scenarios" },
  { label: "Generate Scenario", path: "/faculty/scenarios/generate" },
  { label: "Create Assignment", path: "/faculty/create-assignment" },
  { label: "View Assignments", path: "/faculty/view-assignments" },
  { label: "Analytics", path: "/faculty/analytics" },
  { label: "Profile", path: "/faculty/profile" },
];

export default function CreateAssignment() {
  const [form, setForm] = useState({
    subject: "",
    syllabus_description: "",
    difficulty_level: "medium",
    total_questions: 5,
    mcq_count: 2,
    descriptive_count: 3,
    duration_minutes: 20,
    deadline: "",
    department: "",
    division: "",
    batch: "all batches",
    year: 1,
    focus_topic: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   if(name === "total_questions"){
  //     setForm({...form, [name] : Number(mcq_count) + Number(descriptive_count)  });
  //   }
  //   if (["mcq_count", "descriptive_count", "duration_minutes", "year"].includes(name)) {
  //     setForm({ ...form, [name]: Number(value) });
  //   } else {
  //     setForm({ ...form, [name]: value });
  //   }
  // };

  const handleChange = (e) => {
  const { name, value } = e.target;

  let updatedValue =
    ["mcq_count", "descriptive_count", "duration_minutes", "year"].includes(name)
      ? Number(value)
      : value;

  const updatedForm = {
    ...form,
    [name]: updatedValue
  };

  // ✅ auto-calculate total_questions
  if (name === "mcq_count" || name === "descriptive_count") {
    updatedForm.total_questions =
      Number(updatedForm.mcq_count || 0) +
      Number(updatedForm.descriptive_count || 0);
  }

  setForm(updatedForm);
};
  const generateAssignment = async () => {
    try {
      setLoading(true);
      await api.post("/create-assignment", {
        ...form,
        generate_using_ai: true,
        mode: "generate",
      });
      setLoading(false);
      alert("Assignment generated successfully");
    } catch {
      setLoading(false);
      alert("Failed to generate assignment");
    }
  };

  const loadPrevious = async () => {
    try {
      setLoading(true);
      await api.post("/create-assignment", {
        ...form,
        generate_using_ai: false,
        mode: "cache",
      });
      setLoading(false);
      alert("Loaded cached assignment");
      navigate("/faculty/dashboard");
    } catch {
      setLoading(false);
      alert("Failed to load assignment");
    }
  };

  return (
    <div style={S.shell}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div>
          <div style={S.logoWrap}>
            <div style={S.logoBox}>SB</div>
            <div>
              <div style={S.logoTitle}>SkillBridge</div>
              <div style={S.logoSub}>Faculty Portal</div>
            </div>
          </div>

          <nav style={S.nav}>
            {NAV_ITEMS.map((item, i) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={i}
                  style={active ? S.navActive : S.navBtn}
                  onClick={() => navigate(item.path)}
                >
                  <span style={S.navIcon}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        <h1 style={S.title}>Create Assignment</h1>

        <div style={S.card}>
          <h2 style={S.cardTitle}>Course Information</h2>
          <div style={S.grid}>
            <input name="department" placeholder="Department" onChange={handleChange} style={S.input} />
            <input name="year" type="number" placeholder="Year" onChange={handleChange} style={S.input} />
            <input name="division" placeholder="Division" onChange={handleChange} style={S.input} />
            <input name="subject" placeholder="Subject" onChange={handleChange} style={S.input} />
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.cardTitle}>Syllabus</h2>
          <textarea
            name="syllabus_description"
            placeholder="Paste syllabus here..."
            onChange={handleChange}
            style={{ ...S.input, height: 120 }}
          />
        </div>

        <div style={S.card}>
          <h2 style={S.cardTitle}>Configuration</h2>
          <div style={S.grid}>
            <select name="difficulty_level" value={form.difficulty_level} onChange={handleChange} style={S.input}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <input name="total_questions" type="number" value={form.total_questions} placeholder="Total Questions" readOnly style={S.input} />
            <input name="mcq_count" type="number" placeholder="MCQ Count" onChange={handleChange} style={S.input} />
            <input name="descriptive_count" type="number" placeholder="Descriptive Count" onChange={handleChange} style={S.input} />
            <input name="duration_minutes" type="number" placeholder="Duration (minutes)" onChange={handleChange} style={S.input} />
            <input name="deadline" type="date" onChange={handleChange} style={S.input} />
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.cardTitle}>Industry Alignment</h2>
          <input name="focus_topic" placeholder="Focus Topic" onChange={handleChange} style={S.input} />
        </div>

        <div style={S.buttonRow}>
          <button style={S.primaryBtn} onClick={generateAssignment} disabled={loading}>
            {loading ? "Generating..." : "Generate Assignment"}
          </button>
          <button style={S.secondaryBtn} onClick={loadPrevious} disabled={loading}>
            {loading ? "Loading..." : "Load Previous"}
          </button>
        </div>
      </main>
    </div>
  );
}

const S = {
  shell: { display: "flex", background: "#f1f5f9", minHeight: "100vh", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
  shell: { display: "flex", background: "#f1f5f9", minHeight: "100vh" },
  sidebar: { width: 260, background: "#0f172a", color: "#fff", padding: 20, fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
  logoWrap: { display: "flex", gap: 10, marginBottom: 30 },
  logoBox: { width: 40, height: 40, background: "#6366f1", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  logoTitle: { fontWeight: "bold" },
  logoSub: { fontSize: 12, color: "#94a3b8" },
  nav: { display: "flex", flexDirection: "column", gap: 5 },
  navBtn: { background: "transparent", color: "#94a3b8", padding: 10, borderRadius: 8, textAlign: "left" },
  navActive: { background: "#1e293b", color: "#fff", padding: 10, borderRadius: 8, textAlign: "left" },
  navIcon: { marginRight: 8 },

  main: { flex: 1, padding: "30px", marginLeft: 80, fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },

  card: { background: "#fff", padding: 20, borderRadius: 12, marginBottom: 20, border: "1px solid #e2e8f0" },
  cardTitle: { marginBottom: 15 },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 15 },

  input: { padding: 10, borderRadius: 8, border: "1px solid #d1d5db", fontFamily: "inherit" },

  buttonRow: { display: "flex", gap: 10 },
  primaryBtn: { background: "#6366f1", color: "#fff", padding: "10px 16px", borderRadius: 8 },
  secondaryBtn: { background: "#64748b", color: "#fff", padding: "10px 16px", borderRadius: 8 },
};
