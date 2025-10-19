import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// --- Helper function to call Gemini API (no changes here) ---
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
    const authorization = request.headers.get('authorization');
    if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return response.status(401).end('Unauthorized');
    }

    console.log("Cron Job started...");

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        if (!getApps().length) {
            initializeApp({ credential: cert(serviceAccount) });
        }
        
        const db = getFirestore();
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();

        console.log(`Current time check: Day ${currentDay}, Hour ${currentHour}`);

        const schedulesSnapshot = await db.collectionGroup('schedules').get();
        if (schedulesSnapshot.empty) {
            return response.status(200).send("OK: No schedules found.");
        }

        console.log(`Found ${schedulesSnapshot.docs.length} total schedules. Checking for due posts...`);

        for (const doc of schedulesSnapshot.docs) {
            const schedule = doc.data();
            const scheduleTime = parseInt(schedule.time.split(':')[0]);

            if (schedule.dayOfWeek == currentDay && scheduleTime == currentHour) {
                console.log(`Processing schedule for user ${schedule.userId} on topic: ${schedule.topic}`);
                
                // --- NEW LOGIC: The "Gatekeeper" Check ---
                const userRef = db.collection('users').doc(schedule.userId);
                const userDoc = await userRef.get();

                if (!userDoc.exists) {
                    console.log(`User ${schedule.userId} not found. Skipping.`);
                    continue; // Skip to the next schedule
                }

                const userData = userDoc.data();
                const isPremium = userData.isPremium === true;
                const hasFreeCredits = (userData.freeCredits || 0) > 0;

                if (isPremium || hasFreeCredits) {
                    // User is authorized to generate a post.
                    console.log(`User ${schedule.userId} is authorized. Premium: ${isPremium}, Credits: ${userData.freeCredits || 0}`);

                    // 1. Generate the post
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

                    // 3. If they are not premium, use up one free credit
                    if (!isPremium) {
                        await userRef.update({
                            freeCredits: FieldValue.increment(-1)
                        });
                        console.log(`Decremented free credits for user ${schedule.userId}`);
                    }

                } else {
                    // User is not authorized.
                    console.log(`User ${schedule.userId} has no credits and is not premium. Skipping schedule.`);
                }
            }
        }

        console.log("Cron Job finished successfully.");
        return response.status(200).send("OK: Cron job executed successfully.");

    } catch (error) {
        console.error("Error in Cron Job:", error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

