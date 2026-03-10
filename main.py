"""
CV Booster Backend v4 — Azure OpenAI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRACTION STRATEGY — smart 4-level fallback per file type:

  PDF:
    Level 1 — pdfplumber        (fast, works for standard text CVs)
    Level 2 — GPT-4o Vision     (graphical, 2-col, sidebar, scanned)

  DOCX:
    Level 1 — XML direct        (mc:AlternateContent, text boxes, shapes)
    Level 2 — python-docx       (paragraphs + tables)
    Level 3 — LibreOffice+Vision (complex graphical DOCX)

PHOTO:   extracted (PyMuPDF / zipfile) and re-injected in ATS format
GUARD:   template detection → block before LLM if CV not filled in
ERRORS:  422 = user error (bad/empty CV), 500 = server/LLM error

✅ Improvements from Code 2:
  - Azure credentials loaded from environment variables (no hardcoding)
  - Structured logging throughout (INFO / ERROR levels)

Install:
    pip install fastapi uvicorn python-multipart pdfplumber python-docx openai pymupdf

Run:
    uvicorn main:app --reload --port 8000
"""

# ─────────────────────────────────────────────────────────────────────────────
# IMPORTS
# ─────────────────────────────────────────────────────────────────────────────
import os
import logging
import re
import io
import json
import base64
import zipfile
import struct

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from openai import AzureOpenAI
import pdfplumber
import docx as docx_reader
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# PyMuPDF — optional, needed for PDF→image (vision) + PDF photo extraction
try:
    import fitz
    FITZ_OK = True
except ImportError:
    FITZ_OK = False
    logging.warning("⚠  PyMuPDF not installed — run: pip install pymupdf")

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING SETUP  (from Code 2 — structured logging instead of bare prints)
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("cv_booster")

# ─────────────────────────────────────────────────────────────────────────────
# AZURE OPENAI — credentials from environment variables  (from Code 2)
# ─────────────────────────────────────────────────────────────────────────────
# Set these in your shell or .env file:
#   export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
#   export AZURE_OPENAI_KEY="your-key-here"
#   export AZURE_DEPLOYMENT_CHAT="gpt-4o-mini"
#   export AZURE_DEPLOYMENT_VISION="gpt-4o"
#   export AZURE_API_VERSION="2024-12-01-preview"
#
# Fallbacks to hardcoded values so the app still works without env setup.
AZURE_ENDPOINT    = os.getenv("AZURE_OPENAI_ENDPOINT",    "https://cvazureopenai.openai.azure.com/")
AZURE_API_KEY     = os.getenv("AZURE_OPENAI_KEY",         "AZURE_OPENAI_KEY")
AZURE_API_VERSION = os.getenv("AZURE_API_VERSION",        "2024-12-01-preview")
AZURE_DEPLOYMENT  = os.getenv("AZURE_DEPLOYMENT_CHAT",    "gpt-4o-mini")   # CV rewrite model
AZURE_VISION_DEP  = os.getenv("AZURE_DEPLOYMENT_VISION",  "gpt-4o")        # vision extraction model

if not AZURE_ENDPOINT or not AZURE_API_KEY:
    raise ValueError("❌ Azure OpenAI credentials missing — set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY")

log.info("✅ Azure OpenAI configured — endpoint: %s | chat: %s | vision: %s",
         AZURE_ENDPOINT, AZURE_DEPLOYMENT, AZURE_VISION_DEP)

client = AzureOpenAI(
    api_version=AZURE_API_VERSION,
    azure_endpoint=AZURE_ENDPOINT,
    api_key=AZURE_API_KEY,
)

# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM DATA
# ─────────────────────────────────────────────────────────────────────────────
PLATFORM_DATA = {
    "quiz": {"domain": "Data Analytics & BI", "score": 82, "level": "Advanced"},
    "labs": [
        {"id": "lab1", "title": "Machine Learning Basics",     "date": "Jan 12, 2025", "score": 94},
        {"id": "lab2", "title": "Python Data Analysis",        "date": "Feb 03, 2025", "score": 88},
        {"id": "lab3", "title": "Advanced SQL & Optimization", "date": "Feb 28, 2025", "score": 91},
        {"id": "lab4", "title": "Power BI Dashboards",         "date": "Mar 15, 2025", "score": 85},
    ],
    "certifications": [
        {"id": "cert1", "title": "AWS Cloud Practitioner",      "org": "Amazon Web Services", "date": "Jan 2025"},
        {"id": "cert2", "title": "Google Data Analytics",       "org": "Google",              "date": "Dec 2024"},
        {"id": "cert3", "title": "IBM Python for Data Science", "org": "IBM",                 "date": "Nov 2024"},
    ],
}




