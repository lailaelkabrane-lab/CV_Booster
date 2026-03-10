"use client";
// EnrichScreen.jsx
// Lets the user select platform data (quiz, labs, certs) to integrate into the boosted CV

import {
  Rocket, ArrowLeft, Brain, FlaskConical, Award, TrendingUp,
  CheckCircle2, BookOpen, AlertTriangle, Globe, GraduationCap, Briefcase,
} from "lucide-react";

// ── Mock SUBUL data — single source of truth ────────────────────────────
export const PLATFORM_LABS = [
  { id: "lab1", title: "Machine Learning Basics",      date: "Jan 12, 2025", score: 94 },
  { id: "lab2", title: "Python Data Analysis",         date: "Feb 03, 2025", score: 88 },
  { id: "lab3", title: "Advanced SQL & Optimization",  date: "Feb 28, 2025", score: 91 },
  { id: "lab4", title: "Power BI Dashboards",          date: "Mar 15, 2025", score: 85 },
];

export const PLATFORM_CERTS = [
  { id: "cert1", title: "AWS Cloud Practitioner",      org: "Amazon Web Services", date: "Jan 2025" },
  { id: "cert2", title: "Google Data Analytics",       org: "Google",              date: "Dec 2024" },
  { id: "cert3", title: "IBM Python for Data Science", org: "IBM",                 date: "Nov 2024" },
];

export const PLATFORM_QUIZ = {
  domain: "Data Analytics & BI",
  score: 82,
  level: "Advanced",
  description: "This score will be added at the top of your profile as a validated level indicator in your field.",
};

export const DEFAULT_SELECTIONS = {
  quiz:  true,
  labs:  PLATFORM_LABS.map(l => l.id),
  certs: PLATFORM_CERTS.map(c => c.id),
};

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        position: "relative", flexShrink: 0,
        width: 46, height: 26, borderRadius: 99, border: "none",
        cursor: "pointer",
        background: checked ? "linear-gradient(135deg,#E91E8C,#7B2FBE)" : "rgba(123,47,190,.15)",
        boxShadow: checked ? "0 2px 12px rgba(233,30,140,.35)" : "none",
        transition: "background .25s, box-shadow .25s",
        outline: "none",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: 3,
        width: 20, height: 20, borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,.2)",
        transform: checked ? "translateX(20px)" : "translateX(0)",
        transition: "transform .25s cubic-bezier(0.34,1.56,0.64,1)",
        display: "block",
      }} />
    </button>
  );
}

