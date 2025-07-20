const API_KEY = 'AIzaSyDuu4VTElp41a41v0ri6auuk9LurwntnKg';
const USE_DEMO_MODE = false;

const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

const demoResponses = {
    'hello': 'Hello! I\'m F.L.A.T AI, your study assistant. How can I help you with your studies today?',
    'study': 'I can help you with various study techniques like:\n\n• Creating study schedules\n• Breaking down complex topics\n• Making flashcards\n• Test preparation strategies\n• Note-taking methods\n\nWhat subject are you studying?',
    'code': 'I can help you with programming! I can:\n\n• Explain coding concepts\n• Debug your code\n• Write examples\n• Suggest best practices\n• Help with different languages\n\nWhat programming language are you working with?',
    'test': 'I can help you prepare for tests by:\n\n• Creating practice questions\n• Explaining difficult concepts\n• Providing study strategies\n• Making review materials\n• Time management tips\n\nWhat test are you preparing for?',
    'default': 'I\'m here to help you learn! I can assist with studying, note-taking, coding, and test preparation. What would you like to work on today?'
};

messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener('click', sendMessage);

function addMessage(content, isUser = false, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (isUser) {
        avatar.textContent = 'U';
    } else {
        avatar.innerHTML = `
            <svg class="avatar-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                <circle cx="12" cy="8" r="2"/>
            </svg>
        `;
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = `message-content ${isError ? 'error-message' : ''}`;
    messageContent.textContent = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = 'loadingMessage';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = `
        <svg class="avatar-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            <circle cx="12" cy="8" r="2"/>
        </svg>
    `;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-message';
    loadingDiv.innerHTML = `
        <span>Thinking</span>
        <div class="loading-dots">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        </div>
    `;
    
    messageContent.appendChild(loadingDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoadingMessage() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

function getCustomResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('who made you') || lowerMessage.includes('who created you') || lowerMessage.includes('who developed you')) {
        return 'I was developed by Lovely Public School as a study assistant to help students learn better.';
    }
    
    if (lowerMessage.includes('what is your name') || lowerMessage.includes('what are you called') || lowerMessage.includes('your name')) {
        return 'My name is F.L.A.T, which stands for **Fast Learning Autonomous Thinker**. I\'m your study assistant designed to help you learn effectively.';
    }
    
    return null;
}

function getDemoResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [key, response] of Object.entries(demoResponses)) {
        if (key !== 'default' && lowerMessage.includes(key)) {
            return response;
        }
    }
    
    return demoResponses.default;
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendButton.disabled = true;

    addMessage(message, true);

    const customResponse = getCustomResponse(message);
    if (customResponse) {
        addMessage(customResponse);
        sendButton.disabled = false;
        messageInput.focus();
        return;
    }

    if (USE_DEMO_MODE) {
        addLoadingMessage();
        
        setTimeout(() => {
            removeLoadingMessage();
            const demoResponse = getDemoResponse(message);
            addMessage(demoResponse);
            sendButton.disabled = false;
            messageInput.focus();
        }, 1000);
        
        return;
    }

    addLoadingMessage();

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are F.L.A.T (Fast Learning Autonomous Thinker), a study assistant developed by Lovely Public School. You help students with their studies, create notes, tests, and code examples. Be helpful, educational, and engaging. When providing code examples, format them clearly. For study materials, be thorough and easy to understand.

User question: ${message}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 40
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        removeLoadingMessage();
        
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that request.";
        addMessage(aiResponse);

    } catch (error) {
        console.error('Error:', error);
        removeLoadingMessage();
        
        let errorMessage = 'Sorry, I encountered an error. ';
        
        if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage += 'Please check your API key configuration.';
        } else if (error.message.includes('429')) {
            errorMessage += 'Rate limit exceeded. Please try again later.';
        } else if (error.message.includes('quota')) {
            errorMessage += 'API quota exceeded. Please check your Google Cloud account.';
        } else {
            errorMessage += 'Please try again or contact support.';
        }
        
        addMessage(errorMessage, false, true);
    }

    sendButton.disabled = false;
    messageInput.focus();
}

window.addEventListener('load', () => {
    messageInput.focus();
});