# ─────────────────────────────────────────────────────────────────────────────
# SECTIONS 1 & 2 (Text Extraction + Photo Extraction) have been moved to:
#   cv_extraction.py
# They are imported below after sections 3 & 4 are defined.
# ─────────────────────────────────────────────────────────────────────────────

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 3 — TEMPLATE DETECTION & CONTENT QUALITY GUARD
# ═════════════════════════════════════════════════════════════════════════════

_NOISE_MARKERS = [
    "cher(e) candidat(e)", "merci d'avoir téléchargé", "copyright :",
    "créeruncv.com", "creeruncv.com", "canva.com", "cvdesignr.com",
    "resumegenius.com", "nous espérons qu'il vous aidera",
    "besoin de conseils pour rédiger", "disclaimer :",
    "reproduction strictement interdite", "----------------",
    "nous vous souhaitons bonne chance", "modèle de cv",
]

_EXP_PH = {
    "titre du poste", "poste occupé", "job title", "position title",
    "your job title", "nom du poste", "intitulé du poste",
    "job title here", "company name here",
}
_EDU_PH = {
    "diplôme – université", "degree – university", "university name",
    "école / université", "nom de l'école", "school name",
    "nom du diplôme", "intitulé du diplôme", "degree – school",
}
_DESC_PH = {
    "décrivez ici les fonctions", "décrivez en quelques lignes",
    "décrivez en une ligne", "describe your", "your responsibilities",
    "entrez votre", "saisissez votre", "write your",
}
_ALL_PH = _EXP_PH | _EDU_PH


def _clean_noise(text: str) -> str:
    lines, skip = [], False
    for line in text.split("\n"):
        ll = line.lower().strip()
        if any(m in ll for m in _NOISE_MARKERS):
            skip = True
        if not skip:
            lines.append(line)
    return "\n".join(lines)


def _has_real_content(text: str):
    if not text or len(text.strip()) < 80:
        return False, "The CV file appears to be empty."

    text   = _clean_noise(text)
    lines  = [l.strip() for l in text.split("\n") if l.strip()]
    year_re = re.compile(r"(20\d{2}|19\d{2})")

    _SECTION_WORDS = {
        "education", "formation", "experience", "expérience", "skills",
        "compétences", "profile", "profil", "languages", "langues",
        "projects", "projets", "certifications", "contact",
    }

    real_n, ph_n = 0, 0
    for line in lines:
        if not year_re.search(line): continue
        if "@" in line or re.search(r"\b\d{8,}\b", line): continue
        skeleton = re.sub(r"[0-9\s\-–|/()]", "", line).strip()
        if len(skeleton) < 3: continue
        if skeleton.lower() in _SECTION_WORDS: continue
        if any(ph in line.lower() for ph in _ALL_PH):
            ph_n += 1
        else:
            real_n += 1

    desc_n = sum(1 for l in lines if any(ph in l.lower() for ph in _DESC_PH))

    if real_n == 0 and ph_n > 0:
        return False, (
            "Your CV appears to be an unfilled template — the experience and education "
            "sections still contain placeholder text such as \"TITRE DU POSTE\" or "
            "\"DIPLÔME – UNIVERSITÉ\". Please replace them with your real information "
            "and re-upload."
        )
    if real_n == 0 and desc_n >= 2:
        return False, (
            "Your CV is missing real experience or education entries. "
            "Please fill in at least one job or education entry before uploading."
        )
    return True, ""


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 4 — ATS SCORE CALCULATOR
# ═════════════════════════════════════════════════════════════════════════════

try:
    from sentence_transformers import SentenceTransformer, util as st_util
    _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    SEMANTIC_OK = True
    log.info("✅ Sentence Transformers loaded — semantic keyword scoring active")
except ImportError:
    SEMANTIC_OK = False
    log.warning("⚠  sentence-transformers not installed → pip install sentence-transformers")

