import React, { useState } from "react";

const DashboardCard = ({ title, onClick, icon }) => {
  const [isHovered, setIsHovered] = useState(false);

  const styles = {
    card: {
      backgroundColor: isHovered ? "#125aa3" : "#1976d2",
      color: "white",
      padding: "30px",
      borderRadius: "12px",
      textAlign: "center",
      cursor: "pointer",
      boxShadow: isHovered
        ? "0 8px 18px rgba(0,0,0,0.2)"
        : "0 4px 10px rgba(0,0,0,0.1)",
      transform: isHovered ? "translateY(-5px)" : "translateY(0)",
      transition: "all 0.3s ease",
    },
    icon: {
      fontSize: "32px",
      marginBottom: "10px",
    },
    title: {
      margin: 0,
      fontSize: "18px",
      fontWeight: "600",
    },
  };

  return (
    <div
      style={styles.card}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon && <div style={styles.icon}>{icon}</div>}
      <h3 style={styles.title}>{title}</h3>
    </div>
  );
};

export default DashboardCard;
