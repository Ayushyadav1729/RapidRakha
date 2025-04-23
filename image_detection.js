// image_detection.js - Handles object detection in images for RapidRaksha

class ImageDetectionService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://vision.googleapis.com/v1/images:annotate';
        this.dangerousObjects = [
            'knife', 'dagger', 'sword', 'blade', 'gun', 'pistol', 'firearm', 'weapon',
            'rifle', 'revolver', 'shotgun', 'handgun', 'cutter', 'machete', 'axe'
        ];
    }

    /**
     * Detect objects in an image
     * @param {String} imageBase64 - Base64 encoded image data (without data:image/jpeg;base64, prefix)
     * @returns {Promise<Object>} - Object detection results
     */
    async detectObjects(imageBase64) {
        try {
            // Remove data:image/jpeg;base64, prefix if present
            const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            
            // Prepare request payload
            const payload = {
                requests: [
                    {
                        image: {
                            content: base64Image
                        },
                        features: [
                            {
                                type: 'OBJECT_LOCALIZATION',
                                maxResults: 10
                            },
                            {
                                type: 'LABEL_DETECTION',
                                maxResults: 10
                            }
                        ]
                    }
                ]
            };

            // Make request to Google Cloud Vision API
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.processDetectionResults(data);
        } catch (error) {
            console.error('Error detecting objects:', error);
            return {
                detectedObjects: [],
                dangerousObjectsFound: [],
                sceneDescription: 'Unable to analyze image',
                error: error.message
            };
        }
    }

    /**
     * Process and format the detection results
     * @param {Object} results - Raw detection results from Vision API
     * @returns {Object} - Processed detection results
     */
    processDetectionResults(results) {
        try {
            const response = results.responses[0];
            
            // Extract detected objects
            const detectedObjects = response.localizedObjectAnnotations || [];
            const objectNames = detectedObjects.map(obj => obj.name.toLowerCase());
            
            // Extract labels
            const labels = response.labelAnnotations || [];
            const labelDescriptions = labels.map(label => label.description.toLowerCase());
            
            // Combine all detected terms
            const allDetectedTerms = [...objectNames, ...labelDescriptions];
            
            // Find dangerous objects
            const dangerousObjectsFound = this.dangerousObjects.filter(
                obj => allDetectedTerms.some(term => term.includes(obj))
            );
            
            // Generate scene description
            let sceneDescription = 'The image shows ';
            if (objectNames.length > 0) {
                sceneDescription += objectNames.slice(0, 3).join(', ');
                if (labelDescriptions.length > 0) {
                    sceneDescription += ' and appears to be in a ' + 
                        labelDescriptions.slice(0, 2).join(', ') + ' setting';
                }
            } else if (labelDescriptions.length > 0) {
                sceneDescription += 'a scene that can be described as ' + 
                    labelDescriptions.slice(0, 3).join(', ');
            } else {
                sceneDescription = 'No clear objects or scene could be identified in the image';
            }
            
            return {
                detectedObjects: objectNames,
                labels: labelDescriptions,
                dangerousObjectsFound,
                sceneDescription,
                hasDangerousObjects: dangerousObjectsFound.length > 0
            };
        } catch (error) {
            console.error('Error processing detection results:', error);
            return {
                detectedObjects: [],
                dangerousObjectsFound: [],
                sceneDescription: 'Error analyzing image content',
                hasDangerousObjects: false,
                error: error.message
            };
        }
    }

    /**
     * Get a simple safety assessment based on detected objects
     * @param {Object} detectionResults - Results from object detection
     * @returns {Object} - Safety assessment
     */
    getSafetyAssessment(detectionResults) {
        // Determine risk level based on dangerous objects detected
        let riskLevel = 'Low';
        let assessment = 'No dangerous objects detected in the image.';
        
        if (detectionResults.hasDangerousObjects) {
            riskLevel = 'High';
            assessment = `Dangerous object(s) detected: ${detectionResults.dangerousObjectsFound.join(', ')}. This may indicate a potential threat.`;
        }
        
        return {
            riskLevel,
            assessment,
            detectedObjects: detectionResults.detectedObjects,
            dangerousObjectsFound: detectionResults.dangerousObjectsFound,
            sceneDescription: detectionResults.sceneDescription
        };
    }
}

// Export the service for use in the main application
window.ImageDetectionService = ImageDetectionService; 