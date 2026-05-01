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

const DURATION = 15 * 30;
const SLIDE = 150;
const OVERLAP = 12;
const BG = "linear-gradient(135deg, #050816 0%, #0b1630 45%, #07111f 100%)";
const BORDER = "1px solid rgba(255,255,255,0.12)";
const SHADOW = "0 28px 90px rgba(0,0,0,0.42)";
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

function lerp(frame: number, input: [number, number], output: [number, number]) {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
}

function segmentOpacity(frame: number, start = 0, duration = SLIDE) {
  return interpolate(frame, [start, start + 12, start + duration - 12, start + duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
}

function Chip({ children, accent = "#60a5fa" }: { children: React.ReactNode; accent?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        width: "fit-content",
        borderRadius: 999,
        padding: "10px 14px",
        border: "1px solid rgba(255,255,255,0.14)",
        background: `${accent}18`,
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: 600,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: accent }} />
      {children}
    </span>
  );
}

function Bullet({
  title,
  text,
  accent,
}: {
  title: string;
  text: string;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          marginTop: 7,
          background: accent,
          boxShadow: `0 0 0 6px ${accent}22`,
          flex: "0 0 auto",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 18, lineHeight: 1.5, color: "rgba(226,232,240,0.84)" }}>{text}</div>
      </div>
    </div>
  );
}

function ScreenshotCard({
  src,
  label,
  tall = false,
}: {
  src: string;
  label: string;
  tall?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 28,
        overflow: "hidden",
        border: BORDER,
        background: "rgba(7, 16, 32, 0.65)",
        boxShadow: SHADOW,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.0) 24%, rgba(0,0,0,0.18) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 16,
          top: 16,
          zIndex: 3,
          display: "inline-flex",
          gap: 8,
          alignItems: "center",
          borderRadius: 999,
          padding: "8px 12px",
          background: "rgba(5, 8, 22, 0.72)",
          color: "#eff6ff",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.4,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#60a5fa" }} />
        {label}
      </div>
      <Img
        src={src}
        style={{
          display: "block",
          width: "100%",
          height: tall ? 430 : 380,
          objectFit: "cover",
          objectPosition: "top center",
        }}
      />
    </div>
  );
}

