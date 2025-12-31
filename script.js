// Your Firebase configuration (from your console)
const firebaseConfig = {
  apiKey: "AIzaSyBHPTItWQcYgwmLKEoopVMQe6d77fM68DU",
  authDomain: "diary-midara.firebaseapp.com",
  projectId: "diary-midara",
  storageBucket: "diary-midara.firebasestorage.app",
  messagingSenderId: "613969195802",
  appId: "1:613969195802:web:5a40c4544b4a1dec4b72a3",
  databaseURL: "https://diary-midara-default-rtdb.firebaseio.com"  // IMPORTANT: Added this!
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tasksRef = db.ref('tasks');

let tasks = [];
let nextId = 1;
const timezone = 'Africa/Nairobi'; // East African Time

// Optional: Anonymous sign-in (adds slight security)
firebase.auth().signInAnonymously().catch(err => console.log("Auth error:", err));

// === Date Functions ===
function getCurrentDate() {
    const options = { timeZone: timezone, year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
}

function getCurrentDateISO() {
    const now = new Date();
    const offset = 3 * 60; // EAT is UTC+3
    const eat = new Date(now.getTime() + offset * 60 * 1000);
    return eat.toISOString().split('T')[0];
}

function updateDate() {
    document.getElementById('current-date').textContent = `Today: ${getCurrentDate()}`;
}

// === UI Helpers ===
function toggleAmount(select) {
    const amountInput = select.parentNode.querySelector('input[type="number"]');
    if (select.value === 'work') {
        amountInput.style.display = 'inline';
        amountInput.required = true;
    } else {
        amountInput.style.display = 'none';
        amountInput.required = false;
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    document.querySelector(`button[onclick="showTab('${tabId}')"]`).classList.add('active');
}

// === Task Functions ===
function addTask(person) {
    const form = document.getElementById(person.toLowerCase() + '-form');
    const inputs = form.querySelectorAll('input, select');
    const name = inputs[0].value.trim();
    const type = inputs[1].value;
    const amount = type === 'work' ? parseFloat(inputs[2].value) || 0 : 0;
    const deadline = inputs[3].value;

    if (!name || !deadline) {
        alert('Please fill in task name and deadline.');
        return;
    }

    const newTask = {
        id: nextId++,
        task_name: name,
        type: type,
        amount: amount,
        deadline: deadline,
        done: false,
        completed_date: '',
        person: person
    };

    tasksRef.push(newTask); // Firebase auto-generates unique key

    form.reset();
    inputs[2].style.display = 'none'; // Hide amount field
}

function markDone(taskKey, checked) {
    const updates = {
        done: checked,
        completed_date: checked ? getCurrentDateISO() : ''
    };
    tasksRef.child(taskKey).update(updates);
}

// === Rendering ===
function renderTasks() {
    ['gachara', 'mideva'].forEach(person => {
        const tbody = document.getElementById(`${person}-table`).querySelector('tbody');
        tbody.innerHTML = '';
        tasks
            .filter(t => t.person.toLowerCase() === person)
            .forEach(task => {
                const tr = document.createElement('tr');
                if (task.done) tr.classList.add('done');
                tr.innerHTML = `
                    <td>${task.task_name}</td>
                    <td>${task.type}</td>
                    <td>${task.amount > 0 ? task.amount : '-'}</td>
                    <td>${task.deadline}</td>
                    <td><input type="checkbox" ${task.done ? 'checked' : ''} onchange="markDone('${task.fbKey}', this.checked)"></td>
                `;
                tbody.appendChild(tr);
            });
    });

    renderReminders();
    renderEarnings();
}

function calculateOverdue(deadline) {
    const today = new Date(getCurrentDateISO());
    const due = new Date(deadline);
    const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

function renderReminders() {
    const tbody = document.getElementById('reminders-table').querySelector('tbody');
    tbody.innerHTML = '';

    const overdueTasks = tasks
        .filter(t => !t.done)
        .map(t => ({ ...t, overdueDays: calculateOverdue(t.deadline) }))
        .sort((a, b) => b.overdueDays - a.overdueDays);

    overdueTasks.forEach(task => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${task.person}</td>
            <td>${task.task_name}</td>
            <td>${task.deadline}</td>
            <td>${task.overdueDays > 0 ? task.overdueDays : 'Not yet'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function getWeekNumber(dateStr) {
    const d = new Date(dateStr);
    const dayNum = (d.getUTCDay() + 6) % 7 + 1;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function renderEarnings() {
    const container = document.getElementById('earnings-summary');
    container.innerHTML = '';

    const today = getCurrentDateISO();
    const currentWeek = getWeekNumber(today);
    const currentYear = new Date(today).getUTCFullYear();
    const currentMonth = new Date(today).getUTCMonth() + 1;

    const workDone = tasks.filter(t => t.done && t.type === 'work');

    const sum = (filter) => workDone.filter(filter).reduce((s, t) => s + t.amount, 0);

    const dailyG = sum(t => t.completed_date === today && t.person === 'Gachara');
    const dailyM = sum(t => t.completed_date === today && t.person === 'Mideva');
    const weeklyG = sum(t => getWeekNumber(t.completed_date) === currentWeek && new Date(t.completed_date).getUTCFullYear() === currentYear && t.person === 'Gachara');
    const weeklyM = sum(t => getWeekNumber(t.completed_date) === currentWeek && new Date(t.completed_date).getUTCFullYear() === currentYear && t.person === 'Mideva');
    const monthlyG = sum(t => new Date(t.completed_date).getUTCMonth() + 1 === currentMonth && new Date(t.completed_date).getUTCFullYear() === currentYear && t.person === 'Gachara');
    const monthlyM = sum(t => new Date(t.completed_date).getUTCMonth() + 1 === currentMonth && new Date(t.completed_date).getUTCFullYear() === currentYear && t.person === 'Mideva');

    container.innerHTML = `
        <h3>Gachara</h3>
        <p>Today: KSh ${dailyG}</p>
        <p>This Week: KSh ${weeklyG}</p>
        <p>This Month: KSh ${monthlyG}</p>

        <h3>Mideva</h3>
        <p>Today: KSh ${dailyM}</p>
        <p>This Week: KSh ${weeklyM}</p>
        <p>This Month: KSh ${monthlyM}</p>

        <h3>Combined 💕</h3>
        <p>Today: KSh ${dailyG + dailyM}</p>
        <p>This Week: KSh ${weeklyG + weeklyM}</p>
        <p>This Month: KSh ${monthlyG + monthlyM}</p>
    `;
}

// === Real-time Listener ===
tasksRef.on('value', (snapshot) => {
    tasks = [];
    nextId = 1;
    snapshot.forEach(child => {
        const task = child.val();
        task.fbKey = child.key; // Save Firebase key for updates
        tasks.push(task);
        if (task.id >= nextId) nextId = task.id + 1;
    });
    renderTasks();
});

// === Init ===
updateDate();
setInterval(updateDate, 60000);
showTab('daily');
