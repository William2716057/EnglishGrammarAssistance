//to allow user to know if microphone is working or to speak louder 
async function startVolumeMonitor() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const analyzer = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyzer);
        analyzer.fftSize = 256;
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);

        function update() {
            analyzer.getByteFrequencyData(dataArray);
            let avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
            document.getElementById('volume-bar').style.width = avg + "%";
            requestAnimationFrame(update);
        }
        update();
    } catch (e) {
        console.error("Volume Monitor failed:", e);
    }
}
startVolumeMonitor();

const API_KEY = ""; //API key here
const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status');
const userDisplay = document.getElementById('user-text');
const aiDisplay = document.getElementById('ai-text');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Settings to help with 'no-speech' issues
recognition.lang = 'en-US';
recognition.continuous = false;
recognition.interimResults = false;

let isRunning = false; // Track state to prevent InvalidStateError

micBtn.addEventListener('click', () => {
    if (isRunning) {
        recognition.stop();
        return;
    }

    try {
        recognition.start();
    } catch (e) {
        console.log("Already started, ignoring click.");
    }
});

recognition.onstart = () => {
    isRunning = true;
    console.log("Mic LIVE. Speak clearly now!");
    statusText.innerText = "Status: Listening... (SPEAK NOW)";
    micBtn.innerText = "Listening...";
    micBtn.style.backgroundColor = "#d93025";
};

recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    console.log("Heard:", transcript);
    userDisplay.innerText = transcript;
    statusText.innerText = "Status: Thinking...";

    const aiResponse = await getGeminiResponse(transcript);
    aiDisplay.innerText = aiResponse;
    speak(aiResponse);
};

recognition.onerror = (event) => {
    console.error("Mic Error:", event.error);
    isRunning = false;
    if (event.error === 'no-speech') {
        statusText.innerText = "Status: Didn't hear anything. Try again.";
    } else {
        statusText.innerText = "Error: " + event.error;
    }
};

recognition.onend = () => {
    isRunning = false;
    micBtn.innerText = "Click to Speak";
    micBtn.style.backgroundColor = "";
    console.log("Mic session closed.");
};

async function getGeminiResponse(text) {
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    const requestBody = {
        // Prompt to define the role that 
        system_instruction: {
            parts: [{
                text: "You are an English tutor. The user will give you a sentence in English. Your ONLY job is to: 1. If the sentence is correct, give a supportive response 2. If it has errors, provide a brief correction in Japanese and explain why. Keep responses very short."
            }]
        },
        contents: [{
            parts: [{ text: text }]
        }]
    };
    //error handling
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.error) {
            return `Error: ${data.error.message}`;
        }

        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        return "Connection error. Please check your internet.";
    }
}
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    // Cancel any current speech before starting new speech
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}