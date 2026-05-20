import { useEffect, useState } from "react";
import api from "../../api/axios";

// export default function ViewFaculty() {
//   const [data, setData] = useState([]);

//   useEffect(() => {
//     api.get("/faculty").then(res => setData(res.data.faculty));
//   }, []);

//   return (
//     <div>
//       <h2>Faculty List</h2>

//       {data.map(f => (
//         <div key={f.facid}>
//             <br />
//           Name: {f.facname} - {f.facemail} ({f.role}) <br/>
//           Department: {f.facdept}<br/>
//           <br />
//         </div>
//       ))}
//     </div>
//   );
// }

export default function ViewFaculty() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/faculty").then(res => setData(res.data.faculty));
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Faculty List</h2>

      <div style={styles.scrollBox}>
        {data.map(f => (
          <div key={f.facid} style={styles.card}>
            <p><strong>Name:</strong> {f.facname}</p>
            <p><strong>Email:</strong> {f.facemail}</p>
            <p><strong>Role:</strong> {f.role}</p>
            <p><strong>Department:</strong> {f.facdept}</p>
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
    maxHeight: "400px",   // 🔥 controls scroll height
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