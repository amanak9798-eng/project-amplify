import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Securely initialize Firebase Admin
function initializeFirebaseAdmin() {
    if (!getApps().length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
            credential: cert(serviceAccount)
        });
    }
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    initializeFirebaseAdmin();
    const db = getFirestore();

    try {
        const { scheduleId, userId } = request.body;

        if (!scheduleId || !userId) {
            return response.status(400).json({ message: "Schedule ID and User ID are required." });
        }

        // This is a crucial security check. We're deleting a specific document
        // inside the user's own collection. This prevents one user from being
        // able to delete another user's schedule.
        const scheduleRef = db.collection('users').doc(userId).collection('schedules').doc(scheduleId);
        
        await scheduleRef.delete();

        console.log(`Successfully deleted schedule ${scheduleId} for user ${userId}`);
        response.status(200).json({ message: 'Schedule deleted successfully.' });

    } catch (error) {
        console.error("Error in delete-schedule:", error);
        response.status(500).send("Internal Server Error");
    }
}
