import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios"
import axios from "axios";

export default function RequireAdmin({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await api.get("/get-faculty-profile");
        const user = res.data.faculty;

        if (user.role === "admin") {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error("Auth check failed");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!isAdmin) return <Navigate to="/" />;

  return children;
}