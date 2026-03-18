const storageKey = 'momentum-planner::tasks';
const today = startOfDay(new Date());
const todayKey = formatDateKey(today);

const state = {
  currentMonth: new Date(today.getFullYear(), today.getMonth(), 1),
  selectedDate: todayKey,
  tasks: loadTasks(),
  filters: {
    search: '',
    category: 'all',
    status: 'all',
  },
};

const refs = {
  monthLabel: document.getElementById('monthLabel'),
  selectionLabel: document.getElementById('selectionLabel'),
  calendarGrid: document.getElementById('calendarGrid'),
  totalTasks: document.getElementById('totalTasks'),
  dueToday: document.getElementById('dueToday'),
  completionRate: document.getElementById('completionRate'),
  currentStreak: document.getElementById('currentStreak'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  taskForm: document.getElementById('taskForm'),
  taskTitle: document.getElementById('taskTitle'),
  taskDate: document.getElementById('taskDate'),
  taskTime: document.getElementById('taskTime'),
  taskPriority: document.getElementById('taskPriority'),
  taskCategory: document.getElementById('taskCategory'),
  taskDuration: document.getElementById('taskDuration'),
  taskNotes: document.getElementById('taskNotes'),
  taskListDateLabel: document.getElementById('taskListDateLabel'),
  taskTemplate: document.getElementById('taskTemplate'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  statusFilter: document.getElementById('statusFilter'),
  focusHeadline: document.getElementById('focusHeadline'),
  focusNarrative: document.getElementById('focusNarrative'),
  energyStrip: document.getElementById('energyStrip'),
};

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
    state.tasks = createSeedTasks();
    persistTasks();
    render();
  });

  document.getElementById('clearCompletedBtn').addEventListener('click', () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    persistTasks();
    render();
  });

  document.getElementById('focusModeBtn').addEventListener('click', renderFocusForecast);

  refs.searchInput.addEventListener('input', (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    renderTaskList();
  });

  refs.categoryFilter.addEventListener('change', (event) => {
    state.filters.category = event.target.value;
    renderTaskList();
  });

  refs.statusFilter.addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderTaskList();
  });

  refs.taskForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = refs.taskTitle.value.trim();
    const date = refs.taskDate.value;
    if (!title || !date) return;

    const task = {
      id: crypto.randomUUID(),
      title,
      date,
      time: refs.taskTime.value,
      priority: refs.taskPriority.value,
      category: refs.taskCategory.value,
      duration: Number(refs.taskDuration.value),
      notes: refs.taskNotes.value.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    state.tasks.unshift(task);
    state.selectedDate = date;
    state.currentMonth = new Date(`${date}T00:00:00`);
    persistTasks();

    refs.taskForm.reset();
    refs.taskPriority.value = 'medium';
    refs.taskCategory.value = 'work';
    refs.taskDuration.value = '30';
    refs.taskDate.value = state.selectedDate;
    render();
  });
}

function render() {
  refs.taskDate.value = state.selectedDate;
  renderCalendar();
  renderSummary();
  renderTaskList();
  renderFocusForecast();
}

