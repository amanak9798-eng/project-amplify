export default async function handler(request, response) {
    const { userId } = request.query;
    if (!userId) {
        return response.status(400).json({ message: "User ID is required." });
    }

    const linkedInAuthURL = 'https://www.linkedin.com/oauth/v2/authorization';
    const client_id = process.env.LINKEDIN_CLIENT_ID;
    
    // This is the same redirect URI you configured in your LinkedIn App settings
    const redirect_uri = `${process.env.VERCEL_URL}/api/linkedin-auth-callback`;
    
    // We are asking for permission to post on the user's behalf
    const scope = 'w_member_social';
    
    // We pass the userId in the 'state' parameter so we know who is logging in
    const state = userId;

    const authUrl = `${linkedInAuthURL}?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${scope}&state=${state}`;

    response.status(200).json({ authUrl });
}
