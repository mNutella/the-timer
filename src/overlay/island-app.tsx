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

type RecentProject = NonNullable<
  FunctionReturnType<typeof api.time_entries.getRecentProjects>
>[number];

export function IslandApp({ hasNotch, notchWidth }: IslandAppProps) {
  const runningTimer = useQuery(api.time_entries.getRunningTimer, { userId });
  const recentProjects = useQuery(api.time_entries.getRecentProjects, {
    userId,
    limit: 4,
  });
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

  // Ref-based flag to prevent collapse while inline editing
  const isEditingRef = useRef(false);

  const scheduleCollapse = useCallback(() => {
    if (isEditingRef.current) return;
    leaveTimer.current = window.setTimeout(() => {
      if (isEditingRef.current) return;
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
    if (isEditingRef.current) return;
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
      recentProjects={recentProjects ?? []}
      onClick={handleClick}
      isEditingRef={isEditingRef}
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
          height: 220,
          borderRadius: "0 0 14px 14px",
        };
    }
  }
  switch (state) {
    case "compact":
      return { width: 140, height: 32, borderRadius: "16px" };
    case "hover":
      return { width: 360, height: 48, borderRadius: "16px" };
    case "expanded":
      return { width: 460, height: 220, borderRadius: "16px" };
  }
}

/* ─── Animated container ─────────────────────────────────────── */

interface IslandContainerProps {
  state: IslandState;
  hasNotch: boolean;
  notchWidth: number;
  isRunning: boolean;
  runningTimer: RunningTimer | null;
  recentProjects: RecentProject[];
  onClick: () => void;
  isEditingRef: React.MutableRefObject<boolean>;
}

function IslandContainer({
  state,
  hasNotch,
  notchWidth,
  isRunning,
  runningTimer,
  recentProjects,
  onClick,
  isEditingRef,
}: IslandContainerProps) {
  const elapsed = useLiveElapsedTime(runningTimer?.start_time ?? 0, isRunning);
  const dims = getDimensions(state, hasNotch, notchWidth);

  const createMutation = useMutation(api.time_entries.create);
  const stopMutation = useMutation(api.time_entries.stop);
  const updateMutation = useMutation(api.time_entries.update);

  const handleNameUpdate = useCallback(
    (name: string) => {
      if (runningTimer) {
        updateMutation({ id: runningTimer._id, userId, name });
      }
    },
    [runningTimer, updateMutation],
  );

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (runningTimer) stopMutation({ id: runningTimer._id, userId });
  };

  const handleStart = (
    e: React.MouseEvent,
    project?: RecentProject,
    customName?: string,
  ) => {
    e.stopPropagation();
    createMutation({
      userId,
      name: customName || project?.lastEntryName || "New Time Entry",
      projectId: project?.projectId,
      clientId: project?.clientId,
      categoryId: project?.categoryId,
    });
  };

  return (
    <div
      onClick={onClick}
      style={{
        userSelect: "none",
        position: "relative",
        /* Container fills the Tauri window — JS animation drives the window size,
           so container + window are always in perfect sync. No flash. */
        width: "100%",
        height: "100%",
        background: "black",
        /* clip-path is resolved per-paint at compositing time, unlike overflow:hidden +
           borderRadius which can lag the window resize by a frame. */
        clipPath: `inset(0 round ${dims.borderRadius})`,
        cursor: state === "hover" ? "pointer" : "default",
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
        // delay={150}
        style={{
          alignItems: "stretch",
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
          recentProjects={recentProjects}
          onStop={handleStop}
          onStart={handleStart}
          onNameUpdate={handleNameUpdate}
          isEditingRef={isEditingRef}
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          position: "absolute",
          width: "100%",
          justifyContent: "center",
        }}
      >
        <StatusDot running={isRunning} size={4} />
        {isRunning && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
              fontVariantNumeric: "tabular-nums",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {elapsed}
          </span>
        )}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <StatusDot running={isRunning} />
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "Inter, sans-serif",
          fontVariantNumeric: "tabular-nums",
          color: "rgba(255,255,255,0.9)",
        }}
      >
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
  const isEmptyBadge = !(timer?.client || timer?.project);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        gap: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <StatusDot running={isRunning} />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            fontVariantNumeric: "tabular-nums",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          {isRunning ? elapsed : "00:00:00"}
        </span>
      </div>
      {isRunning && timer && (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 350,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {timer.name}
            </span>
          </div>
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
                maxHeight: "24px",
                position: "absolute",
                top: 0,
                right: 0,
              }}
            >
              {timer.client?.name || timer.project?.name}
            </span>
          )}
        </>
      )}
      {!isRunning && (
        <span
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          No active timer
        </span>
      )}
      {isEmptyBadge && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 9999,
            padding: "3px 8px",
            fontSize: 10,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          No client/project
        </span>
      )}
    </div>
  );
}

