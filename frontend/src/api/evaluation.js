import axios from "axios";

const eval_api = axios.create({
  baseURL: "http://localhost:8000", // backend URL
  withCredentials: true,            // IMPORTANT for cookies
});

export default eval_api;
