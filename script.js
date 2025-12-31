let tasks = [];
let nextId = 1;
const timezone = 'Africa/Nairobi'; // EAT (UTC+3)

function getCurrentDate() {
    const options = { timeZone: timezone, year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
}

function getCurrentDateISO() {
    const date = new Date();
    const offset = 3 * 60 * 60 * 1000; // EAT offset
    const eatDate = new Date(date.getTime() + offset);
    return eatDate.toISOString().split('T')[0];
}

function updateDate() {
    document.getElementById('current-date').textContent = `Current Date: ${getCurrentDate()}`;
}

function toggleAmount(select) {
    const amountInput = select.nextElementSibling;
    amountInput.style.display = select.value === 'work' ? 'inline' : 'none';
    amountInput.required = select.value === 'work';
}

function addTask(person) {
    const form = person === 'Gachara' ? document.getElementById('gachara-form') : document.getElementById('mideva-form');
    const name = form.querySelector('input[type="text"]').value;
    const type = form.querySelector('select').value;
    const amount = type === 'work' ? parseFloat(form.querySelector('input[type="number"]').value) || 0 : 0;
    const deadline = form.querySelector('input[type="date"]').value;

    if (!name || !deadline) return alert('Name and deadline required.');

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

    renderTasks();
    form.reset();
    form.querySelector('input[type="number"]').style.display = 'none';
}

function markDone(id, checked) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.done = checked;
        task.completed_date = checked ? getCurrentDateISO() : '';
        renderTasks();
    }
}

function renderTasks() {
    ['gachara', 'mideva'].forEach(p => {
        const tableBody = document.getElementById(`${p}-table`).querySelector('tbody');
        tableBody.innerHTML = '';
        tasks.filter(t => t.person.toLowerCase() === p).forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.task_name}</td>
                <td>${t.type}</td>
                <td>${t.amount}</td>
                <td>${t.deadline}</td>
                <td><input type="checkbox" ${t.done ? 'checked' : ''} onchange="markDone(${t.id}, this.checked)"></td>
            `;
            tableBody.appendChild(row);
        });
    });
    renderReminders();
    renderEarnings();
}

function calculateOverdue(deadline) {
    const today = new Date(getCurrentDateISO());
    const due = new Date(deadline);
    return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

function renderReminders() {
    const tableBody = document.getElementById('reminders-table').querySelector('tbody');
    tableBody.innerHTML = '';
    const undone = tasks.filter(t => !t.done).map(t => ({ ...t, overdue: calculateOverdue(t.deadline) }));
    undone.sort((a, b) => b.overdue - a.overdue);
    undone.forEach(t => {
        if (t.overdue > 0 || true) { // Show all undone, but sorted
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.person}</td>
                <td>${t.task_name}</td>
                <td>${t.deadline}</td>
                <td>${t.overdue > 0 ? t.overdue : 0}</td>
            `;
            tableBody.appendChild(row);
        }
    });
}

function getWeekNumber(date) {
    const d = new Date(date);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getMonth(date) {
    return new Date(date).getUTCMonth() + 1;
}

function renderEarnings() {
    const summary = document.getElementById('earnings-summary');
    summary.innerHTML = '';

    const today = getCurrentDateISO();
    const currentWeek = getWeekNumber(today);
    const currentMonth = getMonth(today);
    const currentYear = new Date(today).getUTCFullYear();

    const completedWork = tasks.filter(t => t.done && t.type === 'work');

    function sumBy(filterFn) {
        return completedWork.filter(filterFn).reduce((sum, t) => sum + t.amount, 0);
    }

    const dailyG = sumBy(t => t.completed_date === today && t.person === 'Gachara');
    const dailyM = sumBy(t => t.completed_date === today && t.person === 'Mideva');
    const weeklyG = sumBy(t => getWeekNumber(t.completed_date) === currentWeek && new Date(t.completed_date).getUTCFullYear() === currentYear && t.person === 'Gachara');
    const weeklyM = sumBy(t => getWeekNumber(t.completed_date) === currentWeek && new Date(t.completed_date).getUTCFullYear() === currentYear && t.person === 'Mideva');
    const monthlyG = sumBy(t => getMonth(t.completed_date) === currentMonth && new Date(t.completed_date).getUTCFullYear() === currentYear && t.person === 'Gachara');
    const monthlyM = sumBy(t => getMonth(t.completed_date) === currentMonth && new Date(t.completed_date).getUTCFullYear() === currentYear && t.person === 'Mideva');

    summary.innerHTML = `
        <h3>Gachara</h3>
        <p>Daily: ${dailyG}</p>
        <p>Weekly: ${weeklyG}</p>
        <p>Monthly: ${monthlyG}</p>
        <h3>Mideva</h3>
        <p>Daily: ${dailyM}</p>
        <p>Weekly: ${weeklyM}</p>
        <p>Monthly: ${monthlyM}</p>
        <h3>Total</h3>
        <p>Daily: ${dailyG + dailyM}</p>
        <p>Weekly: ${weeklyG + weeklyM}</p>
        <p>Monthly: ${monthlyG + monthlyM}</p>
    `;
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

function loadCSV() {
    const file = document.getElementById('upload-csv').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        tasks = [];
        nextId = 1;
        if (lines.length > 1) { // Skip header
            lines.slice(1).forEach(line => {
                const [id, task_name, type, amount, deadline, done, completed_date, person] = line.split(',');
                tasks.push({
                    id: parseInt(id),
                    task_name,
                    type,
                    amount: parseFloat(amount),
                    deadline,
                    done: done === 'true',
                    completed_date,
                    person
                });
                nextId = Math.max(nextId, parseInt(id) + 1);
            });
        }
        renderTasks();
    };
    reader.readAsText(file);
}

function downloadCSV() {
    const header = 'id,task_name,type,amount,deadline,done,completed_date,person\n';
    const data = tasks.map(t => `${t.id},${t.task_name},${t.type},${t.amount},${t.deadline},${t.done},${t.completed_date},${t.person}`).join('\n');
    const blob = new Blob([header + data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
}

updateDate();
setInterval(updateDate, 60000); // Update date every minute
showTab('daily'); // Default tab