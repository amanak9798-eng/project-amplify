import Razorpay from 'razorpay';
import { getAuth } from 'firebase-admin/auth';
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

    try {
        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: 29900, // Amount in the smallest currency unit (299 * 100 = 29900 paise)
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`,
        };

        const order = await instance.orders.create(options);

        if (!order) {
            return response.status(500).send("Error creating order");
        }
        
        console.log("Razorpay Order Created:", order);
        response.status(200).json(order);

    } catch (error) {
        console.error("Error in create-order:", error);
        response.status(500).send("Internal Server Error");
    }
}
