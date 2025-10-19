import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Securely initialize Firebase Admin
function initializeFirebaseAdmin() {
    if (!getApps().length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({ credential: cert(serviceAccount) });
    }
}

export default async function handler(request, response) {
    const { code, state } = request.query;
    const userId = state; // We get the userId back from the 'state' parameter

    if (!code || !userId) {
        return response.status(400).send('Error: Missing authorization code or user state.');
    }

    try {
        const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        const client_id = process.env.LINKEDIN_CLIENT_ID;
        const client_secret = process.env.LINKEDIN_CLIENT_SECRET;
        const redirect_uri = `${process.env.VERCEL_URL}/api/linkedin-auth-callback`;

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('client_id', client_id);
        params.append('client_secret', client_secret);
        params.append('redirect_uri', redirect_uri);

        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        
        if (!accessToken) {
            console.error("LinkedIn Auth Error:", tokenData);
            throw new Error("Could not retrieve access token from LinkedIn.");
        }

        // --- Securely save the access token to the user's profile ---
        initializeFirebaseAdmin();
        const db = getFirestore();
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
            linkedinAccessToken: accessToken,
            linkedinTokenExpiry: new Date().getTime() + (tokenData.expires_in * 1000) // Save expiry time
        }, { merge: true });

        console.log(`Successfully saved LinkedIn token for user ${userId}`);

        // Redirect the user back to the main app page
        return response.redirect(process.env.VERCEL_URL);

    } catch (error) {
        console.error("Error in LinkedIn callback:", error);
        return response.status(500).send('An error occurred during LinkedIn authentication.');
    }
}
