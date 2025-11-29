
const STORAGE_KEY = 'tm_tasks_v1';

const form = document.getElementById('taskForm');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const dateInput = document.getElementById('dueDate');
const priorityInput = document.getElementById('priority');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEdit');
const clearAllBtn = document.getElementById('clearAll');

const listEl = document.getElementById('list');
const taskCountEl = document.getElementById('taskCount');
const remainingEl = document.getElementById('remaining');
const lastSavedEl = document.getElementById('lastSaved');

const filters = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search');
const searchClearBtn = document.getElementById('searchClear');

let tasks = []; 
let filter = 'all';
let editingId = null;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    lastSavedEl.textContent = 'Last saved: ' + new Date().toLocaleString();
}

function loadTasks() {
    const data = localStorage.getItem(STORAGE_KEY);
    tasks = data ? JSON.parse(data) : [];
}

function formatDate(d) {
    if (!d) return 'No date';
    const dt = new Date(d + 'T00:00:00'); 
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function clearForm() {
    form.reset();
    titleInput.focus();
    editingId = null;
    document.getElementById('formTitle').textContent = 'Add Task';
    submitBtn.textContent = 'Add Task';
    cancelEditBtn.style.display = 'none';
}

function fillForm(task) {
    titleInput.value = task.title;
    descInput.value = task.description || '';
    dateInput.value = task.dueDate || '';
    priorityInput.value = task.priority || 'medium';
    editingId = task.id;
    document.getElementById('formTitle').textContent = 'Edit Task';
    submitBtn.textContent = 'Save Changes';
    cancelEditBtn.style.display = 'inline-block';
    titleInput.focus();
}

function addTask(task) {
    if (!task.title || !task.dueDate) {
        alert('Please provide both Title and Due Date.');
        return false;
    }
    tasks.push(task);
    saveTasks();
    render();
    return true;
}

function updateTask(id, updates) {
    tasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    saveTasks();
    render();
}

function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
}

function toggleDone(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTasks();
    render();
}

function applyFilterAndSearch(items) {
    let out = items.slice();

    if (filter !== 'all') {
        out = out.filter(t => t.priority === filter);
    }

    const q = searchInput.value.trim().toLowerCase();
    if (q) {
        out = out.filter(t => (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
    }

    out.sort((a, b) => {
        const ad = a.dueDate || '';
        const bd = b.dueDate || '';
        if (ad !== bd) return (ad || '9999-12-31').localeCompare(bd || '9999-12-31');
        return b.createdAt - a.createdAt;
    });

    return out;
}

function render() {
    listEl.innerHTML = '';

    const visible = applyFilterAndSearch(tasks);
    if (visible.length === 0) {
        listEl.innerHTML = `<div class="empty">No tasks found. Add a new task or adjust filter/search.</div>`;
    } else {
        visible.forEach(task => {
            const item = document.createElement('div');
            item.className = 'task';
            const color = task.priority === 'low' ? '#bbf7d0' : task.priority === 'medium' ? '#fef3c7' : '#fecaca';
            const left = document.createElement('div'); left.className = 'left'; left.style.background = color;
            const content = document.createElement('div'); content.className = 'content';
            const h = document.createElement('h3');
            const titleSpan = document.createElement('span');
            titleSpan.textContent = task.title;
            if (task.done) titleSpan.style.textDecoration = 'line-through';
            h.appendChild(titleSpan);

            const actionsWrap = document.createElement('div');
            actionsWrap.style.marginLeft = 'auto';
            actionsWrap.style.display = 'flex';
            actionsWrap.style.gap = '6px';

            content.appendChild(h);
            const desc = document.createElement('p'); desc.textContent = task.description || ''; content.appendChild(desc);

            const meta = document.createElement('div'); meta.className = 'meta';
            const due = document.createElement('div'); due.innerHTML = `<strong>Due:</strong> ${formatDate(task.dueDate)}`;
            const pr = document.createElement('div'); pr.innerHTML = `<span class="priority ${task.priority}">${task.priority.toUpperCase()}</span>`;
            const doneBtn = document.createElement('button'); doneBtn.className = 'icon-btn'; doneBtn.title = 'Toggle done';
            doneBtn.innerHTML = task.done ? '✅' : '⬜';
            doneBtn.addEventListener('click', () => toggleDone(task.id));

            meta.appendChild(due); meta.appendChild(pr); meta.appendChild(doneBtn);
            content.appendChild(meta);

            const actions = document.createElement('div'); actions.className = 'actions';
            const editBtn = document.createElement('button'); editBtn.className = 'icon-btn'; editBtn.title = 'Edit';
            editBtn.innerHTML = '✎';
            editBtn.addEventListener('click', () => fillForm(task));

            const delBtn = document.createElement('button'); delBtn.className = 'icon-btn'; delBtn.title = 'Delete';
            delBtn.innerHTML = '🗑';
            delBtn.addEventListener('click', () => deleteTask(task.id));

            actions.appendChild(editBtn); actions.appendChild(delBtn);
            item.appendChild(left);
            item.appendChild(content);
            item.appendChild(actions);

            listEl.appendChild(item);
        });
    }

    taskCountEl.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;
    const remaining = tasks.filter(t => !t.done).length;
    remainingEl.textContent = `${remaining} remaining`;
}

form.addEventListener('submit', function (e) {
    e.preventDefault();
    const payload = {
        id: editingId || uid(),
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        dueDate: dateInput.value,
        priority: priorityInput.value,
        done: editingId ? (tasks.find(t => t.id === editingId)?.done || false) : false,
        createdAt: editingId ? (tasks.find(t => t.id === editingId)?.createdAt || Date.now()) : Date.now()
    };

    if (editingId) {
        if (!payload.title || !payload.dueDate) {
            alert('Please provide both Title and Due Date.');
            return;
        }
        updateTask(editingId, {
            title: payload.title,
            description: payload.description,
            dueDate: payload.dueDate,
            priority: payload.priority
        });
        clearForm();
    } else {
        const ok = addTask(payload);
        if (ok) clearForm();
    }
});

cancelEditBtn.addEventListener('click', () => clearForm());

clearAllBtn.addEventListener('click', () => {
    if (!confirm('Clear ALL tasks? This cannot be undone.')) return;
    tasks = [];
    saveTasks();
    render();
});

filters.forEach(btn => {
    btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filter = btn.dataset.filter;
        render();
    });
});

searchInput.addEventListener('input', () => render());
searchClearBtn.addEventListener('click', () => { searchInput.value = ''; render(); });

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editingId) clearForm();
});

loadTasks();
render();
lastSavedEl.textContent = 'Last saved: —';
