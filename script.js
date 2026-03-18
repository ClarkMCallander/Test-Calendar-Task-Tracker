const STORAGE_KEY = "calendar-task-tracker";

const monthLabel = document.getElementById("month-label");
const calendarGrid = document.getElementById("calendar-grid");
const selectedDateLabel = document.getElementById("selected-date-label");
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const taskFilter = document.getElementById("task-filter");
const taskTemplate = document.getElementById("task-item-template");
const statTotal = document.getElementById("stat-total");
const statOpen = document.getElementById("stat-open");
const statDone = document.getElementById("stat-done");

const today = new Date();
const appState = {
  viewDate: new Date(today.getFullYear(), today.getMonth(), 1),
  selectedDate: isoDate(today),
  tasks: loadTasks(),
};

function isoDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    .toISOString()
    .slice(0, 10);
}

function formatLongDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.tasks));
}

function render() {
  renderCalendar();
  renderTasks();
  renderStats();
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const year = appState.viewDate.getFullYear();
  const month = appState.viewDate.getMonth();
  monthLabel.textContent = appState.viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysToRender = 42;
  const startOffset = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startOffset);

  for (let index = 0; index < daysToRender; index += 1) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + index);
    const currentIso = isoDate(current);
    const isCurrentMonth = current.getMonth() === month;
    const isSelected = currentIso === appState.selectedDate;
    const isToday = currentIso === isoDate(today);
    const tasksForDay = getTasksForDate(currentIso);

    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar-day${isCurrentMonth ? "" : " muted"}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`;
    button.setAttribute("role", "gridcell");
    button.innerHTML = `
      <strong>${current.getDate()}</strong>
      <span class="day-task-count">${tasksForDay.length} ${tasksForDay.length === 1 ? "task" : "tasks"}</span>
      <div class="day-dots">${tasksForDay
        .slice(0, 4)
        .map((task) => `<span class="priority-${task.priority}" title="${task.title}"></span>`)
        .join("")}</div>
    `;

    button.addEventListener("click", () => {
      appState.selectedDate = currentIso;
      appState.viewDate = new Date(current.getFullYear(), current.getMonth(), 1);
      render();
    });

    calendarGrid.appendChild(button);
  }

  if (lastDay.getDay() === 6 && lastDay.getDate() === 31) {
    calendarGrid.dataset.fullWeeks = "true";
  }
}

function getTasksForDate(date) {
  return appState.tasks.filter((task) => task.date === date);
}

function renderTasks() {
  selectedDateLabel.textContent = formatLongDate(appState.selectedDate);
  taskList.innerHTML = "";
  const visibleTasks = getTasksForDate(appState.selectedDate).filter((task) => {
    if (taskFilter.value === "open") return !task.done;
    if (taskFilter.value === "done") return task.done;
    return true;
  });

  if (!visibleTasks.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No tasks for this date yet. Add one above to get started.";
    taskList.appendChild(empty);
    return;
  }

  visibleTasks
    .sort((left, right) => Number(left.done) - Number(right.done))
    .forEach((task) => {
      const fragment = taskTemplate.content.cloneNode(true);
      const item = fragment.querySelector(".task-item");
      const toggle = fragment.querySelector(".task-toggle");
      const title = fragment.querySelector(".task-title");
      const notes = fragment.querySelector(".task-notes");
      const badge = fragment.querySelector(".priority-badge");
      const deleteButton = fragment.querySelector(".delete-button");

      item.dataset.id = task.id;
      item.classList.toggle("done", task.done);
      toggle.checked = task.done;
      title.textContent = task.title;
      notes.textContent = task.notes || "No additional notes.";
      badge.textContent = task.priority;
      badge.classList.add(`priority-${task.priority}`);

      toggle.addEventListener("change", () => toggleTask(task.id));
      deleteButton.addEventListener("click", () => deleteTask(task.id));

      taskList.appendChild(fragment);
    });
}

function renderStats() {
  const total = appState.tasks.length;
  const done = appState.tasks.filter((task) => task.done).length;
  statTotal.textContent = String(total);
  statDone.textContent = String(done);
  statOpen.textContent = String(total - done);
}

function addTask(event) {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const title = String(formData.get("title") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const priority = String(formData.get("priority") || "medium");

  if (!title) return;

  appState.tasks.push({
    id: crypto.randomUUID(),
    title,
    notes,
    priority,
    date: appState.selectedDate,
    done: false,
  });

  saveTasks();
  taskForm.reset();
  document.getElementById("task-priority").value = "medium";
  render();
}

function toggleTask(taskId) {
  appState.tasks = appState.tasks.map((task) =>
    task.id === taskId ? { ...task, done: !task.done } : task,
  );
  saveTasks();
  render();
}

function deleteTask(taskId) {
  appState.tasks = appState.tasks.filter((task) => task.id !== taskId);
  saveTasks();
  render();
}

document.getElementById("prev-month").addEventListener("click", () => {
  appState.viewDate = new Date(appState.viewDate.getFullYear(), appState.viewDate.getMonth() - 1, 1);
  render();
});

document.getElementById("next-month").addEventListener("click", () => {
  appState.viewDate = new Date(appState.viewDate.getFullYear(), appState.viewDate.getMonth() + 1, 1);
  render();
});

document.getElementById("today-button").addEventListener("click", () => {
  appState.selectedDate = isoDate(today);
  appState.viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
  render();
});

taskFilter.addEventListener("change", renderTasks);
taskForm.addEventListener("submit", addTask);

render();