_FALLBACK_KEYWORDS = [
    "machine learning", "data", "python", "analysis", "analytics",
    "artificial intelligence", "ai", "deep learning", "nlp", "sql",
    "statistics", "model", "algorithm", "visualization", "engineering",
    "project", "internship", "research", "development", "bachelor", "master",
    "scikit", "pandas", "tensorflow", "keras", "docker", "git", "power bi",
    "cloud", "aws", "pipeline", "dashboard", "automation", "optimization",
]

_DOMAIN_KW_CACHE: dict[str, list[str]] = {}

SECTION_HEADERS_RE = {
    "profile":        re.compile(r"^(profile|profil|about|objective|summary|présentation|professional summary|about me|career objective|personal statement)$", re.I),
    "education":      re.compile(r"^(education|formation|études|academic|diplômes?|qualifications?|academic background|educational background|studies)$", re.I),
    "experience":     re.compile(r"^(experience|expérience|professional experience|work experience|work history|employment|employment history|career history|internships?|stage)$", re.I),
    "skills":         re.compile(r"^(skills?|technical skills?|compétences?|technologies|core skills?|key skills?|expertise|technical expertise)$", re.I),
    "projects":       re.compile(r"^(projects?|academic projects?|projets?|portfolio|personal projects?|side projects?|notable projects?)$", re.I),
    "certifications": re.compile(r"^(certif\w*|badges?|awards?|achievements?|training|licenses?|courses?)$", re.I),
    "languages":      re.compile(r"^(languages?|langues?|spoken languages?)$", re.I),
}


def parse_cv_sections(text: str) -> dict:
    lines    = [l.strip() for l in text.split("\n") if l.strip()]
    sections = {"header": []}
    current  = "header"
    for line in lines:
        matched = next((k for k, p in SECTION_HEADERS_RE.items()
                        if p.match(line) and len(line) < 60), None)
        if matched:
            current = matched
            sections.setdefault(current, [])
        else:
            sections.setdefault(current, [])
            sections[current].append(line)
    return sections


def detect_domain(cv_text: str) -> str:
    try:
        resp = client.chat.completions.create(
            model=AZURE_DEPLOYMENT,
            messages=[{
                "role": "user",
                "content": (
                    "Read this CV extract and return ONLY the professional domain "
                    "in 2-4 words (English). Examples: 'Data Engineering', "
                    "'Web Development', 'Cybersecurity', 'Finance & Accounting'.\n"
                    "Return ONLY the domain name, nothing else.\n\n"
                    f"{cv_text[:1500]}"
                ),
            }],
            max_tokens=15,
            temperature=0,
        )
        domain = resp.choices[0].message.content.strip().strip("\"'")
        log.info("✓ Domain detected: %s", domain)
        return domain
    except Exception as e:
        log.error("detect_domain error: %s", e)
        return "Data Science"


