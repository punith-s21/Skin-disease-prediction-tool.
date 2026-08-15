# Vercel Deployment Guide

DermAl is ready for one-click deployment on **Vercel** with full serverless AI support and Firebase Cloud synchronization.

---

### **1. Prerequisites**
- A [Vercel](https://vercel.com) account
- A GitHub repository with this code pushed

---

### **2. Quick Deploy Steps on Vercel**
1. Go to your [Vercel Dashboard](https://vercel.com/new).
2. Click **"Add New..."** → **"Project"** and import your repository.
3. Vercel will automatically detect:
   - **Framework Preset:** `Vite`
   - **Build Command:** `vite build` (or `npm run build`)
   - **Output Directory:** `dist`
4. Expand **Environment Variables** and add:
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key from Google AI Studio)*
   - `VITE_GEMINI_API_KEY`: *(Optional, same as GEMINI_API_KEY for client backup)*
5. Click **Deploy**.

---

### **3. Firebase Authentication Authorization (Crucial)**
If you use Google Sign-In or Firebase Auth:
1. Go to the [Firebase Console](https://console.firebase.google.com).
2. Navigate to **Authentication** → **Settings** tab → **Authorized domains**.
3. Click **Add domain** and paste your Vercel URL (e.g. `your-app-name.vercel.app`).

---

### **4. Included Architecture & Optimizations**
- **Serverless API Routes (`/api/analyze`)**: Vercel automatically deploys the `@google/genai` handler without needing a standalone server container.
- **Offline & Low-Bandwidth Mode**: If internet access drops in rural clinics, the app automatically switches to the built-in clinical heuristic engine (trained on HAM10000 and Fitzpatrick 17k taxonomy).
- **Single Page Application Routing**: Configured via `vercel.json` to prevent 404 errors on page reloads.

