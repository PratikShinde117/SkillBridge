

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const Login = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [facname, setFacname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // const handleLogin = async (e) => {
  //   e.preventDefault();
  //   setError("");
  //   setLoading(true);

  //   try {
  //     let endpoint = "";

  //     if (role === "student") endpoint = "/login-student";
  //     if (role === "faculty" || role === "admin") endpoint = "/login-faculty";
      

  //     if (role === "student") {
  //       await api.post(endpoint, {
  //         studemail: email,
  //         studpass: password,
  //       });
  //     } else {
  //       await api.post(endpoint, {
  //         facemail: email,
  //         facpass: password,
  //         facname: facname,
  //       });
  //     }

  //     if (remember) {
  //       localStorage.setItem("userEmail", email);
  //     }

  //     if (role === "student") navigate("/student/dashboard");
  //     else {
  //       const user = res.data.Faculty;
  //       if (user.role === "admin") {
  //         navigate("/admin/dashboard");
  //       } else {
  //         navigate("/faculty/dashboard");
  //       }
  //     }
  //   } catch (err) {
  //     setError(err.response?.data?.error || "Login failed");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleLogin = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    let endpoint = "";

    if (role === "student") endpoint = "/login-student";
    if (role === "faculty" || role === "admin") endpoint = "/login-faculty";

    let res; // ✅ FIX: declare response

    if (role === "student") {
      res = await api.post(endpoint, {
        studemail: email,
        studpass: password,
      });
    } else {
      res = await api.post(endpoint, {
        facemail: email,
        facpass: password,
        facname: facname,
      });
    }

    if (remember) {
      localStorage.setItem("userEmail", email);
    }

    if (role === "student") navigate("/student/dashboard");
    else {
      const user = res.data.Faculty; // ✅ now res exists
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/faculty/dashboard");
      }
    }
  } catch (err) {
    setError(err.response?.data?.error || "Login failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>

        {/* LEFT PANEL */}
        <div style={styles.leftPanel}>
          <h1 style={styles.brand}>SkillBridge</h1>
          <p style={styles.tagline}>
            Competency-Based Learning Platform for Engineers
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div style={styles.card}>
          <h2 style={styles.title}>Login to your account</h2>

          <form onSubmit={handleLogin}>
            <label style={styles.label}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={styles.input}
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              {/* <option value="tp">T & P</option> */}
            </select>

            {role === "faculty" && (
              <>
                <label style={styles.label}>Faculty Name</label>
                <input
                  type="text"
                  required
                  value={facname}
                  onChange={(e) => setFacname(e.target.value)}
                  style={styles.input}
                  placeholder="Enter your name"
                />
              </>
            )}

            <label style={styles.label}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
            />

            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, margin: 0 }}
                placeholder="Enter password"
              />
              <span
                style={styles.showBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>

            <div style={styles.row}>
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                />
                <span style={{ marginLeft: "6px" }}>Remember me</span>
              </label>

              <span style={styles.link}>Forgot Password?</span>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={styles.footer}>© 2026 SkillBridge</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f1f5f9",
  },
  wrapper: {
    display: "flex",
    width: "900px",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.1)",
  },
  leftPanel: {
    flex: 1,
    background: "#2563eb",
    color: "white",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  brand: {
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "10px",
  },
  tagline: {
    fontSize: "14px",
    opacity: 0.9,
  },
  card: {
    flex: 1,
    background: "#ffffff",
    padding: "40px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "20px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
  },
  input: {
    width: "100%",
    padding: "10px",
    margin: "6px 0 16px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
  },
  passwordWrapper: {
    position: "relative",
    marginBottom: "16px",
  },
  showBtn: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "12px",
    cursor: "pointer",
    color: "#2563eb",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
    marginBottom: "15px",
  },
  link: {
    color: "#2563eb",
    cursor: "pointer",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  error: {
    color: "red",
    fontSize: "13px",
    marginBottom: "10px",
  },
  footer: {
    marginTop: "20px",
    fontSize: "12px",
    color: "#888",
  },
};