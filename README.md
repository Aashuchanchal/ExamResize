# 📐 ExamResize — Free Career Toolkit

A comprehensive, free career platform built for Indian students and job seekers. Resize photos for government exams, build ATS-optimized resumes, check resume scores, search jobs, and shop curated deals — all 100% private, client-side processing.

![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA-blue)
![Status](https://img.shields.io/badge/status-Production-brightgreen)

## 🚀 Features

### 📐 Exam Image Resizer
- **15+ exam presets**: SSC CGL, CHSL, MTS, IBPS PO, Clerk, SBI PO, UPSC CSE, JEE Main, NEET, UGC NET, RRB NTPC, CBSE, UP Board & more
- Smart binary-search compression to hit exact file size ranges
- Drag-and-drop upload, instant preview, one-click download
- Community-submitted exams via admin-approved requests

### 📄 ATS Resume Builder
- Multi-step wizard: Personal → Education → Experience → Skills → Projects
- 4 premium templates: Modern, Classic, Minimal, Professional
- Live real-time preview with auto-save to localStorage
- PDF download via jsPDF + html2canvas

### 📊 ATS Resume Score Checker
- Paste resume + job description for instant analysis
- Keyword matching, section detection, format scoring
- Weighted overall ATS score with visual gauge
- Actionable improvement suggestions

### 💼 Job Portal
- Multi-source aggregation: JSearch (LinkedIn, Indeed, Glassdoor) + RemoteOK
- Direct search links: Naukri, AmbitionBox, Internshala
- Job type filters: Full-time, Part-time, Internship, Freelance, Remote
- Bookmark/save jobs to localStorage

### 🛍️ Affiliate Marketplace
- Curated products for students: books, electronics, study materials
- Amazon & Flipkart affiliate links with click tracking
- Admin-managed product catalog via Firestore

### 📢 Admin Panel
- Password-protected dashboard (noindex, hidden)
- Exam request management with Gemini AI autofill
- Ad campaign CRUD with impression/click metrics
- Product catalog management with analytics

### 📱 PWA Mobile App
- Install directly from browser — no Play Store needed
- Offline support via Service Worker
- Standalone app experience on Android & iOS

## 🔒 Privacy

**Zero data uploaded.** All image processing, resume building, and score analysis happen entirely in the browser using Canvas API, jsPDF, and client-side algorithms. No user data is ever sent to any server.

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Fonts | Inter, Outfit (Google Fonts) |
| PDF Generation | jsPDF + html2canvas |
| Job APIs | JSearch (RapidAPI), RemoteOK |
| Backend | Firebase Firestore (requests, ads, products only) |
| Hosting | Firebase Hosting |
| PWA | manifest.json + Service Worker |
| AI | Gemini 2.0 Flash (admin autofill) |

## 📁 Project Structure

```
├── index.html              # Main page (image resizer + tools)
├── resume-builder.html     # ATS Resume Builder
├── resume-score.html       # ATS Resume Score Checker
├── jobs.html               # Job Portal
├── marketplace.html        # Affiliate Product Marketplace
├── admin.html              # Admin Panel (hidden)
├── css/
│   ├── styles.css          # Shared design system
│   ├── resume-builder.css  # Resume builder styles
│   ├── resume-score.css    # Score checker styles
│   ├── jobs.css            # Job portal styles
│   └── marketplace.css     # Marketplace styles
├── js/
│   ├── firebase-config.js  # Firebase + API keys config
│   ├── presets.js           # Exam specifications database
│   ├── processor.js         # Image processing engine
│   ├── app.js               # Main page controller
│   ├── resume-builder.js   # Resume builder logic
│   ├── resume-score.js     # Score analysis engine
│   ├── jobs.js              # Job portal controller
│   ├── marketplace.js      # Marketplace controller
│   ├── admin.js             # Admin panel controller
│   └── ad-renderer.js      # Ad rendering + tracking
├── manifest.json            # PWA manifest
├── sw.js                    # Service Worker
├── sitemap.xml              # SEO sitemap
├── robots.txt               # Search engine directives
├── firebase.json            # Firebase Hosting config
├── firestore.rules          # Firestore security rules
└── .firebaserc              # Firebase project alias
```

## ⚙️ Setup

### 1. Firebase Configuration
Edit `js/firebase-config.js` and replace placeholder values:
```javascript
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID",
  // ... other config
};
const GEMINI_API_KEY = "YOUR_GEMINI_KEY";
const JSEARCH_API_KEY = "YOUR_RAPIDAPI_KEY";
```

### 2. Get Free API Keys
- **Firebase**: [console.firebase.google.com](https://console.firebase.google.com)
- **Gemini AI**: [aistudio.google.com](https://aistudio.google.com)
- **JSearch**: [rapidapi.com/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)

### 3. Deploy
```bash
firebase deploy
```

### 4. Update SEO URLs
Replace `YOUR_DOMAIN` in `sitemap.xml` and `robots.txt` with your Firebase hosting URL.

## 👤 Author

**Designed & Deployed by Aashutosh Tiwari**

## 📄 License

MIT License — free for personal and commercial use.
