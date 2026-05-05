# Vercel Deployment Guide

DermAl can be deployed to Vercel. Since it uses a combined React + Express architecture, you have two main options.

## Option 1: Static Deployment (Recommended for simplicity)

If you only need the AI analysis and History (Firebase) features, you can deploy the app as a static site. Note that the simple "Local Alerts" feature (from `server.ts`) will not work in this mode, as it requires a running Node.js server.

1.  **Framework Preset**: Select **Vite**.
2.  **Build Command**: `npm run build`
3.  **Output Directory**: `dist`
4.  **Environment Variables**:
    -   `VITE_GEMINI_API_KEY`: Your Gemini API key.
    -   `VITE_APP_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`).
5.  **Firebase Config**: Ensure `firebase-applet-config.json` is in your repository.

## Option 2: Full-Stack Deployment (With Express API)

To keep the `/api/alerts` functionality, you need to configure Vercel to handle the Express server as a function.

1.  **Create `vercel.json`**: Add this file to the root directory:
    ```json
    {
      "rewrites": [
        { "source": "/api/(.*)", "destination": "/api/server.js" },
        { "source": "/(.*)", "destination": "/index.html" }
      ]
    }
    ```
2.  **Adapt Server**: Vercel expects serverless functions in the `api/` directory. You would need to move your `server.ts` logic into `api/server.ts` and export the express instance:
    ```typescript
    // api/server.ts example
    import app from "../server-instance"; // you'd need to refactor slightly
    export default app;
    ```
3.  **Environment Variables**: Same as Option 1.

## Important: Firebase & Gemini Security

-   **Firebase**: Go to the Firebase Console -> Authentication -> Settings -> Authorized Domains. Add your Vercel domain (e.g., `your-app.vercel.app`) so Google Login works.
-   **API Keys**: Never commit your `.env` file to GitHub. Always use Vercel's Environment Variables dashboard to add your `VITE_GEMINI_API_KEY`.

## Steps to Deploy

1.  Push your code to a **GitHub** repository.
2.  Go to [Vercel](https://vercel.com) and click **"New Project"**.
3.  Import your GitHub repository.
4.  Add the environment variables mentioned above.
5.  Click **Deploy**.
