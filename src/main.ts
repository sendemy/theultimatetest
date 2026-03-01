import "./styles.css";
import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";

type QuizOption = {
  text: string;
};

type QuizQuestion = {
  text: string;
  options: QuizOption[];
  correctIndex: number;
};

type QuizPayload = {
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt?: unknown;
};

const appRoot = must<HTMLDivElement>("#app");

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

const params = new URLSearchParams(window.location.search);
const quizId = params.get("quiz");

if (quizId) {
  renderQuizMode();
} else {
  renderBuilderMode();
}

function createFirebase() {
  if (!hasFirebaseConfig) {
    throw new Error(
      "Firebase env vars missing. Set VITE_FIREBASE_* values in .env.local."
    );
  }

  const app = initializeApp(firebaseConfig);
  return getFirestore(app);
}

function renderBuilderMode() {
  appRoot.innerHTML = `
    <section class="card">
      <h1>Quiz Builder</h1>
      <p class="subtitle">Create a quiz, save to Firebase Firestore and share by link.</p>

      <div id="status" class="status"></div>

      <label class="label" for="quiz-title">Quiz title</label>
      <input id="quiz-title" class="input" placeholder="Например: Тест на Ксению" />

      <label class="label" for="quiz-description">Description</label>
      <textarea id="quiz-description" class="textarea" rows="2" placeholder="Короткое описание теста"></textarea>

      <div id="questions" class="questions"></div>

      <div class="row">
        <button id="add-question" class="btn btn-secondary" type="button">+ Add question</button>
        <button id="save-quiz" class="btn btn-primary" type="button">Save quiz</button>
      </div>

      <div id="share-wrap" class="share-wrap hidden">
        <p class="share-title">Share link</p>
        <input id="share-link" class="input" readonly />
        <button id="copy-link" class="btn btn-secondary" type="button">Copy link</button>
      </div>
    </section>
  `;

  const questionsEl = must<HTMLDivElement>("#questions");
  const addQuestionBtn = must<HTMLButtonElement>("#add-question");
  const saveQuizBtn = must<HTMLButtonElement>("#save-quiz");
  const statusEl = must<HTMLDivElement>("#status");

  addQuestionCard(questionsEl);

  addQuestionBtn.addEventListener("click", () => {
    addQuestionCard(questionsEl);
  });

  saveQuizBtn.addEventListener("click", async () => {
    status(statusEl, "Saving...", "info");

    try {
      const payload = collectBuilderData();
      const db = createFirebase();
      const docRef = await addDoc(collection(db, "quizzes"), {
        ...payload,
        createdAt: serverTimestamp(),
      });

      const link = buildShareLink(docRef.id);
      showShareLink(link);
      status(statusEl, "Quiz saved successfully.", "success");
    } catch (error) {
      status(statusEl, getErrorMessage(error), "error");
    }
  });
}

function renderQuizMode() {
  appRoot.innerHTML = `
    <section class="card">
      <div id="status" class="status"></div>
      <div id="quiz-view" class="hidden"></div>
    </section>
  `;

  const statusEl = must<HTMLDivElement>("#status");
  const quizViewEl = must<HTMLDivElement>("#quiz-view");

  void loadQuiz(statusEl, quizViewEl);
}

async function loadQuiz(statusEl: HTMLDivElement, quizViewEl: HTMLDivElement) {
  status(statusEl, "Loading quiz...", "info");

  try {
    const db = createFirebase();
    const quizRef = doc(db, "quizzes", quizId as string);
    const quizSnap = await getDoc(quizRef);

    if (!quizSnap.exists()) {
      status(statusEl, "Quiz not found.", "error");
      return;
    }

    const data = quizSnap.data() as QuizPayload;
    const validationError = validateQuizPayload(data);
    if (validationError) {
      status(statusEl, validationError, "error");
      return;
    }

    statusEl.textContent = "";
    quizViewEl.classList.remove("hidden");
    renderPlayableQuiz(quizViewEl, data);
  } catch (error) {
    status(statusEl, getErrorMessage(error), "error");
  }
}

function renderPlayableQuiz(root: HTMLDivElement, quiz: QuizPayload) {
  let currentIndex = 0;
  let score = 0;
  const answers: number[] = new Array(quiz.questions.length).fill(-1);

  root.innerHTML = `
    <h1>${escapeHtml(quiz.title)}</h1>
    <p class="subtitle">${escapeHtml(quiz.description)}</p>
    <div id="quiz-body"></div>
  `;

  const quizBody = must<HTMLDivElement>("#quiz-body");
  drawQuestion();

  function drawQuestion() {
    const question = quiz.questions[currentIndex];
    const selected = answers[currentIndex];

    quizBody.innerHTML = `
      <p class="progress">Question ${currentIndex + 1} / ${quiz.questions.length}</p>
      <h2 class="question">${escapeHtml(question.text)}</h2>
      <div class="answers" id="answers"></div>
      <div class="row">
        <button id="next" class="btn btn-primary" type="button" ${selected < 0 ? "disabled" : ""}>
          ${currentIndex === quiz.questions.length - 1 ? "Show result" : "Next"}
        </button>
      </div>
    `;

    const answersEl = must<HTMLDivElement>("#answers");
    question.options.forEach((option, idx) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `answer ${selected === idx ? "selected" : ""}`;
      button.textContent = option.text;
      button.addEventListener("click", () => {
        answers[currentIndex] = idx;
        drawQuestion();
      });
      answersEl.appendChild(button);
    });

    must<HTMLButtonElement>("#next").addEventListener("click", () => {
      if (currentIndex < quiz.questions.length - 1) {
        currentIndex += 1;
        drawQuestion();
        return;
      }

      score = quiz.questions.reduce((acc, q, idx) => {
        return acc + (answers[idx] === q.correctIndex ? 1 : 0);
      }, 0);

      drawResult();
    });
  }

  function drawResult() {
    const detailsHtml = quiz.questions
      .map((question, idx) => {
        const userIdx = answers[idx];
        const correct = userIdx === question.correctIndex;
        const userText =
          userIdx >= 0 ? question.options[userIdx]?.text ?? "No answer" : "No answer";
        const correctText = question.options[question.correctIndex]?.text ?? "-";

        return `
          <div class="result-item ${correct ? "correct" : "wrong"}">
            <p class="result-item-title">${escapeHtml(question.text)}</p>
            <p class="result-line">Your answer: ${escapeHtml(userText)}</p>
            <p class="result-line">Correct answer: ${escapeHtml(correctText)}</p>
          </div>
        `;
      })
      .join("");

    quizBody.innerHTML = `
      <h2>Result</h2>
      <p class="score">Score: ${score} / ${quiz.questions.length}</p>
      <div class="result-details">${detailsHtml}</div>
      <a class="btn btn-secondary link-btn" href="${window.location.pathname}">Create your own quiz</a>
    `;
  }
}

