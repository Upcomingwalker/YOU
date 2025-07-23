const GEMINI_API_KEY = 'AIzaSyAFVEMaTpSIFBYJ4Wp3Ol8p9ZDlMk6fiMk';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let selectedDifficulty = null;
let isGeneratingQuestions = false;

const subjects = {
    '6-10': ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Sanskrit'],
    '11-12': {
        'Science': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'],
        'Commerce': ['Accountancy', 'Business Studies', 'Economics', 'English', 'Mathematics'],
        'Arts': ['History', 'Geography', 'Political Science', 'English', 'Hindi', 'Psychology', 'Sociology']
    }
};

//Backup Questions if AI didn't work.
const questionBank = {
    Mathematics: {
        easy: [
            { question: "What is 15 + 23?", options: { A: "36", B: "38", C: "40", D: "42" }, correct: "B", explanation: "15 + 23 = 38" },
            { question: "What is 8 × 7?", options: { A: "54", B: "56", C: "58", D: "60" }, correct: "B", explanation: "8 × 7 = 56" },
            { question: "What is 144 ÷ 12?", options: { A: "10", B: "11", C: "12", D: "13" }, correct: "C", explanation: "144 ÷ 12 = 12" },
            { question: "What is 6²?", options: { A: "32", B: "34", C: "36", D: "38" }, correct: "C", explanation: "6² = 6 × 6 = 36" },
            { question: "What is ½ as a decimal?", options: { A: "0.25", B: "0.33", C: "0.50", D: "0.75" }, correct: "C", explanation: "½ = 0.50" },
            { question: "What is 25% of 80?", options: { A: "15", B: "20", C: "25", D: "30" }, correct: "B", explanation: "25% of 80 = 20" },
            { question: "What is the square root of 49?", options: { A: "6", B: "7", C: "8", D: "9" }, correct: "B", explanation: "√49 = 7" },
            { question: "What is 3 + 4 × 2?", options: { A: "10", B: "11", C: "12", D: "14" }, correct: "B", explanation: "Following order of operations: 3 + (4 × 2) = 3 + 8 = 11" },
            { question: "What is the perimeter of a square with side 5 cm?", options: { A: "15 cm", B: "20 cm", C: "25 cm", D: "30 cm" }, correct: "B", explanation: "Perimeter = 4 × side = 4 × 5 = 20 cm" },
            { question: "Convert 3/5 to percentage", options: { A: "50%", B: "55%", C: "60%", D: "65%" }, correct: "C", explanation: "3/5 = 0.6 = 60%" }
        ],
        medium: [
            { question: "If 2x + 5 = 17, what is x?", options: { A: "5", B: "6", C: "7", D: "8" }, correct: "B", explanation: "2x = 17 - 5 = 12, so x = 6" },
            { question: "What is the area of a triangle with base 8 cm and height 6 cm?", options: { A: "20 cm²", B: "22 cm²", C: "24 cm²", D: "26 cm²" }, correct: "C", explanation: "Area = ½ × base × height = ½ × 8 × 6 = 24 cm²" },
            { question: "What is 30% of 150?", options: { A: "40", B: "45", C: "50", D: "55" }, correct: "B", explanation: "30% of 150 = 0.30 × 150 = 45" }
        ],
        hard: [
            { question: "What is the derivative of x³ + 2x² - 5x + 3?", options: { A: "3x² + 4x - 5", B: "3x² + 2x - 5", C: "x² + 4x - 5", D: "3x + 4x - 5" }, correct: "A", explanation: "d/dx(x³ + 2x² - 5x + 3) = 3x² + 4x - 5" }
        ]
    },
    Science: {
        easy: [
            { question: "What is the chemical formula for water?", options: { A: "H2O", B: "CO2", C: "NaCl", D: "O2" }, correct: "A", explanation: "Water consists of 2 hydrogen atoms and 1 oxygen atom" },
            { question: "How many bones are in an adult human body?", options: { A: "106", B: "206", C: "306", D: "406" }, correct: "B", explanation: "An adult human has 206 bones" }
        ],
        medium: [
            { question: "What is photosynthesis?", options: { A: "Breathing in plants", B: "Making food using sunlight", C: "Plant reproduction", D: "Plant growth" }, correct: "B", explanation: "Photosynthesis converts sunlight, CO₂, and water into glucose" }
        ],
        hard: [
            { question: "What is the second law of thermodynamics?", options: { A: "Energy cannot be created or destroyed", B: "Entropy always increases", C: "Heat flows from hot to cold", D: "Temperature is absolute" }, correct: "B", explanation: "The second law states that entropy of an isolated system always increases" }
        ]
    },
    English: {
        easy: [
            { question: "What is the past tense of 'go'?", options: { A: "goed", B: "went", C: "gone", D: "going" }, correct: "B", explanation: "The past tense of 'go' is 'went'" },
            { question: "Which of these is a noun?", options: { A: "quickly", B: "beautiful", C: "table", D: "running" }, correct: "C", explanation: "'Table' is a thing, making it a noun" }
        ],
        medium: [
            { question: "What is a metaphor?", options: { A: "Comparison using 'like' or 'as'", B: "Direct comparison without 'like' or 'as'", C: "An exaggeration", D: "A rhetorical question" }, correct: "B", explanation: "A metaphor directly compares without using 'like' or 'as'" }
        ],
        hard: [
            { question: "In which literary period did Shakespeare write?", options: { A: "Victorian", B: "Romantic", C: "Elizabethan", D: "Modern" }, correct: "C", explanation: "Shakespeare wrote during the Elizabethan era" }
        ]
    }
};

