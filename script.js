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

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let final_transcript = '';
        let isRecording = false;
        let finalTranscriptLength = 0; // Track the length of finalized transcript

        recognition.onstart = () => {
            statusDiv.innerHTML = '<p>Status: Recording... Speak now!</p>';
            transcriptionContainer.classList.remove('hidden');
            analysisSection.classList.add('hidden');
            if (!isRecording) {
                finalTranscriptDiv.innerHTML = '';
                interimTranscriptDiv.innerHTML = '';
                analysisResultDiv.innerHTML = '';
                final_transcript = '';
                finalTranscriptLength = 0; // Reset the tracker
                isRecording = true;
            }
        };

        recognition.onresult = (event) => {
            let interim_transcript = '';
            let new_final_transcript = '';
            
            // Build the complete final transcript from all final results
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    new_final_transcript += event.results[i][0].transcript + ' ';
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            
            // Only update if we have new final content
            if (new_final_transcript.length > finalTranscriptLength) {
                final_transcript = new_final_transcript;
                finalTranscriptLength = new_final_transcript.length;
                finalTranscriptDiv.innerHTML = final_transcript;
            }
            
            // Always update interim (it changes frequently)
            interimTranscriptDiv.innerHTML = interim_transcript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech' && isRecording) {
                // Restart recognition if no speech detected but still recording
                setTimeout(() => {
                    if (isRecording) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.log('Recognition restart failed:', e);
                        }
                    }
                }, 100);
            } else if (event.error !== 'aborted') {
                statusDiv.innerHTML = `<p>Status: Error - ${event.error}. Please ensure microphone access is allowed.</p>`;
            }
        };

        recognition.onend = () => {
            if (isRecording) {
                // Automatically restart recognition to keep recording continuous
                try {
                    recognition.start();
                } catch (e) {
                    console.log('Recognition restart failed:', e);
                    // If restart fails, try again after a short delay
                    setTimeout(() => {
                        if (isRecording) {
                            try {
                                recognition.start();
                            } catch (e2) {
                                console.log('Recognition restart failed again:', e2);
                                isRecording = false;
                                statusDiv.innerHTML = '<p>Status: Recording stopped due to error.</p>';
                                startButton.classList.remove('hidden');
                                stopButton.classList.add('hidden');
                            }
                        }
                    }, 100);
                }
            } else {
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
            }
        };

        startButton.addEventListener('click', () => {
            try {
                recognition.start();
                startButton.classList.add('hidden');
                stopButton.classList.remove('hidden');
            } catch (e) {
                console.error('Failed to start recognition:', e);
                statusDiv.innerHTML = '<p>Status: Failed to start recording. Please try again.</p>';
            }
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