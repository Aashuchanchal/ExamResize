# 📐 ExamResize — Photo & Signature Resizer for Government Exams

A free, client-side web tool that resizes and compresses photos & signatures to exact specifications for Indian government examinations.

![ExamResize](https://img.shields.io/badge/ExamResize-Live-6366f1?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Hosted_on-Firebase-FFCA28?style=for-the-badge&logo=firebase)

---

## ✨ Features

- **15+ Exam Presets** — SSC CGL, CHSL, MTS, IBPS PO/Clerk, SBI PO, UPSC CSE/CAPF, JEE Main, NEET UG, UGC NET, RRB NTPC, Group D, CBSE, UP Board
- **100% Client-Side** — All image processing happens in your browser. Zero data is uploaded to any server.
- **Smart Compression** — Binary search algorithm adjusts JPEG quality to hit the exact file size range (e.g., 10–20 KB for SSC signatures).
- **Drag & Drop Upload** — Intuitive upload with real-time preview.
- **Before/After Comparison** — See original vs processed image with full stats.
- **Request New Exams** — Users can request additional exam presets via the built-in contact form.
- **Admin Panel** — Password-protected admin dashboard to review requests and approve new exam presets.
- **AI-Powered Autofill** — Gemini AI automatically fetches exam specifications when admin approves a request.
- **Responsive Design** — Works on mobile, tablet, and desktop.
- **Modern UI** — Dark glassmorphism theme with particle animations and gradient accents.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Firestore (NoSQL database)
- **Hosting**: Firebase Hosting
- **AI**: Google Gemini API (for exam spec autofill)
- **Image Processing**: Canvas API (browser-native)
- **Design**: Custom CSS with glassmorphism, Google Fonts (Inter + Outfit)

## 📦 Project Structure

```
├── index.html              # Main application
├── admin.html              # Admin panel (password protected)
├── css/
│   └── styles.css          # Design system
├── js/
│   ├── presets.js           # Built-in exam presets database
│   ├── processor.js         # Image resize/compress engine
│   ├── app.js               # Main UI controller
│   ├── firebase-config.js   # Firebase initialization
│   └── admin.js             # Admin panel controller
├── firebase.json            # Firebase Hosting config
├── firestore.rules          # Firestore security rules
├── .firebaserc              # Firebase project alias
└── README.md
```

## 🚀 Deployment

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

### GitHub Pages
Push to your GitHub repository — the site is static and can be served from any static host.

## 📋 Supported Exams

| Category | Exams |
|:---------|:------|
| **SSC** | CGL, CHSL, MTS |
| **Banking** | IBPS PO, IBPS Clerk, SBI PO |
| **UPSC** | CSE (IAS), CAPF |
| **NTA** | JEE Main, NEET UG, UGC NET |
| **Railway** | RRB NTPC, RRB Group D |
| **Board** | CBSE, UP Board |

Users can request additional exams through the built-in contact form.

## 🔒 Privacy

- All image processing is done **client-side** using the browser's Canvas API.
- No images are ever uploaded to any server.
- The only data stored in Firebase is exam request submissions (name, email, message).

## 📄 License

MIT License — Free to use, modify, and distribute.

---

**Designed and deployed by Aashutosh Tiwari**
