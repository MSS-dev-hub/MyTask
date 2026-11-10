const storageKey = "mytask.tasks.v1";
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const dueDateInput = document.querySelector("#task-due-date");
const clearDueDateButton = document.querySelector("#clear-due-date");
const priorityInput = form.elements.namedItem("priority");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-task");
const cancelButton = document.querySelector("#cancel-edit");
const filters = document.querySelector("#filters");
const list = document.querySelector("#task-list");
const empty = document.querySelector("#empty");
const notice = document.querySelector("#notice");
const total = document.querySelector("#total");
const completed = document.querySelector("#completed");
const defaultPriority = "medium";
const priorityLabels = { high: "高", medium: "中", low: "低" };

const emptyMessages = {
  all: "还没有任务。添加一项开始吧。",
  active: "没有未完成的任务。",
  done: "还没有已完成的任务。"
};

let tasks = loadTasks();
let editingTask = null;
let currentFilter = "all";

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = !message;
}

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(saved) || !saved.every(task =>
      task && typeof task.title === "string" && typeof task.done === "boolean"
    )) {
      throw new Error("任务数据格式无效");
    }
    return saved.map(task => ({
      ...task,
      priority: Object.hasOwn(priorityLabels, task.priority) ? task.priority : defaultPriority
    }));
  } catch {
    showNotice("无法读取本地任务，请检查浏览器的存储设置。");
    return [];
  }
}

function saveTasks(nextTasks) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextTasks));
  } catch {
    showNotice("无法保存这次修改，请检查浏览器的存储设置后重试。");
    return false;
  }

  tasks = nextTasks;
  showNotice("");
  return true;
}

function setEditing(task) {
  editingTask = task;
  const isEditing = task !== null;
  formTitle.textContent = isEditing ? "编辑任务" : "添加新任务";
  submitButton.textContent = isEditing ? "保存修改" : "添加任务";
  cancelButton.hidden = !isEditing;
  clearDueDateButton.hidden = !isEditing;
  titleInput.value = task?.title ?? "";
  priorityInput.value = task?.priority ?? defaultPriority;
  dueDateInput.value = task?.dueDate ?? "";
  titleInput.setCustomValidity("");
}

function localDateString(date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function createTaskRow(task, today) {
  const row = document.createElement("li");
  const label = document.createElement("label");
  label.className = "task-label";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  const details = document.createElement("span");
  details.className = "task-details";
  const name = document.createElement("span");
  name.className = "task-name";
  name.textContent = task.title;
  details.append(name);
  if (task.dueDate) {
    const date = document.createElement("time");
    date.className = "task-date";
    date.dateTime = task.dueDate;
    date.textContent = "截止日期：" + task.dueDate;
    if (!task.done && task.dueDate < today) {
      date.classList.add("date-overdue");
      date.textContent += " · 已逾期";
    } else if (!task.done && task.dueDate === today) {
      date.classList.add("date-today");
      date.textContent += " · 今天到期";
    }
    details.append(date);
  }
  label.append(checkbox, details);

  const actions = document.createElement("div");
  actions.className = "actions";

  const priority = document.createElement("span");
  priority.className = "priority priority-" + task.priority;
  priority.textContent = "优先级：" + priorityLabels[task.priority];

  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "编辑";
  edit.setAttribute("aria-label", "编辑任务：" + task.title);
  edit.addEventListener("click", () => {
    setEditing(task);
    titleInput.focus();
    titleInput.select();
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete";
  remove.textContent = "删除";
  remove.setAttribute("aria-label", "删除任务：" + task.title);
  remove.addEventListener("click", () => {
    if (!window.confirm("确定删除这项任务吗？\n" + task.title)) return;
    if (saveTasks(tasks.filter(item => item !== task))) {
      if (editingTask === task) setEditing(null);
      render();
      titleInput.focus();
    }
  });

  checkbox.addEventListener("change", () => {
    const updated = { ...task, done: checkbox.checked };
    const nextTasks = tasks.map(item => item === task ? updated : item);
    if (!saveTasks(nextTasks)) {
      checkbox.checked = task.done;
      return;
    }

    if (editingTask === task) editingTask = updated;
    render();
    const nextCheckbox = list.children[visibleTasks().indexOf(updated)]?.querySelector("input");
    (nextCheckbox ?? filters.querySelector('[aria-pressed="true"]')).focus();
  });

  actions.append(priority, edit, remove);
  row.append(label, actions);
  return row;
}

function visibleTasks() {
  if (currentFilter === "active") return tasks.filter(task => !task.done);
  if (currentFilter === "done") return tasks.filter(task => task.done);
  return tasks;
}

function render() {
  total.textContent = tasks.length;
  completed.textContent = tasks.filter(task => task.done).length;
  const visible = visibleTasks();
  const today = localDateString(new Date());
  list.replaceChildren(...visible.map(task => createTaskRow(task, today)));
  empty.textContent = emptyMessages[currentFilter];
  empty.hidden = visible.length > 0;
}

titleInput.addEventListener("input", () => titleInput.setCustomValidity(""));
clearDueDateButton.addEventListener("click", () => {
  dueDateInput.value = "";
  dueDateInput.focus();
});
titleInput.addEventListener("invalid", () => {
  if (!titleInput.value.trim()) titleInput.setCustomValidity("请输入任务名称。");
});

form.addEventListener("submit", event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.setCustomValidity("请输入任务名称。");
    titleInput.reportValidity();
    return;
  }

  const priority = priorityInput.value;
  const dueDate = dueDateInput.value || undefined;
  const nextTasks = editingTask
    ? tasks.map(task => task === editingTask ? { ...task, title, priority, dueDate } : task)
    : [...tasks, { title, priority, dueDate, done: false }];

  if (saveTasks(nextTasks)) {
    setEditing(null);
    render();
    titleInput.focus();
  }
});

cancelButton.addEventListener("click", () => {
  setEditing(null);
  titleInput.focus();
});

filters.addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  currentFilter = button.dataset.filter;
  for (const option of filters.querySelectorAll("button")) {
    option.setAttribute("aria-pressed", String(option === button));
  }
  render();
});

render();
