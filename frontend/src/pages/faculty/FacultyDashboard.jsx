import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../api/axios";

const NAV_ITEMS = [
  {label: "Dashboard", path: "/faculty/dashboard" },
  {label: "Scenario Library", path: "/faculty/scenarios" },
  {label: "Generate Scenario", path: "/faculty/scenarios/generate" },
  {label: "Create Assignment", path: "/faculty/create-assignment" },
  {label: "View Assignments", path: "/faculty/view-assignments" },
  {label: "Analytics", path: "/faculty/analytics" },
  {label: "Profile", path: "/faculty/profile" },
];

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [facultyName, setFacultyName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [draftAssignments, setDraftAssignments] = useState(0);
  const [publishedAssignments, setPublishedAssignments] = useState(0);
  const [scenarioCount, setScenarioCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentAssignments, setRecentAssignments] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      await Promise.all([fetchAssignments(), fetchFacultyInfo(), fetchScenarioCount()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await api.get("/faculty/view-assignments");
      const all = res.data.assignments || [];
      setTotalAssignments(all.length);
      setDraftAssignments(all.filter(a => a.status === "draft").length);
      setPublishedAssignments(all.filter(a => a.status === "published").length);
      setRecentAssignments(all.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    }
  };

  const fetchFacultyInfo = async () => {
    try {
      const res = await api.get("/get-faculty-profile");
      setFacultyName(res.data.faculty.facname);
      setFacultyId(res.data.faculty.facid);
    } catch (error) {
      console.error("Failed to fetch faculty info:", error);
    }
  };

  const fetchScenarioCount = async () => {
    try {
      const res = await api.get("/api/scenarios/all");
      setScenarioCount((res.data.scenarios || []).length);
    } catch { /* ignore */ }
  };

  const handleLogout = async () => {
    try { await api.post("/logout-faculty"); } catch {}
    navigate("/");
  };

  const QUICK_ACTIONS = [
    { icon: "✨", title: "Generate Scenario", desc: "Create AI-powered scenarios", path: "/faculty/scenarios/generate", gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
    { icon: "📝", title: "Create Assignment", desc: "New question or scenario assignment", path: "/faculty/create-assignment", gradient: "linear-gradient(135deg,#3b82f6,#2563eb)" },
    { icon: "🎯", title: "Scenario Library", desc: "Browse & manage scenarios", path: "/faculty/scenarios", gradient: "linear-gradient(135deg,#059669,#10b981)" },
    { icon: "📋", title: "View Assignments", desc: "Track all assignments", path: "/faculty/view-assignments", gradient: "linear-gradient(135deg,#d97706,#f59e0b)" },
  ];

  const STATS = [
    { value: totalAssignments, label: "Total Assignments", icon: "📚", color: "#6366f1", bg: "#ede9fe" },
    { value: publishedAssignments, label: "Published", icon: "🚀", color: "#059669", bg: "#ecfdf5" },
    { value: draftAssignments, label: "Drafts", icon: "📄", color: "#d97706", bg: "#fffbeb" },
    { value: scenarioCount, label: "Scenarios", icon: "🎯", color: "#2563eb", bg: "#eff6ff" },
  ];

  return (
    <div style={S.shell}>
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
              <div style={S.userId}>ID: {facultyId}</div>
            </div>
          </div>
          <button style={S.logoutBtn} onClick={handleLogout}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main style={S.main}>
        {/* Header */}
        <header style={S.header}>
          <div>
            <h1 style={S.pageTitle}>
              Welcome back, <span style={S.nameHighlight}>{facultyName || "Faculty"}</span>
            </h1>
            <p style={S.pageSub}>Here's what's happening with your assignments today.</p>
          </div>
          <div style={S.headerRight}>
            <span style={S.dateBadge}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </span>
          </div>
        </header>

        {/* Stats Grid */}
        <div style={S.statsGrid}>
          {STATS.map((stat, i) => (
            <div key={i} style={S.statCard}>
              <div style={{ ...S.statIcon, background: stat.bg, color: stat.color }}>{stat.icon}</div>
              <div>
                <div style={S.statValue}>{loading ? "—" : stat.value}</div>
                <div style={S.statLabel}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={S.sectionRow}>
          <h2 style={S.sectionTitle}>Quick Actions</h2>
        </div>
        <div style={S.actionsGrid}>
          {QUICK_ACTIONS.map((qa, i) => (
            <button
              key={i}
              style={S.actionCard}
              onClick={() => navigate(qa.path)}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.04)"; }}
            >
              <div style={{ ...S.actionIcon, background: qa.gradient }}>{qa.icon}</div>
              <div>
                <div style={S.actionTitle}>{qa.title}</div>
                <div style={S.actionDesc}>{qa.desc}</div>
              </div>
              <span style={S.actionArrow}>→</span>
            </button>
          ))}
        </div>

        {/* Recent Assignments */}
        <div style={S.sectionRow}>
          <h2 style={S.sectionTitle}>Recent Assignments</h2>
          <button style={S.viewAllBtn} onClick={() => navigate("/faculty/view-assignments")}>View All →</button>
        </div>
        <div style={S.tableCard}>
          {loading ? (
            <div style={S.tableSkeleton}>
              {[1, 2, 3].map(i => <div key={i} style={S.skeletonRow} />)}
            </div>
          ) : recentAssignments.length === 0 ? (
            <div style={S.emptyTable}>
              <p style={S.emptyText}>No assignments yet. Create your first one!</p>
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>Subject</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Year</th>
                  <th style={S.th}>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {recentAssignments.map(a => (
                  <tr key={a.assignment_id} style={S.tr}>
                    <td style={S.td}>
                      <span style={S.idBadge}>#{a.assignment_id}</span>
                    </td>
                    <td style={{ ...S.td, fontWeight: 600, color: "#0f172a" }}>{a.subject}</td>
                    <td style={S.td}>
                      <span style={a.assignment_type === "scenario" ? S.typeScenario : S.typeQuestion}>
                        {a.assignment_type === "scenario" ? "🎯 Scenario" : "📝 Question"}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={a.status === "published" ? S.statusPublished : S.statusDraft}>
                        {a.status}
                      </span>
                    </td>
                    <td style={S.td}>{a.year}</td>
                    <td style={{ ...S.td, color: "#64748b" }}>
                      {a.deadline ? new Date(a.deadline).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

/* ===== STYLES ===== */
const S = {
  shell: { display: "flex", width: "100%", minHeight: "100vh", background: "#f1f5f9" },

  // Sidebar
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
  userId: { fontSize: 11, color: "#64748b" },
  logoutBtn: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "rgba(239,68,68,.1)", color: "#fca5a5", borderRadius: 10, fontSize: 13, fontWeight: 600 },

  // Main
  main: { flex: 1, marginLeft: 260, padding: "32px 40px 48px", minHeight: "100vh", overflowY: "auto" },

  // Header
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px", lineHeight: 1.3 },
  nameHighlight: { color: "#6366f1" },
  pageSub: { fontSize: 14, color: "#64748b", margin: "6px 0 0", fontWeight: 400 },
  headerRight: {},
  dateBadge: { background: "#fff", color: "#475569", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid #e2e8f0" },

  // Stats
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 32 },
  statCard: { background: "#fff", borderRadius: 16, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.03)" },
  statIcon: { width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
  statValue: { fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 3 },

  // Sections
  sectionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0 },
  viewAllBtn: { background: "none", color: "#6366f1", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 },

  // Quick Actions
  actionsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  actionCard: { background: "#fff", borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #e2e8f0", cursor: "pointer", textAlign: "left", transition: "all .2s", boxShadow: "0 1px 3px rgba(0,0,0,.04)", width: "100%" },
  actionIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", flexShrink: 0 },
  actionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2 },
  actionDesc: { fontSize: 11, color: "#94a3b8", fontWeight: 400 },
  actionArrow: { marginLeft: "auto", color: "#cbd5e1", fontSize: 16, fontWeight: 600 },

  // Table
  tableCard: { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.03)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "14px 20px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" },
  tr: { transition: "background .15s" },
  td: { padding: "14px 20px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f8fafc" },
  idBadge: { background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600 },
  typeScenario: { background: "#ede9fe", color: "#6d28d9", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 },
  typeQuestion: { background: "#dbeafe", color: "#1d4ed8", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 },
  statusPublished: { background: "#ecfdf5", color: "#059669", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: "capitalize" },
  statusDraft: { background: "#fffbeb", color: "#d97706", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: "capitalize" },

  tableSkeleton: { padding: 20 },
  skeletonRow: { height: 48, background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)", borderRadius: 8, marginBottom: 8, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" },
  emptyTable: { padding: "48px 20px", textAlign: "center" },
  emptyText: { color: "#94a3b8", fontSize: 14 },
};

export default FacultyDashboard;