const elements = {
    setupForm: document.getElementById('setupForm'),
    loadingScreen: document.getElementById('loadingScreen'),
    quizSection: document.getElementById('quizSection'),
    resultsSection: document.getElementById('resultsSection'),
    reviewSection: document.getElementById('reviewSection'),
    historySection: document.getElementById('historySection'),
    board: document.getElementById('board'),
    classSelect: document.getElementById('class'),
    streamGroup: document.getElementById('streamGroup'),
    stream: document.getElementById('stream'),
    subject: document.getElementById('subject'),
    startQuiz: document.getElementById('startQuiz'),
    testAPI: document.getElementById('testAPI'),
    questionCard: document.getElementById('questionCard'),
    progressFill: document.getElementById('progressFill'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    submitBtn: document.getElementById('submitBtn'),
    scoreCircle: document.getElementById('scoreCircle'),
    scoreText: document.getElementById('scoreText'),
    resultTitle: document.getElementById('resultTitle'),
    resultDescription: document.getElementById('resultDescription'),
    reviewBtn: document.getElementById('reviewBtn'),
    newQuizBtn: document.getElementById('newQuizBtn'),
    reviewContent: document.getElementById('reviewContent'),
    backToResultsBtn: document.getElementById('backToResultsBtn'),
    historyContent: document.getElementById('historyContent'),
    messageContainer: document.getElementById('messageContainer'),
    loadingText: document.getElementById('loadingText'),
    loadingDetails: document.getElementById('loadingDetails')
};

function showMessage(message, type = 'info', details = null) {
    const messageClasses = {
        'error': 'error-message',
        'success': 'success-message',
        'info': 'info-message'
    };
    
    const messageClass = messageClasses[type] || 'info-message';
    const messageHtml = `
        <div class="${messageClass}">
            <strong>${type === 'error' ? 'Error:' : type === 'success' ? 'Success:' : 'Info:'}</strong> ${message}
            ${details ? `<div class="debug-info">${details}</div>` : ''}
        </div>
    `;
    elements.messageContainer.innerHTML = messageHtml;
    
    if (type !== 'error') {
        setTimeout(() => {
            elements.messageContainer.innerHTML = '';
        }, 5000);
    }
}

function clearMessage() {
    elements.messageContainer.innerHTML = '';
}

function updateLoadingStatus(message, details = '') {
    elements.loadingText.textContent = message;
    elements.loadingDetails.textContent = details;
}

async function testFlatAI() {
    showMessage('Testing API connection with FLAT AI...', 'info');
    
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Generate a simple test response: Hello World"
                    }]
                }]
            })
        });

        console.log('API Test Response Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            showMessage(`API test failed with status ${response.status}`, 'error', errorText);
            return false;
        }

        const data = await response.json();
        console.log('API Test Success:', data);
        showMessage('API connection successful! FLAT AI is working perfectly.', 'success');
        return true;
    } catch (error) {
        console.error('API Test Error:', error);
        showMessage('API test failed - Network or CORS error', 'error', error.message);
        return false;
    }
}

