import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel securely injects the GEMINI_API_KEY environment variable here at runtime
// This key is NOT visible to the client-side (index.html)
const API_KEY = process.env.GEMINI_API_KEY;

// Define the model name being used for generation
const modelName = 'gemini-2.5-pro'; 

// Initialize the AI model (must be done after reading the API_KEY)
// We rely on Vercel's Node.js environment to handle the import and execution.
const ai = new GoogleGenerativeAI(API_KEY);

/**
 * Vercel Serverless Function entry point.
 * This function acts as a secure proxy between the client-side HTML and the Gemini API.
 * The client sends the prompt and configuration; the proxy makes the authenticated call.
 */
export default async function handler(req, res) {
    // 1. Security Check: Only allow POST requests for generation
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed', message: 'Only POST requests are accepted.' });
    }

    // 2. API Key Check
    if (!API_KEY) {
        console.error("GEMINI_API_KEY is not set in Vercel environment variables.");
        return res.status(500).json({ 
            error: 'Server configuration error: API Key missing.', 
            hint: 'Please ensure GEMINI_API_KEY is set in your Vercel project settings.' 
        });
    }

    // 3. Destructure and validate input from the client (index.html)
    const { prompt, config, mode } = req.body;

    if (!prompt || !config || !mode) {
        return res.status(400).json({ error: 'Missing required parameters (prompt, config, or mode).' });
    }

    try {
        // Create the model configuration using the parameters passed from the client
        const model = ai.getGenerativeModel({
            model: modelName,
            systemInstruction: config.systemInstruction,
            generationConfig: config.generationConfig
        });

        // 4. Call the Gemini API securely using the server-side API Key
        const result = await model.generateContent(prompt);
        
        // 5. Send the raw response text back to the client
        // The client-side JS will handle the JSON parsing and rendering.
        return res.status(200).json({ 
            text: result.text,
            mode: mode // Send back the mode for client-side processing
        });

    } catch (error) {
        console.error("Gemini API call failed in proxy:", error);
        return res.status(500).json({ 
            error: 'Failed to generate content via proxy.',
            details: error.message
        });
    }
}
