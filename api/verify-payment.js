import crypto from 'crypto';
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
        const { order_id, razorpay_payment_id, razorpay_signature, userId } = request.body;
        
        // This is the crucial security step
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${order_id}|${razorpay_payment_id}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpay_signature) {
            console.warn("Payment verification failed for user:", userId);

            return response.status(400).json({ msg: 'Transaction not legit!' });
        }

        // If the signature is legit, update the user's status in Firebase
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
            isPremium: true,
            premiumSince: new Date()
        }, { merge: true }); // merge:true prevents overwriting other user data

        console.log("Payment successful and user upgraded to premium:", userId);
        
        response.status(200).json({
            msg: 'Payment verified successfully',
            orderId: order_id,
            paymentId: razorpay_payment_id,
        });

    } catch (error) {
        console.error("Error in verify-payment:", error);
        response.status(500).send("Internal Server Error");
    }
}
