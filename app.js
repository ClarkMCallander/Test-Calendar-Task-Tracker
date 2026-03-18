const storageKey = 'orbit-planner::tasks';
const today = startOfDay(new Date());
const todayKey = formatDateKey(today);

const state = {
  currentMonth: new Date(today.getFullYear(), today.getMonth(), 1),
  selectedDate: todayKey,
  tasks: loadTasks(),
  filters: {
    search: '',
    status: 'all',
    priority: 'all',
    category: 'all',
  },
};

const refs = {
  monthLabel: document.getElementById('monthLabel'),
  selectionLabel: document.getElementById('selectionLabel'),
  calendarGrid: document.getElementById('calendarGrid'),
  upcomingTimeline: document.getElementById('upcomingTimeline'),
  totalTasks: document.getElementById('totalTasks'),
  totalTasksMeta: document.getElementById('totalTasksMeta'),
  dueToday: document.getElementById('dueToday'),
  dueTodayMeta: document.getElementById('dueTodayMeta'),
  completionRate: document.getElementById('completionRate'),
  completionRateMeta: document.getElementById('completionRateMeta'),
  focusForecastTitle: document.getElementById('focusForecastTitle'),
  focusForecastMeta: document.getElementById('focusForecastMeta'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  taskForm: document.getElementById('taskForm'),
  taskDate: document.getElementById('taskDate'),
  taskTitle: document.getElementById('taskTitle'),
  taskPriority: document.getElementById('taskPriority'),
  taskCategory: document.getElementById('taskCategory'),
  taskDuration: document.getElementById('taskDuration'),
  taskRecurring: document.getElementById('taskRecurring'),
  taskNotes: document.getElementById('taskNotes'),
  taskListDateLabel: document.getElementById('taskListDateLabel'),
  taskListMeta: document.getElementById('taskListMeta'),
  taskTemplate: document.getElementById('taskTemplate'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  priorityFilter: document.getElementById('priorityFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  editingTaskId: document.getElementById('editingTaskId'),
  formTitle: document.getElementById('formTitle'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  saveTaskBtn: document.getElementById('saveTaskBtn'),
  importInput: document.getElementById('importInput'),
};

wireEvents();
migrateLegacyStorage();
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

  document.getElementById('exportBtn').addEventListener('click', exportTasks);
  refs.importInput.addEventListener('change', importTasks);

  document.getElementById('clearCompletedBtn').addEventListener('click', () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    persistTasks();
    render();
  });

  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    state.filters = { search: '', status: 'all', priority: 'all', category: 'all' };
    syncFiltersToInputs();
    renderTaskList();
    renderCalendar();
  });

  refs.cancelEditBtn.addEventListener('click', resetForm);

  refs.searchInput.addEventListener('input', (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    renderTaskList();
    renderCalendar();
  });

  refs.statusFilter.addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderTaskList();
    renderCalendar();
  });

  refs.priorityFilter.addEventListener('change', (event) => {
    state.filters.priority = event.target.value;
    renderTaskList();
    renderCalendar();
  });

  refs.categoryFilter.addEventListener('change', (event) => {
    state.filters.category = event.target.value;
    renderTaskList();
    renderCalendar();
  });

  refs.taskForm.addEventListener('submit', handleTaskSubmit);
}

function render() {
  refs.taskDate.value = state.selectedDate;
  syncFiltersToInputs();
  populateCategoryOptions();
  renderCalendar();
  renderSummary();
  renderUpcomingTimeline();
  renderTaskList();
}