function generateQuestionsFromBank(config) {
    const subject = config.subject;
    const difficulty = config.difficulty;
    const questionCount = { easy: 10, medium: 20, hard: 30 }[difficulty];
    
    console.log(`Generating ${questionCount} questions for ${subject} - ${difficulty}`);
    
    let availableQuestions = [];
    
    if (questionBank[subject] && questionBank[subject][difficulty]) {
        availableQuestions = [...questionBank[subject][difficulty]];
    }
    
    let finalQuestions = [];
    
    if (availableQuestions.length >= questionCount) {
        for (let i = availableQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
        }
        finalQuestions = availableQuestions.slice(0, questionCount);
    } else {
        finalQuestions = [...availableQuestions];
        
        const questionsNeeded = questionCount - availableQuestions.length;
        console.log(`Need ${questionsNeeded} more questions`);
        
        for (let i = 0; i < questionsNeeded; i++) {
            const baseIndex = i % availableQuestions.length;
            const baseQuestion = availableQuestions[baseIndex];
            
            if (baseQuestion) {
                finalQuestions.push({
                    question: `${baseQuestion.question} (Variant ${Math.floor(i / availableQuestions.length) + 2})`,
                    options: { ...baseQuestion.options },
                    correct: baseQuestion.correct,
                    explanation: baseQuestion.explanation
                });
            } else {
                finalQuestions.push({
                    question: `${subject} question ${finalQuestions.length + 1} (${difficulty} level)`,
                    options: {
                        A: `Option A for question ${finalQuestions.length + 1}`,
                        B: `Option B for question ${finalQuestions.length + 1}`,
                        C: `Option C for question ${finalQuestions.length + 1}`,
                        D: `Option D for question ${finalQuestions.length + 1}`
                    },
                    correct: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
                    explanation: `Explanation for ${subject} question ${finalQuestions.length + 1}`
                });
            }
        }
    }
    
    console.log(`Generated ${finalQuestions.length} questions`);
    return finalQuestions;
}

