# RapidRaksha - Women's Safety App

RapidRaksha is an emergency alert system powered by GroqShield AI that provides safety recommendations based on camera imagery, facial emotion detection, and object detection.

## Features

- Emergency alert system with camera snapshot
- Facial emotion detection using face-api.js
- Object detection using Google Vision API (with dangerous object identification)
- Location tracking for emergency alerts
- Threat analysis with safety recommendations
- History of previous alerts

## Setup Instructions

1. Clone or download this repository
2. Open `index.html` in a web browser
3. Enter your API keys when prompted:
   - Groq API key for threat analysis
   - Google Vision API key for object detection

## API Keys

- **Groq API**: Get your API key from [groq.com](https://console.groq.com/)
- **Google Vision API**: Get your API key from [Google Cloud Console](https://console.cloud.google.com/)

## Troubleshooting Emotion Detection

If you're experiencing issues with emotion detection:

1. **Check Browser Support**: Ensure you're using a modern browser (Chrome, Firefox, Edge)
2. **Check Camera Permissions**: Make sure you've granted camera access to the application
3. **Good Lighting**: Ensure your face is well-lit for better detection
4. **Camera Position**: Position your face clearly in the center of the frame
5. **Model Files**: Check that all model files are present in the `models` directory:
   - face_expression_model-shard1
   - face_expression_model-weights_manifest.json
   - tiny_face_detector_model-shard1
   - tiny_face_detector_model-weights_manifest.json
   - ssd_mobilenetv1_model-shard1
   - ssd_mobilenetv1_model-shard2
   - ssd_mobilenetv1_model-weights_manifest.json

### Missing Model Files?

If you're missing any model files, run:

```
node download_models.js
```

Or open `download_models.html` in your browser and follow the instructions to download the required model files.

### Test Emotion Detection

To test if emotion detection is working correctly, open:

```
emotion_test.html
```

This utility will help you test face detection and emotion recognition directly.

## Technical Details

- **Face Detection**: Uses face-api.js with TinyFaceDetector and SSD MobileNet models
- **Emotion Detection**: Analyzes facial expressions to detect emotions like happy, sad, angry, etc.
- **Object Detection**: Uses Google Vision API to identify objects and potentially dangerous items
- **Threat Analysis**: Uses Groq API with LLaMA3 70B model to analyze the overall situation

## Privacy

- All data is processed locally in your browser
- API keys are stored in your browser's localStorage
- Images are not saved permanently unless you specifically choose to save them
- No data is shared with third parties beyond the necessary API requests

## License

MIT License

---

*Note: While this app can provide helpful recommendations, always prioritize your safety and contact emergency services (100/112) in serious situations.* 