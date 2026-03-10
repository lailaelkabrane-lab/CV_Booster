# SUBUL CV Booster — Next.js

Migrated from React (Vite) to Next.js 14 App Router.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Backend

Make sure the FastAPI backend is running on port 8000:

```bash
cd backend
pip install fastapi uvicorn python-multipart pdfplumber python-docx openai pymupdf
uvicorn main:app --reload --port 8000
```

## Project Structure

```
cv-booster-next/
├── app/
│   ├── layout.js          # Root layout (replaces index.html + main.jsx)
│   ├── page.js            # Home page → renders CVBoosterApp
│   └── globals.css        # All styles (merged App.css + index.css)
├── components/
│   ├── CVBoosterApp.jsx   # Main app logic (was App.jsx)
│   ├── EnrichScreen.jsx
│   ├── ExplainScreen.jsx
│   ├── FormatScreen.jsx
│   ├── MissingSectionsModal.jsx
│   └── ResultInsights.jsx
├── package.json
├── next.config.js
└── jsconfig.json
```

## What Changed (React → Next.js)

| React (Vite)         | Next.js                          |
|----------------------|----------------------------------|
| `main.jsx`           | `app/layout.js` + `app/page.js`  |
| `index.html`         | `app/layout.js` (metadata)       |
| `App.jsx`            | `components/CVBoosterApp.jsx`    |
| `import "./App.css"` | `app/globals.css` (auto-loaded)  |
| No directives needed | `"use client"` on all components |
| Vite dev server      | `next dev` on port 3000          |

The backend API URL (`http://localhost:8000`) and all functionality remain identical.
