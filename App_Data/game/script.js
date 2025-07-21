import { GoogleGenAI } from 'https://esm.run/@google/genai';

const easyQ = [
  { question: "What is 7 + 8?", options: ["13", "14", "15", "16"], answer: 2 },
  { question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], answer: 1 },
  { question: "Boiling point of water at sea level is?", options: ["90°C", "95°C", "100°C", "110°C"], answer: 2 },
  { question: "What gas do plants absorb?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], answer: 1 },
  { question: "Binary of decimal 5 is", options: ["101", "010", "100", "111"], answer: 0 },
  { question: "1 byte equals how many bits?", options: ["4", "8", "16", "32"], answer: 1 },
  { question: "How many degrees in a right angle?", options: ["45°", "90°", "180°", "360°"], answer: 1 },
  { question: "What is H₂O?", options: ["Salt", "Water", "Hydrogen Peroxide", "Ozone"], answer: 1 },
  { question: "GUI stands for", options: ["Graphical User Interface", "General Utility Interface", "Global User Internet", "None"], answer: 0 },
  { question: "Sound travels fastest in", options: ["Air", "Water", "Vacuum", "Steel"], answer: 3 }
];

const mediumQ = [
  { question: "Solve for x: 2x + 5 = 17", options: ["6", "5", "11", "12"], answer: 0 },
  { question: "Time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], answer: 1 },
  { question: "pH of neutral solution at 25°C", options: ["6", "7", "8", "5"], answer: 1 },
  { question: "Speed of light in vacuum", options: ["3×10⁶ m/s", "3×10⁷ m/s", "3×10⁸ m/s", "3×10⁹ m/s"], answer: 2 },
  { question: "Find derivative of x²", options: ["x", "2x", "x²", "2"], answer: 1 },
  { question: "Which law states pressure inversely proportional to volume?", options: ["Boyle's", "Charles'", "Gay-Lussac", "Avogadro"], answer: 0 },
  { question: "Which layer of OSI handles routing?", options: ["Transport", "Network", "Data Link", "Session"], answer: 1 },
  { question: "Convert 0.25 to fraction", options: ["1/2", "1/3", "1/4", "2/5"], answer: 2 },
  { question: "Probability of getting 2 heads in 3 tosses", options: ["1/8", "3/8", "1/3", "1/2"], answer: 1 },
  { question: "Which vitamin deficiency causes scurvy?", options: ["A", "B1", "C", "D"], answer: 2 },
  { question: "Matrix A 2×3, B 3×4. Order of AB?", options: ["2×4", "3×4", "2×3", "4×4"], answer: 0 },
  { question: "DNA → RNA enzyme", options: ["DNA ligase", "RNA polymerase", "DNA polymerase", "Helicase"], answer: 1 },
  { question: "Beta decay emits", options: ["Helium nucleus", "Electron", "Photon", "Neutron"], answer: 1 },
  { question: "Which sorting algorithm is stable?", options: ["Quick sort", "Merge sort", "Heap sort", "Selection sort"], answer: 1 },
  { question: "Integral of 3x²", options: ["x³", "x³ + C", "x² + C", "x²"], answer: 1 },
  { question: "Which gas is NOT greenhouse gas?", options: ["CO₂", "CH₄", "N₂", "N₂O"], answer: 2 },
  { question: "Standard deviation symbol", options: ["σ", "μ", "π", "δ"], answer: 0 },
  { question: "IPv6 address length", options: ["32 bits", "64 bits", "128 bits", "256 bits"], answer: 2 },
  { question: "Hooke's law relates to", options: ["Elasticity", "Viscosity", "Diffusion", "Radiation"], answer: 0 },
  { question: "Binomial coefficient C(6,2) equals", options: ["12", "15", "20", "30"], answer: 1 }
];

const hardQ = [
  { question: "Evaluate: Σ₁⁵⁰ k", options: ["1125", "1225", "1275", "1325"], answer: 1 },
  { question: "Heisenberg principle relates", options: ["Force & distance", "Position & momentum", "Energy & mass", "Pressure & volume"], answer: 1 },
  { question: "Laplace transform of sin(at)", options: ["a/(s²+a²)", "s/(s²+a²)", "a²/(s²+a²)", "1/(s²+a²)"], answer: 0 },
  { question: "Binding energy per nucleon max for", options: ["Hydrogen", "Iron-56", "Uranium-238", "Helium-4"], answer: 1 },
  { question: "AVL tree balance factor range", options: ["-2 to 2", "-1 to 1", "0 to 1", "1 to 2"], answer: 1 },
  { question: "Rate equation rate=k[A]² describes order", options: ["Zero", "First", "Second", "Third"], answer: 2 },
  { question: "Cauchy-Schwarz inequality", options: ["|a·b| ≤ |a||b|", "|a×b| ≥ |a||b|", "|a+b| ≤ |a|+|b|", "None of these"], answer: 0 },
  { question: "Kepler's third law", options: ["T² ∝ R³", "F=ma", "PV=nRT", "E=mc²"], answer: 0 },
  { question: "Maclaurin series of ln(1+x) to x³", options: ["x - x²/2 + x³/3", "x - x²/2 + x³/6", "x² - x³/2", "None"], answer: 1 },
  { question: "Quantum number 'l' represents", options: ["Spin", "Azimuthal", "Principal", "Magnetic"], answer: 1 },
  { question: "Eigenvalues of [[2,1],[1,2]]", options: ["3,1", "1,1", "4,0", "2,2"], answer: 0 },
  { question: "Critical angle occurs when light travels from", options: ["Denser to rarer", "Rarer to denser", "Vacuum to air", "Glass to diamond"], answer: 0 },
  { question: "Which reaction in Haber process?", options: ["N₂+3H₂→2NH₃", "2H₂O→2H₂+O₂", "2SO₂+O₂→2SO₃", "C+O₂→CO₂"], answer: 0 },
  { question: "Time complexity Dijkstra using binary heap", options: ["O(E log V)", "O(V²)", "O(E+V)", "O(V log V)"], answer: 0 },
  { question: "Radius of curvature of y=x² at (1,1)", options: ["(1+4)^{3/2}/2", "(1+4)^{1/2}/2", "(1+4)^{3/2}/4", "None"], answer: 2 },
  { question: "Half-life of C-14 is 5730y. Fraction left after 11460y", options: ["1/2", "1/4", "1/8", "1/16"], answer: 1 },
  { question: "Number of onto functions from {1,2,3}→{a,b,c}", options: ["6", "27", "3", "15"], answer: 0 },
  { question: "Which phenomenon proves particle nature of light?", options: ["Reflection", "Photoelectric effect", "Diffraction", "Refraction"], answer: 1 },
  { question: "PCR technique amplifies", options: ["Proteins", "DNA", "Lipids", "RNA"], answer: 1 },
  { question: "If sin θ = 1/2, θ in degrees could be", options: ["30°", "45°", "60°", "90°"], answer: 0 },
  { question: "Von Neumann bottleneck refers to", options: ["Memory bandwidth", "CPU heat", "Power", "Cache"], answer: 0 },
  { question: "P vs NP relates to", options: ["Cryptography", "Complexity theory", "Operating systems", "Databases"], answer: 1 },
  { question: "Minimum x²+y² subject to x+y=10", options: ["50", "100", "25", "None"], answer: 0 }
];

const classSelect = document.getElementById('classSelect');
const subjectGroup = document.getElementById('subjectGroup');
const subjectSelect = document.getElementById('subjectSelect');
const streamGroup = document.getElementById('streamGroup');
const streamSelect = document.getElementById('streamSelect');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const startBtn = document.getElementById('startBtn');

const startScreen = document.getElementById('start');
const quizScreen = document.getElementById('quiz');
const resultScreen = document.getElementById('result');

const questionCounter = document.getElementById('questionCounter');
const questionText = document.getElementById('questionText');
const optionsForm = document.getElementById('optionsForm');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');

const scoreRing = document.getElementById('scoreRing');
const incorrectDetails = document.getElementById('incorrectDetails');
const incorrectList = document.getElementById('incorrectList');
const explainBtn = document.getElementById('explainBtn');
const retakeBtn = document.getElementById('retakeBtn');
const returnDashboardQuiz = document.getElementById('returnDashboardQuiz');
const returnDashboardResult = document.getElementById('returnDashboardResult');
const geminiResponse = document.getElementById('geminiResponse');
const resultMeta = document.getElementById('resultMeta');

let selectedClass = '';
let selectedSubject = '';
let selectedStream = '';
let selectedDifficulty = '';

let questions = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectPairs = [];
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateStartState() {
  const classChosen = !!selectedClass;
  const diffChosen = !!selectedDifficulty;
  let extraOk = true;
  if (selectedClass === '9' || selectedClass === '10') {
    extraOk = !!selectedSubject;
  } else if (selectedClass === '11' || selectedClass === '12') {
    extraOk = !!selectedStream;
  }
  startBtn.disabled = !(classChosen && diffChosen && extraOk);
}

function resetDifficultyButtons() {
  difficultyBtns.forEach(btn => btn.classList.remove('active'));
}

function showSubjectStreamFields() {
  selectedSubject = '';
  selectedStream = '';
  subjectSelect.value = '';
  streamSelect.value = '';

  if (selectedClass === '9' || selectedClass === '10') {
    subjectGroup.classList.remove('hidden');
    streamGroup.classList.add('hidden');
  } else if (selectedClass === '11' || selectedClass === '12') {
    streamGroup.classList.remove('hidden');
    subjectGroup.classList.add('hidden');
  } else {
    subjectGroup.classList.add('hidden');
    streamGroup.classList.add('hidden');
  }
  updateStartState();
}

classSelect.addEventListener('change', e => {
  selectedClass = e.target.value;
  showSubjectStreamFields();
});

subjectSelect.addEventListener('change', e => {
  selectedSubject = e.target.value;
  updateStartState();
});

streamSelect.addEventListener('change', e => {
  selectedStream = e.target.value;
  updateStartState();
});

difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    resetDifficultyButtons();
    btn.classList.add('active');
    selectedDifficulty = btn.dataset.difficulty;
    updateStartState();
  });
});

