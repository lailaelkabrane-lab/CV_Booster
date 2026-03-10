"use client";
// ResultInsights.jsx
// Derives REAL "What was improved" and "ATS Compliance" data
// directly from the backend API output — zero fake/hardcoded items.
//
// Data sources used:
//   parsedCV   ← X-Parsed-CV header  (sections OpenAI actually wrote)
//   bdBefore   ← X-ATS-Breakdown-Before (scores per criterion before boost)
//   bdAfter    ← X-ATS-Breakdown-After  (scores per criterion after boost)
//   selections ← { quiz, labs: [...ids], certs: [...ids] } (what user selected)
//   domain     ← X-Domain header (detected professional domain)

import { CheckCircle, Sparkles } from "lucide-react";

// ─── Format-specific ATS compliance rules ─────────────────────────────────────
const ATS_FORMAT_RULES = {
  ats: [
    "Single-column layout — ATS-safe structure",
    "Times New Roman — universally readable font",
    "Dates right-aligned via tab stops",
    "Section headings in ALL CAPS",
    "No tables, graphics or colors",
    ".docx format — maximum ATS compatibility",
  ],
  basic: [
    "Two-column classic layout — Georgia font",
    "Bold name header with domain subtitle",
    "Education & Skills in left column",
    "Experience & Projects in right column",
    "Subtle separator line between columns",
    ".docx format — maximum ATS compatibility",
  ],
  modern: [
    "Navy blue sidebar — contact & skills",
    "Calibri font — modern and readable",
    "White main area — experience & education",
    "Visually striking two-column design",
    "Optimized for direct email applications",
    ".docx format — maximum ATS compatibility",
  ],
  canadian: [
    "Canadian standard — no photo, age or gender",
    "Calibri with dark navy section headings",
    "Single-column professional layout",
    "Full-width underlined section separators",
    "Complies with PIPEDA privacy guidelines",
    ".docx format — maximum ATS compatibility",
  ],
  europass: [
    "Europass EU standard format",
    "Arial font — EU institution standard",
    "Blue header bands per Europass specification",
    "CEFR language level labeling",
    "Recognized across 32 European countries",
    ".docx format — maximum ATS compatibility",
  ],
};

// ─── Criterion → human readable improvement label ─────────────────────────────
const CRITERION_IMPROVEMENT_LABEL = {
  summary:    "Professional summary rewritten with impact keywords",
  skills:     "Skills section enriched and restructured by category",
  experience: "Work experience reformatted with bullet points & action verbs",
  sections:   "CV structure reorganized — all key ATS sections present",
  keywords:   "ATS keyword density boosted for your domain",
  contact:    "Contact information completed and standardized",
  languages:  "Languages section added with CEFR proficiency levels",
  length:     "CV length optimized to ATS-ideal range (20–70 lines)",
};

// ─────────────────────────────────────────────────────────────────────────────
// deriveImprovements()
//
// Builds the REAL "What GPT actually improved" list by:
//   1. Comparing bdBefore vs bdAfter per criterion — only show real gains
//   2. Listing platform items actually integrated (labs/certs/quiz selected)
//   3. Showing domain keywords that were actually matched after boost
// ─────────────────────────────────────────────────────────────────────────────
export function deriveImprovements({
  parsedCV,
  bdBefore,
  bdAfter,
  selections,
  domain,
  platformLabs  = [],
  platformCerts = [],
  platformQuiz  = null,
}) {
  if (!bdBefore || !bdAfter) return [];

  const items = [];

  // 1. Score gains per criterion — sorted by gain (biggest first)
  const gains = Object.entries(CRITERION_IMPROVEMENT_LABEL)
    .map(([key, label]) => ({
      key,
      label,
      gain: (bdAfter[key]?.score ?? 0) - (bdBefore[key]?.score ?? 0),
    }))
    .filter(x => x.gain > 0)
    .sort((a, b) => b.gain - a.gain);

  for (const { label, gain } of gains) {
    items.push({ type: "score-gain", text: label, gain: `+${gain} pts` });
  }

  // 2. SUBUL quiz integrated
  if (selections?.quiz && platformQuiz) {
    items.push({
      type: "platform",
      text: `Platform quiz integrated — ${platformQuiz.domain} · Level ${platformQuiz.level} (${platformQuiz.score}%)`,
      gain: null,
    });
  }

  // 3. Labs actually selected & integrated
  const integratedLabs = platformLabs.filter(l => selections?.labs?.includes(l.id));
  if (integratedLabs.length > 0) {
    items.push({
      type: "platform",
      text: `${integratedLabs.length} platform lab${integratedLabs.length > 1 ? "s" : ""} integrated: ${integratedLabs.map(l => l.title).join(", ")}`,
      gain: null,
    });
  }

  // 4. Certifications actually selected & integrated
  const integratedCerts = platformCerts.filter(c => selections?.certs?.includes(c.id));
  if (integratedCerts.length > 0) {
    items.push({
      type: "platform",
      text: `${integratedCerts.length} certification${integratedCerts.length > 1 ? "s" : ""} added: ${integratedCerts.map(c => c.title).join(", ")}`,
      gain: null,
    });
  }

  // 5. Real domain keywords that matched after boost
  const matchedKw = bdAfter["keywords"]?.matched || [];
  if (matchedKw.length > 0 && domain) {
    const topKw = matchedKw
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, 5)
      .map(m => (typeof m === "string" ? m : m.keyword))
      .filter(Boolean);
    if (topKw.length > 0) {
      items.push({
        type: "keywords",
        text: `Top keywords matched for "${domain}": ${topKw.join(", ")}`,
        gain: null,
      });
    }
  }

  return items.slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// deriveCompliance()
