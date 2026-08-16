# Vercel Deployment Guide

DermAI is configured for seamless deployment on **Vercel** with dedicated Serverless AI functions (`/api/analyze`) and full Firebase Cloud synchronization.

---

### **1. Why AI Prediction Might Not Respond on Vercel (Root Causes & Fixes)**

1. **Missing `GEMINI_API_KEY` in Vercel Project Settings**:
   - Vercel does **not** automatically inherit local `.env` files.
   - You must add `GEMINI_API_KEY` in **Vercel Project Settings** → **Environment Variables**.
2. **Missing Redeploy after Adding Variables**:
   - After adding environment variables in Vercel, you must trigger a **Redeploy** (Deployments → `...` menu → Redeploy) for the variables to take effect.
3. **Payload Size Limit for Images**:
   - Vercel Serverless Functions have a request body limit. The app automatically compresses and optimizes image uploads to under 1.5MB before transmission and configures `bodyParser: { sizeLimit: '15mb' }`.

---

### **2. Step-by-Step Vercel Deployment**

1. Go to your [Vercel Dashboard](https://vercel.com/new).
2. Click **"Add New..."** → **"Project"** and import your GitHub repository.
3. Vercel automatically detects the project settings:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build` (or `vite build`)
   - **Output Directory:** `dist`
4. Expand the **Environment Variables** section and add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** *Your Gemini API Key (from https://aistudio.google.com/app/apikey)*
5. *(Optional backup)* Add:
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** *Your Gemini API Key*
6. Click **Deploy**.

---

### **3. If Already Deployed: How to Add the API Key Now**

1. Open your project in the [Vercel Dashboard](https://vercel.com).
2. Go to **Settings** → **Environment Variables**.
3. Add `GEMINI_API_KEY` and paste your key. Check all environments (Production, Preview, Development).
4. Click **Save**.
5. Go to the **Deployments** tab, click the three dots (`...`) on the latest deployment, and click **Redeploy**.

---

### **4. Firebase Authentication Domain Authorization**

If using Firebase Google Sign-In on your Vercel deployment:
1. Open the [Firebase Console](https://console.firebase.google.com).
2. Select your Firebase project → **Authentication** → **Settings** tab.
3. Scroll to **Authorized domains** and click **Add domain**.
4. Add your Vercel domain (e.g. `your-app.vercel.app`).

---

### **5. Architecture Details**
- **Serverless Endpoint (`/api/analyze`)**: Vercel executes the `@google/genai` model endpoint (`gemini-3.1-flash-lite` / `gemini-3.7-flash`).
- **Resilient Fallback**: If the API key is missing or internet is temporarily disrupted, the system uses the client-side clinical heuristic model to ensure continuous clinic operation.


