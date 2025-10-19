import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
    if (!getApps().length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({ credential: cert(serviceAccount) });
    }
}

export default async function handler(request, response) {
    // This is a powerful function. We'll protect it with a secret key.
    const { email, secret } = request.query;

    if (secret !== process.env.ADMIN_SECRET) {
        return response.status(401).send('Unauthorized: Invalid secret.');
    }

    if (!email) {
        return response.status(400).send('Please provide an email address in the query.');
    }

    try {
        initializeFirebaseAdmin();
        const auth = getAuth();

        // Get the user by email
        const user = await auth.getUserByEmail(email);

        // Set the custom claim 'admin' to true
        await auth.setCustomUserClaims(user.uid, { admin: true });

        console.log(`Successfully made ${email} (UID: ${user.uid}) an admin.`);
        return response.status(200).send(`Successfully made ${email} an admin! You can now close this tab.`);

    } catch (error) {
        console.error("Error setting admin claim:", error);
        return response.status(500).send('Error setting admin claim: ' + error.message);
    }
}