function renderCalendar() {
  refs.monthLabel.textContent = state.currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  refs.selectionLabel.textContent = formatLongDate(state.selectedDate);
  refs.calendarGrid.innerHTML = '';

  const firstDay = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(date);
    const dayTasks = getTasksForDate(dateKey);
    const totalLoad = dayTasks.reduce((sum, task) => sum + task.duration, 0);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    if (date.getMonth() !== state.currentMonth.getMonth()) button.classList.add('is-outside');
    if (dateKey === state.selectedDate) button.classList.add('is-selected');
    if (dateKey === todayKey) button.classList.add('is-today');
    if (hasOverdueTasks(dayTasks, dateKey)) button.classList.add('has-overdue');

    button.innerHTML = `
      <span class="day-topline">
        <span class="day-number">${date.getDate()}</span>
        <span class="day-load">${formatMinutes(totalLoad)}</span>
      </span>
      <span class="day-preview"></span>
    `;

    const preview = button.querySelector('.day-preview');
    const loadBadge = document.createElement('span');
    const loadLevel = classifyLoad(totalLoad);
    loadBadge.className = `load-pill ${loadLevel}`;
    loadBadge.textContent = `${capitalize(loadLevel)} load`;
    preview.appendChild(loadBadge);

    dayTasks.slice(0, 2).forEach((task) => {
      const pill = document.createElement('span');
      pill.className = `preview-pill ${task.priority}`;
      pill.textContent = `${task.time ? `${task.time} · ` : ''}${task.title}`;
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

    refs.calendarGrid.appendChild(button);
  }
}

function renderSummary() {
  const completedCount = state.tasks.filter((task) => task.completed).length;
  const completionRate = state.tasks.length ? Math.round((completedCount / state.tasks.length) * 100) : 0;

  refs.totalTasks.textContent = String(state.tasks.length);
  refs.dueToday.textContent = String(getTasksForDate(todayKey).filter((task) => !task.completed).length);
  refs.completionRate.textContent = `${completionRate}%`;
  refs.currentStreak.textContent = `${calculateStreak()} days`;
}

function renderTaskList() {
  refs.taskList.innerHTML = '';
  refs.taskListDateLabel.textContent = new Date(`${state.selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const dayTasks = applyFilters(getTasksForDate(state.selectedDate));
  refs.emptyState.hidden = dayTasks.length > 0;

  dayTasks.forEach((task) => {
    const fragment = refs.taskTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.task-card');
    const checkbox = fragment.querySelector('.task-complete');
    const title = fragment.querySelector('.task-title');
    const notes = fragment.querySelector('.task-notes');
    const priority = fragment.querySelector('.priority-pill');
    const category = fragment.querySelector('.category-pill');
    const time = fragment.querySelector('.task-time');
    const deleteButton = fragment.querySelector('.delete-task');

    title.textContent = task.title;
    notes.textContent = task.notes || 'No notes added.';
    priority.textContent = `${capitalize(task.priority)} priority`;
    priority.classList.add(task.priority);
    category.textContent = capitalize(task.category);
    category.classList.add(task.category);
    time.textContent = formatTaskTiming(task);
    checkbox.checked = task.completed;

    if (task.completed) card.classList.add('is-complete');

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

    refs.taskList.appendChild(fragment);
  });
}

function renderFocusForecast() {
  const forecast = buildForecast();
  refs.energyStrip.innerHTML = '';

  if (!forecast.length) {
    refs.focusHeadline.textContent = 'Add a few tasks to unlock your seven-day focus forecast.';
    refs.focusNarrative.textContent = 'Momentum Planner evaluates workload, urgency, and completion patterns to recommend where to concentrate next.';
    return;
  }

  const bestDay = [...forecast].sort((left, right) => left.score - right.score)[0];
  const intenseDay = [...forecast].sort((left, right) => right.score - left.score)[0];

  refs.focusHeadline.textContent = `Best focus window: ${bestDay.label} · ${bestDay.loadLabel}`;
  refs.focusNarrative.textContent = `Aim for deep work on ${bestDay.label} when your workload is ${bestDay.loadLabel.toLowerCase()}. Protect energy on ${intenseDay.label}, which currently looks like your busiest day.`;

  forecast.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'energy-day';
    card.innerHTML = `
      <span>${entry.weekday}</span>
      <strong>${entry.label}</strong>
      <span>${entry.taskCount} tasks · ${formatMinutes(entry.minutes)}</span>
      <span class="load-pill ${entry.loadLevel}">${entry.loadLabel}</span>
    `;
    refs.energyStrip.appendChild(card);
  });
}

function getTasksForDate(dateKey) {
  return state.tasks
    .filter((task) => task.date === dateKey)
    .sort((left, right) => compareTasks(left, right));
}

function compareTasks(left, right) {
  return Number(left.completed) - Number(right.completed)
    || priorityRank(left.priority) - priorityRank(right.priority)
    || compareTimes(left.time, right.time)
    || left.title.localeCompare(right.title);
}

function applyFilters(tasks) {
  return tasks.filter((task) => {
    const matchesSearch = !state.filters.search
      || `${task.title} ${task.notes}`.toLowerCase().includes(state.filters.search);
    const matchesCategory = state.filters.category === 'all' || task.category === state.filters.category;
    const matchesStatus = state.filters.status === 'all'
      || (state.filters.status === 'open' && !task.completed)
      || (state.filters.status === 'done' && task.completed);

    return matchesSearch && matchesCategory && matchesStatus;
  });
}

function buildForecast() {
  const days = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const key = formatDateKey(date);
    const tasks = getTasksForDate(key);
    const minutes = tasks.filter((task) => !task.completed).reduce((sum, task) => sum + task.duration, 0);
    const urgentBoost = tasks.filter((task) => task.priority === 'high' && !task.completed).length * 25;
    const score = minutes + urgentBoost;
    const loadLevel = classifyLoad(minutes);

    days.push({
      weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      taskCount: tasks.length,
      minutes,
      score,
      loadLevel,
      loadLabel: `${capitalize(loadLevel)} load`,
    });
  }

  return days;
}

function calculateStreak() {
  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const key = formatDateKey(cursor);
    const tasks = getTasksForDate(key);
    if (!tasks.length || tasks.some((task) => !task.completed)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function createSeedTasks() {
  const blueprint = [
    { offset: 0, time: '09:00', title: 'Daily stand-up', priority: 'high', category: 'work', duration: 30, notes: 'Flag blockers and align sprint goals.' },
    { offset: 0, time: '18:00', title: 'Mobility workout', priority: 'medium', category: 'health', duration: 45, notes: 'Lower back and shoulder routine.' },
    { offset: 1, time: '10:30', title: 'Prototype review', priority: 'high', category: 'work', duration: 60, notes: 'Converge on release candidate feedback.' },
    { offset: 2, time: '07:30', title: 'Read design systems article', priority: 'low', category: 'learning', duration: 30, notes: 'Capture three ideas to reuse.' },
    { offset: 3, time: '19:00', title: 'Family dinner plan', priority: 'medium', category: 'personal', duration: 30, notes: 'Book table and confirm timing.' },
    { offset: 5, time: '11:00', title: 'Deep work block', priority: 'high', category: 'work', duration: 120, notes: 'Ship the hardest unfinished task.' },
  ];

  return blueprint.map((seed) => {
    const date = new Date(today);
    date.setDate(today.getDate() + seed.offset);
    return {
      id: crypto.randomUUID(),
      title: seed.title,
      date: formatDateKey(date),
      time: seed.time,
      priority: seed.priority,
      category: seed.category,
      duration: seed.duration,
      notes: seed.notes,
      completed: false,
      createdAt: new Date().toISOString(),
    };
  });
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTask) : [];
  } catch {
    return [];
  }
}

function persistTasks() {
  localStorage.setItem(storageKey, JSON.stringify(state.tasks));
}

function normalizeTask(task) {
  return {
    id: task.id ?? crypto.randomUUID(),
    title: task.title ?? 'Untitled task',
    date: task.date ?? todayKey,
    time: task.time ?? '',
    priority: task.priority ?? 'medium',
    category: task.category ?? 'work',
    duration: Number(task.duration ?? 30),
    notes: task.notes ?? '',
    completed: Boolean(task.completed),
    createdAt: task.createdAt ?? new Date().toISOString(),
  };
}

function hasOverdueTasks(tasks, dateKey) {
  return dateKey < todayKey && tasks.some((task) => !task.completed);
}

function classifyLoad(minutes) {
  if (minutes >= 180) return 'intense';
  if (minutes >= 60) return 'steady';
  return 'calm';
}

function formatTaskTiming(task) {
  const bits = [];
  if (task.time) bits.push(task.time);
  bits.push(formatMinutes(task.duration));
  return bits.join(' · ');
}

function formatMinutes(minutes) {
  if (!minutes) return '0 min';
  if (minutes % 60 === 0) return `${minutes / 60} hr`;
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes} min`;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatLongDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function compareTimes(left, right) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right);
}

function priorityRank(priority) {
  return { high: 0, medium: 1, low: 2 }[priority] ?? 3;
}

function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
