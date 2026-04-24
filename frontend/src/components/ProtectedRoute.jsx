import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/axios";

const ProtectedRoute = ({ children, role }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    api.get("/me")
      .then((res) => {
        if (res.data.role === role) {
          setAllowed(true);
        }
      })
      .catch(() => setAllowed(false))
      .finally(() => setLoading(false));
  }, [role]);

  if (loading) return <p>Loading...</p>;
  if (!allowed) return <Navigate to="/" />;

  return children;
};

export default ProtectedRoute;
