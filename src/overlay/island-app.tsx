import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useLiveElapsedTime } from "@/hooks/use-live-elapsed-time";

const userId = import.meta.env.VITE_USER_ID as Id<"users">;

type IslandState = "compact" | "hover" | "expanded";

type RunningTimer = NonNullable<
  FunctionReturnType<typeof api.time_entries.getRunningTimer>
>;

interface IslandAppProps {
  hasNotch: boolean;
  notchWidth: number;
  windowWidth: number;
}

const TRANSITION_MS = 400;
const TRANSITION_CSS = "0.4s";

/** cubic-bezier(0.4, 0, 0.2, 1) easing — matches the CSS transition curve */
function bezierEase(t: number): number {
  // Binary-search for parameter u where x(u) = t, then return y(u)
  // B(u) with P1=(0.4, 0) P2=(0.2, 1)
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 20; i++) {
    const u = (lo + hi) / 2;
    const x = 1.2 * u * (1 - u) * (1 - u) + 0.6 * u * u * (1 - u) + u * u * u;
    if (x < t) lo = u;
    else hi = u;
  }
  const u = (lo + hi) / 2;
  return 3 * u * u - 2 * u * u * u;
}

export function IslandApp({ hasNotch, notchWidth }: IslandAppProps) {
  const runningTimer = useQuery(api.time_entries.getRunningTimer, { userId });
  const [state, setState] = useState<IslandState>("compact");
  const stateRef = useRef<IslandState>("compact");
  stateRef.current = state;

  const leaveTimer = useRef<number | null>(null);
  const guardTimer = useRef<number | null>(null);
  const exitGuard = useRef(false);
  const deferredExit = useRef(false);

  // JS-driven window animation refs
  const animationRef = useRef<number | null>(null);
  const initDims = getDimensions("compact", hasNotch, notchWidth);
  const currentDimsRef = useRef({
    width: initDims.width,
    height: initDims.height,
  });
  // Ref breaks circular dep: scheduleCollapse → animateToState → guardResize → scheduleCollapse
  const animateRef = useRef<(target: IslandState) => void>();

  const scheduleCollapse = useCallback(() => {
    leaveTimer.current = window.setTimeout(() => {
      animateRef.current?.("compact");
      leaveTimer.current = null;
    }, 200);
  }, []);

  /** Activate the exit guard for `ms`, then verify mouse position with Rust. */
  const guardResize = useCallback(
    (ms: number) => {
      exitGuard.current = true;
      deferredExit.current = false;
      if (guardTimer.current) clearTimeout(guardTimer.current);
      guardTimer.current = window.setTimeout(async () => {
        exitGuard.current = false;
        guardTimer.current = null;
        if (deferredExit.current) {
          deferredExit.current = false;
          const inside = await invoke<boolean>("check_island_mouse");
          if (!inside) scheduleCollapse();
        }
      }, ms);
    },
    [scheduleCollapse],
  );

  /** Unified state + window-resize animation.
   *
   *  Sets React state immediately (CSS opacity / border-radius transitions start),
   *  then drives the Tauri window resize frame-by-frame with the same easing.
   *  Because the container is always `width:100%; height:100%` of the window,
   *  window and container stay in perfect sync — no viewport-mismatch flash. */
  const animateToState = useCallback(
    (target: IslandState) => {
      // Cancel any in-progress animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Cancel any pending collapse
      if (leaveTimer.current) {
        clearTimeout(leaveTimer.current);
        leaveTimer.current = null;
      }

      const from = { ...currentDimsRef.current };
      const to = getDimensions(target, hasNotch, notchWidth);

      // Set state immediately → CSS opacity / border-radius transitions start
      setState(target);

      // Brief guard for the tracking-area rebuild at the start of the resize
      guardResize(150);

      // Animate window resize frame-by-frame
      const start = performance.now();
      function frame() {
        const elapsed = performance.now() - start;
        const t = Math.min(elapsed / TRANSITION_MS, 1);
        const e = bezierEase(t);
        const w = from.width + (to.width - from.width) * e;
        const h = from.height + (to.height - from.height) * e;
        currentDimsRef.current = { width: w, height: h };
        invoke("resize_island", { width: w, height: h });
        if (t < 1) {
          animationRef.current = requestAnimationFrame(frame);
        } else {
          animationRef.current = null;
        }
      }
      animationRef.current = requestAnimationFrame(frame);
    },
    [hasNotch, notchWidth, guardResize],
  );

  // Keep ref in sync so scheduleCollapse can call it
  animateRef.current = animateToState;

  // Native mouse tracking via Tauri events (NSTrackingArea).
  useEffect(() => {
    const unlistenEnter = listen("island-mouse-entered", () => {
      deferredExit.current = false;
      if (leaveTimer.current) {
        clearTimeout(leaveTimer.current);
        leaveTimer.current = null;
      }
      if (stateRef.current === "compact") {
        animateToState("hover");
      }
    });

    const unlistenExit = listen("island-mouse-exited", () => {
      if (exitGuard.current) {
        deferredExit.current = true;
        return;
      }
      scheduleCollapse();
    });

    return () => {
      unlistenEnter.then((f) => f());
      unlistenExit.then((f) => f());
    };
  }, [scheduleCollapse, animateToState]);

  const handleClick = useCallback(() => {
    const current = stateRef.current;
    if (current === "compact" || current === "hover") {
      animateToState("expanded");
    } else {
      animateToState("compact");
    }
  }, [animateToState]);

  if (runningTimer === undefined) return null;

  return (
    <IslandContainer
      state={state}
      hasNotch={hasNotch}
      notchWidth={notchWidth}
      isRunning={!!runningTimer}
      runningTimer={runningTimer}
      onClick={handleClick}
    />
  );
}

