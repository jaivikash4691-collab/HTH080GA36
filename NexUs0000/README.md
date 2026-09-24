# NEXUS • From Research Papers to Research Strategy

NEXUS is an academic AI literature intelligence and research strategy platform designed to transform fragmented scientific papers into structured comparative evidence matrices, empirical contradiction detection, research gap identification, and executable experiment roadmaps.

---

## 📁 Project Architecture & Clean Folder Separation

The project is structured with strict separation between frontend, backend, and database:

```text
NexUs/
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── .env
│   ├── .env.example
│   │
│   ├── public/
│   │
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── hooks/
│       ├── context/
│       ├── services/
│       │   ├── api.js
│       │   ├── authService.js
│       │   ├── paperService.js
│       │   ├── analyzerService.js
│       │   ├── conversationService.js
│       │   ├── researchService.js
│       │   └── feedbackService.js
│       ├── utils/
│       ├── styles/
│       ├── App.jsx
│       └── main.jsx
│
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env
│   ├── .env.example
│   │
│   ├── config/
│   │   └── supabase.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── papers.js
│   │   ├── analyzer.js
│   │   ├── conversations.js
│   │   ├── research.js
│   │   └── feedback.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── paperController.js
│   │   ├── analyzerController.js
│   │   ├── conversationController.js
│   │   ├── researchController.js
│   │   └── feedbackController.js
│   │
│   ├── services/
│   │   ├── authService.js
│   │   ├── paperService.js
│   │   ├── analyzerService.js
│   │   ├── ragService.js
│   │   ├── researchService.js
│   │   └── geminiService.js
│   │
│   ├── utils/
│   │   ├── pdfParser.js
│   │   ├── documentParser.js
│   │   ├── chunker.js
│   │   ├── embeddings.js
│   │   └── evidence.js
│   │
│   └── uploads/
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
└── README.md
```

---

## 🚀 Quick Start & Running the Platform

### 1. Start Backend API Server
```bash
cd backend
npm install
npm run dev
# or: node server.js
```
*Backend runs independently at `http://localhost:5000`*

### 2. Start Frontend Client
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`*

### 3. Production Frontend Build
```bash
cd frontend
npm run build
```

---

## 🔌 Backend REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & engine status |
| `POST` | `/api/auth/register` | Register new researcher (direct email + password, zero OTP) |
| `POST` | `/api/auth/login` | Authenticate researcher session |
| `POST` | `/api/auth/logout` | End researcher session |
| `POST` | `/api/auth/forgot-password`| Send password recovery instructions |
| `POST` | `/api/auth/reset-password` | Set new password |
| `GET` | `/api/papers` | Retrieve user's ingested papers & metadata |
| `POST` | `/api/papers/upload` | Ingest and chunk new paper (PDF / DOC / DOCX) |
| `GET` | `/api/papers/:id` | Fetch specific paper extraction details |
| `DELETE` | `/api/papers/:id` | Remove paper from active literature set |
| `POST` | `/api/analyzer/analyze` | Run multi-paper comparative synthesis |
| `POST` | `/api/analyzer/ask` | Citation-grounded cross-paper question answering |
| `GET` | `/api/conversations` | Retrieve past research Q&A sessions |
| `GET` | `/api/conversations/:id` | Retrieve specific conversation messages |
| `DELETE` | `/api/conversations/:id`| Delete conversation history |
| `GET` | `/api/research/findings` | Cross-paper consensus findings & evidence |
| `GET` | `/api/research/gaps` | 6-category Research Gap Radar items |
| `GET` | `/api/research/directions`| Prioritized research directions & milestones |
| `GET` | `/api/research/brain` | Multi-Paper Brain cross-paper synthesis |
| `GET` | `/api/research/contradictions`| Contradiction Hunter side-by-side claims |
| `GET` | `/api/research/timeline`| Methodology evolution timeline (2020-2026) |
| `GET` | `/api/research/combinations`| "What Nobody Combined?" detector |
| `GET` | `/api/research/opportunities`| Ranked research opportunities & questions |
| `GET` | `/api/research/experiments`| Experiment design templates & parameters |
| `GET` | `/api/research/lineage` | 8-step clickable research idea lineage trail |
| `GET` | `/api/research/frontier`| 2D coverage map coordinate clusters |
| `GET` | `/api/research/impact` | Feasibility, novelty, publication simulator |
| `POST` | `/api/feedback` | Academic peer evaluation rating & feedback |

---

## 🎨 Design System & Evidence Taxonomy

- **Background**: `#FBF9F5` (Warm White) / Surface `#F3EFEA` (Linen)
- **Primary Accent**: `#1E1B4B` (Deep Indigo)
- **Verified Findings**: `#0D9488` (Sea Glass Teal)
- **Contradictions**: `#E11D48` (Bright Crimson)
- **Research Gaps**: `#D97706` (Amber Coral)
- **Evidence Badges**: `EXPLICIT`, `SUPPORTED`, `INFERRED`, `UNCERTAIN`, `CONFLICTING`
