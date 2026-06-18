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

    // Render all your standard batch number chips
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

    // Append the blended Refresh Button at the very end of the row
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'chip back'; // Reusing your 'back' chip theme color for differentiation
    refreshBtn.title = 'Force refresh';  // Tooltip backup
    refreshBtn.innerHTML = `<span>↻</span> <span>Refresh</span>`;

    refreshBtn.onclick = () => {
        // Clear all cached routines
        Object.keys(localStorage)
            .filter(key => key.startsWith('schedule_data_'))
            .forEach(key => localStorage.removeItem(key));

        // Reload to fetch fresh data
        window.location.reload();
    };

    batchRow.appendChild(refreshBtn);
}

function renderSections(batch) {
    sectionRow.innerHTML = '';
    sectionRow.classList.remove('hidden');

    const back = document.createElement('button');
    back.className = 'chip back';
    back.innerHTML = `<span><</span> <span>${batch}</span>`;

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

    const cacheKey = `schedule_data_${batch}_${section}`;
    const cachedData = localStorage.getItem(cacheKey);

    // 1. PRIORITIZE CACHE FIRST (Essential for offline PWA standalone launches)
    if (cachedData) {
        console.log(`Serving schedule for ${batch}-${section} from frontend cache.`);
        scheduleWrap.innerHTML = buildScheduleTable(JSON.parse(cachedData));

        // If the student has data/Wi-Fi, silently look for updates in the background!
        if (navigator.onLine) {
            fetchSilentUpdate(batch, section, cacheKey);
        }
        return;
    }

    // 2. FALLBACK TO NETWORK (Only if this routine has never been opened before)
    fetchFromNetwork(batch, section, cacheKey);
}

// Separate helper to pull clean data from the server and commit it to storage
function fetchFromNetwork(batch, section, cacheKey) {
    fetch(`${API_URL}/schedule/${batch}/${section}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            // Save it to localStorage so it works offline going forward!
            localStorage.setItem(cacheKey, JSON.stringify(data));
            scheduleWrap.innerHTML = buildScheduleTable(data);
        })
        .catch(err => {
            scheduleWrap.innerHTML = '';
            scheduleMessage.textContent = 'Could not load schedule. Check your connection and try again.';
            scheduleWrap.appendChild(scheduleMessage);
            console.error(err);
        });
}

// Background worker to check if room numbers/classes changed while online
function fetchSilentUpdate(batch, section, cacheKey) {
    fetch(`${API_URL}/schedule/${batch}/${section}`)
        .then(response => {
            if (response.ok) return response.json();
        })
        .then(data => {
            if (data) {
                localStorage.setItem(cacheKey, JSON.stringify(data));
                // Silently refresh the visual grid without flash interruptions
                scheduleWrap.innerHTML = buildScheduleTable(data);
            }
        })
        .catch(() => console.log("Silent update skipped (offline mode)."));
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
            .then(reg => {
                console.log('Service Worker registered successfully!', reg.scope);

                // Check for updates every time the app opens
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        // If a new service worker has finished installing, activate it!
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New update available! Swapping files...');
                            // Tell the new service worker to take control instantly
                            newWorker.postMessage({ action: 'skipWaiting' });
                        }
                    });
                });
            })
            .catch(err => console.error('Service Worker registration failed:', err));
    });

    // Reload the page once the new service worker officially takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}