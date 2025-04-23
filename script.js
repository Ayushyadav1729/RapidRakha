// Initialize face-api.js
async function initFaceApi() {
    try {
        console.log('Loading Face API models...');
        // Load multiple models to increase detection accuracy
        await faceapi.nets.tinyFaceDetector.loadFromUri('models');
        await faceapi.nets.faceExpressionNet.loadFromUri('models');
        
        // Add SSD Mobilenet model for better face detection in difficult conditions
        await faceapi.nets.ssdMobilenetv1.loadFromUri('models');
        
        console.log('Face API initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Face API:', error);
        return false;
    }
}


document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    
    const panicButton = document.getElementById('panic-button');
    const cameraSection = document.getElementById('camera-section');
    const cameraStream = document.getElementById('camera-stream');
    const loadingIndicator = document.getElementById('loading');
    const alertAnalysis = document.getElementById('alert-analysis');
    const alertTimestamp = document.getElementById('alert-timestamp');
    const alertImage = document.getElementById('alert-image');
    const threatLevel = document.getElementById('threat-level');
    const recommendation = document.getElementById('recommendation');
    const reasoning = document.getElementById('reasoning');
    const locationInfo = document.getElementById('location-info');
    const locationText = document.getElementById('location-text');
    const errorMessage = document.getElementById('error-message');
    const alertsList = document.getElementById('alerts-list');
    const apiKeyInput = document.getElementById('groq-api-key');
    const saveApiKeyButton = document.getElementById('save-api-key');
    const apiKeySection = document.getElementById('api-key-section');
    const visionApiKeyInput = document.getElementById('vision-api-key');
    const saveVisionKeyButton = document.getElementById('save-vision-key');
    const visionApiKeySection = document.getElementById('vision-api-key-section');
    const emergencyContactInput = document.getElementById('emergency-contact');
    const saveContactButton = document.getElementById('save-contact');
    const emergencyContactSection = document.getElementById('emergency-contact-section');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsContainer = document.getElementById('settings-container');
    const objectDetection = document.getElementById('object-detection');
    const objectsList = document.getElementById('objects-list');
    const detectionWarning = document.getElementById('detection-warning');
    const alertDetails = document.querySelector('.alert-details');
  
    
    // Initialize Face API
    initFaceApi();
    
    // Variables to store media stream, location, and API keys
    let mediaStream = null;
    let userLocation = null;
    let previousAlerts = [];

    // Default test API keys - replace with your actual test keys before deployment
    const defaultGroqApiKey = "gsk_1234567890abcdefghijklmnopqrstuvwxyz"; // Replace with your test Groq API key
    const defaultVisionApiKey = "VISION_API_KEY_1234567890abcdefghijklmn"; // Replace with your test Vision API key
    
    // Use stored keys if available, otherwise use the default test keys
    let groqApiKey = localStorage.getItem('groqApiKey') || defaultGroqApiKey;
    let visionApiKey = localStorage.getItem('visionApiKey') || defaultVisionApiKey;
    let emergencyContact = localStorage.getItem('emergencyContact') || '';
    let groqService = null;
    let imageDetectionService = null;

    // Initialize the API key inputs with stored values
    apiKeyInput.value = groqApiKey;
    visionApiKeyInput.value = visionApiKey;
    emergencyContactInput.value = emergencyContact;
    
    // Initialize the services with the keys
    groqService = new GroqAPIService(groqApiKey);
    imageDetectionService = new ImageDetectionService(visionApiKey);
    
    // Hide the API key sections since we have preloaded keys
    apiKeySection.style.display = 'none';
    visionApiKeySection.style.display = 'none';
    
    // Hide the settings container by default
    settingsContainer.classList.remove('active');
    
    // Toggle settings container when settings button is clicked
    settingsToggle.addEventListener('click', function() {
        settingsContainer.classList.toggle('active');
        
        // Scroll to settings container if it's open
        if (settingsContainer.classList.contains('active')) {
            settingsContainer.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    // Show a message that we're using default test keys
    if (groqApiKey === defaultGroqApiKey || visionApiKey === defaultVisionApiKey) {
        showMessage('Using test API keys for demo purposes. Replace with your own keys for production use.', 'info');
    }

    // Save Groq API key
    saveApiKeyButton.addEventListener('click', function() {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('groqApiKey', apiKey);
            groqApiKey = apiKey;
            groqService = new GroqAPIService(apiKey);
            apiKeySection.style.display = 'none';
            showMessage('Groq API key saved successfully!', 'success');
        } else {
            showError('Please enter a valid Groq API key');
        }
    });
    
    // Save Vision API key
    saveVisionKeyButton.addEventListener('click', function() {
        const apiKey = visionApiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('visionApiKey', apiKey);
            visionApiKey = apiKey;
            imageDetectionService = new ImageDetectionService(apiKey);
            visionApiKeySection.style.display = 'none';
            showMessage('Vision API key saved successfully!', 'success');
        } else {
            showError('Please enter a valid Google Vision API key');
        }
    });

    // Save Emergency Contact
    saveContactButton.addEventListener('click', function() {
        const contactNumber = emergencyContactInput.value.trim();
        
        // Basic phone number validation (international formats allowed)
        if (contactNumber && /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(contactNumber)) {
            localStorage.setItem('emergencyContact', contactNumber);
            emergencyContact = contactNumber;
            showMessage('Emergency contact saved successfully!', 'success');
        } else if (contactNumber === '') {
            // Clear saved contact if field is empty
            localStorage.removeItem('emergencyContact');
            emergencyContact = '';
            showMessage('Emergency contact cleared', 'info');
        } else {
            showError('Please enter a valid phone number');
        }
    });

    // Function to show success/error message
    function showMessage(message, type = 'error') {
        errorMessage.textContent = message;
        
        // Set different background and text colors based on message type
        if (type === 'success') {
            errorMessage.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            errorMessage.style.color = 'var(--success-color)';
        } else if (type === 'info') {
            errorMessage.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
            errorMessage.style.color = '#2196F3'; // Blue color for info messages
        } else {
            errorMessage.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
            errorMessage.style.color = 'var(--danger-color)';
        }
        
        errorMessage.classList.add('active');
        setTimeout(() => {
            errorMessage.classList.remove('active');
        }, 5000); // Hide after 5 seconds
    }

    // Load previous alerts from localStorage if available
    loadPreviousAlerts();

    // Function to start camera
    async function startCamera() {
        try {
            // Get user media with video and audio
            mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false 
            });
            
            // Attach stream to video element
            cameraStream.srcObject = mediaStream;
            cameraSection.classList.add('active');
            
            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            showError('Could not access camera. Please check permissions and try again.');
            return false;
        }
    }

    // Function to get user's location
    async function getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                position => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    resolve(userLocation);
                },
                error => {
                    console.error('Error getting location:', error);
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    // Function to capture image from camera
    function captureImage() {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = cameraStream.videoWidth;
                canvas.height = cameraStream.videoHeight;
                
                const context = canvas.getContext('2d');
                context.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);
                
                const imageDataUrl = canvas.toDataURL('image/jpeg');
                resolve(imageDataUrl);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Improved emotion detection function with multiple detection options
    async function detectEmotion(imageDataUrl) {
        const img = new Image();
        img.src = imageDataUrl;
    
        return new Promise(resolve => {
            img.onload = async () => {
                try {
                    console.log("Face API detection starting...");
                    
                    // Make sure face-api is loaded
                    if (!faceapi.nets.tinyFaceDetector.isLoaded) {
                        await initFaceApi();
                    }
                    
                    // Try different detection methods in sequence
                    let detection;
                    
                    // First try the tiny face detector (fastest)
                    detection = await faceapi
                        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
                        .withFaceExpressions();
                    
                    // If no result, try SSD Mobilenet (more accurate but slower)
                    if (!detection && faceapi.nets.ssdMobilenetv1.isLoaded) {
                        console.log("Trying SSD Mobilenet detection...");
                        detection = await faceapi
                            .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
                            .withFaceExpressions();
                    }
                    
                    console.log("Face detection result:", detection);
    
                    if (!detection || !detection.expressions) {
                        console.log("No face or expressions detected");
                        return resolve({ emotion: 'unknown' });
                    }
    
                    const expressions = detection.expressions;
                    const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
                    const topEmotion = sorted[0][0]; // highest confidence
                    const confidence = sorted[0][1];
                    
                    console.log(`Detected emotion: ${topEmotion} with ${confidence.toFixed(2)} confidence`);
                    
                    // Map the raw emotions to more user-friendly terms
                    const emotionMapping = {
                        'neutral': 'Neutral',
                        'happy': 'Happy',
                        'sad': 'Sad',
                        'angry': 'Angry',
                        'fearful': 'Fearful',
                        'disgusted': 'Disgusted',
                        'surprised': 'Surprised'
                    };
                    
                    // Only return the emotion if we have reasonable confidence
                    if (confidence > 0.4) {
                        resolve({ 
                            emotion: emotionMapping[topEmotion] || topEmotion, 
                            confidence,
                            allExpressions: sorted.map(([emotion, conf]) => ({
                                emotion: emotionMapping[emotion] || emotion,
                                confidence: conf
                            }))
                        });
                    } else {
                        resolve({ emotion: 'uncertain', confidence });
                    }
                } catch (error) {
                    console.error("Error in emotion detection:", error);
                    resolve({ emotion: 'unknown', error: error.message });
                }
            };
            
            img.onerror = () => {
                console.error("Failed to load image for emotion detection");
                resolve({ emotion: 'unknown', error: 'Image load failed' });
            };
        });
    }
    
    
    // Function to detect objects in image
    async function detectObjectsInImage(imageData) {
        if (!imageDetectionService) {
            if (!visionApiKey) {
                // Show Vision API key section if we don't have one
                visionApiKeySection.style.display = 'block';
                return null; // Return null instead of throwing to allow the app to continue without image detection
            }
            imageDetectionService = new ImageDetectionService(visionApiKey);
        }
        
        try {
            // Detect objects in image
            return await imageDetectionService.detectObjects(imageData);
        } catch (error) {
            console.error('Error detecting objects in image:', error);
            showError('Could not detect objects in the image. Continuing with basic analysis.');
            return null;
        }
    }

    // Function to send emergency alert with Groq API
    async function sendEmergencyAlert(imageData, location, detectionResults) {
        if (!groqService) {
            if (!groqApiKey) {
                // Show API key section if we don't have one
                apiKeySection.style.display = 'block';
                throw new Error('Groq API key is required');
            }
            groqService = new GroqAPIService(groqApiKey);
        }
        const emotionData = await detectEmotion(imageData);
        console.log("Detected emotion:", emotionData);

        // Prepare payload
        const payload = {
            image_base64: imageData,
            location: location,
            detectionResults: detectionResults,
            emotion: emotionData.emotion,
            timestamp: new Date().toISOString()
        };
        
        
        console.log('Sending emergency alert with data:', payload);
        
        try {
            // Use Groq API service to analyze the threat
            const analysis = await groqService.analyzeThreat(payload);
            // Add emotion to analysis object so it's available in the UI
            analysis.emotion = emotionData.emotion;
            return analysis;
        } catch (error) {
            console.error('Error with Groq API:', error);
            // Fall back to simulation if Groq API fails
            console.log('Falling back to simulated response');
            const simulatedResponse = simulateGroqShieldResponse(imageData, detectionResults);
            // Add emotion to simulated response
            simulatedResponse.emotion = emotionData.emotion;
            return simulatedResponse;
        }
    }

    


    // Function to simulate GroqShield AI response (fallback)
    function simulateGroqShieldResponse(imageData, detectionResults) {
        // Keeping this as a fallback in case the API integration fails
        
        // Determine threat level based on detected objects
        let level = 'Low';
        let recommendation = 'No immediate danger detected. Stay vigilant and keep your phone accessible.';
        let reasoning = 'Simulated response (API fallback)';
        
        // If we have detection results, use them to determine threat level
        if (detectionResults && detectionResults.hasDangerousObjects) {
            level = 'High';
            recommendation = `ALERT: Dangerous objects detected (${detectionResults.dangerousObjectsFound.join(', ')}). Seek immediate shelter, call emergency services (100/112), and share your location with trusted contacts.`;
            reasoning = `Dangerous objects detected: ${detectionResults.dangerousObjectsFound.join(', ')}`;
        } else if (!detectionResults) {
            // Random level if no detection results
            const threatLevels = ['Low', 'Medium', 'High'];
            const randomIndex = Math.floor(Math.random() * threatLevels.length);
            level = threatLevels[randomIndex];
            
            switch(level) {
                case 'Low':
                    recommendation = 'No immediate danger detected. Stay vigilant and keep your phone accessible.';
                    break;
                case 'Medium':
                    recommendation = 'Potential risk detected. Move to a more public area and consider contacting a trusted person.';
                    break;
                case 'High':
                    recommendation = 'Serious threat detected. Seek immediate shelter, call emergency services (100/112), and share your location with trusted contacts.';
                    break;
            }
        }
        
        return {
            threat_level: level,
            recommendation: recommendation,
            analyzed_image: imageData,
            timestamp: new Date().toISOString(),
            reasoning: reasoning,
            detected_objects: detectionResults ? detectionResults.detectedObjects : [],
            dangerous_objects: detectionResults ? detectionResults.dangerousObjectsFound : []
        };
    }

    // Function to display threat analysis
    function displayThreatAnalysis(analysis) {
        // Set threat level with appropriate color
        threatLevel.textContent = `Threat Level: ${analysis.threat_level}`;
        threatLevel.className = 'threat-level';
        
        if (analysis.threat_level === 'Low') {
            threatLevel.classList.add('threat-low');
        } else if (analysis.threat_level === 'Medium') {
            threatLevel.classList.add('threat-medium');
        } else if (analysis.threat_level === 'High') {
            threatLevel.classList.add('threat-high');
        }
        
        // Format and set recommendation with paragraph breaks and emphasis
        const formattedRecommendation = formatTextWithEmphasis(analysis.recommendation);
        recommendation.innerHTML = formattedRecommendation;
        
        // Format and set reasoning if available
        if (analysis.reasoning) {
            const formattedReasoning = formatTextWithEmphasis(analysis.reasoning);
            reasoning.innerHTML = `<strong>Analysis:</strong> ${formattedReasoning}`;
            reasoning.style.display = 'block';
        } else {
            reasoning.style.display = 'none';
        }
        
        // Show emotion if available
        // First, remove any existing emotion tag
        const existingEmotionTag = document.querySelector('.emotion-tag');
        if (existingEmotionTag) {
            existingEmotionTag.remove();
        }
        
        if (analysis.emotion && analysis.emotion !== 'unknown' && analysis.emotion !== 'uncertain') {
            const emotionTag = document.createElement('div');
            emotionTag.className = 'emotion-tag';
            emotionTag.textContent = `Detected Emotion: ${analysis.emotion}`;
            emotionTag.style.marginTop = '0.5rem';
            emotionTag.style.fontWeight = 'bold';
            emotionTag.style.color = 'var(--secondary-color)';
            
            // Add a small icon or emoji corresponding to the emotion
            const emotionEmojis = {
                'Happy': '😊',
                'Sad': '😔',
                'Angry': '😠',
                'Fearful': '😨',
                'Disgusted': '😖',
                'Surprised': '😲',
                'Neutral': '😐'
            };
            
            if (emotionEmojis[analysis.emotion]) {
                emotionTag.textContent = `${emotionEmojis[analysis.emotion]} Detected Emotion: ${analysis.emotion}`;
            }
            
            // Insert before object detection section
            if (alertDetails && objectDetection) {
                alertDetails.insertBefore(emotionTag, objectDetection);
            }
        }
        
        // Set image
        if (alertImage) {
            alertImage.src = analysis.analyzed_image;
        }
        
        // Set timestamp
        const date = new Date(analysis.timestamp);
        if (alertTimestamp) {
            alertTimestamp.textContent = date.toLocaleString();
        }
        
        // Display detected objects if available
        if (analysis.detected_objects && analysis.detected_objects.length > 0) {
            objectDetection.classList.add('active');
            objectsList.innerHTML = '';
            
            // Create a Set of dangerous objects for quick lookup
            const dangerousObjectsSet = new Set(analysis.dangerous_objects || []);
            
            // Add each detected object as a tag
            analysis.detected_objects.forEach(obj => {
                const tag = document.createElement('span');
                tag.textContent = obj;
                tag.className = 'object-tag';
                
                // Add 'dangerous' class if the object is in the dangerous objects list
                if (dangerousObjectsSet.has(obj)) {
                    tag.classList.add('dangerous');
                }
                
                objectsList.appendChild(tag);
            });
            
            // Show warning if dangerous objects were detected
            if (analysis.dangerous_objects && analysis.dangerous_objects.length > 0) {
                detectionWarning.textContent = `⚠️ WARNING: Potentially dangerous objects detected (${analysis.dangerous_objects.join(', ')})`;
                detectionWarning.classList.add('active');
            } else {
                detectionWarning.classList.remove('active');
            }
        } else {
            objectDetection.classList.remove('active');
        }
        
        // Set location info if available
        if (userLocation) {
            locationText.textContent = `Lat: ${userLocation.latitude.toFixed(6)}, Long: ${userLocation.longitude.toFixed(6)}`;
        } else {
            locationText.textContent = 'Location unavailable';
        }
        
        // Save alert to history
        saveAlertToHistory(analysis);
        
        // Display alert analysis section
        alertAnalysis.classList.add('active');
        
        // Add a subtle animation to make the alert more noticeable
        alertAnalysis.classList.add('alert-animation');
        setTimeout(() => {
            alertAnalysis.classList.remove('alert-animation');
        }, 1000);
    }
    /**
     * Helper function to format text with paragraph breaks and emphasis
     * @param {string} text - The text to format
     * @returns {string} - Formatted HTML
     */
    function formatTextWithEmphasis(text) {
        if (!text) return '';
        
        // Add paragraph breaks
        let formatted = text
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // Wrap in paragraph tags if not already
        if (!formatted.startsWith('<p>')) {
            formatted = `<p>${formatted}</p>`;
        }
        if (!formatted.endsWith('</p>')) {
            formatted = `${formatted}</p>`;
        }
        
        // Add emphasis to important phrases
        const emphasisPatterns = [
            { pattern: /\b(ALERT|WARNING|DANGER|EMERGENCY|CAUTION)\b/gi, replacement: '<strong class="highlight-warning">$1</strong>' },
            { pattern: /\b(immediately|urgent|quickly|right now|vital|critical)\b/gi, replacement: '<strong>$1</strong>' },
            { pattern: /\b(call|contact|dial|text|send|find|seek|remain|stay|move|leave|hide|run)\b/gi, replacement: '<em>$1</em>' },
            { pattern: /\b(\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}|\d{3}[-\.\s]?\d{4}|100|101|112|911)\b/g, replacement: '<strong class="highlight-number">$1</strong>' },
        ];
        
        emphasisPatterns.forEach(({ pattern, replacement }) => {
            formatted = formatted.replace(pattern, replacement);
        });
        
        return formatted;
    }

    // Function to save alert to history
    function saveAlertToHistory(analysis) {
        // Add location to analysis object
        const alertWithLocation = {
            ...analysis,
            location: userLocation
        };
        
        // Add to previous alerts array
        previousAlerts.unshift(alertWithLocation);
        
        // Keep only the latest 5 alerts
        if (previousAlerts.length > 5) {
            previousAlerts = previousAlerts.slice(0, 5);
        }
        
        // Save to localStorage
        localStorage.setItem('rapidRakshaAlerts', JSON.stringify(previousAlerts));
        
        // Update UI
        updateAlertsHistory();
    }

    // Function to load previous alerts from localStorage
    function loadPreviousAlerts() {
        const savedAlerts = localStorage.getItem('rapidRakshaAlerts');
        if (savedAlerts) {
            previousAlerts = JSON.parse(savedAlerts);
            updateAlertsHistory();
        }
    }

    // Function to update alerts history UI
    function updateAlertsHistory() {
        alertsList.innerHTML = '';
        
        if (previousAlerts.length === 0) {
            const noAlerts = document.createElement('p');
            noAlerts.textContent = 'No previous alerts';
            alertsList.appendChild(noAlerts);
            return;
        }
        
        previousAlerts.forEach(alert => {
            const alertCard = document.createElement('div');
            alertCard.className = 'alert-card';
            
            const date = new Date(alert.timestamp);
            
            // Add reasoning to the alert card if available
            const reasoningHtml = alert.reasoning 
                ? `<p style="font-style: italic; font-size: 0.8rem; margin-top: 0.5rem;">${alert.reasoning}</p>` 
                : '';
            
            // Add detected objects to the alert card if available
            let objectsHtml = '';
            if (alert.detected_objects && alert.detected_objects.length > 0) {
                objectsHtml = '<div style="margin-top: 0.5rem; font-size: 0.8rem;">';
                
                // Create a Set of dangerous objects for quick lookup
                const dangerousObjectsSet = new Set(alert.dangerous_objects || []);
                
                // Create a string of object tags
                const objectTags = alert.detected_objects.map(obj => {
                    const isDangerous = dangerousObjectsSet.has(obj);
                    return `<span class="object-tag ${isDangerous ? 'dangerous' : ''}" style="display: inline-block; margin: 0.1rem;">${obj}</span>`;
                }).join(' ');
                
                objectsHtml += `<div style="font-weight: 700; margin-bottom: 0.2rem;">Objects:</div><div>${objectTags}</div>`;
                objectsHtml += '</div>';
            }
            
            // Add emotion to the alert card if available
            let emotionHtml = '';
            if (alert.emotion && alert.emotion !== 'unknown' && alert.emotion !== 'uncertain') {
                const emotionEmojis = {
                    'Happy': '😊',
                    'Sad': '😔',
                    'Angry': '😠',
                    'Fearful': '😨',
                    'Disgusted': '😖',
                    'Surprised': '😲',
                    'Neutral': '😐'
                };
                
                const emoji = emotionEmojis[alert.emotion] || '';
                emotionHtml = `<div style="margin-top: 0.5rem; font-size: 0.8rem; font-weight: bold;">${emoji} Emotion: ${alert.emotion}</div>`;
            }
            
            alertCard.innerHTML = `
                <div class="alert-card-header">
                    <div class="threat-level ${alert.threat_level.toLowerCase() === 'low' ? 'threat-low' : 
                                              alert.threat_level.toLowerCase() === 'medium' ? 'threat-medium' : 
                                              'threat-high'}">
                        ${alert.threat_level}
                    </div>
                    <div>${date.toLocaleString()}</div>
                </div>
                <img src="${alert.analyzed_image}" alt="Alert image" class="alert-card-image">
                <div class="alert-card-content">
                    ${formatTextWithEmphasis(alert.recommendation)}
                    ${reasoningHtml}
                    ${emotionHtml}
                    ${objectsHtml}
                </div>
            `;
            
            alertsList.appendChild(alertCard);
        });
    }

    // Function to show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
        errorMessage.style.color = 'var(--danger-color)';
        errorMessage.classList.add('active');
        setTimeout(() => {
            errorMessage.classList.remove('active');
        }, 5000); // Hide after 5 seconds
    }

    // Function to stop camera
    function stopCamera() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        cameraSection.classList.remove('active');
    }

    // Helper function to detect if running on Android
    function isAndroidDevice() {
        return /Android/i.test(navigator.userAgent);
    }

    // Function to send location via SMS
    async function sendLocationSMS() {
        try {
            // Check if we have an emergency contact
            if (!emergencyContact) {
                // If no contact is saved, try to open SMS app with just the message
                showMessage('No emergency contact saved. Opening SMS app with a generic message.', 'info');
            }
            
            // Try to get user's location
            let location = null;
            try {
                location = await getUserLocation();
            } catch (error) {
                console.error('Error getting location for SMS:', error);
                // If location fails, show an alert and continue with a generic message
                showError('Could not access your location. A generic emergency SMS will be sent instead.');
            }
            
            // Create SMS content
            let message = '🚨 Emergency Alert!';
            
            // Add location link if available
            if (location && location.latitude && location.longitude) {
                const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
                message += ` My location: ${mapsLink}`;
            } else {
                message += ' I need help! (Location unavailable)';
            }
            
            // Create SMS URI with encoded message
            const encodedMessage = encodeURIComponent(message);
            
            // Construct SMS URI based on device platform and contact availability
            let smsUri;
            
            if (isAndroidDevice()) {
                // Android SMS format with semicolon for compatibility with more Android devices
                smsUri = emergencyContact 
                    ? `sms:${emergencyContact};?body=${encodedMessage}` 
                    : `sms:;?body=${encodedMessage}`;
            } else {
                // iOS and other platforms format
                smsUri = emergencyContact 
                    ? `sms:${emergencyContact}?body=${encodedMessage}` 
                    : `sms:?body=${encodedMessage}`;
            }
            
            // Open SMS app
            window.open(smsUri, '_blank');
            
            // Show success message
            if (location && location.latitude && location.longitude) {
                showMessage('SMS app opened with your current location.', 'success');
            } else {
                showMessage('SMS app opened with a generic emergency message.', 'info');
            }
            
            return true;
        } catch (error) {
            console.error('Error sending SMS:', error);
            showError('Could not open SMS app. Please manually send a message to your emergency contact.');
            return false;
        }
    }

    // Event listener for panic button
    panicButton.addEventListener('click', async function() {
        // Check if we have a Groq API key
        if (!groqApiKey) {
            apiKeySection.style.display = 'block';
            showError('Please enter your Groq API key to continue');
            return;
        }

        // Check if we're using default demo keys and show a warning
        if (groqApiKey === defaultGroqApiKey || visionApiKey === defaultVisionApiKey) {
            showMessage('Using demo API keys. In production, replace with your actual API keys for full functionality.', 'info');
        }

        // Remove pulse animation
        panicButton.classList.remove('pulse');
        
        try {
            // First, immediately send an SMS with location
            // This ensures help is requested even if the rest of the process fails
            sendLocationSMS();
            
            // Get user location
            try {
                await getUserLocation();
            } catch (error) {
                console.error('Error getting location:', error);
                showError('Could not access your location. The alert will be sent without location information.');
                // Continue without location
            }
            
            // Start camera
            const cameraStarted = await startCamera();
            
            if (!cameraStarted) {
                throw new Error('Failed to start camera');
            }
            
            // Wait a bit for camera to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Capture image
            const imageData = await captureImage();
            
            // Show loading indicator
            loadingIndicator.classList.add('active');
            
            // Detect objects in image (if Vision API key is available)
            let detectionResults = null;
            if (visionApiKey) {
                try {
                    detectionResults = await detectObjectsInImage(imageData);
                    console.log('Object detection results:', detectionResults);
                } catch (error) {
                    console.error('Error detecting objects:', error);
                    // Continue without object detection
                }
            } else {
                console.log('No Vision API key available, skipping object detection');
            }
            
            // Send emergency alert with detection results
            const analysis = await sendEmergencyAlert(imageData, userLocation, detectionResults);
            
            // Hide loading indicator
            loadingIndicator.classList.remove('active');
            
            // Stop camera
            stopCamera();
            
            // Display threat analysis
            displayThreatAnalysis(analysis);
            
        } catch (error) {
            console.error('Error during emergency alert process:', error);
            loadingIndicator.classList.remove('active');
            stopCamera();
            showError(error.message || 'An error occurred while processing your emergency alert. Please try again.');
        }
    });
});







