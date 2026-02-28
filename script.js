const questions = [
	{
		text: '1. Ваше имя',
		options: [
			{ key: 'a', text: 'а) Ксения' },
			{ key: 'b', text: 'б) Гад' },
			{ key: 'c', text: 'в) Минён с единорошко.' },
			{ key: 'd', text: 'г) Другое' },
		],
		correct: 'b',
	},
	{
		text: '2. Что вы делаете в ВУЗе',
		options: [
			{ key: 'a', text: 'а) смотрим трупаков' },
			{ key: 'b', text: 'б) нууу там нормально короч ты не борзей тоже больно' },
			{ key: 'c', text: 'в) Учимся, и так далее :)' },
			{ key: 'd', text: 'г) Брэкинг бэд чертов' },
		],
		correct: 'a',
	},
	{
		text: '3. Ваша любимая игра',
		options: [
			{ key: 'a', text: 'а) клеш' },
			{ key: 'b', text: 'б) бравл' },
			{ key: 'c', text: 'в) майнкраф' },
			{ key: 'd', text: 'г) куки ран' },
		],
		correct: 'b',
	},
	{
		text: '4. Ваша любимая песня',
		options: [
			{ key: 'a', text: 'а) талант вот такои пацан' },
			{ key: 'b', text: 'б) серебро любое' },
			{ key: 'c', text: 'в) Dj алексей болконский' },
			{ key: 'd', text: 'г) сам знаешь' },
		],
		correct: 'a',
	},
	{
		text: '5. последний вопрос: как вам этот тест',
		options: [
			{ key: 'a', text: 'а) хорошо' },
			{ key: 'b', text: 'б) хорошоооо' },
			{ key: 'c', text: 'в) такое себе не буду врать' },
			{ key: 'd', text: 'г) Сдезь прикольно ;p' },
		],
		correct: 'c',
	},
];

const STORAGE_KEY = 'isCompleted';

const screenMenu = document.getElementById('screen-menu');
const screenTest = document.getElementById('screen-test');
const screenResult = document.getElementById('screen-result');

const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');

const progressEl = document.getElementById('progress');
const progressFill = document.getElementById('progress-fill');
const questionText = document.getElementById('question-text');
const answersEl = document.getElementById('answers');
const scoreText = document.getElementById('score-text');
const resultMessage = document.getElementById('result-message');
const resultDetails = document.getElementById('result-details');
const completionNote = document.getElementById('completion-note');

let currentIndex = 0;
let selectedKey = null;
let score = 0;
let userAnswers = [];

function showScreen(screen) {
	[screenMenu, screenTest, screenResult].forEach((el) => {
		el.classList.remove('active');
	});
	screen.classList.add('active');
}

function isCompleted() {
	return localStorage.getItem(STORAGE_KEY) === 'true';
}

function updateMenuState() {
	if (isCompleted()) {
		startBtn.disabled = true;
		startBtn.textContent = 'Тест уже пройден';
		completionNote.textContent = 'Чтобы пройти тест повторно, обратитесь к так называемому администратору сайта.';
		completionNote.classList.add('visible');
	} else {
		startBtn.disabled = false;
		startBtn.textContent = 'Начать тест';
		completionNote.textContent = '';
		completionNote.classList.remove('visible');
	}
}

function resetState() {
	currentIndex = 0;
	selectedKey = null;
	score = 0;
	userAnswers = [];
	nextBtn.disabled = true;
	resultDetails.innerHTML = '';
}

function renderQuestion() {
	const current = questions[currentIndex];
	const currentNumber = currentIndex + 1;
	const total = questions.length;

	progressEl.textContent = `Вопрос ${currentNumber} / ${total}`;
	progressFill.style.width = `${(currentNumber / total) * 100}%`;
	questionText.textContent = current.text;
	answersEl.innerHTML = '';
	selectedKey = null;
	nextBtn.disabled = true;
	nextBtn.textContent = currentIndex === total - 1 ? 'Показать результат' : 'Далее';

	current.options.forEach((option) => {
		const button = document.createElement('button');
		button.className = 'answer';
		button.type = 'button';
		button.textContent = option.text;
		button.dataset.key = option.key;

		button.addEventListener('click', () => {
			selectedKey = option.key;
			nextBtn.disabled = false;

			document.querySelectorAll('.answer').forEach((el) => {
				el.classList.remove('selected');
			});
			button.classList.add('selected');
		});

		answersEl.appendChild(button);
	});
}

function getResultMessage(result) {
	if (result === 5) {
		return 'Воу. Ахереть. Вы реально Ксения.';
	}
	if (result >= 3) {
		return 'Неплохо и/или норм. Сойдет крч.';
	}
	return 'Вы не Ксения. Вы проиграли и тд.';
}

function getOptionText(question, key) {
	const found = question.options.find((opt) => opt.key === key);
	return found ? found.text : 'Нет ответа';
}

function renderResultDetails() {
	resultDetails.innerHTML = '';

	questions.forEach((question, index) => {
		const userKey = userAnswers[index];
		const isCorrect = userKey === question.correct;

		const item = document.createElement('div');
		item.className = `result-item ${isCorrect ? 'correct' : 'wrong'}`;

		const title = document.createElement('p');
		title.className = 'result-item-title';
		title.textContent = question.text;

		const chosen = document.createElement('p');
		chosen.className = 'result-line';
		chosen.textContent = `Ваш ответ: ${getOptionText(question, userKey)}`;

		const correct = document.createElement('p');
		correct.className = 'result-line';
		correct.textContent = `Правильный ответ: ${getOptionText(question, question.correct)}`;

		item.append(title, chosen, correct);
		resultDetails.appendChild(item);
	});
}

function showResult() {
	scoreText.textContent = `Ваш счет: ${score} из ${questions.length}`;
	resultMessage.textContent = getResultMessage(score);
	renderResultDetails();
	showScreen(screenResult);
}

function submitCurrentAnswer() {
	const current = questions[currentIndex];
	userAnswers[currentIndex] = selectedKey;

	if (selectedKey === current.correct) {
		score += 1;
	}

	if (currentIndex < questions.length - 1) {
		currentIndex += 1;
		renderQuestion();
	} else {
		localStorage.setItem(STORAGE_KEY, 'true');
		updateMenuState();
		showResult();
	}
}

startBtn.addEventListener('click', () => {
	if (isCompleted()) {
		updateMenuState();
		return;
	}

	resetState();
	showScreen(screenTest);
	renderQuestion();
});

nextBtn.addEventListener('click', submitCurrentAnswer);

restartBtn.addEventListener('click', () => {
	showScreen(screenMenu);
	updateMenuState();
});

updateMenuState();
