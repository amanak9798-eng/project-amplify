import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Helper function to call Gemini API ---
async function generatePostFromTopic(topic) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `You are an expert LinkedIn content strategist. Take the following topic and generate a complete, engaging, professional LinkedIn post suitable for an Indian audience. The post should be ready to publish.
    - Start with a strong, attention-grabbing hook.
    - Elaborate on the topic in 2-3 short, easy-to-read paragraphs.
    - End with a question to encourage comments and engagement.
    - Include 3 to 5 relevant and popular hashtags.
    - Topic: "${topic}"`;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "contents": [{ "parts": [{ "text": prompt }] }]
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API Error:", errorData);
        throw new Error(`Gemini API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}


// --- Main Handler for the Cron Job ---
export default async function handler(request, response) {
    console.log("Cron Job started...");

    try {
        // Securely initialize Firebase Admin SDK using Vercel Environment Variables
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

        if (!getApps().length) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        }
        
        const db = getFirestore();
        const now = new Date();
        const currentDay = now.getDay(); // Sunday = 0, Monday = 1, ...
        const currentHour = now.getHours(); // 0-23

        console.log(`Current time check: Day ${currentDay}, Hour ${currentHour}`);

        // Get all schedules
        const schedulesSnapshot = await db.collectionGroup('schedules').get();
        if (schedulesSnapshot.empty) {
            console.log("No schedules found.");
            return response.status(200).send("OK: No schedules found.");
        }

        console.log(`Found ${schedulesSnapshot.docs.length} total schedules. Checking for due posts...`);

        // Process each schedule
        for (const doc of schedulesSnapshot.docs) {
            const schedule = doc.data();
            const scheduleTime = parseInt(schedule.time.split(':')[0]);

            // Check if the schedule is due
            if (schedule.dayOfWeek == currentDay && scheduleTime == currentHour) {
                console.log(`Processing schedule for user ${schedule.userId} on topic: ${schedule.topic}`);
                
                // 1. Generate the post using Gemini
                const postContent = await generatePostFromTopic(schedule.topic);

                // 2. Save the new post to the user's history
                const postTitle = schedule.topic.substring(0, 60) + (schedule.topic.length > 60 ? '...' : '');
                const postsRef = db.collection('users').doc(schedule.userId).collection('posts');
                await postsRef.add({
                    userId: schedule.userId,
                    title: `Automated Post: ${postTitle}`,
                    content: postContent,
                    originalIdea: `Automated from schedule: "${schedule.topic}"`,
                    createdAt: new Date()
                });
                console.log(`Successfully generated and saved post for user ${schedule.userId}`);
            }
        }

        console.log("Cron Job finished successfully.");
        return response.status(200).send("OK: Cron job executed successfully.");

    } catch (error) {
        console.error("Error in Cron Job:", error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
