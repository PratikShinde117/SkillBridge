import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ViewStudents() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/students").then(res => setData(res.data.students));
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Students List</h2>

      <div style={styles.scrollBox}>
        {data.map(s => (
          <div key={s.roll_no} style={styles.card}>
            <p><strong>Name:</strong> {s.studname}</p>
            <p><strong>Email:</strong> {s.studemail}</p>
            <p><strong>Roll No:</strong> {s.roll_no}</p>
            <p><strong>Department:</strong> {s.studdept}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100%",
  },
  title: {
    marginBottom: "15px",
    fontSize: "18px",
    fontWeight: "600",
  },
  scrollBox: {
    maxHeight: "400px",   // 🔥 controls scrolling
    overflowY: "auto",
    paddingRight: "8px",
  },
  card: {
    background: "#f9fafb",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  }
};