# Test-Calendar-Task-Tracker

Orbit Planner is a richer browser-based calendar and task tracking app built with plain HTML, CSS, and JavaScript.

## Features

- Month-view calendar with selected day highlighting, open-task counts, and task previews.
- Add, edit, delete, and complete tasks with title, date, priority, category, notes, and focus-minute estimates.
- Weekly recurring task creation for the next four weeks.
- Search plus status / priority / category filters that also affect the calendar preview.
- Upcoming 7-day workload timeline for quick navigation.
- **Focus Forecast**, a unique planning feature that recommends the lightest day in the next week for deep work.
- Import/export JSON support for backing up or moving your plan.
- Local storage persistence, plus migration support from the previous storage key.
- Sample data loader for quick demos.

## Run locally

Because this is a static app, you can open `index.html` directly in your browser, or serve the folder with a simple static server.

### Python

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