function renderCalendar() {
  refs.monthLabel.textContent = state.currentMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  refs.selectionLabel.textContent = formatLongDate(state.selectedDate);

  const firstDay = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  refs.calendarGrid.innerHTML = '';

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(date);
    const dayTasks = getVisibleTasksForDate(dateKey);
    const openTasks = dayTasks.filter((task) => !task.completed);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    if (date.getMonth() !== state.currentMonth.getMonth()) button.classList.add('is-outside');
    if (dateKey === todayKey) button.classList.add('is-today');
    if (dateKey === state.selectedDate) button.classList.add('is-selected');
    if (openTasks.length >= 4) button.classList.add('is-busy');

    button.innerHTML = `
      <span class="day-topline">
        <span class="day-number">${date.getDate()}</span>
        <span class="day-count">${openTasks.length ? `${openTasks.length} open` : ''}</span>
      </span>
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
      more.className = 'preview-pill neutral';
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
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const todayOpen = getTasksForDate(todayKey).filter((task) => !task.completed).length;
  const focusForecast = buildFocusForecast();

  refs.totalTasks.textContent = String(total);
  refs.totalTasksMeta.textContent = `${countUniqueCategories()} categories in rotation`;
  refs.dueToday.textContent = String(todayOpen);
  refs.dueTodayMeta.textContent = todayOpen ? 'Active tasks still due today' : 'Today is clear';
  refs.completionRate.textContent = `${total ? Math.round((completed / total) * 100) : 0}%`;
  refs.completionRateMeta.textContent = `${completed} of ${total} tasks completed`;
  refs.focusForecastTitle.textContent = focusForecast.title;
  refs.focusForecastMeta.textContent = focusForecast.meta;
}

function renderUpcomingTimeline() {
  refs.upcomingTimeline.innerHTML = '';
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const dateKey = formatDateKey(date);
    const tasks = getTasksForDate(dateKey);
    const open = tasks.filter((task) => !task.completed).length;
    const minutes = tasks.reduce((sum, task) => sum + (task.completed ? 0 : task.duration), 0);

    const card = document.createElement('article');
    card.className = 'timeline-card';
    if (dateKey === state.selectedDate) card.classList.add('is-selected');
    card.innerHTML = `
      <button type="button" class="timeline-button">
        <span class="timeline-day">${date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
        <strong>${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>
        <span>${open} open • ${minutes} min</span>
      </button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      state.selectedDate = dateKey;
      state.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      render();
    });
    refs.upcomingTimeline.appendChild(card);
  }
}

