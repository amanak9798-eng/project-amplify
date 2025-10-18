// This file runs on a secure server, not in the user's browser.
// It acts as a safe middleman between our website and the Gemini API.

export default async function handler(req, res) {
    // First, we only allow POST requests for security.
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed.' });
    }

    try {
        // Get the user's idea from the incoming request from the browser.
        const { idea } = req.body;
        if (!idea) {
            return res.status(400).json({ message: 'No idea was provided.' });
        }

        // IMPORTANT: Get the secret API key from a secure server environment variable.
        // This is never exposed to the public.
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            console.error("API key is not configured on the server.");
            return res.status(500).json({ message: 'Server configuration error.' });
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
        
        // We build the same powerful prompt on the server-side.
        const prompt = `You are a world-class LinkedIn content strategist for the Indian professional market. Take the user's raw idea and transform it into an engaging, professional LinkedIn post. Follow these instructions: 1. Hook: Start with a powerful, attention-grabbing first line. 2. Body: Expand on the idea in 2-3 short, easy-to-read paragraphs. 3. Engagement: End with a thought-provoking question. 4. Hashtags: Include 3 to 5 relevant hashtags at the end (e.g., #indianbusiness, #makeinindia). User's raw idea: "${idea}"`;

        // The secure server calls the Gemini API.
        const geminiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "contents": [{ "parts": [{ "text": prompt }] }]
            })
        });

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
            throw new Error(data?.error?.message || 'Failed to fetch from Gemini API');
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Finally, send the generated post back to the user's browser.
        res.status(200).json({ post: generatedText });

    } catch (error) {
        console.error("Backend Error:", error.message);
        res.status(500).json({ message: 'An error occurred on the server.' });
    }
}
