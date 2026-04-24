

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

const QuestionCard = ({ q, index, answers, setAnswers }) => {
  const qid = String(q.question_id);

  // ensure options is array
  let options = q.options;
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      options = [];
    }
  }

  const currentAnswer = answers[qid] ?? "";

  return (
    <div style={styles.qCard}>
      <h4>Q{index + 1}. {q.question_text}</h4>

      {q.question_type === "mcq" &&
        options.map((opt, i) => (
          <label key={i} style={styles.option}>
            <input
              type="radio"
              name={`q_${qid}`}
              value={opt}
              checked={String(currentAnswer) === String(opt)}
              onChange={(e) =>
                setAnswers(prev => ({
                  ...prev,
                  [qid]: e.target.value
                }))
              }
            />
            {opt}
          </label>
        ))}

      {q.question_type === "descriptive" && (
        <textarea
          placeholder="Type your answer here..."
          value={currentAnswer}
          onChange={(e) =>
            setAnswers(prev => ({
              ...prev,
              [qid]: e.target.value
            }))
          }
          style={styles.textarea}
          rows={4}
        />
      )}
    </div>
  );
};

const StartTest = () => {
  const { assignment_id } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  const answersRef = useRef({});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    let timerInterval;

    const initializeTest = async () => {
      try {

        await api.get(`/assignments/${assignment_id}/start`);

        const res = await api.get(`/assignments/${assignment_id}/questions`);
        console.log("Saved answers from backend:", res.data.saved_answers);

        setQuestions(res.data.questions);

        // 🔥 normalize saved answers keys
        const restored = {};
        Object.entries(res.data.saved_answers || {}).forEach(([k, v]) => {
          restored[String(k)] = v;
        });

        setAnswers(restored);
        answersRef.current = restored;

        const startedAt = new Date(res.data.started_at);
        const duration = res.data.duration_minutes;

        const endTime = new Date(startedAt.getTime() + duration * 60000);

        timerInterval = setInterval(() => {
          const now = new Date();
          const diff = Math.max(0, Math.floor((endTime - now) / 1000));

          setTimeLeft(diff);

          if (diff <= 0) {
            clearInterval(timerInterval);
            handleSubmit(true, answersRef.current);
          }
        }, 1000);

        setLoading(false);

      } catch (err) {
        console.error("Unable to start test", err);
        navigate("/student/dashboard");
      }
    };

    initializeTest();

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };

  }, [assignment_id]);

  useEffect(() => {
    const interval = setInterval(async () => {

      const currentAnswers = answersRef.current;

      if (!currentAnswers || Object.keys(currentAnswers).length === 0) return;

      try {

        await api.patch(
          `/assignments/${assignment_id}/save-progress`,
          { answers: currentAnswers }
        );

        console.log("Auto-saved:", currentAnswers);

      } catch {
        console.error("Auto-save failed");
      }

    }, 15000);

    return () => clearInterval(interval);

  }, [assignment_id]);

  const handleSubmit = async (auto = false, finalAnswers = answers) => {
    try {

      await api.post(
        `/assignments/${assignment_id}/submit`,
        { answers: finalAnswers }
      );

      navigate("/student/dashboard", { state: { refresh: true } });

    } catch {
      navigate("/student/dashboard");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) return <p>Loading test...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Assignment {assignment_id}</h2>

      <h3 style={{ color: timeLeft < 60 ? "red" : "black" }}>
        Time Left: {formatTime(timeLeft)}
      </h3>

      {questions.map((q, index) => (
        <QuestionCard
          key={q.question_id}
          q={q}
          index={index}
          answers={answers}
          setAnswers={setAnswers}
        />
      ))}

      <button
        onClick={() => handleSubmit(false)}
        style={styles.submitBtn}
      >
        Submit Test
      </button>
    </div>
  );
};

export default StartTest;

const styles = {
  qCard: {
    background: "#fff",
    padding: "16px",
    marginBottom: "16px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
  },
  option: {
    display: "block",
    marginTop: "8px",
    cursor: "pointer"
  },
  textarea: {
    width: "100%",
    marginTop: "10px",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc"
  },
  submitBtn: {
    marginTop: "20px",
    padding: "10px 18px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }
};