export default function EnrichScreen({ fileName, selections, setSelections, onBoost, onBack, missingSections = [] }) {
  const toggleItem = (key, id) => {
    setSelections(prev => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter(x => x !== id)
        : [...prev[key], id],
    }));
  };

  const selectedCount =
    (selections.quiz ? 1 : 0) +
    selections.labs.length +
    selections.certs.length;

  const estMin = 47 + selectedCount * 4;
  const estMax = 47 + selectedCount * 7;

  const card = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: "20px 22px",
    boxShadow: "var(--shadow-sm)",
  };

  const itemRow = {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid var(--border-soft)",
  };

  const iconBox = (color, bg) => ({
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: bg, display: "flex", alignItems: "center", justifyContent: "center",
    color,
  });

  return (
    <div style={{
      minHeight: "calc(100vh - 57px)",
      display: "flex", flexDirection: "column",
      alignItems: "center",
      padding: "44px 24px 72px",
      animation: "fadeUp .35s ease both",
    }}>
      <div style={{ width: "100%", maxWidth: 860, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div>
          <div style={{
            display: "inline-block", padding: "4px 14px", borderRadius: 99,
            border: "1.5px solid rgba(233,30,140,.35)",
            fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
            color: "var(--pink)", marginBottom: 12,
          }}>Step 04 — Enrich</div>
          <h2 style={{
            fontSize: "clamp(26px,4vw,42px)", fontWeight: 900,
            letterSpacing: "-.03em", margin: "0 0 8px", color: "var(--text)", lineHeight: 1.1,
          }}>Enrich your CV from SUBUL</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
            Select SUBUL elements to automatically integrate into your boosted CV
          </p>
        </div>

        {/* Quiz card */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={iconBox("#7B2FBE", "rgba(123,47,190,.12)")}>
                <Brain size={18} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Initial Positioning Quiz</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                  Taken when you registered on the SUBUL platform
                </div>
              </div>
            </div>
            <Toggle
              checked={selections.quiz}
              onChange={v => setSelections(p => ({ ...p, quiz: v }))}
            />
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pink)", marginBottom: 14 }}>
            Detected domain: <strong>{PLATFORM_QUIZ.domain}</strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 14 }}>
            <div style={{
              fontSize: 56, fontWeight: 900, lineHeight: 1,
              background: "var(--grad)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              flexShrink: 0,
            }}>{PLATFORM_QUIZ.score}%</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Level: <strong>{PLATFORM_QUIZ.level}</strong>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
                {PLATFORM_QUIZ.description}
              </div>
            </div>
          </div>

          <div style={{ height: 6, borderRadius: 99, background: "rgba(123,47,190,.1)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99, width: `${PLATFORM_QUIZ.score}%`,
              background: "linear-gradient(90deg,#E91E8C,#7B2FBE)",
              transition: "width .8s ease",
            }} />
          </div>
        </div>

        {/* Labs + Certs two-column */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="enr-panels-grid">

          {/* Labs */}
          <div style={card}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 14, fontWeight: 700, color: "var(--text)",
              marginBottom: 16, paddingBottom: 12,
              borderBottom: "1px solid var(--border-soft)",
            }}>
              <FlaskConical size={15} color="var(--violet)" />
              Completed Labs
            </div>

            {PLATFORM_LABS.map((lab, idx) => (
              <div key={lab.id} style={{
                ...itemRow,
                ...(idx === PLATFORM_LABS.length - 1 ? { borderBottom: "none", paddingBottom: 0 } : {}),
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={iconBox("#7B2FBE", "rgba(123,47,190,.08)")}>
                    <BookOpen size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{lab.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      Completed · {lab.date}
                      <span style={{
                        padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 600,
                        background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)",
                        color: "#059669",
                      }}>Score {lab.score}/100</span>
                    </div>
                  </div>
                </div>
                <Toggle
                  checked={selections.labs.includes(lab.id)}
                  onChange={() => toggleItem("labs", lab.id)}
                />
              </div>
            ))}
          </div>

          {/* Certs */}
          <div style={card}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 14, fontWeight: 700, color: "var(--text)",
              marginBottom: 16, paddingBottom: 12,
              borderBottom: "1px solid var(--border-soft)",
            }}>
              <Award size={15} color="var(--violet)" />
              Validated Certifications
            </div>

            {PLATFORM_CERTS.map((cert, idx) => (
              <div key={cert.id} style={{
                ...itemRow,
                ...(idx === PLATFORM_CERTS.length - 1 ? { borderBottom: "none", paddingBottom: 0 } : {}),
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={iconBox("#E91E8C", "rgba(233,30,140,.08)")}>
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {cert.title}
                      <span style={{
                        padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                        background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)",
                        color: "#059669",
                      }}>Validated</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                      {cert.org} · {cert.date}
                    </div>
                  </div>
                </div>
                <Toggle
                  checked={selections.certs.includes(cert.id)}
                  onChange={() => toggleItem("certs", cert.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Estimator + Boost CTA */}
        <div style={{
          background: "var(--surface)",
          border: "1.5px solid rgba(233,30,140,.2)",
          borderRadius: 20, padding: "22px 28px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 24,
          boxShadow: "0 4px 24px rgba(233,30,140,.08)",
          flexWrap: "wrap",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
              textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 4,
            }}>Estimated ATS score after boost</div>
            <div style={{
              fontSize: 28, fontWeight: 900, letterSpacing: "-.02em",
              background: "var(--grad)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}>
              {selectedCount > 0 ? `${estMin} – ${estMax} / 100` : "—"}
            </div>
            {selectedCount > 0 && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
                <TrendingUp size={12} color="var(--pink)" />
                +{estMin - 47} to +{estMax - 47} pts · {selectedCount} element{selectedCount > 1 ? "s" : ""} selected
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>

            {/* Missing section badges */}
            {missingSections.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                {missingSections.includes("experience") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 10, background: "rgba(239,68,68,.07)", border: "1.5px solid rgba(239,68,68,.25)", fontSize: 12, fontWeight: 600, color: "#EF4444" }}>
                    <Briefcase size={12} /> Work Experience section missing
                    <span style={{ padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "rgba(239,68,68,.12)", color: "#EF4444" }}>+15 pts</span>
                  </div>
                )}
                {missingSections.includes("languages") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 10, background: "rgba(123,47,190,.07)", border: "1.5px solid rgba(123,47,190,.25)", fontSize: 12, fontWeight: 600, color: "var(--violet)" }}>
                    <Globe size={12} /> Languages section missing
                    <span style={{ padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "rgba(123,47,190,.12)", color: "var(--violet)" }}>+6 pts</span>
                  </div>
                )}
                {missingSections.includes("education") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 10, background: "rgba(233,30,140,.07)", border: "1.5px solid rgba(233,30,140,.25)", fontSize: 12, fontWeight: 600, color: "var(--pink)" }}>
                    <GraduationCap size={12} /> Education section missing
                    <span style={{ padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "rgba(233,30,140,.12)", color: "var(--pink)" }}>+8 pts</span>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "right" }}>
                  <AlertTriangle size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  A form will appear to fill in the missing data
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onBoost}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "15px 36px", borderRadius: 14,
                background: "var(--grad)", border: "none",
                color: "#fff", fontFamily: "var(--font)",
                fontSize: 15, fontWeight: 800, cursor: "pointer",
                boxShadow: "0 6px 28px rgba(233,30,140,.38)",
                transition: "all .2s", whiteSpace: "nowrap",
                position: "relative",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 36px rgba(233,30,140,.55)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(233,30,140,.38)"; e.currentTarget.style.transform = "none"; }}
            >
              {missingSections.length > 0 && (
                <span style={{ position: "absolute", top: -7, right: -7, width: 18, height: 18, borderRadius: "50%", background: "#EF4444", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff" }}>
                  {missingSections.length}
                </span>
              )}
              <Rocket size={15} />
              {missingSections.length > 0 ? "Complete & Boost" : "Boost My CV"}
            </button>

            <button
              type="button"
              onClick={onBack}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 10,
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-faint)", fontFamily: "var(--font)",
                fontSize: 12, cursor: "pointer", transition: "all .2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(123,47,190,.3)"; e.currentTarget.style.color = "var(--violet)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-faint)"; }}
            >
              <ArrowLeft size={11} />
              Go Back
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}