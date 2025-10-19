export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    try {
        // THE FIX IS HERE: Changed request.json() to request.body
        const { idea, tone, type, length } = request.body;

        if (!idea) {
            return response.status(400).json({ message: 'Idea is required.' });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            throw new Error("Gemini API key is not configured.");
        }
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

        // A much more advanced prompt that uses the new inputs
        const prompt = `You are an expert LinkedIn content strategist with 10 years of experience. A user wants to create a LinkedIn post.
        
        Their core idea is: "${idea}"
        
        Please craft a complete, engaging, and professional post based on the following requirements:
        - The desired tone is: ${tone}.
        - The type of post is: ${type}.
        - The desired length is: ${length}.

        The post should be ready to publish and include:
        1. A strong, attention-grabbing hook.
        2. A well-structured body that elaborates on the idea.
        3. A concluding question or call-to-action to encourage engagement.
        4. 3 to 5 relevant and popular hashtags.
        
        Generate the post now.`;

        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "contents": [{ "parts": [{ "text": prompt }] }]
            })
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error("Gemini API Error:", errorData);
            throw new Error(`Gemini API request failed.`);
        }

        const data = await apiResponse.json();
        
        if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
             throw new Error("Received an unexpected response format from the AI.");
        }

        const postText = data.candidates[0].content.parts[0].text;
        
        response.status(200).json({ post: postText });

    } catch (error) {
        console.error("Error in generate function:", error);
        response.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}

