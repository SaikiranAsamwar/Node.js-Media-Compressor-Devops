# Google OAuth Setup Instructions

The Google OAuth "Continue with Google" button has been temporarily disabled.

## To Enable Google OAuth:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project:**
   - Click "Select a project" → "New Project"
   - Name: "FileCompressor Pro"
   - Click "Create"

3. **Enable Google+ API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Configure consent screen if prompted
   - Application type: "Web application"
   - Name: "FileCompressor Pro OAuth"
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
   - Click "Create"

5. **Copy Credentials:**
   - Copy the "Client ID" (ends with .apps.googleusercontent.com)
   - Copy the "Client Secret"

6. **Update Backend Configuration:**
   - Create file: `backend/.env`
   - Add your credentials:
     ```
     GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
     GOOGLE_CLIENT_SECRET=your-client-secret-here
     ```

7. **Restart the Server:**
   ```bash
   cd backend
   npm start
   ```

8. **Uncomment OAuth Buttons:**
   - Edit `frontend/login.html` and `frontend/signup.html`
   - Remove the `<!--` and `-->` around the OAuth button code

## Current Status:
✅ OAuth backend routes configured
✅ Passport.js Google strategy set up
⏸️ OAuth buttons hidden until credentials configured
⏸️ Using placeholder credentials (needs real Google Cloud credentials)

The application works perfectly with regular email/password authentication!
