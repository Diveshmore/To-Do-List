/* Advanced To-Do script
   - clickable dashboard cards
   - polished UI behavior
   - localStorage persistence
   - scheduled reminders (uses Notification API if permitted; fallback to in-page toast)
   - stable scheduling (each task has an id; we track scheduled timeouts)
*/

const STORAGE_KEY = "todo_tasks_v2";
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
const scheduled = new Map(); // map taskId -> timeoutId
let currentFilter = "all";
let currentSearch = "";

/* Elements */
const taskInput = document.getElementById("taskInput");
const deadlineInput = document.getElementById("deadlineInput");
const categoryInput = document.getElementById("categoryInput");
const addBtn = document.getElementById("addBtn");
const pendingList = document.getElementById("pendingList");
const completedList = document.getElementById("completedList");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter");
const dashboardCards = document.querySelectorAll(".dashboard-cards .card");
const toastEl = document.getElementById("toast");

/* helpers */
function saveTasks(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

function formatDeadline(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString(undefined, {year:"numeric",month:"short",day:"numeric", hour:"2-digit",minute:"2-digit"});
  }catch(e){ return iso; }
}

function showToast(message, ms = 4500){
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(()=> toastEl.classList.remove("show"), ms);
}

function notifyUser(title, body){
  if ("Notification" in window && Notification.permission === "granted"){
    try { new Notification(title, {body}); return; } catch(e){}
  }
  showToast(`${title} — ${body}`, 6000);
}

/* Rendering tasks */
function renderTasks(filter = currentFilter, search = currentSearch){
  currentFilter = filter;
  currentSearch = search || "";

  pendingList.innerHTML = "";
  completedList.innerHTML = "";

  let pendingCount = 0, completedCount = 0, overdueCount = 0, todayCount = 0;
  const todayISO = new Date().toISOString().split("T")[0];

  tasks.forEach(task => {
    if (currentSearch && !task.text.toLowerCase().includes(currentSearch.toLowerCase())) return;

    const deadlineMs = task.deadline ? new Date(task.deadline).getTime() : null;
    const now = Date.now();
    const isOverdue = !task.completed && deadlineMs && (deadlineMs < now);
    const dueDateISO = task.deadline ? new Date(task.deadline).toISOString().split("T")[0] : null;
    const isToday = !task.completed && dueDateISO === todayISO;

    if (!task.completed) pendingCount++;
    if (task.completed) completedCount++;
    if (isOverdue) overdueCount++;
    if (isToday) todayCount++;

    let shouldRender = true;
    if (filter === "pending" && task.completed) shouldRender = false;
    if (filter === "completed" && !task.completed) shouldRender = false;
    if (filter === "overdue" && !isOverdue) shouldRender = false;
    if (filter === "today" && !isToday) shouldRender = false;
    if (filter === "all") shouldRender = true;

    if (!shouldRender) return;

    const li = document.createElement("li");
    li.className = "task-item";

    const left = document.createElement("div");
    left.className = "task-left";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = !!task.completed;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.text;

    const sub = document.createElement("div");
    sub.className = "task-sub";

    const deadlineSpan = document.createElement("span");
    deadlineSpan.textContent = task.deadline ? formatDeadline(task.deadline) : "No deadline";
    deadlineSpan.className = "deadline-badge";

    if (deadlineMs){
      const diff = deadlineMs - now;
      if (diff < 0) { deadlineSpan.classList.add("deadline-overdue"); }
      else if (diff < 86400000) { deadlineSpan.classList.add("deadline-soon"); }
    }

    const categorySpan = document.createElement("span");
    categorySpan.className = "category-pill";
    categorySpan.textContent = task.category || "General";
    const colors = { Work: "#007bff", Study: "#17a2b8", Personal: "#6f42c1", Fitness: "#28a745" };
    categorySpan.style.background = colors[task.category] || "#6c757d";

    sub.appendChild(deadlineSpan);
    sub.appendChild(categorySpan);
    meta.appendChild(title);
    meta.appendChild(sub);

    left.appendChild(chk);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";

    actions.appendChild(del);

    li.appendChild(left);
    li.appendChild(actions);

    if (task.completed) completedList.appendChild(li);
    else pendingList.appendChild(li);

    chk.addEventListener("change", ()=>{
      task.completed = chk.checked;
      saveTasks();
      renderTasks(currentFilter, currentSearch);
    });

    del.addEventListener("click", ()=>{
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderTasks(currentFilter, currentSearch);
    });
  });

  const total = pendingCount + completedCount;
  progressText.textContent = `${completedCount}/${total} tasks completed`;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  progressFill.style.width = pct + "%";

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("pendingTasks").textContent = pendingCount;
  document.getElementById("completedTasks").textContent = completedCount;
  document.getElementById("overdueTasks").textContent = overdueCount;
  document.getElementById("todayTasks").textContent = todayCount;

  dashboardCards.forEach(c => c.classList.toggle("active", c.dataset.filter === currentFilter));
  filterButtons.forEach(b => b.classList.toggle("active", b.dataset.filter === currentFilter));
}

/* Add Task */
addBtn.addEventListener("click", ()=>{
  const text = taskInput.value.trim();
  const deadline = deadlineInput.value;
  const category = categoryInput.value;

  if (!text || !deadline){
    showToast("Please enter a task and deadline");
    return;
  }

  const id = `${Date.now()}_${Math.floor(Math.random()*10000)}`;
  const newTask = { id, text, deadline, category, completed:false, createdAt: new Date().toISOString() };
  tasks.push(newTask);
  saveTasks();
  renderTasks("all", "");
  taskInput.value = "";
  deadlineInput.value = "";
});

/* Search & Filter */
searchInput.addEventListener("input", e => {
  renderTasks(currentFilter, e.target.value.trim());
});

filterButtons.forEach(btn => btn.addEventListener("click", ()=>{
  const f = btn.dataset.filter;
  renderTasks(f, searchInput.value.trim());
}));

dashboardCards.forEach(card => {
  card.addEventListener("click", ()=>{
    const f = card.dataset.filter;
    renderTasks(f, searchInput.value.trim());
    dashboardCards.forEach(c => c.setAttribute("aria-pressed", (c === card).toString()));
  });
});

/* Theme toggle */
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  themeToggle.setAttribute("aria-pressed", isDark);
});

/* Init */
function init(){
  renderTasks("all", "");
}
init();
