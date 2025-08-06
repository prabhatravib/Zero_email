import { getAccessToken } from './googleAuth';
import type { SAEnv } from './googleAuth';

export async function categorizeEmail(emailContent: string, env: SAEnv): Promise<string[]> {
  console.log('GOOGLE_SERVICE_ACCOUNT available:', !!env.GOOGLE_SERVICE_ACCOUNT);
  
  if (!env.GOOGLE_SERVICE_ACCOUNT) {
    console.error('GOOGLE_SERVICE_ACCOUNT environment variable is not set');
    return ["Others"];
  }
  
  // Get access token using the new authentication flow
  let accessToken: string;
  try {
    accessToken = await getAccessToken(env, 'https://www.googleapis.com/auth/cloud-platform');
    console.log('Access token generated successfully');
  } catch (error) {
    console.error('Access token generation failed:', error);
    return ["Others"];
  }
  
  // Parse service account to get project ID
  let projectId: string;
  try {
    const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
    projectId = sa.project_id;
    console.log('Project ID:', projectId);
  } catch (error) {
    console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT JSON:', error);
    return ["Others"];
  }
  
  const API_ENDPOINT = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent`;
  
  const prompt = `You are an email categorization system. Analyze the email content and classify it into the appropriate categories.

CATEGORIES:
- "Fubo": Emails related to Fubo TV streaming service, including account management, billing, streaming issues, sports content, channel packages, customer support, or any Fubo-related services
- "Jobs and Employment": Emails related to job applications, employment opportunities, recruitment, hiring, career development, interviews, job offers, or professional networking

INSTRUCTIONS:
- Return only a JSON array of matching labels
- If the email doesn't match any specific category, return an empty array []
- Do not include "Others" in the response
- Be specific - only categorize if there's a clear match

EXAMPLES:
- Email about Fubo subscription renewal → ["Fubo"]
- Email about job application status → ["Jobs and Employment"] 
- Email about Fubo sports package → ["Fubo"]
- Email about interview scheduling → ["Jobs and Employment"]
- General newsletter or unrelated email → []

Email to classify:
${emailContent}`;

  const requestBody = {
    contents: [{
      role: "user" as const,
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0,             // lowest latency
      maxOutputTokens: 16,
      responseMimeType: "application/json",
      // Allow multiple categories via an array of enum strings
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "STRING",
          enum: ["Fubo", "Jobs and Employment"]
        }
      },
      // Turn off thinking to save latency on 2.5 Flash/Flash-Lite
      thinkingConfig: { thinkingBudget: 0 }
    }
  };

  try {
    console.log('Making request to Vertex AI with access token');
    console.log('API endpoint:', API_ENDPOINT);
    console.log('Access token length:', accessToken.length);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Vertex AI response status:', response.status);
    console.log('Vertex AI response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI error response:', errorText);
      throw new Error(`Vertex AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Vertex AI response data:', JSON.stringify(data, null, 2));
    
    // Extract the categories from response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    console.log('=== LLM RESPONSE LOG ===');
    console.log('Email content:', emailContent.substring(0, 200) + '...');
    console.log('LLM generated text:', generatedText);
    console.log('LLM response timestamp:', new Date().toISOString());
    console.log('=== END LLM RESPONSE LOG ===');
    
    let llmCategories: string[];
    try {
      llmCategories = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', parseError);
      console.error('Raw response:', generatedText);
      llmCategories = [];
    }
    
    // Ensure llmCategories is an array
    if (!Array.isArray(llmCategories)) {
      console.log('LLM response is not an array, treating as empty');
      llmCategories = [];
    }
    
    // Filter out "Others" if LLM mistakenly includes it
    llmCategories = llmCategories.filter(cat => cat !== "Others");
    
    // Only use "Others" if no specific categories were found
    const finalCategories = llmCategories.length > 0 ? llmCategories : ["Others"];
    const result = [...new Set(finalCategories)];
    console.log('Final categories:', result);
    return result;
    
  } catch (error) {
    console.error('LLM categorization failed:', error);
    // On any error, just return Others
    return ["Others"];
  }
} 