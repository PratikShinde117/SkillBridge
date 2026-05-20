import { use, useEffect, useState } from "react";
import api from "../../api/axios";
import AddFaculty from "../././//../components/admin/AddFaculty";
import AddStudent from "../././//../components/admin/AddStudent";
import ViewFaculty from "../././//../components/admin/ViewFaculty";
import ViewStudents from "../././//../components/admin/ViewStudent";

import { useNavigate } from "react-router-dom";


const AdminDashboard = () => {
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalStudents: 0,
  });

  const navigate = useNavigate();

  // 🔹 Fetch stats
  useEffect(() => {
    api.get("/admin/dashboard")
      .then((res) => setStats(res.data.stats))
      .catch((err) => console.error(err));
  }, []);

  // 🔹 Logout (COOKIE BASED)
  const handleLogout = async () => {
    try {
      await api.post("/logout-faculty"); // ✅ correct endpoint

      // cookie cleared by backend
      navigate("/"); // redirect to login
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div style={styles.container}>

      {/* 🔹 TOP BAR */}
      <div style={styles.topBar}>
        <span style={styles.titleTop}>Admin Panel</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div style={styles.wrapper}>

        {/* SIDEBAR */}
        <div style={styles.sidebar}>
          <h2 style={styles.brand}>SkillBridge</h2>

          <button style={styles.navBtn} onClick={() => setTab("dashboard")}>
            Dashboard
          </button>
          <button style={styles.navBtn} onClick={() => setTab("faculty")}>
            Add Faculty
          </button>
          <button style={styles.navBtn} onClick={() => setTab("student")}>
            Add Student
          </button>
          <button style={styles.navBtn} onClick={() => setTab("viewFaculty")}>
            View Faculty
          </button>
          <button style={styles.navBtn} onClick={() => setTab("viewStudent")}>
            View Students
          </button>
        </div>

        {/* MAIN */}
        <div style={styles.main}>
          <h2 style={styles.title}>Admin Dashboard</h2>

          {tab === "dashboard" && (
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <h3>Total Faculty</h3>
                <p style={styles.statValue}>{stats.totalFaculty}</p>
              </div>

              <div style={styles.statCard}>
                <h3>Total Students</h3>
                <p style={styles.statValue}>{stats.totalStudents}</p>
              </div>
            </div>
          )}

          {tab === "faculty" && <AddFaculty />}
          {tab === "student" && <AddStudent />}
          {tab === "viewFaculty" && <ViewFaculty />}
          {tab === "viewStudent" && <ViewStudents />}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f1f5f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  // 🔹 TOP BAR
  topBar: {
    position: "absolute",
    top: "20px",
    right: "40px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  titleTop: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
  },

  logoutBtn: {
    padding: "8px 14px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
  },

  wrapper: {
    display: "flex",
    width: "1100px",
    height: "650px",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.1)",
  },

  sidebar: {
    width: "250px",
    background: "#2563eb",
    color: "white",
    padding: "30px",
    display: "flex",
    flexDirection: "column",
  },

  brand: {
    fontSize: "22px",
    fontWeight: "700",
    marginBottom: "30px",
  },

  navBtn: {
    background: "transparent",
    border: "none",
    color: "white",
    textAlign: "left",
    marginBottom: "15px",
    cursor: "pointer",
    fontSize: "14px",
  },

  main: {
    flex: 1,
    background: "#fff",
    padding: "30px",
  },

  title: {
    fontSize: "22px",
    fontWeight: "600",
    marginBottom: "20px",
  },

  statsGrid: {
    display: "flex",
    gap: "20px",
  },

  statCard: {
    flex: 1,
    padding: "20px",
    borderRadius: "10px",
    background: "#f9fafb",
    boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
  },

  statValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#2563eb",
  },
};