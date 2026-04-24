import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

const MissionBrief = () => {

  const { assignment_id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignment();
  }, []);

  const fetchAssignment = async () => {
    try {

      const res = await api.get(`/assignments/${assignment_id}/brief`);

      setAssignment(res.data.assignment);

    } catch (err) {
      alert("Failed to load mission brief");
      navigate("/student/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const startTest = () => {
    navigate(`/assignments/${assignment_id}/start`);
  };

  if (loading) return <p style={{ padding: "30px" }}>Loading mission...</p>;
  let caseStudyData;

try {
  caseStudyData =
    typeof assignment.case_study === "string"
      ? JSON.parse(assignment.case_study)
      : assignment.case_study;
} catch (error) {
  caseStudyData = null; // fallback
}

  return (
    
<div style={styles.container}>
  <h2>{assignment.subject}</h2>

  <div style={styles.card}>
    <h3>Case Study</h3>

    {caseStudyData ? (
      <div style={styles.caseGrid}>
        {Object.entries(caseStudyData).map(([title, content], index) => (
          <div key={index} style={styles.caseItem}>
            <h4 style={styles.caseTitle}>{title}</h4>
            <p style={styles.paragraph}>{content}</p>
          </div>
        ))}
      </div>
    ) : (
      // fallback if not JSON
      <p style={styles.paragraph}>
        {assignment.case_study}
      </p>
    )}

    <div style={styles.info}>
      <p><strong>Duration:</strong> {assignment.duration_minutes} minutes</p>
      <p><strong>Total Questions:</strong> {assignment.total_questions}</p>
    </div>

    <button
      style={styles.primaryButton}
      onClick={startTest}
    >
      Start Assessment
    </button>
  </div>
</div>
  );
};

const styles = {

  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "40px"
  },

  card: {
    marginTop: "20px",
    background: "#fff",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)"
  },

  paragraph: {
    marginTop: "15px",
    lineHeight: "1.7",
    fontSize: "16px"
  },

  info: {
    marginTop: "20px",
    color: "#374151"
  },

  primaryButton: {
    marginTop: "25px",
    padding: "12px 20px",
    background: "#2563eb",
    border: "none",
    color: "#fff",
    borderRadius: "8px",
    cursor: "pointer"
  }

};

export default MissionBrief;