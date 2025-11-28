import { GoogleGenerativeAI } from "@google/generative-ai";

// Allow CORS for local testing if needed, though Vercel usually handles same-origin
export const config = {
    api: {
        bodyParser: true,
    },
};

export default async function handler(request, response) {
    // 1. Set CORS Headers
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this in production for security
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // 2. Handle OPTIONS request (Preflight)
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    // 3. Validate Request Method
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 4. Check API Key
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        return response.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is missing.' });
    }

    // 5. Parse Request Body
    const { prompt, config, mode } = request.body;

    if (!prompt || !mode) {
        return response.status(400).json({ error: 'Missing required parameters: prompt or mode.' });
    }

    try {
        const ai = new GoogleGenerativeAI(API_KEY);
        // Use Flash for drafts (speed), Pro for complex structure
        const modelName = (mode === 'draft') ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
        
        const model = ai.getGenerativeModel({
            model: modelName,
            systemInstruction: config.systemInstruction,
            generationConfig: config.generationConfig
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return response.status(200).json({ text: responseText });

    } catch (error) {
        console.error("Proxy Error:", error);
        return response.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
```

### Step 4: Verify the HTML Client Code (index.html)

Ensure your `index.html` is correctly calling the proxy. Here is the specific `callProxy` function you need inside your `<script>` tag.

```javascript
// Inside your index.html <script type="module">

async function callProxy(prompt, config, mode) {
    // Note: We are calling the relative path '/api/gemini-proxy'
    // This automatically resolves to your Vercel backend.
    const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, config, mode }),
    });

    // Parse the JSON response from the proxy
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Proxy Error: ${response.statusText}`);
    }

    return data; // This object contains { text: "..." }
}