function SlideShell({
  eyebrow,
  title,
  subtitle,
  left,
  right,
  frame,
  start,
  accent = "#60a5fa",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  left: React.ReactNode;
  right: React.ReactNode;
  frame: number;
  start: number;
  accent?: string;
}) {
  const local = Math.max(0, frame - start);
  const opacity = segmentOpacity(frame, start);
  const y = lerp(local, [0, 30], [28, 0]);
  const scale = lerp(local, [0, 26], [0.965, 1]);

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        display: "flex",
        padding: "54px 60px",
        color: "#eff6ff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 28,
          flex: 1,
        }}
      >
        <div style={{ width: "50%", display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "inline-flex",
              width: "fit-content",
              alignItems: "center",
              gap: 10,
              borderRadius: 999,
              border: BORDER,
              background: "rgba(255,255,255,0.06)",
              padding: "8px 14px",
              fontSize: 15,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.74)",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 0 6px ${accent}22`,
              }}
            />
            {eyebrow}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 76,
                lineHeight: 0.94,
                letterSpacing: -2,
                fontWeight: 800,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: 560,
                fontSize: 26,
                lineHeight: 1.35,
                color: "rgba(226,232,240,0.88)",
              }}
            >
              {subtitle}
            </p>
          </div>

          {left}
        </div>

        <div
          style={{
            width: "47%",
            minWidth: 520,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {right}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function IntroScene({ frame }: { frame: number }) {
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const floating = lerp(frame, [0, 80], [18, 0]);

  return (
    <SlideShell
      eyebrow="Voice AI for clinics"
      title="MediVoice"
      subtitle="A multilingual appointment assistant that books, reschedules, cancels, and runs outbound reminders without making the caller repeat themselves."
      frame={frame}
      start={0}
      accent="#7dd3fc"
      left={
        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 6 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Chip accent="#7dd3fc">Real-time browser console</Chip>
            <Chip accent="#34d399">Vapi + webhook driven</Chip>
            <Chip accent="#c084fc">English, Hindi, Tamil</Chip>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <Bullet
              title="Two-step confirmation"
              text="The agent confirms the exact appointment before it writes anything, which keeps accidental bookings and cancellations out of the flow."
              accent="#60a5fa"
            />
            <Bullet
              title="Live trace and latency"
              text="Every turn captures intent parsing, tool calls, and response latency so the scheduling path is easy to debug and demo."
              accent="#34d399"
            />
            <Bullet
              title="Outbound follow-ups"
              text="Campaigns run through the same scheduling system, so reminders and follow-up calls stay tied to the same patient record."
              accent="#f59e0b"
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 8,
              opacity: 0.95,
              transform: `translateY(${floating}px)`,
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 22,
                border: BORDER,
                background: "rgba(255,255,255,0.06)",
                minWidth: 176,
              }}
            >
              <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(226,232,240,0.62)" }}>
                Built with
              </div>
              <div style={{ fontSize: 21, fontWeight: 700, marginTop: 8 }}>React, Express, Vapi</div>
            </div>
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 22,
                border: BORDER,
                background: "rgba(255,255,255,0.06)",
                minWidth: 176,
              }}
            >
              <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(226,232,240,0.62)" }}>
                Focus
              </div>
              <div style={{ fontSize: 21, fontWeight: 700, marginTop: 8 }}>Scheduling, not chatter</div>
            </div>
          </div>
        </div>
      }
      right={
        <div
          style={{
            position: "relative",
            width: "100%",
            transform: `translateY(${lerp(frame, [0, 40], [18, 0])}px) rotate(${lerp(frame, [0, 80], [1.2, 0])}deg)`,
          }}
        >
          <ScreenshotCard src={staticFile("mediavoice-dashboard.png")} label="Dashboard view" />
          <div
            style={{
              position: "absolute",
              right: 18,
              bottom: 18,
              padding: "14px 16px",
              borderRadius: 22,
              border: BORDER,
              background: "rgba(7, 16, 32, 0.78)",
              backdropFilter: "blur(10px)",
              boxShadow: SHADOW,
              minWidth: 220,
              opacity: progress,
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(226,232,240,0.66)" }}>
              Typical output
            </div>
            <div style={{ marginTop: 10, fontSize: 18, lineHeight: 1.4, color: "#f8fafc" }}>
              “Your appointment with Dr. Rao is booked for tomorrow at 10:00 AM.”
            </div>
          </div>
        </div>
      }
    />
  );
}

function OperationsScene({ frame }: { frame: number }) {
  return (
    <SlideShell
      eyebrow="Appointment operations"
      title="Control the workflow"
      subtitle="Booking, rescheduling, and cancellation stay deterministic, while the UI exposes trace data and operational status for the team."
      frame={frame}
      start={SLIDE - OVERLAP}
      accent="#34d399"
      left={
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Chip accent="#34d399">Availability checks</Chip>
            <Chip accent="#7dd3fc">Conflict prevention</Chip>
            <Chip accent="#f59e0b">Campaign queue</Chip>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <Bullet
              title="Confirm before write"
              text="The agent resolves intent, gathers missing details, and asks for a yes/no confirmation before it mutates appointments."
              accent="#34d399"
            />
            <Bullet
              title="Multiple appointments handled"
              text="If a patient has more than one active booking, the app asks which appointment they mean instead of guessing."
              accent="#7dd3fc"
            />
            <Bullet
              title="Vapi stays in sync"
              text="The assistant, phone number, webhook, and processTurn tool all point at the same live backend."
              accent="#a78bfa"
            />
          </div>
        </div>
      }
      right={
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.12fr 0.88fr",
            gap: 18,
            alignItems: "start",
            width: "100%",
            transform: `translateY(${lerp(frame, [0, 50], [20, 0])}px)`,
          }}
        >
          <ScreenshotCard src={staticFile("mediavoice-appointments.png")} label="Appointments" tall />
          <ScreenshotCard src={staticFile("mediavoice-campaigns.png")} label="Campaigns" tall />
        </div>
      }
    />
  );
}