async function callFlatAI(config, retryCount = 0) {
    const maxRetries = 2;
    const questionCount = { easy: 10, medium: 20, hard: 30 }[config.difficulty];
    
    const prompt = `You are an expert educator. Generate EXACTLY ${questionCount} unique, high-quality multiple choice questions for ${config.subject} for ${config.board} Class ${config.class}${config.stream ? ` ${config.stream}` : ''} students.

STRICT REQUIREMENTS:
- Generate EXACTLY ${questionCount} questions, no more, no less
- Each question must be unique and different
- Difficulty level: ${config.difficulty}
- Each question must have exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Include educational explanation for each correct answer
- Questions must be curriculum-appropriate and academically sound
- Avoid repetitive or similar questions

${config.difficulty === 'easy' ? 'Focus on: Basic concepts, definitions, simple calculations, fundamental principles' : 
  config.difficulty === 'medium' ? 'Focus on: Application of concepts, moderate problem-solving, analysis, connections between ideas' :
  'Focus on: Complex problem-solving, critical thinking, advanced concepts, synthesis of multiple ideas'}

Return ONLY a valid JSON array with exactly ${questionCount} questions in this format:
[
  {
    "question": "Clear, specific question text?",
    "options": {
      "A": "First option",
      "B": "Second option",
      "C": "Third option", 
      "D": "Fourth option"
    },
    "correct": "B",
    "explanation": "Clear explanation of why this answer is correct"
  }
]

CRITICAL: Return ONLY the JSON array, no additional text, comments, or markdown formatting.`;

    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 8192,
        }
    };

    try {
        console.log('Making API request for', questionCount, 'questions using FLAT AI...');
        
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid API response structure');
        }

        const content = data.candidates[0].content.parts[0].text;
        console.log('FLAT AI API Content:', content);

        let cleanContent = content.trim();
        cleanContent = cleanContent.replace(/``````\n?/g, '');
        
        const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No valid JSON array found in response');
        }

        const questions = JSON.parse(jsonMatch[0]);
        
        if (!Array.isArray(questions)) {
            throw new Error('Response is not a valid array');
        }

        const validQuestions = questions.filter(q => 
            q.question && q.options && q.correct && q.explanation &&
            q.options.A && q.options.B && q.options.C && q.options.D &&
            ['A', 'B', 'C', 'D'].includes(q.correct)
        );

        if (validQuestions.length < questionCount * 0.8) {
            throw new Error(`Not enough valid questions generated: ${validQuestions.length}/${questionCount}`);
        }

        console.log(`Successfully validated ${validQuestions.length} questions from FLAT AI`);
        return validQuestions.slice(0, questionCount);

    } catch (error) {
        console.error(`FLAT AI API attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < maxRetries) {
            updateLoadingStatus(`Retrying API call... (${retryCount + 1}/${maxRetries + 1})`, error.message);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return callFlatAI(config, retryCount + 1);
        }
        
        throw error;
    }
}

async function generateQuestions(config) {
    try {
        updateLoadingStatus('Connecting to FLAT AI servers...', 'Requesting custom questions from FLAT AI model');
        
        const questions = await callFlatAI(config);
        
        updateLoadingStatus('FLAT AI questions generated!', `Generated ${questions.length} custom questions`);
        showMessage(`Successfully generated ${questions.length} AI-powered questions using FLAT AI!`, 'success');
        
        return questions;
    } catch (error) {
        console.error('FLAT AI generation failed:', error);
        
        updateLoadingStatus('Using curated question bank...', 'Loading high-quality questions');
        showMessage('AI service temporarily unavailable, using curated questions for optimal experience', 'info');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const questions = generateQuestionsFromBank(config);
        
        updateLoadingStatus('Questions ready!', `Loaded ${questions.length} curated questions`);
        
        return questions;
    }
}

elements.classSelect.addEventListener('change', handleClassChange);
elements.stream.addEventListener('change', updateSubjects);
elements.startQuiz.addEventListener('click', startQuiz);
elements.testAPI.addEventListener('click', testFlatAI);
elements.prevBtn.addEventListener('click', () => navigateQuestion(-1));
elements.nextBtn.addEventListener('click', () => navigateQuestion(1));
elements.submitBtn.addEventListener('click', submitQuiz);
elements.reviewBtn.addEventListener('click', showReview);
elements.newQuizBtn.addEventListener('click', resetQuiz);
elements.backToResultsBtn.addEventListener('click', () => showSection('resultsSection'));

document.querySelectorAll('.difficulty-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedDifficulty = card.dataset.difficulty;
    });
});

function handleClassChange() {
    const selectedClass = elements.classSelect.value;
    const isHigherSecondary = selectedClass === '11' || selectedClass === '12';
    
    elements.streamGroup.classList.toggle('hidden', !isHigherSecondary);
    
    if (!isHigherSecondary) {
        elements.stream.value = '';
        updateSubjects();
    }
}

function updateSubjects() {
    const selectedClass = elements.classSelect.value;
    const selectedStream = elements.stream.value;
    const subjectSelect = elements.subject;
    
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    
    if (!selectedClass) return;
    
    let availableSubjects = [];
    
    if (selectedClass === '11' || selectedClass === '12') {
        if (selectedStream && subjects['11-12'][selectedStream]) {
            availableSubjects = subjects['11-12'][selectedStream];
        }
    } else {
        availableSubjects = subjects['6-10'];
    }
    
    availableSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });
}

async function startQuiz() {
    if (isGeneratingQuestions) return;
    
    const config = {
        board: elements.board.value,
        class: elements.classSelect.value,
        stream: elements.stream.value,
        subject: elements.subject.value,
        difficulty: selectedDifficulty
    };

    if (!config.board || !config.class || !config.subject || !config.difficulty) {
        showMessage('Please fill all required fields and select difficulty level', 'error');
        return;
    }

    if ((config.class === '11' || config.class === '12') && !config.stream) {
        showMessage('Please select a stream for classes 11 and 12', 'error');
        return;
    }

    clearMessage();
    isGeneratingQuestions = true;
    elements.startQuiz.disabled = true;
    showSection('loadingScreen');

    try {
        const questions = await generateQuestions(config);
        
        currentQuiz = {
            config,
            questions,
            startTime: new Date(),
            id: Date.now()
        };
        
        userAnswers = new Array(questions.length).fill(null);
        currentQuestionIndex = 0;
        
        console.log(`Quiz started with ${questions.length} questions`);
        
        showSection('quizSection');
        displayQuestion();
        updateProgress();
    } catch (error) {
        console.error('Quiz generation failed completely:', error);
        showMessage('Failed to generate quiz. Please try again.', 'error', error.message);
        showSection('setupForm');
    } finally {
        isGeneratingQuestions = false;
        elements.startQuiz.disabled = false;
    }
}

function displayQuestion() {
    if (!currentQuiz || currentQuestionIndex >= currentQuiz.questions.length) return;

    const question = currentQuiz.questions[currentQuestionIndex];
    const questionCard = elements.questionCard;

    questionCard.innerHTML = `
        <div class="question-header">
            <div class="question-number">Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}</div>
        </div>
        <div class="question-text">${question.question}</div>
        <div class="options">
            ${Object.entries(question.options).map(([key, value]) => `
                <div class="option" data-option="${key}">
                    <strong>${key}.</strong> ${value}
                </div>
            `).join('')}
        </div>
    `;

    questionCard.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => selectOption(option.dataset.option));
    });

    if (userAnswers[currentQuestionIndex]) {
        const selectedOption = questionCard.querySelector(`[data-option="${userAnswers[currentQuestionIndex]}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }

    updateNavigationButtons();
}

function selectOption(option) {
    elements.questionCard.querySelectorAll('.option').forEach(opt => 
        opt.classList.remove('selected')
    );
    
    elements.questionCard.querySelector(`[data-option="${option}"]`).classList.add('selected');
    
    userAnswers[currentQuestionIndex] = option;
}

function navigateQuestion(direction) {
    currentQuestionIndex += direction;
    currentQuestionIndex = Math.max(0, Math.min(currentQuestionIndex, currentQuiz.questions.length - 1));
    
    displayQuestion();
    updateProgress();
}

function updateNavigationButtons() {
    elements.prevBtn.style.visibility = currentQuestionIndex === 0 ? 'hidden' : 'visible';
    
    const isLastQuestion = currentQuestionIndex === currentQuiz.questions.length - 1;
    elements.nextBtn.classList.toggle('hidden', isLastQuestion);
    elements.submitBtn.classList.toggle('hidden', !isLastQuestion);
}

function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
    elements.progressFill.style.width = `${progress}%`;
}

