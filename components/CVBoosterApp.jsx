"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, Download, CheckCircle, RotateCcw,
  Zap, RefreshCw, TrendingUp, AlertCircle, Sparkles,
  BookOpen, Rocket, Search, Wand2,
  BarChart2, Cpu, Database, Cloud, Code2, LineChart,
  Award, FlaskConical, Clock,
  Target, Palette,
} from "lucide-react";

import ExplainScreen from "./ExplainScreen";
import EnrichScreen, { PLATFORM_LABS, PLATFORM_CERTS, PLATFORM_QUIZ, DEFAULT_SELECTIONS } from "./EnrichScreen";
import FormatScreen, { FORMATS } from "./FormatScreen";
import MissingSectionsModal from "./MissingSectionsModal";
import { deriveImprovements, deriveCompliance, WhatWasImproved, ATSCompliance } from "./ResultInsights";

const API_URL = "http://localhost:8000";

// ─────────────────────────────────────────────────────────────────────────────
// SCORE RING
// ─────────────────────────────────────────────────────────────────────────────
function ScoreRing({ score, label, size = 110, animate = false }) {
  const r    = size * 0.38;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="score-ring-wrap">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke="rgba(123,47,190,0.1)" strokeWidth={size * 0.075} />
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={size * 0.075}
            strokeDasharray={circ} strokeDashoffset={circ - dash}
            strokeLinecap="round"
            style={{ transition: animate ? "stroke-dashoffset 1.3s cubic-bezier(0.34,1.56,0.64,1)" : "none" }} />
        </svg>
        <div className="ring-center">
          <span className="ring-num" style={{ color, fontSize: size * 0.23 }}>{score}</span>
          <span className="ring-denom" style={{ fontSize: size * 0.1 }}>/100</span>
        </div>
      </div>
      <span className="ring-label">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRITERIA BAR
// ─────────────────────────────────────────────────────────────────────────────
function CriteriaBar({ label, before, after, max }) {
  const improved  = after > before;
  const beforePct = (before / max) * 100;
  const afterPct  = (after  / max) * 100;
  return (
    <div className="crit-row">
      <div className="crit-row-head">
        <span className="crit-row-label">{label}</span>
        <div className="crit-row-scores">
          <span className="score-before">{before}/{max}</span>
          {improved && <span className="score-after">→ {after}/{max}</span>}
        </div>
      </div>
      <div className="bar-track">
        <div className="bar-seg bar-before" style={{ width: `${beforePct}%` }} />
        <div className="bar-seg bar-after" style={{
          width: `${afterPct}%`,
          background: improved ? "linear-gradient(90deg,#E91E8C,#7B2FBE)" : "rgba(123,47,190,0.15)",
          transition: "width 1s cubic-bezier(0.34,1.56,0.64,1) 0.3s",
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEPPER
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = ["Import", "ATS Score", "Enrich", "Boost", "Result"];
function Stepper({ currentStep }) {
  return (
    <div className="stepper-steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done   = currentStep > n;
        const active = currentStep === n;
        return (
          <div key={n} className="stepper-item">
            <div className={`st ${done ? "done" : active ? "active" : ""}`}>
              <div className="st-n">{done ? <CheckCircle size={11} /> : n}</div>
              <span className="st-lbl">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="st-ln" />}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CRITERIA_META = {
  sections:   { label: "Key Sections",         max: 20 },
  skills:     { label: "Technical Skills",     max: 18 },
  experience: { label: "Work Experience",      max: 18 },
  length:     { label: "CV Length",            max: 12 },
  contact:    { label: "Contact Info",         max:  8 },
  keywords:   { label: "ATS Keywords",         max:  8 },
  summary:    { label: "Professional Summary", max: 10 },
  languages:  { label: "Languages",            max:  6 },
};

const LOAD_STEPS = [
  "Enriched with your SUBUL data …",
  "Calculating final ATS score…",
  "Generating DOCX file…",
];

const ROTATING_FACTS = [
  '"75% of CVs are rejected before being read by a human due to ATS filters."',
  '"Recruiters spend an average of 7 seconds on a CV."',
  '"An ATS-optimized CV increases your chances of an interview by 3x."',
  '"An ATS looks for exact keyword matches with the job description."',
  '"Data Analyst roles requiring dbt or Snowflake grew by 47% in 2024."',
];

const RECOMMENDED_LABS = [
  { color: "blue",   title: "Advanced Data Visualization with D3.js",      domain: "Data Analytics · Visualization Track",    tags: ["D3.js","JavaScript","SVG","Dashboard"],     pts: "+6 ATS pts", duration: "~8 hrs"  },
  { color: "purple", title: "MLOps Fundamentals: Deploy ML Models",         domain: "Machine Learning · Engineering Track",     tags: ["MLflow","Docker","FastAPI","CI/CD"],        pts: "+7 ATS pts", duration: "~12 hrs" },
  { color: "green",  title: "dbt Core: Transform Data Like a Pro",          domain: "Data Engineering · Analytics Engineering", tags: ["dbt","SQL","Snowflake","Testing"],          pts: "+5 ATS pts", duration: "~10 hrs" },
  { color: "orange", title: "AWS Data Analytics with S3 & Athena",          domain: "Cloud Analytics · AWS Track",              tags: ["AWS S3","Athena","Glue","QuickSight"],      pts: "+6 ATS pts", duration: "~9 hrs"  },
  { color: "pink",   title: "PySpark for Large-Scale Data Processing",      domain: "Big Data · Spark Track",                   tags: ["PySpark","Hadoop","DataFrame","Streaming"], pts: "+5 ATS pts", duration: "~14 hrs" },
  { color: "blue",   title: "Time Series Forecasting with Prophet & ARIMA", domain: "Data Science · Forecasting Track",         tags: ["Prophet","ARIMA","Pandas","Plotly"],        pts: "+4 ATS pts", duration: "~7 hrs"  },
];

const RECOMMENDED_CERTS = [
  { name: "Microsoft Azure DP-900",         org: "Microsoft · Data Fundamentals",  pts: "+8 ATS pts", desc: "Cloud Data certification recognized by 90% of recruiters. Completable in 3 weeks." },
  { name: "Databricks Lakehouse Associate", org: "Databricks · Data Engineering",  pts: "+6 ATS pts", desc: "Highly sought in Data Engineer & Analyst job postings. Strengthens your Big Data profile." },
  { name: "Tableau Desktop Specialist",     org: "Tableau · Visualization",        pts: "+5 ATS pts", desc: "Perfectly complements your Power BI profile. Dual BI competency is highly valued." },
  { name: "dbt Analytics Engineer",         org: "dbt Labs · Data Transformation", pts: "+5 ATS pts", desc: "Highly sought for modern Data Analyst roles with data pipelines." },
  { name: "Snowflake SnowPro Core",         org: "Snowflake · Data Warehouse",     pts: "+4 ATS pts", desc: "Snowflake is the most mentioned cloud database in Data job descriptions in 2025." },
  { name: "Apache Spark Developer",         org: "Databricks · Big Data",          pts: "+4 ATS pts", desc: "Strengthens your profile for senior Data Analyst and Data Engineering team positions." },
];

// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLE CARDS
// ─────────────────────────────────────────────────────────────────────────────
const LAB_ICONS = { blue: BarChart2, purple: Cpu, green: Database, orange: Cloud, pink: Code2 };

function LabCard({ lab }) {
  const IconCmp = LAB_ICONS[lab.color] || LineChart;
  return (
    <div className="lab-card">
      <div className="lab-head">
        <div className={`lab-icon ${lab.color}`} style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          <IconCmp size={15} />
        </div>
        <div>
          <div className="lab-title">{lab.title}</div>
          <div className="lab-domain">{lab.domain}</div>
        </div>
      </div>
      <div className="lab-tags">
        {lab.tags.map(t => <span key={t} className="lab-tag">{t}</span>)}
      </div>
      <div className="lab-meta-row">
        <span className="lab-pts">{lab.pts} estimated</span>
        <span className="lab-duration" style={{ display:"flex", alignItems:"center", gap:4 }}>
          <Clock size={10} /> {lab.duration}
        </span>
      </div>
    </div>
  );
}

function CertCard({ cert }) {
  return (
    <div className="cert-rec-card">
      <div className="cert-rec-head">
        <div className="cert-rec-logo" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Award size={16} color="var(--pink)" />
        </div>
        <div>
          <div className="cert-rec-name">{cert.name}</div>
          <div className="cert-rec-org">{cert.org}</div>
        </div>
      </div>
      <div className="cert-pts">{cert.pts} estimated</div>
      <div className="cert-rec-desc">{cert.desc}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATS SCORE SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function ATSScoreScreen({ scoreBefore, bdBefore, fileName, onExplain, onEnhance }) {
  const color = scoreBefore >= 75 ? "#10B981" : scoreBefore >= 50 ? "#F59E0B" : "#EF4444";
  const r = 54, circ = 2 * Math.PI * r;
  const dash = (scoreBefore / 100) * circ;

  return (
    <div className="screen screen-idle" style={{ justifyContent: "center", gap: 32 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 16px", borderRadius: 99,
        background: "var(--surface)", border: "1px solid var(--border)",
        fontSize: 12, color: "var(--text-muted)", boxShadow: "var(--shadow-sm)",
      }}>
        <FileText size={13} color="var(--violet)" />
        {fileName}
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 12, fontWeight: 700, letterSpacing: ".12em",
          textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 20,
        }}>Your Current ATS Score</div>

        <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 20px" }}>
          <svg width={160} height={160} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={80} cy={80} r={r} fill="none" stroke="rgba(123,47,190,0.1)" strokeWidth={12} />
            <circle cx={80} cy={80} r={r} fill="none" stroke={color} strokeWidth={12}
              strokeDasharray={circ} strokeDashoffset={circ - dash} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 44, fontWeight: 900, color, lineHeight: 1 }}>{scoreBefore}</span>
            <span style={{ fontSize: 13, color: "var(--text-faint)", fontWeight: 500 }}>/100</span>
          </div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
          {scoreBefore >= 75 ? "Great ATS score!" : scoreBefore >= 50 ? "Average — room to improve" : "Low ATS score — let's fix it"}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
          {scoreBefore >= 75
            ? "Your CV is well-structured. Enhancing it with your platform data will push it even further."
            : scoreBefore >= 50
            ? "Your CV has some gaps. ATS filters may catch issues before a recruiter sees it."
            : "Your CV will likely be filtered out by automated ATS systems. Boosting is strongly recommended."}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <button type="button" onClick={onExplain} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "16px 28px", borderRadius: 16,
          background: "var(--surface)", border: "1.5px solid rgba(123,47,190,.25)", color: "var(--violet)",
          fontFamily: "var(--font)", fontSize: 14, fontWeight: 700, cursor: "pointer",
          boxShadow: "var(--shadow-md)", transition: "all .2s", minWidth: 220,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--violet)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(123,47,190,.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(123,47,190,.25)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "rgba(123,47,190,.08)", border: "1px solid rgba(123,47,190,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Search size={16} color="var(--violet)" />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Explain ATS Score</div>
            <div style={{ fontSize: 11, fontWeight: 400, color: "var(--text-faint)", marginTop: 1 }}>See what&apos;s missing &amp; why</div>
          </div>
        </button>

        <button type="button" onClick={onEnhance} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "16px 28px", borderRadius: 16,
          background: "var(--grad)", border: "none", color: "#fff", fontFamily: "var(--font)",
          fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 28px rgba(233,30,140,.35)",
          transition: "all .2s", minWidth: 220,
        }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 36px rgba(233,30,140,.52)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(233,30,140,.35)"; e.currentTarget.style.transform = "none"; }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wand2 size={16} color="#fff" />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Enhance My CV</div>
            <div style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,.7)", marginTop: 1 }}>AI rewrite + platform data</div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────
function filterTrulyMissing(missingSections, bdBefore) {
  if (!missingSections || missingSections.length === 0) return [];
  return missingSections;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CVBoosterApp() {
  const [phase,          setPhase]          = useState("idle");
  const [fileName,       setFileName]       = useState("");
  const [pendingFile,    setPendingFile]     = useState(null);
  const [errorMsg,       setErrorMsg]       = useState("");
  const [docxUrl,        setDocxUrl]        = useState(null);
  const [docxName,       setDocxName]       = useState("");
  const [scoreBefore,    setScoreBefore]    = useState(null);
  const [scoreAfter,     setScoreAfter]     = useState(null);
  const [bdBefore,       setBdBefore]       = useState(null);
  const [bdAfter,        setBdAfter]        = useState(null);
  const [dragging,       setDragging]       = useState(false);
  const [loadStep,       setLoadStep]       = useState(0);
  const [factIdx,        setFactIdx]        = useState(0);
  const [bonusTab,       setBonusTab]       = useState("labs");
  const [parsedCV,       setParsedCV]       = useState(null);
  const [applyingFormat, setApplyingFormat] = useState(false);
  const [explanation,    setExplanation]    = useState(null);
  const [domain,         setDomain]         = useState("");
  const [rawMissingSections, setRawMissingSections] = useState([]);
  const [showModal,      setShowModal]      = useState(false);
  const [selections,     setSelections]     = useState(DEFAULT_SELECTIONS);
  const [selectedFormat, setSelectedFormat] = useState("ats");
  const [improvementItems, setImprovementItems] = useState(null);
  const [complianceItems,  setComplianceItems]  = useState(null);

  const fileRef   = useRef();
  const factTimer = useRef(null);

  const missingSections = filterTrulyMissing(rawMissingSections, bdBefore);

  const stepperStep =
    phase === "idle"      ? 1 : phase === "scanning"  ? 2 :
    phase === "ats-score" ? 2 : phase === "explain"   ? 2 :
    phase === "enrich"    ? 3 : phase === "uploading" ? 4 :
    phase === "done"      ? 5 : 1;

  const startFactRotation = () => {
    let i = 0;
    factTimer.current = setInterval(() => { i = (i + 1) % ROTATING_FACTS.length; setFactIdx(i); }, 4000);
  };
  const stopFactRotation = () => { if (factTimer.current) clearInterval(factTimer.current); };

  const animateSteps = () => {
    const delays = [700, 1400, 4200, 1100, 800];
    let acc = 0; setLoadStep(1);
    delays.forEach((ms, i) => { acc += ms; setTimeout(() => setLoadStep(i + 2), acc); });
  };

  // ── Initial scan ───────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setFileName(file.name);
    setPendingFile(file);
    setPhase("scanning");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/boost-cv`, { method: "POST", body: fd });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const sBefore   = parseInt(res.headers.get("X-ATS-Score-Before") || "0");
      const bbRaw     = res.headers.get("X-ATS-Breakdown-Before");
      const sAfter    = parseInt(res.headers.get("X-ATS-Score-After")  || "0");
      const baRaw     = res.headers.get("X-ATS-Breakdown-After");
      const xaiRaw    = res.headers.get("X-ATS-Explanation");
      const domainRaw = res.headers.get("X-Domain");

      setScoreBefore(sBefore);
      const parsedBdBefore = bbRaw ? JSON.parse(bbRaw) : null;
      if (parsedBdBefore) setBdBefore(parsedBdBefore);
      setScoreAfter(sAfter);
      if (baRaw)     setBdAfter(JSON.parse(baRaw));
      if (xaiRaw)    setExplanation(JSON.parse(xaiRaw));
      if (domainRaw) setDomain(domainRaw);

      const missRaw = res.headers.get("X-Missing-Sections");
      if (missRaw) setRawMissingSections(JSON.parse(missRaw));

      const blob = await res.blob();
      setDocxUrl(URL.createObjectURL(blob));
      setDocxName(file.name.replace(/\.[^.]+$/, "") + "_Boosted.docx");

      setPhase("ats-score");
    } catch (e) {
      setErrorMsg(e.message || "Unknown error");
      setPhase("error");
    }
  }, []);

  // ── Real boost ────────────────────────────────────────────────────────────
  const handleBoost = useCallback(async (extraData = {}, skippedSections = []) => {
    if (!pendingFile) return;
    setShowModal(false);
    setPhase("uploading");
    setLoadStep(0); setFactIdx(0);
    animateSteps();
    startFactRotation();

    try {
      const fd = new FormData();
      fd.append("file",             pendingFile);
      fd.append("include_quiz",     selections.quiz ? "true" : "false");
      fd.append("include_labs",     JSON.stringify(selections.labs));
      fd.append("include_certs",    JSON.stringify(selections.certs));
      fd.append("cv_format",        selectedFormat);
      fd.append("skipped_sections", JSON.stringify(skippedSections));
      fd.append("extra_data",       JSON.stringify({
        languages:  Array.isArray(extraData.languages)  ? extraData.languages  : [],
        education:  Array.isArray(extraData.education)  ? extraData.education  : [],
        experience: Array.isArray(extraData.experience) ? extraData.experience : [],
      }));

      const res = await fetch(`${API_URL}/boost-cv`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const newBdBefore = (() => { const r = res.headers.get("X-ATS-Breakdown-Before"); return r ? JSON.parse(r) : null; })();
      const newBdAfter  = (() => { const r = res.headers.get("X-ATS-Breakdown-After");  return r ? JSON.parse(r) : null; })();
      const newParsedCV = (() => { const r = res.headers.get("X-Parsed-CV");            return r ? JSON.parse(r) : null; })();
      const newDomain   = res.headers.get("X-Domain") || domain;
      const newBefore   = parseInt(res.headers.get("X-ATS-Score-Before") || "0");
      const newAfter    = parseInt(res.headers.get("X-ATS-Score-After")  || "0");

      setScoreBefore(newBefore);
      setScoreAfter(newAfter);
      if (newBdBefore) setBdBefore(newBdBefore);
      if (newBdAfter)  setBdAfter(newBdAfter);
      if (newParsedCV) setParsedCV(newParsedCV);
      if (newDomain)   setDomain(newDomain);

      if (newBdBefore && newBdAfter) {
        setImprovementItems(
          deriveImprovements({
            parsedCV:      newParsedCV,
            bdBefore:      newBdBefore,
            bdAfter:       newBdAfter,
            selections,
            domain:        newDomain,
            platformLabs:  PLATFORM_LABS,
            platformCerts: PLATFORM_CERTS,
            platformQuiz:  PLATFORM_QUIZ,
          })
        );
        setComplianceItems(
          deriveCompliance({
            parsedCV:      newParsedCV,
            bdAfter:       newBdAfter,
            selectedFormat,
          })
        );
      }

      const blob = await res.blob();
      setDocxUrl(URL.createObjectURL(blob));
      setDocxName(pendingFile.name.replace(/\.[^.]+$/, "") + `_Boosted_${selectedFormat.toUpperCase()}.docx`);

      stopFactRotation();
      setTimeout(() => { setLoadStep(6); setPhase("done"); }, 500);
    } catch (e) {
      stopFactRotation();
      setErrorMsg(e.message || "Unknown error");
      setPhase("error");
    }
  }, [pendingFile, selections, selectedFormat, domain]);

  // ── Format switch ──────────────────────────────────────────────────────────
  const handleApplyFormat = useCallback(async (fmt) => {
    if (!parsedCV) return;
    setApplyingFormat(true);
    setSelectedFormat(fmt);

    if (bdAfter) {
      setComplianceItems(
        deriveCompliance({ parsedCV, bdAfter, selectedFormat: fmt })
      );
    }

    try {
      const fd = new FormData();
      fd.append("parsed_cv", JSON.stringify(parsedCV));
      fd.append("cv_format",  fmt);
      const res = await fetch(`${API_URL}/apply-format`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Format error");
      const blob = await res.blob();
      if (docxUrl) URL.revokeObjectURL(docxUrl);
      setDocxUrl(URL.createObjectURL(blob));
      setDocxName((pendingFile?.name || "CV").replace(/\.[^.]+$/, "") + `_Boosted_${fmt.toUpperCase()}.docx`);
    } catch (e) {
      console.error("Apply format failed:", e);
    } finally {
      setApplyingFormat(false);
    }
  }, [parsedCV, docxUrl, pendingFile, bdAfter]);

  const handleEnhanceClick = useCallback(() => {
    if (missingSections.length > 0) setShowModal(true);
    else handleBoost({});
  }, [missingSections, handleBoost]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const reset = () => {
    stopFactRotation();
    setPhase("idle"); setFileName(""); setPendingFile(null);
    setDocxUrl(null); setErrorMsg("");
    setScoreBefore(null); setScoreAfter(null); setBdBefore(null); setBdAfter(null);
    setSelections(DEFAULT_SELECTIONS); setSelectedFormat("ats");
    setParsedCV(null); setApplyingFormat(false);
    setExplanation(null); setDomain("");
    setRawMissingSections([]); setShowModal(false);
    setImprovementItems(null); setComplianceItems(null);
  };

  const downloadFile = () => {
    const a = document.createElement("a"); a.href = docxUrl; a.download = docxName; a.click();
  };

  const delta = scoreBefore !== null && scoreAfter !== null ? scoreAfter - scoreBefore : 0;

  return (
    <div className="app">
      <div className="blobs" aria-hidden="true">
        <div className="blob blob-1" /><div className="blob blob-2" />
      </div>

      <header className="topbar">
        <div className="logo">
          <div className="logo-icon"><Zap size={14} color="#fff" /></div>
          <span className="logo-text"> <em>SUBUL</em></span>
        </div>
        <Stepper currentStep={stepperStep} />
      </header>

      <main className="main-content">

        {/* ══ IDLE ══════════════════════════════════════════════ */}
        {phase === "idle" && (
          <div className="screen screen-idle">
            <div className="hero">
              <div className="hero-badge"><Sparkles size={11} /><span>POWERED BY SUBUL</span></div>
              <h1>Turn your CV into an<br /><span className="hero-gradient">interview magnet</span></h1>
              <p className="hero-sub">Real-time ATS analysis, automatic enrichment from your certifications and labs, before/after score guaranteed.</p>
            </div>
            <div
              className={`dropzone${dragging ? " dragging" : ""}`}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
            >
              <div className="drop-icon-wrap"><Upload size={26} color="#E91E8C" /></div>
              <div className="drop-title">{dragging ? "Drop it here!" : "Drag your CV here"}</div>
              <button className="btn-browse" type="button">Browse files</button>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display:"none" }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>
        )}

        {/* ══ SCANNING ══════════════════════════════════════════ */}
        {phase === "scanning" && (
          <div className="screen screen-loading">
            <div className="loader-ring-wrap">
              <div className="loader-ring-outer" />
              <RefreshCw size={26} color="#7B2FBE" style={{ animation: "spin 2s linear infinite reverse" }} />
            </div>
            <div className="loading-title">Analyzing your CV…</div>
            <div className="loading-file">{fileName}</div>
            <div style={{ fontSize: 13, color: "var(--text-faint)" }}>Calculating your initial ATS score</div>
          </div>
        )}

        {/* ══ ATS SCORE ═════════════════════════════════════════ */}
        {phase === "ats-score" && (
          <ATSScoreScreen
            scoreBefore={scoreBefore} bdBefore={bdBefore} fileName={fileName}
            onExplain={() => setPhase("explain")} onEnhance={() => setPhase("enrich")}
          />
        )}

        {/* ══ EXPLAIN ════════════════════════════════════════════ */}
        {phase === "explain" && (
          <ExplainScreen
            scoreBefore={scoreBefore} bdBefore={bdBefore}
            explanation={explanation} domain={domain}
            onBack={() => setPhase("ats-score")}
          />
        )}

        {/* ══ ENRICH ════════════════════════════════════════════ */}
        {phase === "enrich" && (
          <EnrichScreen
            fileName={fileName} selections={selections} setSelections={setSelections}
            onBoost={handleEnhanceClick} onBack={() => setPhase("ats-score")}
            missingSections={missingSections}
          />
        )}

        {/* ══ MISSING SECTIONS MODAL ════════════════════════════ */}
        {showModal && (
          <MissingSectionsModal
            missingSections={missingSections}
            onSubmit={({ extraData, skippedSections }) => handleBoost(extraData, skippedSections)}
            onSkip={(skippedSections) => handleBoost({}, skippedSections)}
          />
        )}

        {/* ══ UPLOADING ═════════════════════════════════════════ */}
        {phase === "uploading" && (
          <div className="screen screen-loading">
            <div className="loader-ring-wrap">
              <div className="loader-ring-outer" />
              <RefreshCw size={26} color="#7B2FBE" style={{ animation: "spin 2s linear infinite reverse" }} />
            </div>
            <div className="loading-title">Boost in progress…</div>
            <div className="loading-file">{fileName}</div>
            <div className="steps-list">
              {LOAD_STEPS.map((label, i) => {
                const n = i+1; const done = loadStep > n; const active = loadStep === n; const wait = loadStep < n;
                return (
                  <div key={n} className={`step-item${done?" done":active?" active":" wait"}`}>
                    <div className="step-icon">
                      {done   && <CheckCircle size={14} color="#10B981" />}
                      {active && <div className="step-spin" />}
                      {wait   && <div className="step-idle-dot" />}
                    </div>
                    <span className="step-label">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="loading-fact">{ROTATING_FACTS[factIdx]}</div>
          </div>
        )}

        {/* ══ DONE ══════════════════════════════════════════════ */}
        {phase === "done" && (
          <div className="screen screen-done">

            <div className="card result-card-wide">
              <div className="card-label"><TrendingUp size={13} color="#E91E8C" /><span>ATS Score</span></div>
              <div className="rings-row">
                <ScoreRing score={scoreBefore} label="Before boost" size={108} />
                <div className="delta">
                  <span className="delta-val">{delta >= 0 ? "+" : ""}{delta}</span>
                  <span className="delta-sub">points</span>
                </div>
                <ScoreRing score={scoreAfter} label="After boost" size={108} animate />
              </div>
              {bdBefore && bdAfter && (
                <>
                  <div className="section-micro-label">Detailed Criteria</div>
                  <div className="criteria-two-col">
                    {Object.entries(CRITERIA_META).map(([k, m]) => (
                      <CriteriaBar key={k} label={m.label} max={m.max}
                        before={bdBefore[k]?.score || 0} after={bdAfter[k]?.score || 0} />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="result-two-col">
              <div className="card">
                <div className="section-micro-label" style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
                  <Sparkles size={12} color="#E91E8C" style={{ flexShrink:0 }} />
                  What was improved
                </div>
                <WhatWasImproved items={improvementItems} />
              </div>

              <div className="card">
                <div className="section-micro-label" style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
                  <CheckCircle size={12} color="#10B981" style={{ flexShrink:0 }} />
                  ATS Compliance — {FORMATS.find(f => f.id === selectedFormat)?.name || "ATS Classic"}
                </div>
                <ATSCompliance items={complianceItems} />
              </div>
            </div>

            <div className="card result-card-wide">
              <div className="card-label"><BookOpen size={13} color="#E91E8C" /><span>Labs &amp; Certifications Recommendations</span></div>
              <p className="rec-subtitle">To reach 95/100 in your field — {domain || "Data Analytics"}</p>
              <div className="tabs-row">
                {[{id:"labs",label:"Recommended Labs"},{id:"certs",label:"Certifications"}].map(t => (
                  <button key={t.id} className={`tab${bonusTab===t.id?" active":""}`}
                    onClick={() => setBonusTab(t.id)} type="button">
                    {t.id === "labs" ? <FlaskConical size={12} style={{marginRight:5}} /> : <Award size={12} style={{marginRight:5}} />}
                    {t.label}
                  </button>
                ))}
              </div>
              {bonusTab === "labs"  && <div className="labs-grid">{RECOMMENDED_LABS.map((l,i)  => <LabCard  key={i} lab={l}  />)}</div>}
              {bonusTab === "certs" && <div className="cert-recs-grid">{RECOMMENDED_CERTS.map((c,i) => <CertCard key={i} cert={c} />)}</div>}
            </div>

            <div className="card result-card-wide card-download">
              <div className="dl-icon-wrap"><CheckCircle size={24} color="#E91E8C" /></div>
              <div className="dl-title">Your CV is ready!</div>
              <p className="dl-sub">Enriched with your SUBUL data. Switch format instantly — no re-generation needed.</p>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
                  Choose format
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {FORMATS.map(fmt => {
                    const isActive = selectedFormat === fmt.id;
                    const IconCmp  = fmt.id === "ats" ? Target : fmt.id === "basic" ? FileText : Palette;
                    return (
                      <button key={fmt.id} type="button" onClick={() => handleApplyFormat(fmt.id)} disabled={applyingFormat}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12,
                          background: isActive ? "var(--grad)" : "var(--surface)",
                          border: isActive ? "none" : "1.5px solid var(--border)",
                          color: isActive ? "#fff" : "var(--text-muted)",
                          fontFamily: "var(--font)", fontSize: 13, fontWeight: 700,
                          cursor: applyingFormat ? "wait" : "pointer",
                          boxShadow: isActive ? "0 4px 18px rgba(233,30,140,.35)" : "var(--shadow-sm)",
                          transition: "all .18s", opacity: applyingFormat && !isActive ? 0.5 : 1,
                        }}>
                        <IconCmp size={14} />{fmt.name}
                        {isActive && applyingFormat && <span style={{ fontSize:10, opacity:.8 }}>…</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="dl-file-row">
                <FileText size={20} color="#7B2FBE" />
                <div>
                  <div className="dl-file-name">{docxName}</div>
                  <div className="dl-file-meta">
                    {FORMATS.find(f => f.id === selectedFormat)?.name} · {FORMATS.find(f => f.id === selectedFormat)?.font}
                  </div>
                </div>
              </div>
              <div className="dl-actions">
                <button className="btn-download" onClick={downloadFile} type="button" disabled={applyingFormat}>
                  <Download size={15} />{applyingFormat ? "Generating…" : "Download Boosted CV (.docx)"}
                </button>
                <button className="btn-reset btn-reset-inline" onClick={reset} type="button">
                  <RotateCcw size={11} /> Import another CV
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ══ ERROR ═════════════════════════════════════════════ */}
        {phase === "error" && (
          <div className="screen screen-error">
            <div className="error-icon-wrap"><AlertCircle size={28} color="#EF4444" /></div>
            <div className="error-title">An error occurred</div>
            <div className="error-msg">{errorMsg}</div>
            <div className="error-hint">
              Make sure the backend is running:<br />
              <code>uvicorn main:app --reload --port 8000</code>
            </div>
            <button className="btn-reset" onClick={reset} type="button">Try again</button>
          </div>
        )}

      </main>
    </div>
  );
}
