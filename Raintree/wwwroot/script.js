// Run the code in web, pc, and phone - all at once
const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000"
    : (window.location.hostname.startsWith("192.168.") || window.location.hostname.startsWith("10.0."))
        ? `http://${window.location.hostname}:5000`
        : "https://raintree-xnlz.onrender.com";

const CLASS_DURATION_MINUTES = 80;

// Converts "8:45" or "1:15" to minutes-since-midnight.
// Assumes classes run 8am-4pm, so any hour < 8 must be PM (1:15 -> 13:15)
function parseTimeToMinutes(timeStr) {
    let [hour, minute] = timeStr.split(':').map(Number);
    if (hour < 8) hour += 12;
    return hour * 60 + minute;
}

// Returns the index of the currently-running slot in TIME_SLOTS, or -1 if none
function getActiveSlotIndex() {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (let i = 0; i < TIME_SLOTS.length; i++) {
        const start = parseTimeToMinutes(TIME_SLOTS[i]);
        const end = start + CLASS_DURATION_MINUTES;
        if (nowMinutes >= start && nowMinutes < end) {
            return i;
        }
    }
    return -1;
}
const TIME_SLOTS = ["8:45", "10:05", "11:25", "1:15", "2:35", "3:55"];

// Each batch maps to its own list of sections
const BATCH_SECTIONS = {
    58: ["A", "B", "C"],
    59: ["A", "B"],
    60: ["A", "B", "C", "D", "E", "F", "G", "H"],
    61: ["A", "B", "C", "D", "E", "F"],
    62: ["A", "B", "C", "D"],
    63: ["A", "B", "C"],
    64: ["A", "B", "C", "D", "E"],
    65: ["A", "B", "C", "D"],
    66: ["A", "B", "C", "D"],
    67: ["A", "B", "C", "D", "E", "F"],
};
const BATCHES = Object.keys(BATCH_SECTIONS).map(Number);
// ---------------------------------------------

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const batchRow = document.getElementById('batchRow');
const sectionRow = document.getElementById('sectionRow');
const scheduleWrap = document.getElementById('scheduleWrap');
const scheduleMessage = document.getElementById('scheduleMessage');
const subtitle = document.getElementById('subtitle');

function init() {
    const lastBatch = localStorage.getItem('lastBatch');
    const lastSection = localStorage.getItem('lastSection');

    renderBatches();

    if (lastBatch && lastSection) {
        batchRow.classList.add('hidden');
        renderSections(Number(lastBatch));
        loadSchedule(lastBatch, lastSection);
    }
}

function renderBatches() {
    batchRow.innerHTML = '';
    BATCHES.forEach(batch => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.textContent = batch;
        btn.onclick = () => {
            sectionRow.classList.remove('hidden');
            batchRow.classList.add('hidden');
            renderSections(batch);
            subtitle.textContent = `Select section for ${batch}`;
        };
        batchRow.appendChild(btn);
    });
}

function renderSections(batch) {
    sectionRow.innerHTML = '';
    sectionRow.classList.remove('hidden');

    const back = document.createElement('button');
    back.className = 'chip back';
    back.innerHTML = '<span class="material-symbols-outlined">arrow_back</span>' + batch;
    back.onclick = () => {
        batchRow.classList.remove('hidden');
        sectionRow.classList.add('hidden');
        subtitle.textContent = 'Select your batch';
    };
    sectionRow.appendChild(back);

    const sections = BATCH_SECTIONS[batch] || [];

    sections.forEach(section => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.textContent = section;
        btn.onclick = () => {
            [...sectionRow.querySelectorAll('.chip')].forEach(c => {
                if (!c.classList.contains('back')) c.classList.remove('selected');
            });
            btn.classList.add('selected');
            loadSchedule(batch, section);
        };

        // restore selected state if this matches the last viewed section
        if (String(batch) === localStorage.getItem('lastBatch') && section === localStorage.getItem('lastSection')) {
            btn.classList.add('selected');
        }

        sectionRow.appendChild(btn);
    });
}

function loadSchedule(batch, section) {
    localStorage.setItem('lastBatch', batch);
    localStorage.setItem('lastSection', section);

    subtitle.textContent = `Batch ${batch} — Section ${section}`;
    scheduleWrap.innerHTML = '';
    scheduleMessage.textContent = 'Loading schedule...';
    scheduleWrap.appendChild(scheduleMessage);

    fetch(`${API_URL}/schedule/${batch}/${section}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            scheduleWrap.innerHTML = buildScheduleTable(data);
        })
        .catch(err => {
            scheduleWrap.innerHTML = '';
            scheduleMessage.textContent = 'Could not load schedule. Check your connection and try again.';
            scheduleWrap.appendChild(scheduleMessage);
            console.error(err);
        });
}

function buildScheduleTable(data) {
    const today = DAY_NAMES[new Date().getDay()];
    const activeSlotIndex = getActiveSlotIndex();

    let html = '<table><thead><tr><th>Day</th>';
    TIME_SLOTS.forEach(slot => html += `<th>${slot}</th>`);
    html += '</tr></thead><tbody>';

    data.forEach(daySchedule => {
        const isToday = daySchedule.day === today;
        const rowClass = isToday ? ' class="today"' : '';
        html += `<tr${rowClass}><th>${daySchedule.day.slice(0, 3)}</th>`;

        if (daySchedule.isOffDay) {
            html += `<td colspan="${TIME_SLOTS.length}" class="off-day">No classes today 🎉</td>`;
        } else {
            TIME_SLOTS.forEach((slot, i) => {
                const isActive = isToday && i === activeSlotIndex;
                const activeClass = isActive ? ' active-class' : '';
                const item = daySchedule.classes.find(c => c.time === slot);

                if (item && item.subject) {
                    html += `<td class="${activeClass.trim()}">
            <div class="class-cell">
            <span class="class-subject">${item.title || item.subject}</span>
            <span class="class-room">${item.room || ''}</span>
            <span class="class-faculty">${item.faculty || ''}</span>
            </div>
            </td>`;
                } else {
                    html += `<td class="empty-slot${activeClass}">—</td>`;
                }
            });
        }

        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

init();

// Service worker to install as PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered successfully!', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}