const storageKey = "mytask.tasks.v1";
const languageKey = "mytask.language";
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const dueDateInput = document.querySelector("#task-due-date");
const clearDueDateButton = document.querySelector("#clear-due-date");
const priorityInput = form.elements.namedItem("priority");
const sourceInput = document.querySelector("#source-language");
const languageButtons = document.querySelectorAll("[data-language]");
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
const messages = {
  zh: {
    language: "界面语言", eyebrow: "个人工作台", pageTitle: "我的任务",
    intro: "把要做的事记下来，一件一件完成。", stats: "任务统计",
    total: "任务总数", done: "已完成", active: "未完成", all: "全部",
    addTitle: "添加新任务", add: "添加任务", editTitle: "编辑任务",
    save: "保存修改", cancel: "取消编辑", taskName: "任务名称",
    placeholder: "请输入任务名称…", required: "请输入任务名称。",
    priority: "优先级", high: "高", medium: "中", low: "低",
    dueDate: "截止日期", clearDate: "清除日期", overdue: "已逾期", dueToday: "今天到期",
    sourceLanguage: "原文语言", detect: "自动识别",
    list: "任务列表", filters: "筛选任务", edit: "编辑", remove: "删除",
    removeTask: "删除任务", confirmDelete: "确定删除这项任务吗？",
    emptyAll: "还没有任务。添加一项开始吧。",
    emptyActive: "没有未完成的任务。", emptyDone: "还没有已完成的任务。",
    readError: "无法读取本地任务，请检查浏览器的存储设置。",
    saveError: "无法保存这次修改，请检查浏览器的存储设置后重试。",
    languageError: "无法保存语言偏好，下次打开可能恢复为中文。",
    translationUnavailable: "自动翻译尚未配置，正在显示原文。",
    translationError: "翻译失败，正在显示原文。"
  },
  en: {
    language: "Interface language", eyebrow: "Personal workspace", pageTitle: "My Tasks",
    intro: "Write down what needs doing and tackle one task at a time.", stats: "Task statistics",
    total: "Total tasks", done: "Completed", active: "Incomplete", all: "All",
    addTitle: "Add a new task", add: "Add task", editTitle: "Edit task",
    save: "Save changes", cancel: "Cancel editing", taskName: "Task name",
    placeholder: "Enter a task name…", required: "Enter a task name.",
    priority: "Priority", high: "High", medium: "Medium", low: "Low",
    dueDate: "Due date", clearDate: "Clear date", overdue: "Overdue", dueToday: "Due today",
    sourceLanguage: "Original language", detect: "Detect automatically",
    list: "Task list", filters: "Filter tasks", edit: "Edit", remove: "Delete",
    removeTask: "Delete task", confirmDelete: "Delete this task?",
    emptyAll: "No tasks yet. Add one to get started.",
    emptyActive: "No incomplete tasks.", emptyDone: "No completed tasks yet.",
    readError: "Could not read local tasks. Check your browser storage settings.",
    saveError: "Could not save this change. Check your browser storage settings and try again.",
    languageError: "Could not save your language preference. The app may reopen in Chinese.",
    translationUnavailable: "Automatic translation is not configured. Showing the original.",
    translationError: "Translation failed. Showing the original."
  }
};

const emptyKeys = { all: "emptyAll", active: "emptyActive", done: "emptyDone" };
const pendingTranslations = new WeakMap();
let language = "zh";
try {
  if (localStorage.getItem(languageKey) === "en") language = "en";
} catch {
  // Chinese remains available when preferences cannot be read.
}
let noticeKey = "";
let storedTasks;
let tasks = loadTasks();
let editingTask = null;
let currentFilter = "all";

function t(key) {
  return messages[language][key];
}

function showNotice(key) {
  noticeKey = key;
  notice.textContent = key ? t(key) : "";
  notice.hidden = !key;
}

function detectLanguage(text) {
  return /\p{Script=Han}/u.test(text) ? "zh" : "en";
}

function renderFormLabels() {
  formTitle.textContent = t(editingTask ? "editTitle" : "addTitle");
  submitButton.textContent = t(editingTask ? "save" : "add");
}

function renderLanguage() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = t("pageTitle");
  for (const element of document.querySelectorAll("[data-text]")) {
    element.textContent = t(element.dataset.text);
  }
  for (const element of document.querySelectorAll("[data-label]")) {
    element.setAttribute("aria-label", t(element.dataset.label));
  }
  for (const button of languageButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  }
  titleInput.placeholder = t("placeholder");
  if (titleInput.validity.customError) titleInput.setCustomValidity(t("required"));
  renderFormLabels();
  showNotice(noticeKey);
  render();
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(storageKey);
    const saved = JSON.parse(raw ?? "[]");
    if (!Array.isArray(saved) || !saved.every(task =>
      task && typeof task.title === "string" && typeof task.done === "boolean"
    )) {
      throw new Error("任务数据格式无效");
    }
    storedTasks = raw;
    return saved.map(task => ({
      ...task,
      priority: ["high", "medium", "low"].includes(task.priority) ? task.priority : defaultPriority,
      sourceLanguage: ["zh", "en"].includes(task.sourceLanguage) ? task.sourceLanguage : detectLanguage(task.title),
      translations: { zh: task.translations?.zh, en: task.translations?.en }
    }));
  } catch {
    showNotice("readError");
    return [];
  }
}

