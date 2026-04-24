import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";

const NAV_ITEMS = [
  {label: "Dashboard", path: "/faculty/dashboard" },
  {label: "Scenario Library", path: "/faculty/scenarios" },
  {label: "Generate Scenario", path: "/faculty/scenarios/generate" },
  {label: "Create Assignment", path: "/faculty/create-assignment" },
  // { label: "Create Scenario Assignment", path: "/faculty/scenarios/create-assignment" },
  {label: "View Assignments", path: "/faculty/view-assignments" },
  {label: "Analytics", path: "/faculty/analytics" },
  {label: "Profile", path: "/faculty/profile" },
];

const YEAR_OPTIONS = [
  { value: "", label: "All Years" },
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
];

const DIFF_COLORS = { easy: "#10b981", medium: "#f59e0b", hard: "#ef4444" };

export default function ScenarioSearch() {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState({ subject: "", year_level: "", concepts: "" });
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState({});
  const [toast, setToast] = useState(null);
  const [facultyName, setFacultyName] = useState("");

  useEffect(() => {
    loadAll();
    api.get("/get-faculty-profile").then(r => setFacultyName(r.data.faculty.facname)).catch(() => { });
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/scenarios/all");
      setScenarios(res.data.scenarios || []);
    } catch { showToast("Failed to load scenarios", "error"); }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.subject) params.set("subject", filters.subject);
      if (filters.year_level) params.set("year_level", filters.year_level);
      if (filters.concepts) params.set("concepts", filters.concepts);
      const q = params.toString();
      const res = await api.get(q ? `/api/scenarios/search?${q}` : "/api/scenarios/all");
      setScenarios(res.data.scenarios || []);
      showToast(`Found ${res.data.scenarios?.length || 0} scenario(s)`, res.data.scenarios?.length ? "success" : "info");
    } catch { showToast("Search failed", "error"); }
    setLoading(false);
  };

  const handleClear = () => {
    setFilters({ subject: "", year_level: "", concepts: "" });
    loadAll();
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!expandedData[id]) {
      try {
        const res = await api.get(`/api/scenarios/detail/${id}`);
        setExpandedData(prev => ({ ...prev, [id]: res.data.scenario }));
      } catch { showToast("Failed to load preview", "error"); }
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this scenario permanently?")) return;
    try {
      await api.delete(`/api/scenarios/${id}`);
      setScenarios(prev => prev.filter(s => s.scenario_id !== id));
      setSelectedIds(prev => prev.filter(x => x !== id));
      showToast("Scenario deleted", "success");
    } catch { showToast("Delete failed", "error"); }
  };

  const handleLogout = async () => {
    try { await api.post("/logout-faculty"); } catch { }
    navigate("/");
  };

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const parseConcepts = (c) => {
    if (!c) return [];
    if (typeof c === "string") try { return JSON.parse(c); } catch { return []; }
    return c;
  };

  return (
    <div style={S.shell}>
      {/* Toast */}
      {toast && (
        <div style={{
          ...S.toast,
          background: toast.type === "error" ? "#fef2f2" : toast.type === "success" ? "#f0fdf4" : "#eff6ff",
          color: toast.type === "error" ? "#dc2626" : toast.type === "success" ? "#16a34a" : "#2563eb",
          borderColor: toast.type === "error" ? "#fecaca" : toast.type === "success" ? "#bbf7d0" : "#bfdbfe"
        }}>
          {toast.type === "success" && "✅ "}{toast.type === "error" && "❌ "}{toast.msg}
        </div>
      )}

      {/* ===== SIDEBAR ===== */}
      <aside style={S.sidebar}>
        <div style={S.sideTop}>
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
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={S.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div style={S.sideBottom}>
          <div style={S.userBox}>
            <div style={S.avatar}>{facultyName?.[0]?.toUpperCase() || "F"}</div>
            <div style={S.userInfo}>
              <div style={S.userName}>{facultyName || "Faculty"}</div>
            </div>
          </div>
          <button style={S.logoutBtn} onClick={handleLogout}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main style={S.main}>
        {/* Page Header */}
        <div style={S.pageHeader}>
          <div>
            <h1 style={S.pageTitle}>Scenario Library</h1>
            <p style={S.pageSub}>Browse, search, edit, and assign scenarios to students</p>
          </div>
          <div style={S.headerActions}>
            {selectedIds.length > 0 && (
              <button
                style={S.assignBtn}
                onClick={() => navigate("/faculty/scenarios/create-assignment", { state: { scenario_ids: selectedIds, subject: filters.subject } })}
              >
                📦 Assign Selected ({selectedIds.length})
              </button>
            )}
            <button style={S.generateBtn} onClick={() => navigate("/faculty/scenarios/generate")}>
              ✨ Generate New
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={S.filterCard}>
          <div style={S.filterGrid}>
            <div style={S.filterField}>
              <label style={S.filterLabel}>SUBJECT</label>
              <input
                style={S.filterInput}
                placeholder="e.g. Operating Systems"
                value={filters.subject}
                onChange={e => setFilters({ ...filters, subject: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div style={S.filterField}>
              <label style={S.filterLabel}>YEAR LEVEL</label>
              <select style={S.filterInput} value={filters.year_level} onChange={e => setFilters({ ...filters, year_level: e.target.value })}>
                {YEAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ ...S.filterField, gridColumn: "span 2" }}>
              <label style={S.filterLabel}>CONCEPTS <span style={S.hint}>— even 1 matching concept shows results</span></label>
              <input
                style={S.filterInput}
                placeholder="e.g. sorting, hashing, graph, deadlock"
                value={filters.concepts}
                onChange={e => setFilters({ ...filters, concepts: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>
          <div style={S.filterActions}>
            <button style={S.searchBtn} onClick={handleSearch}>🔍 Search</button>
            <button style={S.clearBtn} onClick={handleClear}>✕ Clear</button>
            <span style={S.resultCount}>{scenarios.length} result{scenarios.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={S.loadingGrid}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={S.skeleton}>
                <div style={S.skelLine1} />
                <div style={S.skelLine2} />
                <div style={S.skelLine3} />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && scenarios.length === 0 && (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>📭</div>
            <h3 style={S.emptyTitle}>No scenarios found</h3>
            <p style={S.emptyDesc}>Try different filters or generate a new scenario with AI</p>
            <button style={S.generateBtn} onClick={() => navigate("/faculty/scenarios/generate")}>
              ✨ Generate Scenario
            </button>
          </div>
        )}

        {/* Scenario Cards */}
        {!loading && scenarios.length > 0 && (
          <div style={S.cardGrid}>
            {scenarios.map(sc => {
              const isSelected = selectedIds.includes(sc.scenario_id);
              const isExpanded = expandedId === sc.scenario_id;
              const concepts = parseConcepts(sc.concepts);
              const detail = expandedData[sc.scenario_id];
              const sj = detail ? (typeof detail.scenario_json === "string" ? JSON.parse(detail.scenario_json) : detail.scenario_json) : null;

              return (
                <div key={sc.scenario_id} style={{
                  ...S.card,
                  borderLeft: isSelected ? "4px solid #6366f1" : "4px solid transparent",
                  boxShadow: isSelected ? "0 0 0 1px #c7d2fe, 0 2px 8px rgba(99,102,241,.1)" : "0 1px 3px rgba(0,0,0,.04)"
                }}>
                  {/* Card Header */}
                  <div style={S.cardHeader}>
                    <div style={{ flex: 1 }}>
                      <h3 style={S.cardTitle}>{sc.title}</h3>
                      <div style={S.badges}>
                        <span style={S.subjectBadge}>{sc.subject}</span>
                        <span style={S.yearBadge}>Year {sc.year_level}</span>
                        <span style={{
                          ...S.diffBadge,
                          color: DIFF_COLORS[sc.difficulty_level] || "#64748b",
                          background: (DIFF_COLORS[sc.difficulty_level] || "#64748b") + "18"
                        }}>{sc.difficulty_level}</span>
                        {sc.created_by && sc.created_by !== "system" && (
                          <span style={S.authorBadge}>by {sc.created_by}</span>
                        )}
                      </div>
                    </div>
                    <label style={S.checkbox}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(sc.scenario_id)}
                        style={S.checkInput}
                      />
                      <span style={{
                        ...S.checkBox,
                        background: isSelected ? "#6366f1" : "#fff",
                        borderColor: isSelected ? "#6366f1" : "#cbd5e1",
                      }}>
                        {isSelected && "✓"}
                      </span>
                    </label>
                  </div>

                  {/* Concept Chips */}
                  <div style={S.chipRow}>
                    {concepts.slice(0, 8).map((c, i) => <span key={i} style={S.chip}>{c}</span>)}
                    {concepts.length > 8 && <span style={S.chipMore}>+{concepts.length - 8} more</span>}
                  </div>

                  {/* Action Row */}
                  <div style={S.cardActions}>
                    <button style={S.actionBtn} onClick={() => toggleExpand(sc.scenario_id)}>
                      {isExpanded ? "▲ Collapse" : "▼ Preview"}
                    </button>
                    <div style={S.actionRight}>
                      <button
                        style={S.editBtn}
                        onClick={() => navigate("/faculty/scenarios/modify", { state: { scenario_id: sc.scenario_id } })}
                      >
                        ✏️ Edit
                      </button>
                      <button style={S.deleteBtn} onClick={() => handleDelete(sc.scenario_id)}>
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Expanded Preview */}
                  {isExpanded && (
                    <div style={S.preview}>
                      {sj ? (
                        <>
                          <div style={S.previewSection}>
                            <div style={S.previewLabel}>🏢 CONTEXT</div>
                            <p style={S.previewText}>
                              <strong>{sj.context?.domain}</strong> — {sj.context?.description}
                            </p>
                            {sj.context?.scale && <p style={S.scaleText}>📏 {sj.context.scale}</p>}
                          </div>

                          <div style={S.previewSection}>
                            <div style={S.previewLabel}>🎯 PROBLEM STATEMENT</div>
                            <p style={S.previewText}>{sj.problem_statement}</p>
                          </div>

                          <div style={S.previewSection}>
                            <div style={S.previewLabel}>📋 TASKS ({sj.tasks?.length || 0})</div>
                            <div style={S.tasksGrid}>
                              {(sj.tasks || []).map(t => (
                                <div key={t.task_id} style={S.taskCard}>
                                  <div style={S.taskTop}>
                                    <span style={S.taskId}>Task {t.task_id}</span>
                                    <span style={S.taskMarks}>{t.marks} marks</span>
                                  </div>
                                  <div style={S.taskTitle}>{t.title}</div>
                                  <p style={S.taskDesc}>{t.description}</p>
                                  <div style={S.chipRow}>
                                    {(t.expected_concepts || []).map((c, i) => (
                                      <span key={i} style={S.taskChip}>{c}</span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={S.previewLoading}>
                          <div style={S.miniSpinner} />
                          <span style={{ color: "#94a3b8", fontSize: 13 }}>Loading preview...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

/* ===== STYLES ===== */
const S = {
  shell: { display: "flex", width: "100%", minHeight: "100vh", background: "#f1f5f9" },

  // Sidebar (identical to FacultyDashboard)
  sidebar: { width: 260, background: "linear-gradient(180deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, boxSizing: "border-box", padding: "24px 16px 20px" },
  sideTop: {},
  sideBottom: { borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16 },
  logoWrap: { display: "flex", alignItems: "center", gap: 12, padding: "0 8px", marginBottom: 32 },
  logoBox: { width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#818cf8,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, flexShrink: 0 },
  logoTitle: { fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" },
  logoSub: { fontSize: 11, color: "#64748b", fontWeight: 500, marginTop: -1 },
  nav: { display: "flex", flexDirection: "column", gap: 2 },
  navBtn: { display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", background: "transparent", color: "#94a3b8", borderRadius: 10, fontSize: 13, fontWeight: 500, textAlign: "left", transition: "all .15s", width: "100%" },
  navActive: { display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", background: "rgba(99,102,241,.15)", color: "#a5b4fc", borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%" },
  navIcon: { fontSize: 16, width: 24, textAlign: "center", flexShrink: 0 },
  userBox: { display: "flex", alignItems: "center", gap: 10, padding: "8px", marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 },
  userInfo: { overflow: "hidden" },
  userName: { fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  logoutBtn: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "rgba(239,68,68,.1)", color: "#fca5a5", borderRadius: 10, fontSize: 13, fontWeight: 600 },

  // Main
  main: { flex: 1, marginLeft: 260, padding: "32px 40px 48px", minHeight: "100vh" },

  // Page Header
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" },
  pageSub: { fontSize: 14, color: "#64748b", margin: "4px 0 0" },
  headerActions: { display: "flex", gap: 10 },
  generateBtn: { padding: "10px 22px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: "0 2px 12px rgba(99,102,241,.25)" },
  assignBtn: { padding: "10px 22px", background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: "0 2px 12px rgba(16,185,129,.25)" },

  // Filter
  filterCard: { background: "#fff", borderRadius: 16, padding: "22px 26px", border: "1px solid #e2e8f0", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,.03)" },
  filterGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 14, marginBottom: 14 },
  filterField: { display: "flex", flexDirection: "column", gap: 5 },
  filterLabel: { fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: ".5px" },
  hint: { fontWeight: 400, color: "#94a3b8", fontSize: 10, letterSpacing: 0 },
  filterInput: { padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, background: "#f8fafc", color: "#1e293b", outline: "none", width: "100%", boxSizing: "border-box" },
  filterActions: { display: "flex", alignItems: "center", gap: 10 },
  searchBtn: { padding: "9px 22px", background: "#6366f1", color: "#fff", borderRadius: 9, fontWeight: 600, fontSize: 13 },
  clearBtn: { padding: "9px 16px", background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 9, fontWeight: 600, fontSize: 13 },
  resultCount: { fontSize: 13, fontWeight: 600, color: "#94a3b8", marginLeft: "auto" },

  // Loading
  loadingGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  skeleton: { background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" },
  skelLine1: { height: 18, width: "60%", background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)", borderRadius: 6, marginBottom: 12, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" },
  skelLine2: { height: 14, width: "40%", background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)", borderRadius: 6, marginBottom: 10, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" },
  skelLine3: { height: 14, width: "80%", background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)", borderRadius: 6, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" },

  // Empty
  emptyState: { textAlign: "center", padding: "72px 0" },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: "#334155", margin: "0 0 6px" },
  emptyDesc: { fontSize: 14, color: "#94a3b8", marginBottom: 24 },

  // Cards
  cardGrid: { display: "flex", flexDirection: "column", gap: 14 },
  card: { background: "#fff", borderRadius: 16, padding: "22px 26px", border: "1px solid #e2e8f0", transition: "all .2s" },

  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px", lineHeight: 1.3 },
  badges: { display: "flex", gap: 6, flexWrap: "wrap" },
  subjectBadge: { background: "#ede9fe", color: "#6d28d9", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 },
  yearBadge: { background: "#dbeafe", color: "#1d4ed8", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 },
  diffBadge: { padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" },
  authorBadge: { color: "#94a3b8", fontSize: 11, fontWeight: 500, padding: "3px 4px" },

  checkbox: { cursor: "pointer", flexShrink: 0 },
  checkInput: { display: "none" },
  checkBox: { width: 24, height: 24, borderRadius: 7, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", transition: "all .15s" },

  chipRow: { display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 },
  chip: { background: "#f0fdf4", color: "#166534", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, border: "1px solid #bbf7d0" },
  chipMore: { color: "#94a3b8", fontSize: 11, padding: "3px 6px", fontWeight: 500 },
  taskChip: { background: "#faf5ff", color: "#7e22ce", padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 500, border: "1px solid #e9d5ff" },

  // Card Actions
  cardActions: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #f1f5f9" },
  actionBtn: { color: "#6366f1", fontWeight: 600, fontSize: 12, cursor: "pointer", padding: "4px 0" },
  actionRight: { display: "flex", gap: 8 },
  editBtn: { color: "#6366f1", fontWeight: 600, fontSize: 12, cursor: "pointer", padding: "4px" },
  deleteBtn: { color: "#ef4444", fontSize: 13, cursor: "pointer", padding: "4px" },

  // Preview
  preview: { marginTop: 16, padding: "20px 24px", background: "#fafbfe", borderRadius: 14, border: "1px solid #e2e8f0", animation: "fadeIn .3s" },
  previewSection: { marginBottom: 18 },
  previewLabel: { fontSize: 11, fontWeight: 700, color: "#6366f1", letterSpacing: ".8px", marginBottom: 8 },
  previewText: { fontSize: 13, color: "#334155", lineHeight: 1.7, margin: 0 },
  scaleText: { fontSize: 12, color: "#94a3b8", marginTop: 4, margin: "4px 0 0" },

  tasksGrid: { display: "flex", flexDirection: "column", gap: 10 },
  taskCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" },
  taskTop: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  taskId: { fontSize: 10, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: ".5px" },
  taskMarks: { fontSize: 11, fontWeight: 600, color: "#64748b" },
  taskTitle: { fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 4 },
  taskDesc: { fontSize: 12, color: "#475569", lineHeight: 1.6, margin: "0 0 8px" },

  previewLoading: { display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: "24px 0" },
  miniSpinner: { width: 18, height: 18, border: "2px solid #e2e8f0", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin .6s linear infinite" },

  // Toast
  toast: { position: "fixed", top: 20, right: 20, padding: "12px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, border: "1.5px solid", boxShadow: "0 4px 20px rgba(0,0,0,.08)", animation: "fadeIn .3s" },
};