function submitQuiz() {
    const unanswered = userAnswers.filter(answer => answer === null).length;
    if (unanswered > 0) {
        if (!confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) {
            return;
        }
    }

    const endTime = new Date();
    const duration = Math.round((endTime - currentQuiz.startTime) / 1000);
    const score = calculateScore();

    const quizResult = {
        ...currentQuiz,
        endTime,
        duration,
        userAnswers: [...userAnswers],
        score
    };

    saveQuizToHistory(quizResult);
    showResults(quizResult);
}

function calculateScore() {
    const correct = userAnswers.reduce((count, answer, index) => {
        return count + (answer === currentQuiz.questions[index].correct ? 1 : 0);
    }, 0);
    
    return {
        correct,
        total: currentQuiz.questions.length,
        percentage: Math.round((correct / currentQuiz.questions.length) * 100)
    };
}

function showResults(result) {
    const { score } = result;
    
    elements.scoreText.textContent = `${score.percentage}%`;
    elements.scoreCircle.className = 'score-circle';
    
    if (score.percentage >= 80) {
        elements.resultTitle.textContent = 'Outstanding!';
        elements.resultDescription.textContent = `Exceptional performance! You got ${score.correct} out of ${score.total} questions correct.`;
    } else if (score.percentage >= 60) {
        elements.resultTitle.textContent = 'Great Work!';
        elements.resultDescription.textContent = `Well done! You got ${score.correct} out of ${score.total} questions correct.`;
    } else {
        elements.resultTitle.textContent = 'Keep Learning!';
        elements.resultDescription.textContent = `You got ${score.correct} out of ${score.total} questions correct. Review and try again!`;
    }

    showSection('resultsSection');
    updateHistory();
}