function renderTaskList() {
  refs.taskList.innerHTML = '';
  const selectedTasks = getVisibleTasksForDate(state.selectedDate);
  const totalMinutes = selectedTasks.reduce((sum, task) => sum + task.duration, 0);

  refs.taskListDateLabel.textContent = new Date(`${state.selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  refs.taskListMeta.textContent = `${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} • ${totalMinutes} focus minutes`;
  refs.emptyState.hidden = selectedTasks.length > 0;

  selectedTasks.forEach((task) => {
    const fragment = refs.taskTemplate.content.cloneNode(true);
    const item = fragment.querySelector('.task-card');
    const checkbox = fragment.querySelector('.task-complete');
    const title = fragment.querySelector('.task-title');
    const notes = fragment.querySelector('.task-notes');
    const details = fragment.querySelector('.task-details');
    const priority = fragment.querySelector('.priority-pill');
    const category = fragment.querySelector('.task-category');
    const editButton = fragment.querySelector('.edit-task');
    const deleteButton = fragment.querySelector('.delete-task');

    title.textContent = task.title;
    notes.textContent = task.notes || 'No notes added.';
    details.textContent = `${task.duration} min focus • ${task.recurring ? 'Repeats weekly' : 'One-time task'}`;
    priority.textContent = `${capitalize(task.priority)} priority`;
    priority.classList.add(task.priority);
    category.textContent = task.category || 'General';
    checkbox.checked = task.completed;

    if (task.completed) item.classList.add('is-complete');

    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      persistTasks();
      render();
    });

    editButton.addEventListener('click', () => populateFormForEdit(task));
    deleteButton.addEventListener('click', () => {
      state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
      persistTasks();
      render();
      resetForm();
    });

    refs.taskList.appendChild(fragment);
  });
}

function handleTaskSubmit(event) {
  event.preventDefault();
  const taskPayload = readTaskForm();
  if (!taskPayload.title || !taskPayload.date) return;

  const editingId = refs.editingTaskId.value;
  if (editingId) {
    const existing = state.tasks.find((task) => task.id === editingId);
    if (existing) {
      Object.assign(existing, taskPayload);
    }
  } else if (taskPayload.recurring) {
    const recurringTasks = buildRecurringTasks(taskPayload);
    state.tasks.unshift(...recurringTasks);
  } else {
    state.tasks.unshift({
      id: crypto.randomUUID(),
      ...taskPayload,
      createdAt: new Date().toISOString(),
    });
  }

  state.selectedDate = taskPayload.date;
  state.currentMonth = new Date(`${taskPayload.date}T00:00:00`);
  persistTasks();
  resetForm();
  render();
}

function readTaskForm() {
  return {
    title: refs.taskTitle.value.trim(),
    date: refs.taskDate.value,
    notes: refs.taskNotes.value.trim(),
    priority: refs.taskPriority.value,
    category: refs.taskCategory.value.trim(),
    duration: sanitizeDuration(refs.taskDuration.value),
    recurring: refs.taskRecurring.checked,
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

function buildRecurringTasks(taskPayload) {
  const start = new Date(`${taskPayload.date}T00:00:00`);
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index * 7);
    return {
      id: crypto.randomUUID(),
      ...taskPayload,
      date: formatDateKey(date),
      createdAt: new Date().toISOString(),
    };
  });
}

function populateFormForEdit(task) {
  refs.editingTaskId.value = task.id;
  refs.formTitle.textContent = 'Edit task';
  refs.saveTaskBtn.textContent = 'Update task';
  refs.cancelEditBtn.classList.remove('hidden');
  refs.taskTitle.value = task.title;
  refs.taskDate.value = task.date;
  refs.taskPriority.value = task.priority;
  refs.taskCategory.value = task.category || '';
  refs.taskDuration.value = task.duration;
  refs.taskRecurring.checked = Boolean(task.recurring);
  refs.taskNotes.value = task.notes || '';
  refs.taskTitle.focus();
}

function resetForm() {
  refs.taskForm.reset();
  refs.editingTaskId.value = '';
  refs.formTitle.textContent = 'Add task';
  refs.saveTaskBtn.textContent = 'Save task';
  refs.cancelEditBtn.classList.add('hidden');
  refs.taskPriority.value = 'medium';
  refs.taskDuration.value = '30';
  refs.taskDate.value = state.selectedDate;
}

function getVisibleTasksForDate(dateKey) {
  return getTasksForDate(dateKey).filter(matchesFilters);
}

function getTasksForDate(dateKey) {
  return state.tasks
    .filter((task) => task.date === dateKey)
    .sort((left, right) => {
      return Number(left.completed) - Number(right.completed)
        || priorityRank(left.priority) - priorityRank(right.priority)
        || left.duration - right.duration
        || left.title.localeCompare(right.title);
    });
}

function matchesFilters(task) {
  const haystack = `${task.title} ${task.notes} ${task.category}`.toLowerCase();
  const matchesSearch = !state.filters.search || haystack.includes(state.filters.search);
  const matchesStatus = state.filters.status === 'all'
    || (state.filters.status === 'open' && !task.completed)
    || (state.filters.status === 'completed' && task.completed);
  const matchesPriority = state.filters.priority === 'all' || task.priority === state.filters.priority;
  const normalizedCategory = (task.category || 'General').toLowerCase();
  const matchesCategory = state.filters.category === 'all' || normalizedCategory === state.filters.category;

  return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
}

function buildFocusForecast() {
  const nextSeven = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const dateKey = formatDateKey(date);
    const tasks = getTasksForDate(dateKey).filter((task) => !task.completed);
    const minutes = tasks.reduce((sum, task) => sum + task.duration, 0);
    nextSeven.push({ date, dateKey, tasks, minutes });
  }

  if (!state.tasks.length) {
    return { title: 'No tasks yet', meta: 'Load sample data or add a task to generate a recommendation.' };
  }

  const bestDay = [...nextSeven].sort((left, right) => left.minutes - right.minutes || left.tasks.length - right.tasks.length)[0];
  if (!bestDay) {
    return { title: 'No forecast available', meta: 'Add tasks in the next 7 days to compute a suggestion.' };
  }

  const title = bestDay.minutes === 0
    ? `Best deep-work slot: ${bestDay.date.toLocaleDateString(undefined, { weekday: 'long' })}`
    : `Lightest day: ${bestDay.date.toLocaleDateString(undefined, { weekday: 'long' })}`;
  const meta = `${bestDay.tasks.length} open task${bestDay.tasks.length === 1 ? '' : 's'} • ${bestDay.minutes} scheduled focus minutes`;
  return { title, meta };
}

function populateCategoryOptions() {
  const categories = Array.from(new Set(state.tasks.map((task) => (task.category || 'General').trim()).filter(Boolean))).sort();
  const currentValue = state.filters.category;
  refs.categoryFilter.innerHTML = '<option value="all">All categories</option>';
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.toLowerCase();
    option.textContent = category;
    refs.categoryFilter.appendChild(option);
  });
  refs.categoryFilter.value = categories.some((category) => category.toLowerCase() === currentValue) ? currentValue : 'all';
  state.filters.category = refs.categoryFilter.value;
}

function syncFiltersToInputs() {
  refs.searchInput.value = state.filters.search;
  refs.statusFilter.value = state.filters.status;
  refs.priorityFilter.value = state.filters.priority;
}

function countUniqueCategories() {
  return new Set(state.tasks.map((task) => (task.category || 'General').trim().toLowerCase())).size;
}

function exportTasks() {
  const payload = {
    exportedAt: new Date().toISOString(),
    tasks: state.tasks,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orbit-planner-export-${todayKey}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importTasks(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const importedTasks = Array.isArray(parsed) ? parsed : parsed.tasks;
    if (!Array.isArray(importedTasks)) throw new Error('Invalid file format');
    state.tasks = importedTasks.map(normalizeTaskRecord);
    persistTasks();
    render();
    resetForm();
  } catch (error) {
    window.alert(`Unable to import tasks: ${error.message}`);
  } finally {
    event.target.value = '';
  }
}

function seedTasks() {
  const base = new Date(today);
  const seeds = [
    { offset: 0, title: 'Launch prep review', priority: 'high', notes: 'Finalize the release checklist and owners.', category: 'Work', duration: 60 },
    { offset: 1, title: 'Gym session', priority: 'medium', notes: 'Strength and mobility circuit.', category: 'Health', duration: 45 },
    { offset: 2, title: 'Write product brief', priority: 'high', notes: 'Draft v2 goals and risks.', category: 'Work', duration: 90 },
    { offset: 3, title: 'Call parents', priority: 'low', notes: 'Catch up and plan weekend dinner.', category: 'Personal', duration: 30 },
    { offset: 5, title: 'Budget review', priority: 'medium', notes: 'Check subscriptions and monthly savings.', category: 'Finance', duration: 40 },
  ];

  return seeds.map((seed) => {
    const date = new Date(base);
    date.setDate(base.getDate() + seed.offset);
    return normalizeTaskRecord({
      id: crypto.randomUUID(),
      ...seed,
      recurring: false,
      completed: false,
      date: formatDateKey(date),
      createdAt: new Date().toISOString(),
    });
  });
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeTaskRecord) : [];
  } catch {
    return [];
  }
}

function migrateLegacyStorage() {
  const legacyKey = 'calendar-task-tracker::tasks';
  if (state.tasks.length || !localStorage.getItem(legacyKey)) return;
  try {
    const legacyTasks = JSON.parse(localStorage.getItem(legacyKey) || '[]');
    if (Array.isArray(legacyTasks)) {
      state.tasks = legacyTasks.map(normalizeTaskRecord);
      persistTasks();
    }
  } catch {
    // ignore malformed legacy storage
  }
}

function normalizeTaskRecord(task) {
  return {
    id: task.id || crypto.randomUUID(),
    title: String(task.title || 'Untitled task').trim(),
    date: task.date || todayKey,
    notes: String(task.notes || '').trim(),
    priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
    category: String(task.category || 'General').trim(),
    duration: sanitizeDuration(task.duration),
    recurring: Boolean(task.recurring),
    completed: Boolean(task.completed),
    createdAt: task.createdAt || new Date().toISOString(),
  };
}

function persistTasks() {
  localStorage.setItem(storageKey, JSON.stringify(state.tasks));
}

function sanitizeDuration(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric < 0) return 30;
  return Math.min(480, Math.round(numeric));
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

function priorityRank(priority) {
  return { high: 0, medium: 1, low: 2 }[priority] ?? 3;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
