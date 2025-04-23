// groq_api.js - Handles integration with the Groq API for RapidRaksha

class GroqAPIService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions'; // Groq API endpoint
        this.model = 'llama3-70b-8192'; // Default model, can be changed
    }

    /**
     * Analyze potential threat based on image and location data
     * @param {Object} data - Contains image, detection results and location information
     * @returns {Promise} - Promise resolving to threat analysis
     */
    async analyzeThreat(data) {
        try {
            // Extract necessary data
            const { image_base64, location, detectionResults, emotion, timestamp } = data;
            
            // Format prompt for Groq API
            const prompt = this.formatPrompt(image_base64, location, detectionResults, emotion, timestamp);
            
            // Make API request to Groq
            const response = await this.makeAPIRequest(prompt);
            
            // Parse and format the response
            return this.parseResponse(response, image_base64, detectionResults);
        } catch (error) {
            console.error('Error analyzing threat with Groq API:', error);
            throw new Error('Failed to analyze threat. Please try again.');
        }
    }

    /**
     * Format the prompt for Groq API based on image, detection results and location
     * @param {String} image_base64 - Base64 encoded image data
     * @param {Object} location - User's location coordinates
     * @param {Object} detectionResults - Results from image object detection
     * @param {String} emotion - Detected facial emotion
     * @param {String} timestamp - Timestamp of the alert
     * @returns {String} - Formatted prompt
     */
    formatPrompt(image_base64, location, detectionResults, emotion, timestamp) {
        // Create location text
        let locationText = 'unknown location';
        if (location) {
            locationText = `latitude ${location.latitude.toFixed(6)}, longitude ${location.longitude.toFixed(6)}`;
            
            // Try to add a more human-readable location description if possible
            try {
                // This is a placeholder - in a real app, you could use reverse geocoding
                const now = new Date();
                const timeOfDay = now.getHours() < 12 ? 'morning' : 
                                  now.getHours() < 18 ? 'afternoon' : 'evening';
                
                locationText += ` during the ${timeOfDay}`;
            } catch (e) {
                console.warn('Could not determine time of day:', e);
            }
        }
        
        // Create image analysis text
        let imageAnalysisText = 'No image analysis available';
        if (detectionResults) {
            imageAnalysisText = detectionResults.sceneDescription || 'No clear description available';
            
            if (detectionResults.detectedObjects && detectionResults.detectedObjects.length > 0) {
                const commonObjects = detectionResults.detectedObjects.slice(0, 5).join(', ');
                const objectCount = detectionResults.detectedObjects.length;
                
                imageAnalysisText += `\nObjects detected in the image (${objectCount} total): ${commonObjects}${objectCount > 5 ? '...' : ''}`;
            }
            
            if (detectionResults.dangerousObjectsFound && detectionResults.dangerousObjectsFound.length > 0) {
                imageAnalysisText += `\n⚠️ POTENTIALLY DANGEROUS OBJECTS DETECTED: ${detectionResults.dangerousObjectsFound.join(', ')} ⚠️`;
            }
        }
        
        // Create emotion context
        let emotionContext = 'unknown emotional state';
        if (emotion && emotion !== 'unknown' && emotion !== 'uncertain') {
            const emotionMap = {
                'Happy': 'appears to be happy, which may not correlate with a distress situation',
                'Sad': 'appears to be sad or distressed',
                'Angry': 'appears to be angry or upset',
                'Fearful': 'appears to be fearful or frightened',
                'Disgusted': 'appears to be disgusted or repulsed',
                'Surprised': 'appears to be surprised or startled',
                'Neutral': 'has a neutral facial expression'
            };
            
            emotionContext = emotionMap[emotion] || `showing ${emotion.toLowerCase()} emotion`;
        }
        
        // Create the prompt
        const prompt = `
EMERGENCY ALERT DETAILS:
======================================
An emergency alert has been triggered by a woman from ${locationText}.
Facial emotion analysis shows the person ${emotionContext}.

Scene analysis from camera:
${imageAnalysisText}

======================================

Based on this information, please provide a detailed threat assessment with the following:

1. THREAT LEVEL (must be exactly one of these values: "Low", "Medium", or "High")
2. A detailed, personalized SAFETY RECOMMENDATION that takes into account the detected emotion and surroundings
3. REASONING that explains your assessment, incorporating the detected objects and emotion

Please format your response as detailed, expressive, and empathetic text that speaks directly to the person in danger. 
Use a calm but authoritative tone, avoiding technical language.

IMPORTANT: Your response MUST be in the following JSON format without any additional text or explanation outside the JSON:

{
  "threat_level": "Low/Medium/High",
  "recommendation": "Your detailed safety recommendation...",
  "reasoning": "Your detailed reasoning..."
}

DO NOT include any other text before or after the JSON. Only return valid, parsable JSON.
`;
        return prompt;
    }

    /**
     * Make API request to Groq
     * @param {String} prompt - The prompt to send to Groq API
     * @returns {Promise} - Promise resolving to API response
     */
    async makeAPIRequest(prompt) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: `You are RapidRaksha's AI safety assistant, designed to provide emergency guidance to women in potential danger.

Your responses must be detailed, empathetic, and genuinely helpful, showing understanding of the nuanced dangers women face daily.

EXTREMELY IMPORTANT: Your responses MUST be formatted as valid parseable JSON when requested. Do not add any explanation text before or after the JSON. Only return the exact JSON format specified in the user prompt.

When analyzing threats:
- Prioritize life-threatening situations (weapons, violence indicators)
- Consider environmental context (remote locations, time of day)
- Account for emotional state (fear, distress)
- Provide practical, actionable advice
- Use a reassuring but urgent tone where appropriate

Your advice matters - it could make the difference in someone's safety.`
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7, // Increased from 0.3 for more expressive responses
                    max_tokens: 800  // Increased from 500 for more detailed responses
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request to Groq failed:', error);
            throw error;
        }
    }

    /**
     * Parse and format the response from Groq API
     * @param {Object} response - The raw response from Groq API
     * @param {String} image_base64 - The original image data to include in result
     * @param {Object} detectionResults - The image detection results
     * @returns {Object} - Formatted threat analysis
     */
    parseResponse(response, image_base64, detectionResults) {
        try {
            // Extract the content from Groq response
            const content = response.choices[0].message.content;
            console.log("Raw Groq response:", content);
            
            // Try to extract JSON from the response
            let parsedResponse;
            try {
                // Check if content starts with common refusal phrases
                if (content.startsWith("I cannot") || 
                    content.startsWith("I'm sorry") || 
                    content.startsWith("As an AI") ||
                    content.startsWith("I apologize")) {
                    
                    // Handle refusal response by creating a custom response object
                    console.log("Groq API returned a refusal response:", content.substring(0, 100) + "...");
                    
                    return {
                        threat_level: "Medium",
                        recommendation: "Based on the image and information provided, I recommend staying aware of your surroundings and contacting someone you trust if you feel unsafe.",
                        analyzed_image: image_base64,
                        timestamp: new Date().toISOString(),
                        reasoning: "The system could not provide a complete analysis with the information available. This is a default safety recommendation.",
                        detected_objects: detectionResults ? detectionResults.detectedObjects : [],
                        dangerous_objects: detectionResults ? detectionResults.dangerousObjectsFound : []
                    };
                }
                
                // Try to extract JSON if it's wrapped in markdown code blocks
                let jsonString = content;
                
                // Check for JSON block in markdown
                const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonBlockMatch && jsonBlockMatch[1]) {
                    jsonString = jsonBlockMatch[1];
                } else {
                    // Look for an object literal pattern in the text
                    const objectMatch = content.match(/{[\s\S]*?}/);
                    if (objectMatch) {
                        jsonString = objectMatch[0];
                    }
                }
                
                parsedResponse = JSON.parse(jsonString);
                
            } catch (e) {
                console.warn('Failed to parse JSON from Groq response:', e);
                
                // Try a more robust text extraction approach
                let threatLevel = "Medium";
                let recommendation = "";
                let reasoning = "";
                
                // First, try to identify if the response has clear sections
                const threatRegexes = [
                    /threat level:?\s*["']?([A-Za-z]+)["']?/i,
                    /threat_level["']?:\s*["']?([A-Za-z]+)["']?/i,
                    /threat[^\n]*?([Ll]ow|[Mm]edium|[Hh]igh)/i
                ];
                
                // Try each regex pattern to find a threat level
                for (const regex of threatRegexes) {
                    const match = content.match(regex);
                    if (match && match[1]) {
                        threatLevel = match[1].trim();
                        break;
                    }
                }
                
                // Set to high threat if dangerous objects detected
                if (detectionResults && detectionResults.hasDangerousObjects) {
                    threatLevel = "High";
                }
                
                // Try to extract recommendation and reasoning using various patterns
                const recommendationRegexes = [
                    /recommendation:?\s*([\s\S]*?)(?:\n\s*reasoning|\n\s*\d|\n\s*$)/i,
                    /safety recommendation:?\s*([\s\S]*?)(?:\n\s*reasoning|\n\s*\d|\n\s*$)/i,
                    /(\w[^.!?]*(?:[.!?][\s]?)[^.!?]*(?:[.!?][\s]?)[^.!?]*(?:[.!?]))/i // Look for 2-3 sentences
                ];
                
                for (const regex of recommendationRegexes) {
                    const match = content.match(regex);
                    if (match && match[1] && match[1].length > 20) { // Make sure it's reasonably long
                        recommendation = match[1].trim();
                        break;
                    }
                }
                
                // If we still don't have a recommendation, use the first paragraph or chunk
                if (!recommendation || recommendation.length < 20) {
                    const parts = content.split(/\n\n|\r\n\r\n/);
                    if (parts.length > 0) {
                        recommendation = parts[0].trim();
                        // If first part seems too short, combine first and second parts
                        if (parts.length > 1 && recommendation.length < 50) {
                            recommendation = parts[0].trim() + " " + parts[1].trim();
                        }
                    } else {
                        // Just use the first 200 characters if no clear paragraphs
                        recommendation = content.substring(0, 200).trim();
                    }
                }
                
                // Look for reasoning section
                const reasoningRegexes = [
                    /reasoning:?\s*([\s\S]*?)(?:\n\s*\d|\n\s*$)/i,
                    /analysis:?\s*([\s\S]*?)(?:\n\s*\d|\n\s*$)/i
                ];
                
                for (const regex of reasoningRegexes) {
                    const match = content.match(regex);
                    if (match && match[1]) {
                        reasoning = match[1].trim();
                        break;
                    }
                }
                
                // If no reasoning found but we have multiple paragraphs, use the second one
                if (!reasoning && content.split(/\n\n|\r\n\r\n/).length > 1) {
                    reasoning = content.split(/\n\n|\r\n\r\n/)[1].trim();
                } else if (!reasoning) {
                    reasoning = "Based on the available information and scene analysis.";
                }
                
                parsedResponse = {
                    threat_level: threatLevel,
                    recommendation: recommendation || "Please remain vigilant and stay aware of your surroundings.",
                    reasoning: reasoning
                };
            }
            
            // Normalize the threat level to one of our three categories
            const threatLevel = parsedResponse.threat_level || "Medium";
            const threatLowerCase = threatLevel.toLowerCase();
            
            let normalizedThreatLevel;
            if (threatLowerCase.includes('low') || threatLowerCase.includes('minimal') || threatLowerCase.includes('none')) {
                normalizedThreatLevel = 'Low';
            } else if (threatLowerCase.includes('high') || threatLowerCase.includes('severe') || threatLowerCase.includes('critical')) {
                normalizedThreatLevel = 'High';
            } else {
                normalizedThreatLevel = 'Medium';
            }
            
            // Ensure the threat level is set to high if dangerous objects were detected
            if (detectionResults && detectionResults.hasDangerousObjects) {
                normalizedThreatLevel = "High";
                
                // Make sure the recommendation mentions the dangerous objects if not already mentioned
                if (parsedResponse.recommendation && detectionResults.dangerousObjectsFound && 
                    detectionResults.dangerousObjectsFound.length > 0 &&
                    !parsedResponse.recommendation.includes(detectionResults.dangerousObjectsFound[0])) {
                    parsedResponse.recommendation = `⚠️ ALERT: Dangerous objects detected (${detectionResults.dangerousObjectsFound.join(', ')}). ${parsedResponse.recommendation}`;
                }
            }
            
            // Format the final response
            return {
                threat_level: normalizedThreatLevel,
                recommendation: parsedResponse.recommendation || "Please remain vigilant and stay aware of your surroundings.",
                analyzed_image: image_base64,
                timestamp: new Date().toISOString(),
                reasoning: parsedResponse.reasoning || "Analysis based on the available information.",
                detected_objects: detectionResults ? detectionResults.detectedObjects : [],
                dangerous_objects: detectionResults ? detectionResults.dangerousObjectsFound : []
            };
        } catch (error) {
            console.error('Error parsing Groq API response:', error);
            
            // Build a default response based on detection results if available
            let recommendation = "There was an error analyzing your situation. If you feel you're in danger, please contact emergency services immediately.";
            let threatLevel = "Medium";
            let reasoning = "Error processing the threat analysis";
            
            if (detectionResults) {
                if (detectionResults.hasDangerousObjects) {
                    threatLevel = "High";
                    recommendation = `⚠️ ALERT: Dangerous objects detected (${detectionResults.dangerousObjectsFound.join(', ')}). Please seek safety immediately and contact emergency services if needed.`;
                    reasoning = `Dangerous objects detected: ${detectionResults.dangerousObjectsFound.join(', ')}`;
                } else {
                    reasoning = `Image analysis: ${detectionResults.sceneDescription}`;
                }
            }
            
            // Return a default response in case of error
            return {
                threat_level: threatLevel,
                recommendation: recommendation,
                analyzed_image: image_base64,
                timestamp: new Date().toISOString(),
                reasoning: reasoning,
                detected_objects: detectionResults ? detectionResults.detectedObjects : [],
                dangerous_objects: detectionResults ? detectionResults.dangerousObjectsFound : []
            };
        }
    }
}

// Export the service for use in the main application
window.GroqAPIService = GroqAPIService; 