function showReview() {
    if (!currentQuiz) return;

    const reviewHTML = currentQuiz.questions.map((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.correct;
        const statusClass = isCorrect ? 'correct' : 'incorrect';

        return `
            <div class="review-question ${statusClass}">
                <h3 style="margin-bottom: 12px;">Question ${index + 1}</h3>
                <p style="margin-bottom: 16px;"><strong>${question.question}</strong></p>
                <div style="margin: 16px 0;">
                    ${Object.entries(question.options).map(([key, value]) => {
                        let optionClass = 'review-option';
                        if (key === question.correct) {
                            optionClass += ' correct';
                        } else if (key === userAnswer && !isCorrect) {
                            optionClass += ' selected-wrong';
                        }
                        
                        return `<div class="${optionClass}"><strong>${key}.</strong> ${value}</div>`;
                    }).join('')}
                </div>
                <p style="margin-top: 16px;"><strong>Explanation:</strong> ${question.explanation}</p>
                ${!isCorrect ? `<p style="color: var(--error-red); margin-top: 12px;"><strong>Your answer:</strong> ${userAnswer || 'Not answered'}</p>` : ''}
            </div>
        `;
    }).join('');

    elements.reviewContent.innerHTML = reviewHTML;
    showSection('reviewSection');
}

function saveQuizToHistory(result) {
    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    history.unshift({
        id: result.id,
        date: result.endTime.toLocaleDateString(),
        time: result.endTime.toLocaleTimeString(),
        subject: result.config.subject,
        difficulty: result.config.difficulty,
        score: result.score,
        duration: result.duration
    });
    
    localStorage.setItem('quizHistory', JSON.stringify(history.slice(0, 10)));
}

function updateHistory() {
    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    
    if (history.length === 0) {
        elements.historyContent.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-size: 1.1rem;">No quiz history yet. Take your first quiz!</p>';
        return;
    }

    elements.historyContent.innerHTML = history.map(quiz => `
        <div class="history-item">
            <div>
                <strong style="font-size: 1.1rem;">${quiz.subject}</strong> - ${quiz.difficulty}
                <br>
                <small style="color: var(--text-secondary);">${quiz.date} at ${quiz.time}</small>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.8rem; font-weight: 700; background: var(--ps5-gaming-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${quiz.score.percentage}%</div>
                <small style="color: var(--text-secondary);">${quiz.score.correct}/${quiz.score.total} correct</small>
            </div>
        </div>
    `).join('');
}

function resetQuiz() {
    currentQuiz = null;
    currentQuestionIndex = 0;
    userAnswers = [];
    selectedDifficulty = null;
    
    elements.board.value = '';
    elements.classSelect.value = '';
    elements.stream.value = '';
    elements.subject.value = '';
    elements.streamGroup.classList.add('hidden');
    
    document.querySelectorAll('.difficulty-card').forEach(card => 
        card.classList.remove('selected')
    );
    
    clearMessage();
    showSection('setupForm');
}

function showSection(sectionId) {
    const sections = ['setupForm', 'loadingScreen', 'quizSection', 'resultsSection', 'reviewSection'];
    sections.forEach(id => {
        elements[id].classList.add('hidden');
    });
    elements[sectionId].classList.remove('hidden');
}

updateHistory();
updateSubjects();

console.log('Thynx Studio Quiz Hub initialized with FLAT AI');
