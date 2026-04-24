import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_LIMIT = 3;
const LOCK_DURATION_MS = 1200;
const TOAST_DURATION_MS = 3000;

const WARNING_MESSAGES = {
  hidden: "Tab switching is not allowed during the exam.",
  fullscreen: "Leaving fullscreen is not allowed during the exam.",
  copy: "Copy is disabled during the exam.",
  paste: "Paste is disabled during the exam.",
  cut: "Cut is disabled during the exam.",
  selectAll: "Select all is disabled during the exam.",
  contextmenu: "Right click is disabled during the exam."
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const getViolationMessage = (type) =>
  WARNING_MESSAGES[type] || "Restricted activity detected during the exam.";

export default function useSecureExamSession({
  enabled,
  initialSeconds,
  onTimeUp,
  onViolationLimitReached,
  violationLimit = DEFAULT_LIMIT,
  enableFullscreen = true,
  assignmentId
}) {
  const storageKey = assignmentId
    ? `violations_${assignmentId}`
    : `violations_${window.location.pathname}`;

  // ── State ──────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, initialSeconds || 0));

  const [violationCount, setViolationCount] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? Number(saved) : 0;
  });

  const [lastWarning, setLastWarning] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));

  // Toast state: { message, count, limit, visible }
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // ── Refs ────────────────────────────────────────────────────────────────
  const onTimeUpRef = useRef(onTimeUp);
  const onViolationLimitReachedRef = useRef(onViolationLimitReached);
  const triggeredTimeUpRef = useRef(false);
  const triggeredViolationRef = useRef(false);

  // Source of truth for violation count (avoids stale closures)
  const violationCountRef = useRef(
    Number(localStorage.getItem(storageKey)) || 0
  );

  // Lock to prevent duplicate violations from a single user action
  const violationLockRef = useRef(false);
  // Tracks what caused the current lock (e.g. "copy") so fullscreen-exit
  // events triggered by copy/paste can be suppressed.
  const lastActionRef = useRef(null);

  // ── Keep callback refs fresh ───────────────────────────────────────────
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    onViolationLimitReachedRef.current = onViolationLimitReached;
  }, [onViolationLimitReached]);

  // ── Initialise from localStorage on mount / when exam starts ───────────
  useEffect(() => {
    setTimeLeft(Math.max(0, initialSeconds || 0));
    triggeredTimeUpRef.current = false;
    triggeredViolationRef.current = false;

    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      const value = Number(saved);
      setViolationCount(value);
      violationCountRef.current = value;
    }

    setLastWarning("");
  }, [initialSeconds, storageKey]);

  // ── Keep ref in sync with state ────────────────────────────────────────
  useEffect(() => {
    violationCountRef.current = violationCount;
  }, [violationCount]);

  // ── Toast helper ───────────────────────────────────────────────────────
  const showToast = useCallback((message, count, limit) => {
    // Clear any pending hide-timer
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ message, count, limit, visible: true });

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Core violation recorder ────────────────────────────────────────────
  const recordViolation = useCallback((type) => {
    const warning = getViolationMessage(type);

    const next = violationCountRef.current + 1;
    violationCountRef.current = next;

    setViolationCount(next);
    localStorage.setItem(storageKey, next);
    setLastWarning(warning);

    if (next >= violationLimit && !triggeredViolationRef.current) {
      triggeredViolationRef.current = true;

      // Show final toast, then auto-submit after a brief pause so the
      // user can read the "3/3 — auto-submitting" message.
      showToast(`${warning} Violation 3/3 reached — your test is being auto-submitted now.`, next, violationLimit);

      setTimeout(() => {
        onViolationLimitReachedRef.current?.({
          type,
          violationCount: next,
          warning
        });
      }, 2000);
    } else {
      showToast(warning, next, violationLimit);
    }
  }, [violationLimit, storageKey, showToast]);

  // ── Safe wrapper — deduplicates violations ─────────────────────────────
  const safeViolation = useCallback((type, source = "generic") => {
    if (violationLockRef.current) return;

    violationLockRef.current = true;

    // Mark the source BEFORE recording so that fullscreen-change and
    // visibility-change handlers can decide whether to suppress.
    if (["copy", "paste", "cut", "contextmenu", "selectAll"].includes(type)) {
      lastActionRef.current = "copy";
    } else {
      lastActionRef.current = source;
    }

    recordViolation(type);

    // Skip fullscreen restore if violation limit reached — the component
    // is about to navigate away and requestFullscreen would interfere.
    if (violationCountRef.current < violationLimit) {
      // Silently restore fullscreen (non-blocking, no alert)
      setTimeout(async () => {
        try {
          if (enableFullscreen && !document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch {
          // user may have blocked fullscreen
        }
      }, 200);
    }

    // Release the lock after a generous window
    setTimeout(() => {
      violationLockRef.current = false;
      lastActionRef.current = null;
    }, LOCK_DURATION_MS);
  }, [recordViolation, enableFullscreen, violationLimit]);

  // ── Fullscreen + visibility monitoring ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return undefined;

    // Enter fullscreen on exam start
    if (
      enableFullscreen &&
      document.documentElement.requestFullscreen &&
      !document.fullscreenElement
    ) {
      document.documentElement.requestFullscreen().catch(() => {
        setLastWarning("Fullscreen could not be enabled. Continue carefully.");
      });
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) return;

      // If the tab-hidden event was triggered by a copy/paste action
      // (which can briefly lose focus), suppress the duplicate violation.
      if (violationLockRef.current && lastActionRef.current === "copy") {
        // Silently restore fullscreen
        setTimeout(() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }, 100);
        return;
      }

      safeViolation("hidden", "tab");
    };

    const handleFullscreenChange = () => {
      const fullscreenActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreenActive);

      if (enableFullscreen && !fullscreenActive) {
        // If fullscreen exited because of a copy/paste action,
        // silently restore without counting a violation.
        if (lastActionRef.current === "copy") {
          setTimeout(() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          }, 100);
          return;
        }

        safeViolation("fullscreen", "fullscreen");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [enabled, enableFullscreen, safeViolation]);

  // ── Countdown timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return undefined;

    const intervalId = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          if (!triggeredTimeUpRef.current) {
            triggeredTimeUpRef.current = true;
            onTimeUpRef.current?.();
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [enabled]);

  // ── Clipboard / keyboard shortcut blocking ─────────────────────────────
  useEffect(() => {
    if (!enabled) return undefined;

    const handleCopy = (event) => {
      event.preventDefault();
      safeViolation("copy", "copy");
    };

    const handlePaste = (event) => {
      event.preventDefault();
      safeViolation("paste", "copy");
    };

    const handleCut = (event) => {
      event.preventDefault();
      safeViolation("cut", "copy");
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
      safeViolation("contextmenu", "copy");
    };

    const handleKeyDown = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;

      const key = event.key.toLowerCase();

      if (key === "c") {
        event.preventDefault();
        safeViolation("copy", "copy");
      } else if (key === "v") {
        event.preventDefault();
        safeViolation("paste", "copy");
      } else if (key === "x") {
        event.preventDefault();
        safeViolation("cut", "copy");
      } else if (key === "a") {
        event.preventDefault();
        safeViolation("selectAll", "copy");
      }
    };

    window.addEventListener("copy", handleCopy);
    window.addEventListener("paste", handlePaste);
    window.addEventListener("cut", handleCut);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("cut", handleCut);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, safeViolation]);

  // ── Exit fullscreen on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  return useMemo(
    () => ({
      timeLeft,
      formattedTimeLeft: formatTime(timeLeft),
      violationCount,
      violationsRemaining: Math.max(0, violationLimit - violationCount),
      lastWarning,
      isFullscreen,
      toast
    }),
    [isFullscreen, lastWarning, timeLeft, toast, violationCount, violationLimit]
  );
}