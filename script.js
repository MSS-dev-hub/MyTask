const storageKey = "mytask.tasks.v1";
const languageKey = "mytask.language";
const backupVersion = 1;
const maxBackupBytes = 5 * 1024 * 1024;
const exportButton = document.querySelector("#export-tasks");
const importButton = document.querySelector("#import-tasks");
const backupFile = document.querySelector("#backup-file");
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
const priorities = ["high", "medium", "low"];
const sourceLanguages = ["zh", "en"];
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
    exportTasks: "导出任务", importTasks: "导入任务",
    exportSuccess: "已开始下载任务备份。",
    exportError: "无法导出任务备份，请检查浏览器存储后重试。",
    importSuccess: "任务导入成功。",
    importConfirm: count => "将恢复 " + count + " 条任务，并替换当前全部任务。确定继续吗？",
    fileTooLarge: "备份文件不能超过 5 MiB。",
    fileReadError: "无法读取所选文件，请重新选择。",
    invalidJson: "文件不是有效的 JSON。",
    invalidBackup: "备份格式不正确。请选择 MyTask 备份或旧版任务数组。",
    unsupportedVersion: "此备份版本暂不支持。",
    invalidTask: (row, field) => "第 " + row + " 条任务的字段无效：" + field + "。",
    duplicateId: "备份中有重复的任务 ID。",
    storageChanged: "另一个页面已修改本地任务。请刷新后重试。",
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
    exportTasks: "Export Tasks", importTasks: "Import Tasks",
    exportSuccess: "The backup download has started.",
    exportError: "Could not export tasks. Check browser storage and try again.",
    importSuccess: "Tasks imported successfully.",
    importConfirm: count => "Restore " + count + " task(s)? This will replace all current tasks.",
    fileTooLarge: "The backup file must be 5 MiB or smaller.",
    fileReadError: "Could not read the selected file. Please select it again.",
    invalidJson: "The file is not valid JSON.",
    invalidBackup: "Invalid backup format. Select a MyTask backup or a legacy task array.",
    unsupportedVersion: "This backup version is not supported.",
    invalidTask: (row, field) => "Invalid field in task " + row + ": " + field + ".",
    duplicateId: "The backup contains duplicate task IDs.",
    storageChanged: "Local tasks were changed in another page. Reload and try again.",
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
let noticeArgs = [];
let storedTasks;
let tasks = loadTasks();
let editingTask = null;
let currentFilter = "all";

function t(key, ...args) {
  const message = messages[language][key];
  return typeof message === "function" ? message(...args) : message;
}

function showNotice(key, ...args) {
  noticeKey = key;
  noticeArgs = args;
  notice.textContent = key ? t(key, ...args) : "";
  notice.hidden = !key;
  notice.dataset.success = String(key === "exportSuccess" || key === "importSuccess");
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
  showNotice(noticeKey, ...noticeArgs);
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
    return normalizeTasks(saved);
  } catch {
    showNotice("readError");
    return [];
  }
}

function validTaskId(id) {
  return (typeof id === "string" && id.trim() === id && id.length > 0) || Number.isSafeInteger(id);
}

function normalizeTasks(saved) {
  const reservedIds = new Set(saved.filter(task => validTaskId(task.id)).map(task => String(task.id)));
  const usedIds = new Set();
  let nextLegacyId = 1;
  return saved.map(task => {
    let id = task.id;
    if (!validTaskId(id) || usedIds.has(String(id))) {
      do {
        id = "legacy-" + nextLegacyId++;
      } while (reservedIds.has(id));
    }
    usedIds.add(String(id));
    return {
      ...task,
      id,
      priority: priorities.includes(task.priority) ? task.priority : defaultPriority,
      sourceLanguage: sourceLanguages.includes(task.sourceLanguage) ? task.sourceLanguage : detectLanguage(task.title),
      translations: { ...task.translations }
    };
  });
}