/* ─── Dimensions per state ───────────────────────────────────── */

function getDimensions(
  state: IslandState,
  hasNotch: boolean,
  notchWidth: number,
) {
  if (hasNotch) {
    switch (state) {
      case "compact":
        return {
          width: notchWidth,
          height: 56,
          borderRadius: "0 0 14px 14px",
        };
      case "hover":
        return {
          width: Math.max(380, notchWidth + 180),
          height: 56,
          borderRadius: "0 0 14px 14px",
        };
      case "expanded":
        return {
          width: Math.max(480, notchWidth + 280),
          height: 200,
          borderRadius: "0 0 14px 14px",
        };
    }
  }
  switch (state) {
    case "compact":
      return { width: 140, height: 32, borderRadius: "16px" };
    case "hover":
      return { width: 360, height: 48, borderRadius: "24px" };
    case "expanded":
      return { width: 460, height: 200, borderRadius: "32px" };
  }
}

/* ─── Animated container ─────────────────────────────────────── */

interface IslandContainerProps {
  state: IslandState;
  hasNotch: boolean;
  notchWidth: number;
  isRunning: boolean;
  runningTimer: RunningTimer | null;
  onClick: () => void;
}

function IslandContainer({
  state,
  hasNotch,
  notchWidth,
  isRunning,
  runningTimer,
  onClick,
}: IslandContainerProps) {
  const elapsed = useLiveElapsedTime(runningTimer?.start_time ?? 0, isRunning);
  const dims = getDimensions(state, hasNotch, notchWidth);

  const createMutation = useMutation(api.time_entries.create);
  const stopMutation = useMutation(api.time_entries.stop);

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (runningTimer) stopMutation({ id: runningTimer._id, userId });
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    createMutation({ userId, name: "New Time Entry" });
  };

  return (
    <div
      onClick={onClick}
      className="select-none"
      style={{
        // display: "grid",
        position: "relative",
        /* Container fills the Tauri window — JS animation drives the window size,
           so container + window are always in perfect sync. No flash. */
        width: "100%",
        height: "100%",
        borderRadius: dims.borderRadius,
        overflow: "hidden",
        background: "black",
        cursor: state === "hover" ? "pointer" : "default",
        /* Only transition visual props — width/height are driven by JS animation */
        transition: `border-radius ${TRANSITION_CSS} cubic-bezier(0.4, 0, 0.2, 1), box-shadow ${TRANSITION_CSS} cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      <Layer
        active={state === "compact"}
        snap
        style={{
          alignItems: "end",
          justifyContent: "center",
        }}
      >
        <CompactContent
          isRunning={isRunning}
          hasNotch={hasNotch}
          elapsed={elapsed}
        />
      </Layer>

      <Layer
        active={state === "hover"}
        delay={150}
        style={{
          alignItems: "end",
          justifyContent: "center",
          padding: "0 8px 2px 8px",
        }}
      >
        <HoverContent
          isRunning={isRunning}
          elapsed={elapsed}
          timer={runningTimer}
        />
      </Layer>

      <Layer
        active={state === "expanded"}
        style={{
          flexDirection: "column",
          padding: hasNotch ? "16px 24px 20px" : "20px 24px",
        }}
      >
        <ExpandedContent
          isRunning={isRunning}
          elapsed={elapsed}
          timer={runningTimer}
          onStop={handleStop}
          onStart={handleStart}
        />
      </Layer>
    </div>
  );
}

/* ─── Grid-stacked layer with cross-fade ─────────────────────── */

function Layer({
  active,
  snap,
  delay,
  style,
  children,
}: {
  active: boolean;
  /** When true, opacity snaps instantly (no cross-fade). */
  snap?: boolean;
  /** Delay (ms) before fade-in. Fade-out is always immediate. */
  delay?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(active);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (active && delay) {
      // Delay fade-in
      timerRef.current = window.setTimeout(() => setVisible(true), delay);
    } else {
      // Immediate: fade-out or no-delay fade-in
      setVisible(active);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, delay]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        background: "black",
        opacity: visible ? 1 : 0,
        transition: snap
          ? "none"
          : `opacity ${visible ? TRANSITION_CSS : "0.15s"} ease`,
        pointerEvents: active ? "auto" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Content: Compact ───────────────────────────────────────── */

function CompactContent({
  isRunning,
  hasNotch,
  elapsed,
}: {
  isRunning: boolean;
  hasNotch: boolean;
  elapsed: string;
}) {
  if (hasNotch) {
    return (
      <div className="flex items-center gap-1.5 m-0 p-0">
        <StatusDot running={isRunning} size={4} />
        {isRunning && (
          <span className="text-[12px] font-medium font-sans tabular-nums text-white/60">
            {elapsed}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <StatusDot running={isRunning} />
      <span className="text-[13px] font-medium font-sans tabular-nums text-white/90">
        {isRunning ? elapsed : "No timer"}
      </span>
    </div>
  );
}

/* ─── Content: Hover ─────────────────────────────────────────── */

function HoverContent({
  isRunning,
  elapsed,
  timer,
}: {
  isRunning: boolean;
  elapsed: string;
  timer: RunningTimer | null;
}) {
  return (
    <div className="flex items-center justify-between w-full gap-2.5">
      <div className="flex items-center gap-2.5">
        <StatusDot running={isRunning} />
        <span className="text-sm font-semibold font-sans tabular-nums text-white/95">
          {isRunning ? elapsed : "00:00:00"}
        </span>
      </div>
      {isRunning && timer && (
        <>
          <span className="max-w-[200px] truncate text-xs text-white/50 font-sans">
            {timer.name}
          </span>
          {(timer.client || timer.project) && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 9999,
                background: "rgba(255,255,255,0.1)",
                padding: "3px 8px",
                fontSize: 10,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {timer.client?.name || timer.project?.name}
            </span>
          )}
        </>
      )}
      {!isRunning && (
        <span className="text-xs text-white/40 font-sans">No active timer</span>
      )}
    </div>
  );
}

/* ─── Content: Expanded ──────────────────────────────────────── */

function ExpandedContent({
  isRunning,
  elapsed,
  timer,
  onStop,
  onStart,
}: {
  isRunning: boolean;
  elapsed: string;
  timer: RunningTimer | null;
  onStop: (e: React.MouseEvent) => void;
  onStart: (e: React.MouseEvent) => void;
}) {
  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 9999,
    background: "rgba(255,255,255,0.1)",
    padding: "3px 10px",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <StatusDot running={isRunning} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {isRunning ? "Tracking" : "Idle"}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {isRunning && timer ? (
          <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                  color: "rgba(255,255,255,0.95)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {elapsed}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.55)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: 8,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {timer.name}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {timer.client && <span style={badgeStyle}>{timer.client.name}</span>}
                {timer.project && <span style={badgeStyle}>{timer.project.name}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={onStop}
              style={{
                flexShrink: 0,
                width: 48,
                height: 48,
                borderRadius: 9999,
                background: "rgba(239,68,68,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: 3, background: "white" }} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%" }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.65)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                No active timer
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 2,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Click to begin tracking
              </div>
            </div>
            <button
              type="button"
              onClick={onStart}
              style={{
                flexShrink: 0,
                width: 48,
                height: 48,
                borderRadius: 9999,
                background: "rgba(34,197,94,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "8px solid transparent",
                  borderBottom: "8px solid transparent",
                  borderLeft: "14px solid white",
                  marginLeft: 2,
                }}
              />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Shared ─────────────────────────────────────────────────── */

function StatusDot({ running, size = 6 }: { running: boolean; size?: number }) {
  return (
    <span
      className={`shrink-0 rounded-full ${
        running ? "bg-green-400 animate-pulse" : "bg-neutral-500"
      }`}
      style={{ width: size, height: size }}
    />
  );
}
