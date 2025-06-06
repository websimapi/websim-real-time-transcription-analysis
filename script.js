document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const analyzeButton = document.getElementById('analyzeButton');
    const statusDiv = document.getElementById('status');
    const interimTranscriptDiv = document.getElementById('interim-transcript');
    const finalTranscriptDiv = document.getElementById('final-transcript');
    const transcriptionContainer = document.getElementById('transcription-container');
    const analysisSection = document.getElementById('analysis-section');
    const analysisResultDiv = document.getElementById('analysis-result');
    const errorContainer = document.getElementById('error-container');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let isRecording = false; // To track recording state

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let final_transcript = '';

        recognition.onstart = () => {
            statusDiv.innerHTML = '<p>Status: Recording... Speak now!</p>';
        };

        recognition.onresult = (event) => {
            let interim_transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript + ' ';
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            finalTranscriptDiv.innerHTML = final_transcript;
            interimTranscriptDiv.innerHTML = interim_transcript;
        };

        recognition.onerror = (event) => {
            statusDiv.innerHTML = `<p>Status: Error - ${event.error}. Please ensure microphone access is allowed.</p>`;
            console.error('Speech recognition error:', event.error);
            // On critical errors like permission denied, stop trying to record.
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                isRecording = false;
            }
        };

        recognition.onend = () => {
            // If we are still supposed to be recording, restart it.
            // This handles the case where the browser stops recognition after a period of silence or for other reasons.
            if (isRecording) {
                recognition.start();
                return;
            }
            
            // This part runs only when the user has explicitly stopped recording or a critical error occurred.
            statusDiv.innerHTML = '<p>Status: Recording stopped.</p>';
            startButton.classList.remove('hidden');
            stopButton.classList.add('hidden');
            
            if (final_transcript.trim().length > 0) {
                analysisSection.classList.remove('hidden');
                analysisResultDiv.innerHTML = '<p>Click "Analyze Transcript" to see the key points.</p>';
                analyzeButton.disabled = false;
            } else {
                 analysisSection.classList.add('hidden');
            }
        };

        startButton.addEventListener('click', () => {
            isRecording = true;

            // Reset transcript and UI for a new recording session
            final_transcript = '';
            finalTranscriptDiv.innerHTML = '';
            interimTranscriptDiv.innerHTML = '';
            analysisResultDiv.innerHTML = '<p>Click "Analyze Transcript" to see the key points.</p>';
            transcriptionContainer.classList.remove('hidden');
            analysisSection.classList.add('hidden');
            
            recognition.start();

            startButton.classList.add('hidden');
            stopButton.classList.remove('hidden');
        });

        stopButton.addEventListener('click', () => {
            isRecording = false;
            recognition.stop();
        });

        analyzeButton.addEventListener('click', async () => {
            const transcriptText = final_transcript.trim();
            if (!transcriptText) {
                analysisResultDiv.textContent = 'Nothing to analyze. Please record some audio first.';
                return;
            }

            analyzeButton.disabled = true;
            analysisResultDiv.innerHTML = '<p>Analyzing... please wait.</p>';

            try {
                const completion = await websim.chat.completions.create({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant. Your task is to analyze the following text and provide a concise summary of the key points. Use bullet points (using markdown like * or -) for clarity and structure your response neatly.',
                        },
                        {
                            role: 'user',
                            content: `Please analyze this transcript and extract the key points:\n\n"${transcriptText}"`,
                        },
                    ],
                });
                
                analysisResultDiv.textContent = completion.content;

            } catch (error) {
                console.error('Error analyzing transcript:', error);
                analysisResultDiv.textContent = 'Sorry, an error occurred during analysis.';
            } finally {
                analyzeButton.disabled = false;
            }
        });

    } else {
        document.getElementById('controls').classList.add('hidden');
        document.getElementById('status').classList.add('hidden');
        errorContainer.classList.remove('hidden');
    }
});