function newTaskId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function saveTasks(nextTasks) {
  try {
    if (storedTasks === undefined) throw new Error();
    if (localStorage.getItem(storageKey) !== storedTasks) {
      showNotice("storageChanged");
      return false;
    }
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

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validDueDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) {
    return false;
  }
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function invalidTaskField(task, legacy) {
  if (!isRecord(task)) return "task";
  if ((!legacy || Object.hasOwn(task, "id")) && !validTaskId(task.id)) return "id";
  if (typeof task.title !== "string" || !task.title.trim()) return "title";
  if (typeof task.done !== "boolean") return "done";
  if ((!legacy || Object.hasOwn(task, "priority")) && !priorities.includes(task.priority)) return "priority";
  if (task.dueDate !== undefined && task.dueDate !== null && task.dueDate !== "" && !validDueDate(task.dueDate)) {
    return "dueDate";
  }
  if (Object.hasOwn(task, "sourceLanguage") && !sourceLanguages.includes(task.sourceLanguage)) {
    return "sourceLanguage";
  }
  if (Object.hasOwn(task, "translations") &&
      (!isRecord(task.translations) || !Object.values(task.translations).every(value => typeof value === "string"))) {
    return "translations";
  }
  return "";
}

function validateBackup(data) {
  const legacy = Array.isArray(data);
  if (!legacy) {
    if (!isRecord(data) || !Object.hasOwn(data, "version")) return { error: "invalidBackup" };
    if (data.version !== backupVersion) return { error: "unsupportedVersion" };
    if (!Array.isArray(data.tasks) || typeof data.exportedAt !== "string" ||
        !Number.isFinite(Date.parse(data.exportedAt))) return { error: "invalidBackup" };
  }
  const records = legacy ? data : data.tasks;
  const ids = new Set();
  for (const [index, task] of records.entries()) {
    const field = invalidTaskField(task, legacy);
    if (field) return { error: "invalidTask", args: [index + 1, field] };
    if (task.id === undefined) continue;
    const id = String(task.id);
    if (ids.has(id)) return { error: "duplicateId" };
    ids.add(id);
  }
  return { records: normalizeTasks(records) };
}

function exportTasks() {
  try {
    if (storedTasks === undefined) throw new Error();
    if (localStorage.getItem(storageKey) !== storedTasks) {
      showNotice("storageChanged");
      return;
    }
    const now = new Date();
    const json = JSON.stringify({ version: backupVersion, exportedAt: now.toISOString(), tasks });
    const file = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(file);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = "MyTask-backup-" + localDateString(now) + ".json";
      document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    showNotice("exportSuccess");
  } catch {
    showNotice("exportError");
  }
}

async function importTasks(file) {
  if (file.size > maxBackupBytes) {
    showNotice("fileTooLarge");
    return;
  }
  let text;
  try {
    text = await file.text();
  } catch {
    showNotice("fileReadError");
    return;
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    showNotice("invalidJson");
    return;
  }
  const result = validateBackup(data);
  if (result.error) {
    showNotice(result.error, ...(result.args ?? []));
    return;
  }
  if (!window.confirm(t("importConfirm", result.records.length))) return;
  if (saveTasks(result.records)) {
    setEditing(null);
    currentFilter = "all";
    for (const button of filters.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.filter === currentFilter));
    }
    render();
    showNotice("importSuccess");
  }
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
  const rows = document.createDocumentFragment();
  for (const task of visible) rows.append(createTaskRow(task, today));
  list.replaceChildren(rows);
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
    : [...tasks, { id: newTaskId(), ...fields, done: false }];

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

exportButton.addEventListener("click", exportTasks);
importButton.addEventListener("click", () => backupFile.click());
backupFile.addEventListener("change", async () => {
  const file = backupFile.files[0];
  backupFile.value = "";
  if (!file) return;
  importButton.disabled = true;
  try {
    await importTasks(file);
  } finally {
    importButton.disabled = false;
  }
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
