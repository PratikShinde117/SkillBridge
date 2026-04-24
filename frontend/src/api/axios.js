import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000", // backend URL
  withCredentials: true,            // IMPORTANT for cookies
});

export default api;