def get_domain_keywords(domain: str) -> list[str]:
    if domain in _DOMAIN_KW_CACHE:
        log.info("✓ Keywords from cache for '%s'", domain)
        return _DOMAIN_KW_CACHE[domain]

    try:
        resp = client.chat.completions.create(
            model=AZURE_DEPLOYMENT,
            messages=[{
                "role": "user",
                "content": (
                    f"List the 60 most important ATS keywords for a '{domain}' professional CV.\n"
                    f"Include: tools, technologies, skills, methodologies, certifications, "
                    f"action verbs, and domain-specific terms.\n"
                    f"Return ONLY a valid JSON array of lowercase strings, no explanation.\n"
                    f"Example: [\"python\", \"sql\", \"data pipeline\", \"machine learning\"]"
                ),
            }],
            max_tokens=600,
            temperature=0,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            keywords = json.loads(match.group())
            keywords = [str(k).lower().strip() for k in keywords if k]
        else:
            keywords = _FALLBACK_KEYWORDS
        log.info("✓ %d keywords generated for '%s'", len(keywords), domain)
        _DOMAIN_KW_CACHE[domain] = keywords
        return keywords
    except Exception as e:
        log.error("get_domain_keywords error: %s → using fallback", e)
        return _FALLBACK_KEYWORDS


def semantic_keyword_score(cv_text: str, keywords: list[str]) -> dict:
    if not SEMANTIC_OK or not keywords:
        text_lo    = cv_text.lower()
        found      = [kw for kw in keywords if kw in text_lo]
        score      = min(round(len(found) / max(len(keywords) * 0.6, 1) * 10), 10)
        return {
            "score":     score, "max": 10,
            "matched":   [{"keyword": k, "similarity": 1.0} for k in found],
            "unmatched": [k for k in keywords if k not in found],
            "detail":    f"{len(found)}/{len(keywords)} keywords matched (exact)",
        }

    THRESHOLD = 0.50
    cv_sentences = [s.strip() for s in re.split(r"[\n•\-]", cv_text) if len(s.strip()) > 8]
    if not cv_sentences: cv_sentences = [cv_text[:500]]

    cv_embs  = _embedder.encode(cv_sentences, convert_to_tensor=True, show_progress_bar=False)
    kw_embs  = _embedder.encode(keywords,     convert_to_tensor=True, show_progress_bar=False)

    matched, unmatched = [], []
    for i, kw in enumerate(keywords):
        sims       = st_util.cos_sim(kw_embs[i], cv_embs)[0]
        best_score = float(sims.max())
        if best_score >= THRESHOLD:
            matched.append({"keyword": kw, "similarity": round(best_score, 2)})
        else:
            unmatched.append(kw)

    pct   = len(matched) / max(len(keywords), 1)
    score = min(round(pct / 0.65 * 10), 10)
    log.info("✓ Semantic: %d/%d matched (score %d/10)", len(matched), len(keywords), score)
    return {
        "score": score, "max": 10,
        "matched": matched, "unmatched": unmatched,
        "detail": f"{len(matched)}/{len(keywords)} keywords matched semantically",
    }


def calculate_ats_score(sections: dict, full_text: str,
                        domain_keywords: list[str] | None = None) -> dict:
    """
    ATS Score — 100 pts total across 8 criteria:
      Sections    20 pts | Skills      18 pts | Experience 18 pts | Length   12 pts
      Contact      8 pts | Keywords     8 pts | Summary    10 pts | Languages 6 pts
    """
    scores  = {}
    text_lo = full_text.lower()

    # 1. Key Sections (20 pts)
    important = ["profile", "education", "experience", "skills", "projects"]
    found     = [s for s in important if sections.get(s)]
    scores["sections"] = {
        "score": round(len(found) / len(important) * 20), "max": 20,
        "detail": f"{len(found)}/{len(important)} key sections detected",
    }

    # 2. Technical Skills (18 pts)
    skill_list = [
        "python","java","sql","javascript","react","docker","git","tensorflow",
        "keras","scikit","pandas","hadoop","nltk","plotly","opencv","pytorch",
        "numpy","spark","power bi","tableau","aws","azure","dbt","airflow",
        "machine learning","deep learning","nlp","statistics",
    ]
    found_sk = [s for s in skill_list if s in text_lo]
    scores["skills"] = {
        "score": min(round(len(found_sk) / 5 * 18), 18), "max": 18,
        "detail": f"{len(found_sk)} technical skills detected",
    }

    # 3. Experience (18 pts) — strictly section-only, no full-text fallback
    exp_lines   = sections.get("experience", [])
    has_dates   = any(re.search(r"\d{4}", l) for l in exp_lines)   # only exp section
    has_bullets = any(l.strip().startswith(("-", "•")) for l in exp_lines)
    scores["experience"] = {
        "score": min((9 if exp_lines else 0) + (5 if has_dates else 0) + (4 if has_bullets else 0), 18),
        "max": 18,
        "detail": f"{len(exp_lines)} lines, dates:{has_dates}, bullets:{has_bullets}",
    }

    # 4. CV Length (12 pts)
    total_lines = sum(len(v) for v in sections.values())
    if 20 <= total_lines <= 70:   ls, ld = 12, "Ideal length"
    elif total_lines < 20:        ls, ld = 4,  "Too short"
    else:                         ls, ld = 8,  "Slightly long"
    scores["length"] = {"score": ls, "max": 12, "detail": ld}

    # 5. Contact Info (8 pts)
    combined  = (" ".join(sections.get("header",  [])) + " " +
                 " ".join(sections.get("contact", [])) + " " +
                 text_lo[:500]).lower()
    has_phone = bool(re.search(r"\+?\d[\d\s\-]{7,}", combined))
    scores["contact"] = {
        "score":  (3 if "@" in combined else 0) + (3 if has_phone else 0) + (2 if "linkedin" in combined else 0),
        "max": 8,
        "detail": f"Email:{'@' in combined}, Phone:{has_phone}, LinkedIn:{'linkedin' in combined}",
    }

    # 6. ATS Keywords — semantic (8 pts)
    kw_list            = domain_keywords if domain_keywords else _FALLBACK_KEYWORDS
    kw_result          = semantic_keyword_score(full_text, kw_list)
    kw_result["score"] = round(kw_result["score"] / 10 * 8)
    kw_result["max"]   = 8
    scores["keywords"] = kw_result

    # 7. Professional Summary (10 pts)
    profile_lines = (sections.get("profile", []) + sections.get("summary", []) + sections.get("about", []))
    profile_text  = " ".join(profile_lines).strip()
    top_text      = " ".join(text_lo.split()[:80])
    summary_kws   = [
        "experienced", "passionate", "motivated", "dedicated", "skilled",
        "proficient", "specialist", "engineer", "analyst", "developer",
        "manager", "expert", "professional", "background", "expertise",
        "years of experience", "seeking", "objective", "dynamic",
    ]
    has_summary_section = bool(profile_lines)
    summary_word_count  = len(profile_text.split())
    has_summary_kws     = any(kw in profile_text.lower() or kw in top_text for kw in summary_kws)
    is_long_enough      = summary_word_count >= 20

    summary_score, summary_parts = 0, []
    if has_summary_section: summary_score += 5; summary_parts.append("section present")
    if is_long_enough:      summary_score += 3; summary_parts.append(f"{summary_word_count} words")
    if has_summary_kws:     summary_score += 2; summary_parts.append("impact keywords found")
    scores["summary"] = {
        "score": min(summary_score, 10), "max": 10,
        "detail": ", ".join(summary_parts) if summary_parts else "No professional summary detected",
    }

    # 8. Languages (6 pts)
    lang_lines = sections.get("languages", [])
    lang_text  = " ".join(lang_lines).lower()
    KNOWN_LANGS   = [
        "english", "french", "arabic", "spanish", "german", "italian",
        "portuguese", "chinese", "japanese", "russian", "dutch", "turkish",
        "hindi", "korean", "polish", "swedish", "danish", "norwegian",
        "anglais", "français", "arabe", "espagnol", "allemand", "italien",
    ]
    LEVEL_MARKERS = [
        "native", "fluent", "bilingual", "proficient", "advanced",
        "intermediate", "beginner", "basic", "a1","a2","b1","b2","c1","c2",
        "maternelle", "courant", "natif", "notions",
    ]
    langs_found   = [l for l in KNOWN_LANGS if l in lang_text]  # only lang section
    has_lang_sec  = bool(lang_lines)
    has_levels    = any(m in lang_text for m in LEVEL_MARKERS)   # only lang section
    multilingual  = len(langs_found) >= 2

    lang_score, lang_parts = 0, []
    if has_lang_sec:
        lang_score += 3; lang_parts.append("Languages section present")
    elif langs_found:
        lang_score += 1; lang_parts.append(f"{len(langs_found)} language(s) detected in text")
    if has_levels:    lang_score += 2; lang_parts.append("proficiency levels specified")
    if multilingual:  lang_score += 1; lang_parts.append(f"{len(langs_found)} languages listed")
    scores["languages"] = {
        "score": min(lang_score, 6), "max": 6,
        "detail": ", ".join(lang_parts) if lang_parts else "No languages detected",
    }

    total = sum(v["score"] for v in scores.values())
    return {"total": total, "max": 100, "breakdown": scores}


# ─────────────────────────────────────────────────────────────────────────────
# LOAD EXTERNAL MODULES
# cv_extraction — text + photo extraction (Sections 1 & 2)
# explain_ats   — xAI explanation of every ATS criterion
# enhance_cv    — LLM rewrite, DOCX generation, API endpoints
# ─────────────────────────────────────────────────────────────────────────────
from cv_extraction import (        # noqa: F401  (re-exported for callers)
    _is_thin,
    _pdf_to_images_b64, _docx_to_images_b64, _vision_extract,
    _find_xml_parent, _xml_extract_docx,
    extract_text_from_pdf, extract_text_from_docx,
    _img_dimensions, _is_portrait,
    extract_photo_from_pdf, extract_photo_from_docx,
)
from explain_ats import explain_ats_score   # noqa: F401
import enhance_cv                           # noqa: F401  (registers @app routes on import)