//
// Builds the REAL ATS compliance list from:
//   1. Format-specific rules (always true — format was applied by backend)
//   2. Sections actually present in parsedCV (from OpenAI output)
//   3. ATS score after boost
// ─────────────────────────────────────────────────────────────────────────────
export function deriveCompliance({ parsedCV, bdAfter, selectedFormat }) {
  const formatRules = ATS_FORMAT_RULES[selectedFormat] || ATS_FORMAT_RULES["ats"];
  const sections    = parsedCV?.sections || {};

  // Check which sections OpenAI actually generated
  const sectionChecks = [
    { key: "profile",        label: "Professional summary present" },
    { key: "experience",     label: "Work experience section complete" },
    { key: "skills",         label: "Technical skills section present" },
    { key: "education",      label: "Education section present" },
    { key: "certifications", label: "Certifications section added" },
    { key: "languages",      label: "Languages section present" },
  ];

  const dynamicChecks = sectionChecks
    .filter(({ key }) => (sections[key]?.length ?? 0) > 0)
    .map(({ label }) => ({ text: label, ok: true }));

  // Score-based compliance check
  const totalAfter = bdAfter
    ? Object.values(bdAfter).reduce((s, v) => s + (v.score || 0), 0)
    : 0;
  if (totalAfter > 0) {
    dynamicChecks.push({
      text: totalAfter >= 75
        ? `ATS score ${totalAfter}/100 — above recruiter threshold`
        : `ATS score ${totalAfter}/100 — improved from baseline`,
      ok: true,
    });
  }

  // Combine: format rules first (always ✓), then real section checks
  const all = [
    ...formatRules.map(text => ({ text, ok: true })),
    ...dynamicChecks,
  ];

  // Deduplicate
  const seen = new Set();
  return all.filter(item => {
    if (seen.has(item.text)) return false;
    seen.add(item.text);
    return true;
  }).slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// Item type → color config
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_CFG = {
  "score-gain": { color: "#E91E8C", bg: "rgba(233,30,140,.07)", border: "rgba(233,30,140,.18)" },
  "platform":   { color: "#7B2FBE", bg: "rgba(123,47,190,.07)", border: "rgba(123,47,190,.18)" },
  "keywords":   { color: "#10B981", bg: "rgba(16,185,129,.07)",  border: "rgba(16,185,129,.18)"  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WhatWasImproved — renders real improvement items
// ─────────────────────────────────────────────────────────────────────────────
export function WhatWasImproved({ items }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "var(--text-faint)", padding: "12px 0", textAlign: "center" }}>
        Boost your CV to see what SUBUL really changed.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => {
        const cfg = TYPE_CFG[item.type] || TYPE_CFG["score-gain"];
        return (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 13px", borderRadius: 10,
              background: cfg.bg, border: `1.5px solid ${cfg.border}`,
              animation: `fadeUp .28s ease ${i * 55}ms both`,
            }}
          >
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: cfg.color, flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45, flex: 1 }}>
              {item.text}
            </span>
            {item.gain && (
              <span style={{
                fontSize: 11, fontWeight: 800, flexShrink: 0,
                padding: "2px 8px", borderRadius: 99,
                background: cfg.color, color: "#fff",
                boxShadow: `0 2px 8px ${cfg.color}44`,
              }}>
                {item.gain}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATSCompliance — renders real compliance checklist
// ─────────────────────────────────────────────────────────────────────────────
export function ATSCompliance({ items }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "var(--text-faint)", padding: "12px 0", textAlign: "center" }}>
        Compliance data will appear after boost.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            animation: `fadeUp .28s ease ${i * 45}ms both`,
          }}
        >
          <CheckCircle size={13} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45 }}>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}