import React, { useEffect, useState } from 'react'
import api from "../../api/axios";


const Profile = () => {
    const [profile, setProfile] = useState(null);


    useEffect(() => {
        api.get("/get-faculty-profile")
        .then((res) => setProfile(res.data.faculty))
        .catch(() => console.error("Failed to fetch profile"));
    },[])

  return (
    
      <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Faculty Profile</h2>

        {profile && (
          <div style={styles.info}>
            <div style={styles.row}>
              <span style={styles.label}>Faculty ID</span>
              <span>{profile.facid}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Name</span>
              <span>{profile.facname}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Department</span>
              <span>{profile.facdept}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Designation</span>
              <span>{profile.facdesignation}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Subject</span>
              <span>{profile.facsubject}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>E-mail</span>
              <span>{profile.facemail}</span>
            </div>
          </div>
        )}
      </div>
    </div>
    
  )
}

const styles = {
  container: {
    backgroundColor: "#ffffff",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#f9f9f9",
    padding: "40px",
    borderRadius: "12px",
    width: "400px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
    borderTop: "6px solid #1976d2",
  },
  heading: {
    textAlign: "center",
    marginBottom: "30px",
    color: "#1976d2",
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #ddd",
    paddingBottom: "6px",
  },
  label: {
    fontWeight: "600",
    color: "#1976d2",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    fontSize: "18px",
  },
};

export default Profile;