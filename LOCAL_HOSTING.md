# Local Hosting Guide

Follow these steps to run the DermAl application on your local machine.

## 1. Prerequisites

- **Node.js**: Ensure you have Node.js (version 18 or higher) installed.
- **npm**: Comes with Node.js.

## 2. Setting Up the Project

1.  **Clone or Download**: Get the source code onto your local machine.
2.  **Install Dependencies**: Open your terminal in the project root directory and run:
    ```bash
    npm install
    ```

## 3. Environment Configuration

1.  **Create `.env` File**: Create a file named `.env` in the root directory. You can copy the contents from `.env.example`:
    ```bash
    cp .env.example .env
    ```
2.  **Add API Keys**:
    - Open the `.env` file.
    - Set `GEMINI_API_KEY` to your Google AI (Gemini) API key. You can get one from the [Google AI Studio](https://aistudio.google.com/app/apikey).
    - Set `APP_URL` to `http://localhost:3000`.

3.  **Firebase Configuration**:
    - Ensure the `firebase-applet-config.json` file is present in the root directory. This file contains the necessary database and authentication settings. If you want to use your own Firebase project, you will need to replace the values in this file with your project's configuration.

## 4. Running the Application

To start the development server, run:
```bash
npm run dev
```

The application will be accessible at:
**[http://localhost:3000](http://localhost:3000)**

## 5. Deployment / Production Build

To create a production-ready build:
1.  **Build**:
    ```bash
    npm run build
    ```
2.  **Start Pool**:
    ```bash
    npm start
    ```

---
**Note**: Since this app uses Firebase, ensure your Firebase Console has **Google Authentication** enabled and your local URL (`http://localhost:3000`) is added to the "Authorized domains" list in the Firebase Console (Authentication > Settings > Authorized domains).