/* ─── Content: Expanded ──────────────────────────────────────── */

function ExpandedContent({
  isRunning,
  elapsed,
  timer,
  recentProjects,
  onStop,
  onStart,
  onNameUpdate,
  isEditingRef,
}: {
  isRunning: boolean;
  elapsed: string;
  timer: RunningTimer | null;
  recentProjects: RecentProject[];
  onStop: (e: React.MouseEvent) => void;
  onStart: (
    e: React.MouseEvent,
    project?: RecentProject,
    customName?: string,
  ) => void;
  onNameUpdate: (name: string) => void;
  isEditingRef: React.MutableRefObject<boolean>;
}) {
  return (
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
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
          <ExpandedRunningContent
            elapsed={elapsed}
            timer={timer}
            onStop={onStop}
            onNameUpdate={onNameUpdate}
            isEditingRef={isEditingRef}
          />
        ) : (
          <ExpandedIdleContent
            recentProjects={recentProjects}
            onStart={onStart}
            isEditingRef={isEditingRef}
          />
        )}
      </div>
    </>
  );
}

/* ─── Expanded: Running timer ────────────────────────────────── */

function ExpandedRunningContent({
  elapsed,
  timer,
  onStop,
  onNameUpdate,
  isEditingRef,
}: {
  elapsed: string;
  timer: RunningTimer;
  onStop: (e: React.MouseEvent) => void;
  onNameUpdate: (name: string) => void;
  isEditingRef: React.MutableRefObject<boolean>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean up editing state if this component unmounts while editing
  // (e.g. timer stops → parent switches to ExpandedIdleContent)
  useEffect(() => {
    return () => {
      if (isEditingRef.current) {
        isEditingRef.current = false;
        invoke("unfocus_island");
      }
    };
  }, [isEditingRef]);

  const startEditing = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditValue(timer.name);
      setIsEditing(true);
      isEditingRef.current = true;
      invoke("focus_island").then(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    },
    [timer, isEditingRef],
  );

  const finishEditing = useCallback(
    (save: boolean) => {
      if (save && editValue.trim()) {
        onNameUpdate(editValue.trim());
      }
      setIsEditing(false);
      isEditingRef.current = false;
      invoke("unfocus_island");
    },
    [editValue, onNameUpdate, isEditingRef],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishEditing(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finishEditing(false);
      }
    },
    [finishEditing],
  );

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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        width: "100%",
      }}
    >
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
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => finishEditing(true)}
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.55)",
              marginTop: 8,
              fontFamily: "Inter, sans-serif",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.3)",
              outline: "none",
              width: "100%",
              padding: 0,
              lineHeight: "normal",
            }}
          />
        ) : (
          <div
            onClick={startEditing}
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.55)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: 8,
              fontFamily: "Inter, sans-serif",
              cursor: "text",
            }}
          >
            {timer.name}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {timer.client && <span style={badgeStyle}>{timer.client.name}</span>}
          {timer.project && (
            <span style={badgeStyle}>{timer.project.name}</span>
          )}
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
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            background: "white",
          }}
        />
      </button>
    </div>
  );
}

/* ─── Expanded: Idle / creation ──────────────────────────────── */