startBtn.addEventListener('click', initQuiz);
nextBtn.addEventListener('click', handleNext);
retakeBtn.addEventListener('click', initQuiz);
returnDashboardQuiz.addEventListener('click', () => {
  if (confirm('Return to dashboard? Progress will be lost.')) location.reload();
});
returnDashboardResult.addEventListener('click', () => location.reload());

explainBtn.addEventListener('click', async () => {
  if (!incorrectPairs.length) return;
  explainBtn.disabled = true;
  explainBtn.textContent = 'Loading...';
  await fetchGemini();
});

function initQuiz() {
  const bank = selectedDifficulty === 'Easy' ? easyQ : selectedDifficulty === 'Medium' ? mediumQ : hardQ;
  questions = shuffle([...bank]);
  const countMap = { Easy: 10, Medium: 20, Hard: 25 };
  questions = questions.slice(0, countMap[selectedDifficulty] || questions.length);

  currentIndex = 0;
  correctCount = 0;
  incorrectPairs = [];

  quizScreen.classList.remove('hidden');
  startScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
  geminiResponse.classList.add('hidden');
  geminiResponse.textContent = '';
  explainBtn.disabled = false;
  explainBtn.textContent = 'Explain with Gemini';

  loadQuestion();
}

function loadQuestion() {
  const qObj = questions[currentIndex];
  questionCounter.textContent = `Question ${currentIndex + 1} / ${questions.length}`;
  questionText.textContent = qObj.question;

  optionsForm.innerHTML = '';
  qObj.options.forEach((opt, idx) => {
    const id = `opt${currentIndex}_${idx}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'option-wrapper';
    wrapper.innerHTML = `
      <input type="radio" name="option" id="${id}" class="option-input" value="${idx}" />
      <label for="${id}" class="option-label">${opt}</label>
    `;
    optionsForm.appendChild(wrapper);
  });

  optionsForm.addEventListener('change', () => {
    nextBtn.disabled = false;
  }, { once: true });

  nextBtn.textContent = currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next';
  nextBtn.disabled = true;
  progressBar.style.width = `${(currentIndex / questions.length) * 100}%`;
}

function handleNext() {
  const chosenRadio = optionsForm.querySelector('input[name="option"]:checked');
  if (!chosenRadio) return; 
  const chosen = Number(chosenRadio.value);
  const qObj = questions[currentIndex];

  if (chosen === qObj.answer) {
    correctCount++;
  } else {
    incorrectPairs.push({ question: qObj.question, chosen: qObj.options[chosen], correct: qObj.options[qObj.answer] });
  }

  currentIndex++;
  if (currentIndex < questions.length) {
    loadQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  progressBar.style.width = '100%';
  scoreRing.textContent = `${correctCount}/${questions.length}`;

  let meta = `Class ${selectedClass} • Difficulty ${selectedDifficulty}`;
  if (selectedClass === '9' || selectedClass === '10') meta = `Class ${selectedClass} • Subject ${selectedSubject} • Difficulty ${selectedDifficulty}`;
  if (selectedClass === '11' || selectedClass === '12') meta = `Class ${selectedClass} • Stream ${selectedStream} • Difficulty ${selectedDifficulty}`;
  resultMeta.textContent = meta;

  if (incorrectPairs.length) {
    incorrectDetails.classList.remove('hidden');
    incorrectList.innerHTML = incorrectPairs.map(p => `
      <div class="incorrect-item">
        <strong>Q:</strong> ${p.question}<br />
        <strong>Your answer:</strong> ${p.chosen}<br />
        <strong>Correct:</strong> ${p.correct}
      </div>
    `).join('');
  } else {
    incorrectDetails.classList.add('hidden');
    incorrectList.innerHTML = '';
  }

  quizScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');
}

const genAI = new GoogleGenAI({ apiKey: 'AIzaSyDlhV81eD2TrHpPevy4RWlcTmFxPGyu6j0' });
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function fetchGemini() {
  try {
    const prompt = `You are an expert tutor. Explain in 120 words or less why each chosen answer is incorrect and why the correct answer is right. Return numbered points. Data: ${JSON.stringify(incorrectPairs)}`;
    const { response } = await model.generateContent(prompt);
    geminiResponse.textContent = response.text();
  } catch (err) {
    alert('Failed to fetch explanation.');
    geminiResponse.textContent = 'Error retrieving explanation.';
  } finally {
    geminiResponse.classList.remove('hidden');
    explainBtn.textContent = 'Done';
  }
}
