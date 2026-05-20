import { useState } from "react";
import api from "../../api/axios";

const AddFaculty = () => {
  const [form, setForm] = useState({});

  const handleSubmit = async () => {
    try{
        await api.post("/register-faculty", form);
        alert("Faculty added");
    }
    catch(error){
        console.error("Error adding faculty:", error);
        alert("Error adding faculty");
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Add Faculty</h3>

      <input style={styles.input} placeholder="ID" onChange={e => setForm({...form, facid: e.target.value})} />
      <input style={styles.input} placeholder="Name" onChange={e => setForm({...form, facname: e.target.value})} />
      <input style={styles.input} placeholder="Password" onChange={e => setForm({...form, facpass: e.target.value})} />
      <input style={styles.input} placeholder="Dept" onChange={e => setForm({...form, facdept: e.target.value})} />
      <input style={styles.input} placeholder="Designation" onChange={e => setForm({...form, facdesignation: e.target.value})} />
      <input style={styles.input} placeholder="Subject" onChange={e => setForm({...form, facsubject: e.target.value})} />
      <input style={styles.input} placeholder="Email" onChange={e => setForm({...form, facemail: e.target.value})} />
      


      <button style={styles.button} onClick={handleSubmit}>Create</button>
    </div>
  );
};

export default AddFaculty;

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f1f5f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
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
  card: {
    padding: "20px",
    borderRadius: "10px",
    background: "#f9fafb",
    boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
  },
  cardTitle: {
    marginBottom: "15px",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
  },
  button: {
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
};