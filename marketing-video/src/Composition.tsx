import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FPS = 30;
export const VIDEO_DURATION = 36 * FPS;

const palette = {
  ink: "#07111f",
  midnight: "#0b1324",
  panel: "rgba(255,255,255,0.075)",
  border: "rgba(255,255,255,0.14)",
  text: "#f7fbff",
  muted: "rgba(226,232,240,0.76)",
  blue: "#64d8ff",
  mint: "#48e0a4",
  gold: "#f5b942",
  coral: "#ff7a7a",
  violet: "#a88bff",
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const shadow = "0 28px 84px rgba(0, 0, 0, 0.38)";

function anim(frame: number, input: [number, number], output: [number, number]) {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

function sceneOpacity(frame: number, duration: number, fade = 16) {
  return interpolate(frame, [0, fade, duration - fade, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

function Background() {
  const frame = useCurrentFrame();
  const drift = anim(frame, [0, VIDEO_DURATION], [0, 220]);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(140deg, ${palette.ink} 0%, #0d2037 48%, #07141f 100%)` }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          backgroundPosition: `${drift}px ${drift * 0.65}px`,
          opacity: 0.22,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 18% 16%, rgba(100,216,255,0.20), transparent 24%), radial-gradient(circle at 74% 20%, rgba(72,224,164,0.14), transparent 22%), radial-gradient(circle at 86% 84%, rgba(245,185,66,0.12), transparent 26%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, rgba(7,17,31,0.20), rgba(7,17,31,0.0) 42%, rgba(7,17,31,0.24))",
        }}
      />
    </AbsoluteFill>
  );
}

function BrandBar() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 30,
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: palette.text,
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: 0.3,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${palette.blue}, ${palette.mint})`,
            boxShadow: "0 10px 26px rgba(100,216,255,0.26)",
          }}
        />
        MediVoice
      </div>
      <div
        style={{
          position: "absolute",
          right: 56,
          top: 32,
          padding: "8px 13px",
          border: `1px solid ${palette.border}`,
          borderRadius: 999,
          color: "rgba(247,251,255,0.70)",
          background: "rgba(255,255,255,0.055)",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        Clinical voice AI
      </div>
    </>
  );
}

function Kicker({ children, color = palette.blue }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        width: "fit-content",
        alignItems: "center",
        gap: 10,
        border: `1px solid ${palette.border}`,
        borderRadius: 999,
        padding: "8px 13px",
        color: "rgba(247,251,255,0.76)",
        background: "rgba(255,255,255,0.06)",
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: 1.7,
        textTransform: "uppercase",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, boxShadow: `0 0 0 6px ${color}22` }} />
      {children}
    </div>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 14px",
        borderRadius: 999,
        border: `1px solid ${palette.border}`,
        background: `${color}18`,
        color: palette.text,
        fontSize: 15,
        fontWeight: 750,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
      {children}
    </div>
  );
}

function Metric({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: 16,
        background: "rgba(255,255,255,0.07)",
        padding: "13px 15px",
        minWidth: 140,
      }}
    >
      <div style={{ color, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 6, color: palette.muted, fontSize: 12, lineHeight: 1.26 }}>{label}</div>
    </div>
  );
}

function ScreenshotFrame({
  src,
  label,
  scale = 1,
  rotate = 0,
}: {
  src: string;
  label: string;
  scale?: number;
  rotate?: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 26,
        border: `1px solid ${palette.border}`,
        background: "rgba(7,17,31,0.78)",
        boxShadow: shadow,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          zIndex: 3,
          left: 16,
          top: 16,
          borderRadius: 999,
          padding: "8px 12px",
          color: palette.text,
          background: "rgba(7,17,31,0.76)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>
      <Img
        src={src}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(255,255,255,0.10), transparent 24%, rgba(0,0,0,0.18))",
          zIndex: 2,
        }}
      />
    </div>
  );
}

function PhoneCallCard({ frame }: { frame: number }) {
  const bars = [28, 46, 34, 58, 40, 72, 50, 62, 36, 54, 30, 44];

  return (
    <div
      style={{
        width: 430,
        borderRadius: 30,
        border: `1px solid ${palette.border}`,
        background: "rgba(255,255,255,0.08)",
        boxShadow: shadow,
        padding: 22,
        color: palette.text,
        backdropFilter: "blur(18px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, color: palette.muted, fontWeight: 700 }}>Incoming call</div>
          <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900 }}>Patient scheduling</div>
        </div>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            background: `${palette.mint}22`,
            color: palette.mint,
            fontSize: 27,
            fontWeight: 900,
          }}
        >
          AI
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", alignItems: "end", gap: 9, height: 86 }}>
        {bars.map((height, index) => {
          const wave = Math.sin((frame + index * 8) / 9);
          return (
            <div
              key={index}
              style={{
                width: 18,
                height: height + wave * 14,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${palette.blue}, ${palette.mint})`,
                opacity: 0.76 + Math.max(0, wave) * 0.22,
              }}
            />
          );
        })}
      </div>

      <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
        {[
          ["Patient", "Can I move tomorrow's appointment to 3 PM?"],
          ["MediVoice", "I found it. Please confirm: Dr. Rao, tomorrow at 3:00 PM."],
        ].map(([role, text], index) => (
          <div
            key={role}
            style={{
              padding: "13px 15px",
              borderRadius: 16,
              background: index === 1 ? `${palette.mint}18` : "rgba(255,255,255,0.07)",
              border: `1px solid ${index === 1 ? "rgba(72,224,164,0.32)" : palette.border}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: index === 1 ? palette.mint : palette.blue }}>{role}</div>
            <div style={{ marginTop: 5, fontSize: 16, lineHeight: 1.35 }}>{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowLine({ frame }: { frame: number }) {
  const items = [
    ["Voice", palette.blue],
    ["Intent", palette.violet],
    ["Confirm", palette.gold],
    ["Write", palette.mint],
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {items.map(([label, color], index) => {
        const fill = anim(frame, [index * 14, index * 14 + 28], [0.22, 1]);
        return (
          <React.Fragment key={label}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 22,
                border: `1px solid ${palette.border}`,
                background: `${color}${Math.round(fill * 30).toString(16).padStart(2, "0")}`,
                display: "grid",
                placeItems: "center",
                color: palette.text,
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              {label}
            </div>
            {index < items.length - 1 ? <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.25)" }} /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function SceneShell({
  children,
  localFrame,
  duration,
}: {
  children: React.ReactNode;
  localFrame: number;
  duration: number;
}) {
  const y = anim(localFrame, [0, 26], [24, 0]);
  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity(localFrame, duration),
        transform: `translateY(${y}px)`,
        padding: "78px 56px 48px",
        color: palette.text,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

function HeroScene({ localFrame, duration }: { localFrame: number; duration: number }) {
  const { fps } = useVideoConfig();
  const pop = spring({ frame: localFrame, fps, config: { damping: 18, stiffness: 110 } });
  const slide = anim(localFrame, [12, 72], [42, 0]);

  return (
    <SceneShell localFrame={localFrame} duration={duration}>
      <div style={{ display: "grid", gridTemplateColumns: "0.92fr 1.08fr", gap: 34, height: "100%", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Kicker color={palette.mint}>Multilingual front-desk automation</Kicker>
          <h1 style={{ margin: 0, fontSize: 86, lineHeight: 0.9, fontWeight: 950, letterSpacing: 0 }}>
            Voice AI that turns calls into clinic actions.
          </h1>
          <p style={{ margin: 0, maxWidth: 575, fontSize: 25, lineHeight: 1.36, color: palette.muted }}>
            MediVoice handles booking, rescheduling, cancellations, reminders, and follow-ups across English, Hindi, and Tamil.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <Pill color={palette.blue}>Vapi calls</Pill>
            <Pill color={palette.mint}>Two-step confirmations</Pill>
            <Pill color={palette.gold}>Live trace data</Pill>
          </div>
        </div>

        <div style={{ position: "relative", height: 520, transform: `translateX(${slide}px)` }}>
          <div style={{ position: "absolute", inset: "16px 0 0 18px" }}>
            <ScreenshotFrame src={staticFile("mediavoice-dashboard.png")} label="Live dashboard" scale={0.98 + pop * 0.02} rotate={-1.2} />
          </div>
          <div style={{ position: "absolute", right: 8, bottom: 26, transform: `translateY(${anim(localFrame, [24, 58], [42, 0])}px)` }}>
            <PhoneCallCard frame={localFrame} />
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

function ProblemScene({ localFrame, duration }: { localFrame: number; duration: number }) {
  return (
    <SceneShell localFrame={localFrame} duration={duration}>
      <div style={{ height: "100%", display: "grid", gridTemplateColumns: "0.88fr 1.12fr", gap: 42, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Kicker color={palette.coral}>The real clinic bottleneck</Kicker>
          <h2 style={{ margin: 0, fontSize: 72, lineHeight: 0.94, fontWeight: 950, letterSpacing: 0 }}>
            Every call needs accuracy, context, and proof.
          </h2>
          <p style={{ margin: 0, fontSize: 24, lineHeight: 1.36, color: palette.muted }}>
            The assistant does more than chat. It detects intent, checks availability, asks for missing details, and confirms before changing the schedule.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {[
            ["Patient asks in any supported language", "Language routing keeps English, Hindi, and Tamil calls in one workflow.", palette.blue],
            ["Agent parses the appointment action", "Book, reschedule, cancel, lookup, reminder, and campaign flows share the same scheduling core.", palette.violet],
            ["System confirms before writing", "Appointment mutations require a clear yes/no confirmation, reducing accidental changes.", palette.gold],
          ].map(([title, text, color], index) => (
            <div
              key={title}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr",
                gap: 16,
                alignItems: "center",
                padding: "18px 20px",
                borderRadius: 22,
                border: `1px solid ${palette.border}`,
                background: "rgba(255,255,255,0.07)",
                transform: `translateX(${anim(localFrame, [index * 10, index * 10 + 32], [44, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  display: "grid",
                  placeItems: "center",
                  background: `${color}20`,
                  color,
                  fontSize: 25,
                  fontWeight: 950,
                }}
              >
                {index + 1}
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{title}</div>
                <div style={{ marginTop: 6, fontSize: 18, lineHeight: 1.36, color: palette.muted }}>{text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SceneShell>
  );
}

function WorkflowScene({ localFrame, duration }: { localFrame: number; duration: number }) {
  return (
    <SceneShell localFrame={localFrame} duration={duration}>
      <div style={{ display: "grid", gridTemplateColumns: "1.08fr 0.92fr", gap: 38, height: "100%", alignItems: "center" }}>
        <div style={{ height: 490 }}>
          <ScreenshotFrame src={staticFile("mediavoice-appointments.png")} label="Appointments with traceable state" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Kicker color={palette.gold}>From conversation to action</Kicker>
          <h2 style={{ margin: 0, fontSize: 62, lineHeight: 0.94, fontWeight: 950, letterSpacing: 0 }}>
            Deterministic scheduling behind every voice turn.
          </h2>
          <FlowLine frame={localFrame} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Metric value="2-step" label="confirmation before writes" color={palette.gold} />
            <Metric value="3" label="supported languages" color={palette.blue} />
            <Metric value="live" label="latency and reasoning trace" color={palette.mint} />
            <Metric value="Vapi" label="inbound and outbound calls" color={palette.violet} />
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

function CampaignScene({ localFrame, duration }: { localFrame: number; duration: number }) {
  const progress = anim(localFrame, [20, 92], [0, 1]);
  return (
    <SceneShell localFrame={localFrame} duration={duration}>
      <div style={{ height: "100%", display: "grid", gridTemplateColumns: "0.88fr 1.12fr", gap: 40, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 17 }}>
          <Kicker color={palette.mint}>Outbound reminders and follow-ups</Kicker>
          <h2 style={{ margin: 0, fontSize: 64, lineHeight: 0.94, fontWeight: 950, letterSpacing: 0 }}>
            Campaigns run through the same patient context.
          </h2>
          <p style={{ margin: 0, fontSize: 22, lineHeight: 1.34, color: palette.muted }}>
            Reminder calls, follow-up outreach, and analytics stay connected to appointments, patients, and operational history.
          </p>
          <div
            style={{
              height: 14,
              borderRadius: 999,
              overflow: "hidden",
              background: "rgba(255,255,255,0.10)",
              border: `1px solid ${palette.border}`,
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${palette.blue}, ${palette.mint}, ${palette.gold})`,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Pill color={palette.blue}>Queued calls</Pill>
            <Pill color={palette.mint}>Patient memory</Pill>
            <Pill color={palette.gold}>Operational analytics</Pill>
          </div>
        </div>

        <div style={{ position: "relative", height: 532 }}>
          <div style={{ position: "absolute", inset: "0 96px 0 0" }}>
            <ScreenshotFrame src={staticFile("mediavoice-campaigns.png")} label="Campaign operations" rotate={1.1} />
          </div>
          <div style={{ position: "absolute", right: 0, bottom: 18, width: 390, height: 246 }}>
            <ScreenshotFrame src={staticFile("mediavoice-dashboard.png")} label="Analytics surface" scale={1} rotate={-1.4} />
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

function ClosingScene({ localFrame, duration }: { localFrame: number; duration: number }) {
  const { fps } = useVideoConfig();
  const pulse = spring({ frame: localFrame, fps, config: { damping: 16, stiffness: 95 } });
  return (
    <SceneShell localFrame={localFrame} duration={duration}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: 32,
            background: `linear-gradient(135deg, ${palette.blue}, ${palette.mint})`,
            boxShadow: `0 0 0 ${14 + pulse * 12}px rgba(100,216,255,0.08), ${shadow}`,
            marginBottom: 28,
          }}
        />
        <Kicker color={palette.mint}>MediVoice</Kicker>
        <h2 style={{ margin: "18px 0 0", maxWidth: 1030, fontSize: 84, lineHeight: 0.92, fontWeight: 950, letterSpacing: 0 }}>
          A front desk that answers, understands, confirms, and acts.
        </h2>
        <p style={{ margin: "22px 0 0", maxWidth: 780, fontSize: 25, lineHeight: 1.35, color: palette.muted }}>
          Real-time voice automation for clinical scheduling, reminders, and explainable patient workflows.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 34, flexWrap: "wrap", justifyContent: "center" }}>
          {["React", "Express", "Vapi", "Supabase", "Remotion"].map((item, index) => (
            <Pill key={item} color={[palette.blue, palette.mint, palette.gold, palette.violet, palette.coral][index]}>
              {item}
            </Pill>
          ))}
        </div>
      </div>
    </SceneShell>
  );
}

export const MediVoicePromo = () => {
  const frame = useCurrentFrame();
  const scenes = [
    { from: 0, duration: 240, component: HeroScene },
    { from: 210, duration: 240, component: ProblemScene },
    { from: 420, duration: 240, component: WorkflowScene },
    { from: 630, duration: 240, component: CampaignScene },
    { from: 840, duration: 240, component: ClosingScene },
  ];

  return (
    <AbsoluteFill
      style={{
        color: palette.text,
        fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
        overflow: "hidden",
      }}
    >
      <Background />
      {scenes.map(({ from, duration, component: Component }) => (
        <Sequence key={from} from={from} durationInFrames={duration}>
          <Component localFrame={frame - from} duration={duration} />
        </Sequence>
      ))}
      <BrandBar />
    </AbsoluteFill>
  );
};
