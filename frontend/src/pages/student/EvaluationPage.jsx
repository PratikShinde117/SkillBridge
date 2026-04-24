import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import eval_api from "../../api/evaluation";
import { use } from "react";

const EvaluationPage = () => {

  const { assignment_id, roll_no } = useParams();

  console.log("Fetching evaluation for:", { assignment_id, roll_no });
  

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const SkeletonCard = () => (
  <div style={styles.skeletonCard}>
    <div style={styles.skeletonTitle}></div>
    <div style={styles.skeletonLine}></div>
    <div style={styles.skeletonLine}></div>
  </div>
);

  useEffect(() => {

    const fetchEvaluation = async () => {
      try {
        const res = await eval_api.get(
          `/student/evaluation/${roll_no}/${assignment_id}`
        );

        setData(res.data);

      } catch (err) {
        console.log(err);
        setError("Failed to load evaluation");
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();

  }, [assignment_id, roll_no]);

  if (loading) {
  return (
    <div style={styles.container}>
      <h1>Evaluation Report</h1>

      {[1,2,3].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={styles.container}>

      <h1>📊 Evaluation Report</h1>

      <div style={styles.summary}>
        <p><strong>Total Score:</strong> {data.total_score}</p>
        <p><strong>Percentage:</strong> {data.percentage || "N/A"}%</p>
      </div>

      {data.questions.map((q) => (

        <div key={q.question_id} style={styles.card}>

          <h3>{q.question_text}</h3>

          <p><strong>Your Answer:</strong> {q.student_answer}</p>
          {q.question_type === "mcq" && (
            <p><strong>Correct Answer:</strong> {q.correct_answer}</p>
          )}

          <p>
            <strong>Score:</strong> {q.score}/{q.max_score}
          </p>

          {q.question_type === "descriptive" && q.rubric && (
            
            <ul>
                <p><strong>Expected Points:</strong></p>
              {q.rubric.map((r, i) => (
                <li
                  key={i}
                  style={{
                    color: r.matched ? "green" : "red"
                  }}
                >
                  {r.point} ({(r.similarity * 100).toFixed(1)}%)
                </li>
              ))}
            </ul>
          )}

        </div>
      ))}

    </div>
  );
};



const styles = {
  container: {
    padding: "40px",
    background: "#f3f4f6",
    minHeight: "100vh"
  },

  summary: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    marginBottom: "20px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.08)"
  },

  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    marginBottom: "20px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.08)"
  },
  skeletonCard: {
  background: "#fff",
  padding: "20px",
  borderRadius: "10px",
  marginBottom: "20px"
},

skeletonTitle: {
  height: "20px",
  width: "60%",
  background: "#e5e7eb",
  marginBottom: "10px"
},

skeletonLine: {
  height: "14px",
  width: "100%",
  background: "#e5e7eb",
  marginBottom: "8px"
}
};

export default EvaluationPage;