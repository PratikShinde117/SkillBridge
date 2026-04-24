import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import useSecureExamSession from "../../hooks/useSecureExamSession";

const normalizeSavedAnswers = (raw) => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
};

const normalizeOptions = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export default function UnifiedAssignmentAttempt() {
  const { assignment_id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [showStartModal, setShowStartModal] = useState(true);
  const answersRef = useRef({});


  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    let mounted = true;



    // const initialize = async () => {
    //   try {
    //     await api.get(`/assignments/${assignment_id}/start`);
    //     const briefRes = await api.get(`/assignments/${assignment_id}/brief`);
    //     const brief = briefRes.data.assignment;

    //     if (!mounted) return;
    //     setAssignment(brief);

    //     if (brief.assignment_type === "scenario") {
    //       const scenarioRes = await api.get(`/api/scenarios/assignment/${assignment_id}/scenarios`);
    //       if (!mounted) return;

    //       const saved = normalizeSavedAnswers(scenarioRes.data.saved_answers);
    //       setScenarios(scenarioRes.data.scenarios || []);
    //       setAnswers(saved);
    //       answersRef.current = saved;

    //       const startedAt = new Date(scenarioRes.data.started_at);
    //       const durationMinutes = scenarioRes.data.duration_minutes;
    //       const endTime = new Date(startedAt.getTime() + durationMinutes * 60000);
    //       setInitialSeconds(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    //     } else {
    //       const questionRes = await api.get(`/assignments/${assignment_id}/questions`);
    //       if (!mounted) return;

    //       const saved = normalizeSavedAnswers(questionRes.data.saved_answers);
    //       setQuestions(questionRes.data.questions || []);
    //       setAnswers(saved);
    //       answersRef.current = saved;

    //       const startedAt = new Date(questionRes.data.started_at);
    //       const durationMinutes = questionRes.data.duration_minutes;
    //       const endTime = new Date(startedAt.getTime() + durationMinutes * 60000);
    //       setInitialSeconds(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    //     }
    //   } catch (error) {
    //     alert(error.response?.data?.error || "Unable to load assignment");
    //     navigate("/student/dashboard");
    //   } finally {
    //     if (mounted) setLoading(false);
    //   }
    // };

    const initialize = async () => {
      try {
        const briefRes = await api.get(`/assignments/${assignment_id}/brief`);
        const brief = briefRes.data.assignment;

        if (!mounted) return;
        setAssignment(brief);

      } catch (error) {
        console.error(error.response?.data?.error || "Unable to load assignment");
        navigate("/student/dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    };


    initialize();

    return () => {
      mounted = false;
    };
  }, [assignment_id, navigate]);

  useEffect(() => {
    if (loading) return;

    const interval = setInterval(async () => {
      const currentAnswers = answersRef.current;
      if (!Object.keys(currentAnswers).length) return;
      try {
        await api.patch(`/assignments/${assignment_id}/save-progress`, {
          answers: currentAnswers
        });
      } catch {
        // keep autosave silent
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [assignment_id, loading]);

  const scenarioTasks = useMemo(
    () =>
      scenarios.flatMap((scenario) => {
        const scenarioJson =
          typeof scenario.scenario_json === "string"
            ? JSON.parse(scenario.scenario_json)
            : scenario.scenario_json;

        return (scenarioJson?.tasks || []).map((task) => ({
          ...task,
          scenario_id: scenario.scenario_id,
          scenario_title: scenario.title,
          context: scenarioJson?.context,
          problem_statement: scenarioJson?.problem_statement
        }));
      }),
    [scenarios]
  );

  const questionItems = questions.map((question) => ({
    id: String(question.question_id),
    prompt: question.question_text,
    type: question.question_type,
    options: normalizeOptions(question.options)
  }));

  const items =
    assignment?.assignment_type === "scenario"
      ? scenarioTasks.map((task) => ({
        id: `${task.scenario_id}_${task.task_id}`,
        prompt: task.description,
        title: task.title,
        subtitle: `${task.scenario_title} • ${task.marks} marks`,
        type: "descriptive"
      }))
      : questionItems;

  const answeredCount = items.filter((item) => {
    const value = answers[item.id] || "";
    return String(value).trim().length > 0;
  }).length;

  const handleSubmit = async (auto = false, finalAnswers = answers, reason = "") => {
    if (submitting) return;

    setSubmitting(true);
    try {
      await api.post(`/assignments/${assignment_id}/submit`, {
        answers: finalAnswers,
        violation_reason: reason || null
      });

      // Clear violation count so it doesn't persist after submission
      localStorage.removeItem(`violations_${assignment_id}`);
      navigate("/student/dashboard", { state: { refresh: true } });
    } catch (error) {
      console.error(error.response?.data?.error || "Submission failed");
      setSubmitting(false);
    }
  };

  const {
    timeLeft,
    formattedTimeLeft,
    violationCount,
    violationsRemaining,
    lastWarning,
    isFullscreen,
    toast
  } = useSecureExamSession({
    enabled: examStarted && !loading && Boolean(assignment),
    initialSeconds,
    assignmentId: assignment_id,
    onTimeUp: () =>
      handleSubmit(true, answersRef.current, "Time is up. Your assignment was auto-submitted."),
    onViolationLimitReached: ({ warning }) =>
      handleSubmit(
        true,
        answersRef.current,
        `${warning} Violation limit reached. Your assignment was auto-submitted.`
      ),
    violationLimit: 3,
    enableFullscreen: true
  });

  if (loading) {
    return <div style={styles.loading}>Loading assignment...</div>;
  }

  if (showStartModal) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc"
      }}>
        <div style={{
          background: "#fff",
          padding: 30,
          borderRadius: 16,
          width: 360,
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ marginBottom: 10 }}>Start Test?</h2>
          <p style={{ color: "#64748b", marginBottom: 20 }}>
            Once started, timer will begin and cannot be paused.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
                cursor: "pointer"
              }}
              onClick={() => navigate("/student/dashboard")}
            >
              Cancel
            </button>

            <button
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "linear-gradient(135deg,#2563eb,#0f766e)",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                cursor: "pointer"
              }}
              // onClick={async () => {
              //   try {
              //     // optional fullscreen
              //     if (!document.fullscreenElement) {
              //       await document.documentElement.requestFullscreen();
              //     }


              //   } catch {}

              //   setShowStartModal(false);
              //   setExamStarted(true);
              // }}





              //             onClick={async () => {
              //   try {
              //     // Fullscreen
              //     if (!document.fullscreenElement) {
              //       await document.documentElement.requestFullscreen();
              //     }

              //     // ✅ Start exam
              //     await api.get(`/assignments/${assignment_id}/start`);

              //     // ✅ Fetch questions/scenarios AFTER start
              //     if (assignment.assignment_type === "scenario") {

              //       const scenarioRes = await api.get(`/api/scenarios/assignment/${assignment_id}/scenarios`);

              //       const saved = normalizeSavedAnswers(scenarioRes.data.saved_answers);
              //       setScenarios(scenarioRes.data.scenarios || []);
              //       setAnswers(saved);
              //       answersRef.current = saved;

              //       const startedAt = new Date(scenarioRes.data.started_at);
              //       const durationMinutes = scenarioRes.data.duration_minutes;
              //       const endTime = new Date(startedAt.getTime() + durationMinutes * 60000);
              //       setInitialSeconds(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));

              //     } else {

              //       const questionRes = await api.get(`/assignments/${assignment_id}/questions`);

              //       const saved = normalizeSavedAnswers(questionRes.data.saved_answers);
              //       setQuestions(questionRes.data.questions || []);
              //       setAnswers(saved);
              //       answersRef.current = saved;

              //       const startedAt = new Date(questionRes.data.started_at);
              //       const durationMinutes = questionRes.data.duration_minutes;
              //       const endTime = new Date(startedAt.getTime() + durationMinutes * 60000);
              //       setInitialSeconds(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
              //     }

              //     setShowStartModal(false);
              //     setExamStarted(true);

              //   } catch (err) {
              //     console.error(err.response?.data?.error || "Failed to start exam");
              //   }
              // }}


              onClick={async () => {
                try {
                  // ✅ Clear previous violations (VERY IMPORTANT)
                  const violationKey = `violations_${assignment_id}`;
                  localStorage.removeItem(violationKey);

                  // Fullscreen
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                  }

                  // ✅ Start exam
                  await api.get(`/assignments/${assignment_id}/start`);

                  // ✅ Fetch questions/scenarios AFTER start
                  if (assignment.assignment_type === "scenario") {

                    const scenarioRes = await api.get(`/api/scenarios/assignment/${assignment_id}/scenarios`);

                    const saved = normalizeSavedAnswers(scenarioRes.data.saved_answers);
                    setScenarios(scenarioRes.data.scenarios || []);
                    setAnswers(saved);
                    answersRef.current = saved;

                    const startedAt = new Date(scenarioRes.data.started_at);
                    const durationMinutes = scenarioRes.data.duration_minutes;
                    const endTime = new Date(startedAt.getTime() + durationMinutes * 60000);
                    setInitialSeconds(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));

                  } else {

                    const questionRes = await api.get(`/assignments/${assignment_id}/questions`);

                    const saved = normalizeSavedAnswers(questionRes.data.saved_answers);
                    setQuestions(questionRes.data.questions || []);
                    setAnswers(saved);
                    answersRef.current = saved;

                    const startedAt = new Date(questionRes.data.started_at);
                    const durationMinutes = questionRes.data.duration_minutes;
                    const endTime = new Date(startedAt.getTime() + durationMinutes * 60000);
                    setInitialSeconds(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
                  }

                  setShowStartModal(false);
                  setExamStarted(true);

                } catch (err) {
                  console.error(err.response?.data?.error || "Failed to start exam");
                }
              }}


            >
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }



  const isScenario = assignment?.assignment_type === "scenario";
  const urgent = timeLeft < 120;

  return (
    <div style={styles.page}>
      {/* ── Violation Toast ── */}
      {toast && toast.visible && (
        <div style={styles.toast}>
          <div style={styles.toastIcon}>⚠️</div>
          <div style={styles.toastBody}>
            <div style={styles.toastCount}>Violation {toast.count}/{toast.limit}</div>
            <div style={styles.toastMessage}>{toast.message}</div>
          </div>
        </div>
      )}
      <div style={styles.progressRail}>
        <div
          style={{
            ...styles.progressFill,
            width: `${Math.max(5, (answeredCount / Math.max(items.length, 1)) * 100)}%`
          }}
        />
      </div>

      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>{isScenario ? "Scenario Assignment" : "Question Assignment"}</div>
          <h1 style={styles.title}>{assignment?.subject}</h1>
          <p style={styles.subtitle}>
            {answeredCount}/{items.length} answered • {assignment?.duration_minutes} minutes
          </p>
        </div>
        <div style={{ ...styles.timerBox, borderColor: urgent ? "#fecaca" : "#cbd5e1" }}>
          <span style={{ ...styles.timer, color: urgent ? "#dc2626" : "#0f172a" }}>
            {formattedTimeLeft}
          </span>
          <div style={styles.timerMeta}>
            {isFullscreen ? "Fullscreen active" : "Fullscreen required"}
          </div>
        </div>
      </header>

      <section style={styles.securityBanner}>
        <div>
          <strong style={styles.securityTitle}>Secure exam mode</strong>
          <p style={styles.securityText}>
            Tab changes, copy/paste, cut, select-all, and right click are blocked and monitored.
          </p>
        </div>
        <div style={styles.securityStats}>
          <span style={styles.securityChip}>Violations: {violationCount}</span>
          <span style={styles.securityChip}>Remaining: {violationsRemaining}</span>
        </div>
      </section>

      {lastWarning ? (
        <section style={styles.warningCard}>
          <strong style={styles.warningTitle}>Warning recorded</strong>
          <p style={styles.warningText}>{lastWarning}</p>
        </section>
      ) : null}

      {isScenario && scenarios.map((scenario) => {
        const scenarioJson =
          typeof scenario.scenario_json === "string"
            ? JSON.parse(scenario.scenario_json)
            : scenario.scenario_json;

        return (
          <section key={scenario.scenario_id} style={styles.contextCard}>
            <div style={styles.contextTop}>
              <span style={styles.contextTag}>{scenario.title}</span>
              <span style={styles.contextDomain}>{scenarioJson?.context?.domain}</span>
            </div>
            <p style={styles.contextText}>{scenarioJson?.context?.description}</p>
            <p style={styles.problemText}>{scenarioJson?.problem_statement}</p>
          </section>
        );
      })}

      <main style={styles.list}>
        {items.map((item, index) => (
          <article key={item.id} style={styles.card}>
            <div style={styles.cardHead}>
              <div>
                <span style={styles.cardIndex}>{isScenario ? `Task ${index + 1}` : `Question ${index + 1}`}</span>
                {item.title ? <h3 style={styles.cardTitle}>{item.title}</h3> : null}
                {item.subtitle ? <div style={styles.cardMeta}>{item.subtitle}</div> : null}
              </div>
            </div>
            <p style={styles.prompt}>{item.prompt}</p>

            {item.type === "mcq" ? (
              <div style={styles.options}>
                {item.options.map((option) => (
                  <label key={option} style={styles.option}>
                    <input
                      type="radio"
                      checked={String(answers[item.id] || "") === String(option)}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [item.id]: option }))
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                style={styles.textarea}
                rows={6}
                placeholder="Write your answer here..."
                value={answers[item.id] || ""}
                onCopy={(event) => event.preventDefault()}
                onPaste={(event) => event.preventDefault()}
                onCut={(event) => event.preventDefault()}
                onContextMenu={(event) => event.preventDefault()}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [item.id]: event.target.value
                  }))
                }
              />
            )}
          </article>
        ))}
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerMeta}>
          <strong>{answeredCount}</strong> of {items.length} completed
        </div>
        <button
          type="button"
          style={styles.submit}
          disabled={submitting}
          onClick={() => handleSubmit(false)}
        >
          {submitting ? "Submitting..." : "Submit Assignment"}
        </button>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    padding: "24px 24px 64px",
    color: "#0f172a"
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f8fafc",
    color: "#475569",
    fontSize: 18
  },
  progressRail: {
    position: "sticky",
    top: 0,
    height: 6,
    background: "rgba(148,163,184,0.2)",
    borderRadius: 999,
    overflow: "hidden",
    zIndex: 30
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #2563eb 0%, #0f766e 100%)"
  },
  header: {
    maxWidth: 960,
    margin: "24px auto",
    padding: 24,
    borderRadius: 24,
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(148,163,184,0.18)",
    backdropFilter: "blur(16px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16
  },
  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#0f766e",
    fontWeight: 700
  },
  title: {
    margin: "8px 0 6px",
    fontSize: 32
  },
  subtitle: {
    margin: 0,
    color: "#64748b"
  },
  timerBox: {
    padding: "16px 20px",
    borderRadius: 18,
    border: "1px solid",
    background: "#fff",
    minWidth: 130,
    textAlign: "center"
  },
  timer: {
    fontSize: 28,
    fontWeight: 800
  },
  timerMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b"
  },
  securityBanner: {
    maxWidth: 960,
    margin: "0 auto 18px",
    padding: "18px 22px",
    borderRadius: 20,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap"
  },
  securityTitle: {
    display: "block",
    color: "#9a3412",
    marginBottom: 4
  },
  securityText: {
    margin: 0,
    color: "#9a3412",
    lineHeight: 1.6
  },
  securityStats: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  securityChip: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#ffedd5",
    color: "#9a3412",
    fontWeight: 700,
    fontSize: 13
  },
  warningCard: {
    maxWidth: 960,
    margin: "0 auto 18px",
    padding: "18px 22px",
    borderRadius: 18,
    background: "#fef2f2",
    border: "1px solid #fecaca"
  },
  warningTitle: {
    display: "block",
    color: "#b91c1c",
    marginBottom: 6
  },
  warningText: {
    margin: 0,
    color: "#7f1d1d",
    lineHeight: 1.6
  },
  contextCard: {
    maxWidth: 960,
    margin: "0 auto 20px",
    padding: 24,
    borderRadius: 22,
    background: "#0f172a",
    color: "#e2e8f0"
  },
  contextTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap"
  },
  contextTag: {
    background: "rgba(59,130,246,0.18)",
    color: "#bfdbfe",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 13
  },
  contextDomain: {
    color: "#a5f3fc",
    fontWeight: 600,
    fontSize: 13
  },
  contextText: {
    lineHeight: 1.7,
    margin: "0 0 10px"
  },
  problemText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: 1.7
  },
  list: {
    maxWidth: 960,
    margin: "0 auto",
    display: "grid",
    gap: 18
  },
  card: {
    background: "#fff",
    borderRadius: 24,
    padding: 24,
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)"
  },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10
  },
  cardIndex: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#2563eb",
    fontWeight: 700
  },
  cardTitle: {
    margin: "6px 0 4px",
    fontSize: 22
  },
  cardMeta: {
    color: "#64748b",
    fontSize: 13
  },
  prompt: {
    fontSize: 15,
    lineHeight: 1.7,
    color: "#334155"
  },
  options: {
    display: "grid",
    gap: 12,
    marginTop: 16
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid #dbeafe",
    background: "#f8fbff"
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 14,
    borderRadius: 18,
    border: "1px solid #cbd5e1",
    padding: 16,
    minHeight: 150,
    font: "inherit",
    resize: "vertical",
    background: "#f8fafc",
    color: "#0f172a"
  },
  footer: {
    maxWidth: 960,
    margin: "24px auto 0",
    padding: 24,
    borderRadius: 24,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)"
  },
  footerMeta: {
    color: "#475569"
  },
  submit: {
    border: "none",
    borderRadius: 16,
    padding: "14px 24px",
    background: "linear-gradient(135deg, #0f766e 0%, #2563eb 100%)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer"
  },
  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 99999,
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "16px 20px",
    borderRadius: 16,
    background: "linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)",
    color: "#fff",
    boxShadow: "0 12px 40px rgba(185, 28, 28, 0.4)",
    minWidth: 280,
    maxWidth: 400,
    animation: "slideInRight 0.3s ease-out"
  },
  toastIcon: {
    fontSize: 22,
    flexShrink: 0,
    marginTop: 2
  },
  toastBody: {
    flex: 1
  },
  toastCount: {
    fontWeight: 800,
    fontSize: 14,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  toastMessage: {
    fontSize: 13,
    lineHeight: 1.5,
    opacity: 0.92
  }
};