function ExpandedIdleContent({
  recentProjects,
  onStart,
  isEditingRef,
}: {
  recentProjects: RecentProject[];
  onStart: (
    e: React.MouseEvent,
    project?: RecentProject,
    customName?: string,
  ) => void;
  isEditingRef: React.MutableRefObject<boolean>;
}) {
  const [newEntryName, setNewEntryName] = useState("");
  const newEntryInputRef = useRef<HTMLInputElement>(null);
  const [isCreationFocused, setIsCreationFocused] = useState(false);

  const handleCreationFocus = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsCreationFocused(true);
      isEditingRef.current = true;
      invoke("focus_island").then(() => {
        setTimeout(() => newEntryInputRef.current?.focus(), 50);
      });
    },
    [isEditingRef],
  );

  const handleCreationBlur = useCallback(() => {
    setIsCreationFocused(false);
    isEditingRef.current = false;
    invoke("unfocus_island");
  }, [isEditingRef]);

  const handleCreationStart = useCallback(
    (e: React.MouseEvent, project?: RecentProject) => {
      const name = newEntryName.trim();
      onStart(e, project, name || undefined);
      setNewEntryName("");
      if (isCreationFocused) {
        setIsCreationFocused(false);
        isEditingRef.current = false;
        invoke("unfocus_island");
      }
    },
    [newEntryName, isCreationFocused, onStart, isEditingRef],
  );

  const handleCreationKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreationStart(e as unknown as React.MouseEvent);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setNewEntryName("");
        setIsCreationFocused(false);
        isEditingRef.current = false;
        invoke("unfocus_island");
        newEntryInputRef.current?.blur();
      }
    },
    [handleCreationStart, isEditingRef],
  );

  return (
    <div style={{ width: "100%" }}>
      {/* Name input + start button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          onClick={handleCreationFocus}
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <input
            ref={newEntryInputRef}
            value={newEntryName}
            onChange={(e) => setNewEntryName(e.target.value)}
            onKeyDown={handleCreationKeyDown}
            onBlur={handleCreationBlur}
            placeholder="What are you working on?"
            style={{
              width: "100%",
              fontSize: 14,
              color: "rgba(255,255,255,0.85)",
              fontFamily: "Inter, sans-serif",
              background: "transparent",
              border: "none",
              borderBottom: isCreationFocused
                ? "1px solid rgba(255,255,255,0.3)"
                : "1px solid rgba(255,255,255,0.1)",
              outline: "none",
              padding: "4px 0",
              transition: "border-color 0.15s ease",
            }}
          />
        </div>
        <button
          type="button"
          onMouseDown={(e) => {
            // Prevent blur from firing before start
            e.preventDefault();
            handleCreationStart(e);
          }}
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 9999,
            background: "rgba(34,197,94,0.7)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(34,197,94,0.9)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(34,197,94,0.7)";
          }}
        >
          <span
            style={{
              width: 0,
              height: 0,
              borderTop: "5px solid transparent",
              borderBottom: "5px solid transparent",
              borderLeft: "9px solid white",
              marginLeft: 2,
            }}
          />
        </button>
      </div>

      {/* Recent projects */}
      {recentProjects.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
          }}
        >
          {recentProjects.map((project) => (
            <button
              key={project.projectId}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreationStart(e, project);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                transition: "background 0.15s ease",
                maxWidth: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
            >
              <span
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "4px solid transparent",
                  borderBottom: "4px solid transparent",
                  borderLeft: "7px solid rgba(34,197,94,0.9)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: "Inter, sans-serif",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {project.projectName}
              </span>
              {project.clientName && (
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "Inter, sans-serif",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.clientName}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {recentProjects.length === 0 && !newEntryName && (
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          No recent projects
        </div>
      )}
    </div>
  );
}

/* ─── Shared ─────────────────────────────────────────────────── */

function StatusDot({ running, size = 6 }: { running: boolean; size?: number }) {
  return (
    <span
      style={{
        display: "block",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: running ? "#4ade80" : "#737373",
        animation: running
          ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
          : "none",
      }}
    />
  );
}
