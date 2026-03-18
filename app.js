const storageKey = 'calendar-task-tracker::tasks';
const today = new Date();
const todayKey = formatDateKey(today);

const state = {
  currentMonth: new Date(today.getFullYear(), today.getMonth(), 1),
  selectedDate: todayKey,
  tasks: loadTasks(),
};

const monthLabel = document.getElementById('monthLabel');
const selectionLabel = document.getElementById('selectionLabel');
const calendarGrid = document.getElementById('calendarGrid');
const totalTasks = document.getElementById('totalTasks');
const dueToday = document.getElementById('dueToday');
const completedTasks = document.getElementById('completedTasks');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const taskForm = document.getElementById('taskForm');
const taskDate = document.getElementById('taskDate');
const taskTitle = document.getElementById('taskTitle');
const taskPriority = document.getElementById('taskPriority');
const taskNotes = document.getElementById('taskNotes');
const taskListDateLabel = document.getElementById('taskListDateLabel');
const taskTemplate = document.getElementById('taskTemplate');

wireEvents();
render();

function wireEvents() {
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  document.getElementById('todayBtn').addEventListener('click', () => {
    state.selectedDate = todayKey;
    state.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    render();
  });

  document.getElementById('seedBtn').addEventListener('click', () => {
    state.tasks = seedTasks();
    persistTasks();
    render();
  });

  document.getElementById('clearCompletedBtn').addEventListener('click', () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    persistTasks();
    render();
  });

  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = taskTitle.value.trim();
    const date = taskDate.value;
    const notes = taskNotes.value.trim();

    if (!title || !date) return;

    state.tasks.unshift({
      id: crypto.randomUUID(),
      title,
      date,
      notes,
      priority: taskPriority.value,
      completed: false,
      createdAt: new Date().toISOString(),
    });

    state.selectedDate = date;
    state.currentMonth = new Date(`${date}T00:00:00`);
    persistTasks();
    taskForm.reset();
    taskPriority.value = 'medium';
    taskDate.value = state.selectedDate;
    render();
  });
}

function render() {
  taskDate.value = state.selectedDate;
  renderCalendar();
  renderSummary();
  renderTaskList();
}

function renderCalendar() {
  monthLabel.textContent = state.currentMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  selectionLabel.textContent = new Date(`${state.selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const firstDay = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  calendarGrid.innerHTML = '';

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(date);
    const dayTasks = getTasksForDate(dateKey);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    if (date.getMonth() !== state.currentMonth.getMonth()) button.classList.add('is-outside');
    if (dateKey === todayKey) button.classList.add('is-today');
    if (dateKey === state.selectedDate) button.classList.add('is-selected');

    button.innerHTML = `
      <span class="day-number">${date.getDate()}</span>
      <span class="day-preview"></span>
    `;

    const preview = button.querySelector('.day-preview');
    dayTasks.slice(0, 2).forEach((task) => {
      const pill = document.createElement('span');
      pill.className = `preview-pill ${task.priority}`;
      pill.textContent = task.title;
      preview.appendChild(pill);
    });

    if (dayTasks.length > 2) {
      const more = document.createElement('span');
      more.className = 'preview-pill medium';
      more.textContent = `+${dayTasks.length - 2} more`;
      preview.appendChild(more);
    }

    button.addEventListener('click', () => {
      state.selectedDate = dateKey;
      render();
    });

    calendarGrid.appendChild(button);
  }
}

function renderSummary() {
  totalTasks.textContent = String(state.tasks.length);
  dueToday.textContent = String(getTasksForDate(todayKey).filter((task) => !task.completed).length);
  completedTasks.textContent = String(state.tasks.filter((task) => task.completed).length);
}

function renderTaskList() {
  taskList.innerHTML = '';
  const dayTasks = getTasksForDate(state.selectedDate);

  taskListDateLabel.textContent = new Date(`${state.selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  emptyState.hidden = dayTasks.length > 0;

  dayTasks.forEach((task) => {
    const fragment = taskTemplate.content.cloneNode(true);
    const item = fragment.querySelector('.task-card');
    const checkbox = fragment.querySelector('.task-complete');
    const title = fragment.querySelector('.task-title');
    const notes = fragment.querySelector('.task-notes');
    const priority = fragment.querySelector('.priority-pill');
    const deleteButton = fragment.querySelector('.delete-task');

    title.textContent = task.title;
    notes.textContent = task.notes || 'No notes added.';
    priority.textContent = `${capitalize(task.priority)} priority`;
    priority.classList.add(task.priority);
    checkbox.checked = task.completed;

    if (task.completed) item.classList.add('is-complete');

    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      persistTasks();
      render();
    });

    deleteButton.addEventListener('click', () => {
      state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
      persistTasks();
      render();
    });

    taskList.appendChild(fragment);
  });
}

function getTasksForDate(dateKey) {
  return state.tasks
    .filter((task) => task.date === dateKey)
    .sort((left, right) => Number(left.completed) - Number(right.completed) || priorityRank(left.priority) - priorityRank(right.priority));
}

function priorityRank(priority) {
  return { high: 0, medium: 1, low: 2 }[priority] ?? 3;
}

function seedTasks() {
  const base = new Date();
  const seeds = [
    { offset: 0, title: 'Daily stand-up', priority: 'high', notes: 'Share blockers and progress updates.' },
    { offset: 1, title: 'Design review', priority: 'medium', notes: 'Prepare mockups and open questions.' },
    { offset: 2, title: 'Sprint planning', priority: 'high', notes: 'Estimate the backlog for next sprint.' },
    { offset: 4, title: 'Pay invoices', priority: 'low', notes: 'Reconcile finance dashboard before Friday.' },
  ];

  return seeds.map((seed) => {
    const date = new Date(base);
    date.setDate(base.getDate() + seed.offset);
    return {
      id: crypto.randomUUID(),
      title: seed.title,
      date: formatDateKey(date),
      notes: seed.notes,
      priority: seed.priority,
      completed: false,
      createdAt: new Date().toISOString(),
    };
  });
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistTasks() {
  localStorage.setItem(storageKey, JSON.stringify(state.tasks));
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
