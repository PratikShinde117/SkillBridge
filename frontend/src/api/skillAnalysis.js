import api from "./axios";

export const runSkillAnalysis = () => {
  return api.post("/skill-analysis");
};
