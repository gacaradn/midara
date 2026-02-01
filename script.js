// === CONFIGURATION ===
const GITHUB_OWNER = 'your-github-username';
const GITHUB_REPO = 'your-repo-name';
const CSV_PATH = 'data.csv';
const GITHUB_BRANCH = 'main';
const RAW_CSV_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${CSV_PATH}`;

const VALID_USERS = { "Gachara": "LoveMideva2026", "Mideva": "LoveGachara2026" };

let currentUser = null;
let tasks = [];
let nextId = 1;
let myChart = null;
const timezone = 'Africa/Nairobi';

// === LOGIN & AUTH ===
function attemptLogin() {
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value;
    if (VALID_USERS[u] === p) {
        currentUser = u;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('welcome-user').textContent = `Welcome home, ${currentUser} ❤️`;
        loadFromGitHub();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function logout() { location.reload(); }

// === DATE HELPERS ===
function getCurrentDateISO() {
    return new Date().toLocaleString("sv-SE", { timeZone: timezone }).split(' ')[0];
}

function getMonthName(monthIndex) {
    const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return names[monthIndex];
}

// === TASK MANAGEMENT ===
async function addTask(person) {
    const form = document.getElementById(person.toLowerCase() + '-form');
    const inputs = form.querySelectorAll('input, select');
    const name = inputs[0].value.trim();
    const type = inputs[1].value;
    const amount = type === 'work' ? parseFloat(inputs[2].value) || 0 : 0;
    const deadline = inputs[3].value;

    if (!name || !deadline) return alert('Task name and deadline required!');

    tasks.push({
        id: nextId++,
        task_name: name,
        type,
        amount,
        deadline,
        done: false,
        completed_date: '',
        person
    });

    form.reset();
    inputs[2].style.display = 'none';
    await saveToGitHub(); // Auto-sync
}

async function markDone(id, checked) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.done = checked;
        task.completed_date = checked ? getCurrentDateISO() : '';
        await saveToGitHub(); // Auto-sync
    }
}

// === RENDERING: DAILY TO-DO ===
function renderDailyTodo() {
    const tbody = document.getElementById('active-tasks-table').querySelector('tbody');
    tbody.innerHTML = '';
    
    // Show only undone tasks
    const activeTasks = tasks.filter(t => !t.done);
    
    activeTasks.forEach(t => {
        const today = new Date(getCurrentDateISO());
        const due = new Date(t.deadline);
        const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
        const overdueText = diff > 0 ? `${diff} days late` : 'Pending';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.person}</td>
            <td>${t.task_name}</td>
            <td>${t.deadline}</td>
            <td style="color: ${diff > 0 ? 'red' : 'inherit'}">${overdueText}</td>
            <td><input type="checkbox" onchange="markDone(${t.id}, this.checked)"></td>
        `;
        tbody.appendChild(tr);
    });
}

// === RENDERING: HISTORY (CALENDAR FLOW) ===
function renderMonthGrid() {
    const container = document.getElementById('history-view-container');
    container.innerHTML = '<h3>Select a Month</h3><div class="grid-container" id="month-grid"></div>';
    const grid = document.getElementById('month-grid');
    
    for (let i = 0; i < 12; i++) {
        const btn = document.createElement('button');
        btn.className = 'grid-item';
        btn.textContent = getMonthName(i);
        btn.onclick = () => renderDayGrid(i);
        grid.appendChild(btn);
    }
}

function renderDayGrid(monthIndex) {
    const container = document.getElementById('history-view-container');
    container.innerHTML = `<h3>Days in ${getMonthName(monthIndex)}</h3><div class="grid-container" id="day-grid"></div>`;
    const grid = document.getElementById('day-grid');
    
    // Simple logic for 31 days (can be refined for specific years)
    for (let d = 1; d <= 31; d++) {
        const dateStr = `2026-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => t.completed_date === dateStr);
        
        const btn = document.createElement('button');
        btn.className = 'grid-item';
        btn.innerHTML = `${d}<br><small>${dayTasks.length} tasks</small>`;
        btn.onclick = () => showTasksForDay(dateStr);
        grid.appendChild(btn);
    }
}

function showTasksForDay(dateStr) {
    const container = document.getElementById('history-view-container');
    const dayTasks = tasks.filter(t => t.completed_date === dateStr);
    
    let html = `<h3>Tasks on ${dateStr}</h3><ul>`;
    dayTasks.forEach(t => {
        html += `<li>[${t.person}] ${t.task_name} (${t.type}) - KSh ${t.amount}</li>`;
    });
    if (dayTasks.length === 0) html += `<li>No tasks completed this day.</li>`;
    html += `</ul>`;
    container.innerHTML = html;
}

// === RENDERING: EARNINGS & PIE CHART ===
function renderEarnings() {
    const summary = document.getElementById('earnings-summary');
    const monthlyTotals = {};
    
    tasks.filter(t => t.done && t.type === 'work').forEach(t => {
        const m = getMonthName(new Date(t.completed_date).getUTCMonth());
        monthlyTotals[m] = (monthlyTotals[m] || 0) + t.amount;
    });

    const labels = Object.keys(monthlyTotals);
    const data = Object.values(monthlyTotals);

    summary.innerHTML = `<h3>Total Career Earnings: KSh ${data.reduce((a, b) => a + b, 0)}</h3>`;

    if (myChart) myChart.destroy();
    const ctx = document.getElementById('earningsChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff']
            }]
        }
    });
}

// === UI UTILS ===
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    if (tabId === 'history-tab') renderMonthGrid();
    if (tabId === 'earnings-tab') renderEarnings();
    if (tabId === 'daily-todo') renderDailyTodo();
}

function toggleAmount(select) {
    const input = select.parentNode.querySelector('input[type="number"]');
    input.style.display = select.value === 'work' ? 'inline' : 'none';
}

// === GITHUB SYNC ===
async function saveToGitHub() {
    const token = sessionStorage.getItem('github_pat') || prompt('Enter PAT:');
    if (!token) return;
    sessionStorage.setItem('github_pat', token);

    const shaRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CSV_PATH}?ref=${GITHUB_BRANCH}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const shaData = await shaRes.json();
    
    const header = 'id,task_name,type,amount,deadline,done,completed_date,person\n';
    const rows = tasks.map(t => `${t.id},${t.task_name},${t.type},${t.amount},${t.deadline},${t.done},${t.completed_date},${t.person}`).join('\n');
    const content = btoa(unescape(encodeURIComponent(header + rows)));

    const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CSV_PATH}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Content_Type: 'application/json' },
        body: JSON.stringify({ message: "Update", content, sha: shaData.sha, branch: GITHUB_BRANCH })
    });

    if (res.ok) {
        alert('Updated!');
        loadFromGitHub();
    }
}

async function loadFromGitHub() {
    const res = await fetch(RAW_CSV_URL + '?t=' + Date.now());
    const text = await res.text();
    parseCSV(text);
    renderDailyTodo();
    renderEarnings();
}

function parseCSV(text) {
    const lines = text.trim().split('\n').slice(1);
    tasks = lines.map(line => {
        const [id, name, type, amt, dead, done, comp, pers] = line.split(',');
        if (parseInt(id) >= nextId) nextId = parseInt(id) + 1;
        return { id: parseInt(id), task_name: name, type, amount: parseFloat(amt), deadline: dead, done: done === 'true', completed_date: comp, person: pers };
    });
}

// Auto-Refresh
setInterval(loadFromGitHub, 60000);