function ClosingScene({ frame }: { frame: number }) {
  const pulse = spring({ frame, fps: 30, config: { damping: 14, stiffness: 120 } });
  return (
    <AbsoluteFill
      style={{
        opacity: segmentOpacity(frame, SLIDE * 2 - OVERLAP),
        background: BG,
        padding: "58px 66px",
        color: "#eff6ff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "inline-flex",
            width: "fit-content",
            alignItems: "center",
            gap: 10,
            borderRadius: 999,
            border: BORDER,
            background: "rgba(255,255,255,0.06)",
            padding: "8px 14px",
            fontSize: 15,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.74)",
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: 999, background: "#f59e0b" }} />
          Built for recruiters to remember
        </div>
        <h2
          style={{
            margin: 0,
            maxWidth: 940,
            fontSize: 74,
            lineHeight: 0.95,
            letterSpacing: -2,
            fontWeight: 800,
          }}
        >
          A clinic workflow that feels live, useful, and ready for production.
        </h2>
        <p style={{ margin: 0, maxWidth: 720, fontSize: 25, lineHeight: 1.38, color: "rgba(226,232,240,0.84)" }}>
          MediVoice turns a phone call into a structured appointment action and gives the operator a dashboard that shows what happened at every step.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {[
          ["Multilingual", "English, Hindi, and Tamil turn handling."],
          ["Deterministic", "No guesswork for scheduling or conflicts."],
          ["Observable", "Trace, latency, and campaign history."],
          ["Polished", "Dashboard, screenshots, and a marketing video."],
        ].map(([title, text], index) => (
          <div
            key={title}
            style={{
              padding: "20px 18px",
              borderRadius: 24,
              border: BORDER,
              background: "rgba(255,255,255,0.06)",
              transform: `translateY(${lerp(frame, [0, 30 + index * 4], [14, 0])}px)`,
            }}
          >
            <div style={{ fontSize: 21, fontWeight: 700 }}>{title}</div>
            <div style={{ marginTop: 8, fontSize: 17, lineHeight: 1.45, color: "rgba(226,232,240,0.82)" }}>{text}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
          paddingTop: 4,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["React", "Express", "Vapi", "Supabase", "Remotion"].map((item, index) => (
            <span
              key={item}
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                border: BORDER,
                background: "rgba(255,255,255,0.06)",
                fontSize: 16,
                fontWeight: 600,
                opacity: lerp(frame, [0, 40 + index * 4], [0.65, 1]),
              }}
            >
              {item}
            </span>
          ))}
        </div>
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: 999,
            border: BORDER,
            background:
              "radial-gradient(circle at 30% 30%, rgba(125,211,252,0.38), rgba(96,165,250,0.1) 45%, rgba(5,8,22,0.85) 68%)",
            display: "grid",
            placeItems: "center",
            boxShadow: `0 0 0 14px rgba(96,165,250,0.06), ${SHADOW}`,
            transform: `scale(${0.92 + pulse * 0.08})`,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, letterSpacing: 1.8, textTransform: "uppercase", color: "rgba(255,255,255,0.68)" }}>
              MediVoice
            </div>
            <div style={{ marginTop: 8, fontSize: 30, fontWeight: 800 }}>Clinical AI</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const MediVoicePromo = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: BG,
        color: "#f8fafc",
        fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          backgroundPosition: `${lerp(frame, [0, DURATION], [0, 160])}px ${lerp(frame, [0, DURATION], [0, 160])}px`,
          opacity: 0.18,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(96,165,250,0.18), transparent 28%), radial-gradient(circle at 80% 0%, rgba(34,197,94,0.12), transparent 24%), radial-gradient(circle at 100% 100%, rgba(168,85,247,0.12), transparent 24%)",
        }}
      />

      <Sequence from={0} durationInFrames={SLIDE + 24}>
        <IntroScene frame={frame} />
      </Sequence>
      <Sequence from={SLIDE - OVERLAP} durationInFrames={SLIDE + 24}>
        <OperationsScene frame={frame} />
      </Sequence>
      <Sequence from={SLIDE * 2 - OVERLAP} durationInFrames={SLIDE + 24}>
        <ClosingScene frame={frame} />
      </Sequence>

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: 0.9,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 28,
            fontSize: 15,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.56)",
          }}
        >
          Product video
        </div>
        <div
          style={{
            position: "absolute",
            right: 64,
            top: 28,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            borderRadius: 999,
            padding: "8px 14px",
            border: BORDER,
            background: "rgba(255,255,255,0.06)",
            color: "#f8fafc",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "#34d399" }} />
          30 fps
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