function saveTasks(nextTasks) {
  try {
    if (storedTasks === undefined) throw new Error();
    const serialized = JSON.stringify(nextTasks);
    localStorage.setItem(storageKey, serialized);
    storedTasks = serialized;
  } catch {
    showNotice("saveError");
    return false;
  }

  tasks = nextTasks;
  showNotice("");
  return true;
}

function setEditing(task) {
  editingTask = task;
  const isEditing = task !== null;
  renderFormLabels();
  cancelButton.hidden = !isEditing;
  clearDueDateButton.hidden = !isEditing;
  titleInput.value = task?.title ?? "";
  priorityInput.value = task?.priority ?? defaultPriority;
  sourceInput.value = task?.sourceLanguage ?? "";
  dueDateInput.value = task?.dueDate ?? "";
  titleInput.setCustomValidity("");
}

async function translateTaskText(text, sourceLanguage, targetLanguage) {
  // Replace this body with a call to a translation service when configured.
  return null;
}

function requestTranslation(task, targetLanguage) {
  const cache = task.translations;
  // With two supported languages, each original has only one target language.
  if (!pendingTranslations.has(cache)) {
    const request = translateTaskText(task.title, task.sourceLanguage, targetLanguage)
      .then(result => {
        if (result === null) return null;
        if (typeof result !== "string" || !result.trim()) throw new Error();
        if (tasks.some(item => item.translations === cache)) {
          cache[targetLanguage] = result;
          try {
            if (localStorage.getItem(storageKey) === storedTasks) {
              const serialized = JSON.stringify(tasks);
              localStorage.setItem(storageKey, serialized);
              storedTasks = serialized;
            }
          } catch {
            // Keep the translation in memory if storage is unavailable.
          }
        }
        return result;
      })
      .finally(() => pendingTranslations.delete(cache));
    pendingTranslations.set(cache, request);
  }
  return pendingTranslations.get(cache);
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
  const targetLanguage = language;
  const cached = task.translations[targetLanguage];
  const needsTranslation = targetLanguage !== task.sourceLanguage;
  name.textContent = needsTranslation && typeof cached === "string" && cached.trim() ? cached : task.title;
  name.lang = name.textContent === task.title ? task.sourceLanguage : targetLanguage;
  details.append(name);
  if (task.dueDate) {
    const date = document.createElement("time");
    date.className = "task-date";
    date.dateTime = task.dueDate;
    date.textContent = t("dueDate") + ": " + task.dueDate;
    if (!task.done && task.dueDate < today) {
      date.classList.add("date-overdue");
      date.textContent += " · " + t("overdue");
    } else if (!task.done && task.dueDate === today) {
      date.classList.add("date-today");
      date.textContent += " · " + t("dueToday");
    }
    details.append(date);
  }
  label.append(checkbox, details);

  const actions = document.createElement("div");
  actions.className = "actions";

  const priority = document.createElement("span");
  priority.className = "priority priority-" + task.priority;
  priority.textContent = t("priority") + ": " + t(task.priority);

  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = t("edit");
  edit.addEventListener("click", () => {
    setEditing(task);
    titleInput.focus();
    titleInput.select();
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete";
  remove.textContent = t("remove");
  function labelActions() {
    edit.setAttribute("aria-label", t("editTitle") + ": " + name.textContent);
    remove.setAttribute("aria-label", t("removeTask") + ": " + name.textContent);
  }
  labelActions();
  if (needsTranslation && !(typeof cached === "string" && cached.trim())) {
    const note = document.createElement("span");
    note.className = "translation-note";
    note.setAttribute("role", "status");
    details.append(note);
    requestTranslation(task, targetLanguage).then(result => {
      if (!row.isConnected || language !== targetLanguage) return;
      if (result === null) {
        note.textContent = t("translationUnavailable");
      } else {
        name.textContent = result;
        name.lang = targetLanguage;
        labelActions();
      }
    }).catch(() => {
      if (row.isConnected && language === targetLanguage) note.textContent = t("translationError");
    });
  }
  remove.addEventListener("click", () => {
    if (!window.confirm(t("confirmDelete") + "\n" + name.textContent)) return;
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
  empty.textContent = t(emptyKeys[currentFilter]);
  empty.hidden = visible.length > 0;
}

titleInput.addEventListener("input", () => titleInput.setCustomValidity(""));
clearDueDateButton.addEventListener("click", () => {
  dueDateInput.value = "";
  dueDateInput.focus();
});
titleInput.addEventListener("invalid", () => {
  if (!titleInput.value.trim()) titleInput.setCustomValidity(t("required"));
});

form.addEventListener("submit", event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.setCustomValidity(t("required"));
    titleInput.reportValidity();
    return;
  }

  const priority = priorityInput.value;
  const dueDate = dueDateInput.value || undefined;
  const sourceLanguage = sourceInput.value || detectLanguage(title);
  const translations = title === editingTask?.title && sourceLanguage === editingTask.sourceLanguage
    ? editingTask.translations
    : {};
  const fields = { title, priority, dueDate, sourceLanguage, translations };
  const nextTasks = editingTask
    ? tasks.map(task => task === editingTask ? { ...task, ...fields } : task)
    : [...tasks, { ...fields, done: false }];

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

for (const button of languageButtons) {
  button.addEventListener("click", () => {
    language = button.dataset.language;
    try {
      localStorage.setItem(languageKey, language);
      if (noticeKey === "languageError") showNotice("");
    } catch {
      showNotice("languageError");
    }
    renderLanguage();
  });
}

renderLanguage();
