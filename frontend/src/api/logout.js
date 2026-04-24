import api from "./axios";

export const logoutStudent = () => api.post("/logout-student");
export const logoutFaculty = () => api.post("/logout-faculty");