function addQuestionCard(container: HTMLDivElement) {
  const index = container.children.length + 1;
  const card = document.createElement("article");
  card.className = "question-card";
  card.innerHTML = `
    <div class="question-top">
      <h3>Question ${index}</h3>
      <button type="button" class="btn btn-danger remove-btn">Remove</button>
    </div>
    <label class="label">Question text</label>
    <input class="input question-text" placeholder="Введите вопрос" />

    <label class="label">Option A</label>
    <input class="input option-text" placeholder="Вариант A" />

    <label class="label">Option B</label>
    <input class="input option-text" placeholder="Вариант B" />

    <label class="label">Option C</label>
    <input class="input option-text" placeholder="Вариант C" />

    <label class="label">Option D</label>
    <input class="input option-text" placeholder="Вариант D" />

    <label class="label">Correct answer</label>
    <select class="input correct-select">
      <option value="0">A</option>
      <option value="1">B</option>
      <option value="2">C</option>
      <option value="3">D</option>
    </select>
  `;

  const removeBtn = card.querySelector<HTMLButtonElement>(".remove-btn");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      card.remove();
      renumberQuestions(container);
    });
  }

  container.appendChild(card);
}

function renumberQuestions(container: HTMLDivElement) {
  Array.from(container.children).forEach((el, idx) => {
    const h3 = el.querySelector("h3");
    if (h3) {
      h3.textContent = `Question ${idx + 1}`;
    }
  });
}

function collectBuilderData(): QuizPayload {
  const title = must<HTMLInputElement>("#quiz-title").value.trim();
  const description = must<HTMLTextAreaElement>("#quiz-description").value.trim();
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".question-card"));

  if (!title) {
    throw new Error("Quiz title is required.");
  }

  if (cards.length === 0) {
    throw new Error("Add at least one question.");
  }

  const questions = cards.map((card, idx) => {
    const text =
      card.querySelector<HTMLInputElement>(".question-text")?.value.trim() ?? "";
    const optionInputs = Array.from(
      card.querySelectorAll<HTMLInputElement>(".option-text")
    );
    const options = optionInputs.map((input) => ({ text: input.value.trim() }));
    const correctIndex = Number(
      card.querySelector<HTMLSelectElement>(".correct-select")?.value ?? "-1"
    );

    if (!text) {
      throw new Error(`Question ${idx + 1}: text is required.`);
    }

    if (options.some((opt) => !opt.text)) {
      throw new Error(`Question ${idx + 1}: all options are required.`);
    }

    if (correctIndex < 0 || correctIndex >= options.length) {
      throw new Error(`Question ${idx + 1}: choose correct answer.`);
    }

    return { text, options, correctIndex };
  });

  return { title, description, questions };
}

function validateQuizPayload(payload: QuizPayload): string | null {
  if (!payload.title || !Array.isArray(payload.questions) || payload.questions.length === 0) {
    return "Quiz data is invalid.";
  }

  for (const question of payload.questions) {
    if (!question.text || !Array.isArray(question.options) || question.options.length < 2) {
      return "Quiz question structure is invalid.";
    }

    if (
      typeof question.correctIndex !== "number" ||
      question.correctIndex < 0 ||
      question.correctIndex >= question.options.length
    ) {
      return "Quiz correct answer index is invalid.";
    }
  }

  return null;
}

function showShareLink(link: string) {
  const shareWrap = must<HTMLDivElement>("#share-wrap");
  const shareInput = must<HTMLInputElement>("#share-link");
  const copyBtn = must<HTMLButtonElement>("#copy-link");

  shareInput.value = link;
  shareWrap.classList.remove("hidden");

  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(link);
    copyBtn.textContent = "Copied";
    window.setTimeout(() => {
      copyBtn.textContent = "Copy link";
    }, 1200);
  };
}

function buildShareLink(id: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("quiz", id);
  return url.toString();
}

function status(el: HTMLDivElement, text: string, kind: "info" | "success" | "error") {
  el.textContent = text;
  el.className = `status ${kind}`;
}

function must<T extends Element>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) {
    throw new Error(`Required element missing: ${selector}`);
  }
  return el as T;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
