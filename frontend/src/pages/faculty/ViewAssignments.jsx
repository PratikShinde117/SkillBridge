// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../api/axios";
// import "./ViewAssignments.css";

// export default function ViewAssignments() {

//   const [assignments, setAssignments] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const navigate = useNavigate();

//   useEffect(() => {
//     fetchAssignments();
//   }, []);

//   const fetchAssignments = async () => {
//     try {

//       const res = await api.get("/faculty/view-assignments");

//       setAssignments(res.data.assignments || []);

//     } catch (err) {

//       console.error("Failed to fetch assignments");

//     } finally {

//       setLoading(false);

//     }
//   };

//   const publishAssignment = async (assignment_id) => {

//     try {

//       await api.post("/publish-assignment", {
//         assignment_id
//       });

//       alert("Assignment published successfully");

//       fetchAssignments();

//     } catch (err) {

//       alert(
//         err.response?.data?.error ||
//         "Failed to publish assignment"
//       );

//     }
//   };

//   const formatDate = (date) => {
//     return new Date(date).toLocaleDateString();
//   };

//   if (loading) {
//     return (
//       <div className="dashboard-container">
//         <p>Loading assignments...</p>
//       </div>
//     );
//   }

//   return (

//     <div className="dashboard-container">

//       <button
//         className="back-btn"
//         onClick={() => navigate("/faculty/dashboard")}
//       >
//         ← Back to Dashboard
//       </button>

//       <h1 className="dashboard-title">
//        Your Assignments
//       </h1>

//       <div className="assignment-card">

//         <div className="table-wrapper">

//           <table className="assignment-table">

//             <thead>
//               <tr>
//                 <th>Subject</th>
//                 <th>Difficulty</th>
//                 <th>Total Questions</th>
//                 <th>Division</th>
//                 <th>Created</th>
//                 <th>Deadline</th>
//                 <th>Duration</th>
//                 <th>Status</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>

//             <tbody>

//               {assignments.length === 0 && (

//                 <tr>
//                   <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
//                     No assignments found
//                   </td>
//                 </tr>

//               )}

//               {assignments.map((a) => (

//                 <tr key={a.assignment_id}>

//                   <td>{a.subject}</td>

//                   <td>
//                     <span className={`badge-${a.difficulty_level}`}>
//                       {a.difficulty_level}
//                     </span>
//                   </td>

//                   <td>{a.total_questions}</td>

//                   <td>{a.division}</td>

//                   <td>{formatDate(a.created_at)}</td>

//                   <td>{formatDate(a.deadline)}</td>

//                   <td>{a.duration_minutes} min</td>

//                   <td>
//                     <span className={`status-${a.status}`}>
//                       {a.status}
//                     </span>
//                   </td>

//                   <td className="action-cell">

//                     <button
//                       className="view-btn"
//                       onClick={() =>
//                         navigate(
//                           `/faculty/assignment/${a.assignment_id}/questions`
//                         )
//                       }
//                     >
//                       View
//                     </button>

//                     {a.status === "draft" ? (

//                       <button
//                         className="publish-btn"
//                         onClick={() =>
//                           publishAssignment(a.assignment_id)
//                         }
//                       >
//                         Publish
//                       </button>

//                     ) : (

//                       <span className="published-text">
//                         Published
//                       </span>

//                     )}

//                   </td>

//                 </tr>

//               ))}

//             </tbody>

//           </table>

//         </div>

//       </div>

//     </div>

//   );
// }


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ViewAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await api.get("/faculty/view-assignments");
      setAssignments(res.data.assignments || []);
    } catch {
      console.error("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  const publishAssignment = async (assignment_id) => {
    try {
      await api.post("/publish-assignment", { assignment_id });
      alert("Assignment published successfully");
      fetchAssignments();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to publish assignment");
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString();

  if (loading) {
    return <div style={styles.loading}>Loading assignments...</div>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Faculty Panel</div>
          <h1 style={styles.title}>Your Assignments</h1>
        </div>
        <button style={styles.backBtn} onClick={() => navigate("/faculty/dashboard")}>
          ← Dashboard
        </button>
      </header>

      <div style={styles.tableCard}>
        {assignments.length === 0 ? (
          <div style={styles.empty}>No assignments found</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Subject</th>
                <th style={styles.th}>Difficulty</th>
                <th style={styles.th}>Questions</th>
                <th style={styles.th}>Division</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Deadline</th>
                <th style={styles.th}>Duration</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.assignment_id} style={styles.tr}>
                  <td style={styles.td}>{a.subject}</td>
                  <td style={styles.td}>
                    <span style={styles.badge}>{a.difficulty_level}</span>
                  </td>
                  <td style={styles.td}>{a.total_questions}</td>
                  <td style={styles.td}>{a.division}</td>
                  <td style={styles.td}>{formatDate(a.created_at)}</td>
                  <td style={styles.td}>{formatDate(a.deadline)}</td>
                  <td style={styles.td}>{a.duration_minutes} min</td>
                  <td style={styles.td}>
                    <span
                      style={
                        a.status === "published"
                          ? styles.statusPublished
                          : styles.statusDraft
                      }
                    >
                      {a.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        style={styles.viewBtn}
                        onClick={() =>
                          navigate(`/faculty/assignment/${a.assignment_id}/questions`)
                        }
                      >
                        View
                      </button>

                      <button
                        style={styles.analyticsBtn}
                        onClick={() => navigate(`/faculty/analytics/${a.assignment_id}`)}
                      >
                        Analytics
                      </button>

                      {a.status === "draft" ? (
                        <button
                          style={styles.publishBtn}
                          onClick={() => publishAssignment(a.assignment_id)}
                        >
                          Publish
                        </button>
                      ) : (
                        <span style={styles.publishedText}>Published</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
    padding: 24,
    fontFamily: "Inter, system-ui, sans-serif"
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center"
  },
  header: {
    maxWidth: 1100,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#2563eb",
    fontWeight: 700
  },
  title: {
    fontSize: 28
  },
  backBtn: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer"
  },
  tableCard: {
    maxWidth: 1100,
    margin: "auto",
    background: "#fff",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    textAlign: "left",
    padding: "14px",
    background: "#f8fafc",
    fontSize: 12,
    color: "#64748b"
  },
  td: {
    padding: "14px",
    borderTop: "1px solid #f1f5f9"
  },
  tr: {
    transition: "background .2s"
  },
  badge: {
    background: "#e0f2fe",
    padding: "4px 10px",
    borderRadius: 10,
    fontSize: 12
  },
  statusPublished: {
    background: "#dcfce7",
    color: "#166534",
    padding: "4px 10px",
    borderRadius: 10,
    fontSize: 12
  },
  statusDraft: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "4px 10px",
    borderRadius: 10,
    fontSize: 12
  },
  actions: {
    display: "flex",
    gap: 8
  },
  viewBtn: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer"
  },
  publishBtn: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    background: "#6366f1",
    color: "#fff",
    cursor: "pointer"
  },
  analyticsBtn: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    cursor: "pointer"
  },
  publishedText: {
    color: "#16a34a",
    fontWeight: 600
  },
  empty: {
    padding: 40,
    textAlign: "center",
    color: "#64748b"
  }
};
