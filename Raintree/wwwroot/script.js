// ==============================
// API URL
// ==============================

const hostname = window.location.hostname;
let API_URL;

if (hostname === "localhost" || hostname === "127.0.0.1") {
    API_URL = "http://localhost:5000";
} else if (hostname.startsWith("192.168.")) {
    API_URL = `http://${hostname}:5000`;
} else {
    API_URL = "https://raintree-xnlz.onrender.com";
}

// ==============================
// DOM elements
// ==============================

const batchRow = document.getElementById("batchRow");
const sectionRow = document.getElementById("sectionRow");
const scheduleContainer = document.getElementById("chip");
let activeBatch, activeSection;

// ==============================
// Schedule cache
// ==============================

function getScheduleCacheKey() {
    return `schedule-${activeBatch}-${activeSection}`;
}

function saveScheduleToCache(schedule) {
    const key = getScheduleCacheKey();

    localStorage.setItem( key, JSON.stringify(schedule));
}

function getScheduleFromCache() {
    const key = getScheduleCacheKey();
    const cachedSchedule = localStorage.getItem(key);

    if (!cachedSchedule) {
        return null;
    }

    return JSON.parse(cachedSchedule);
}

// ==============================
// Fetch fresh schedule
// ==============================

async function fetchFreshSchedule() {
    const getApiUrl =
        `${API_URL}/schedule/${activeBatch}/${activeSection}`;

    const response = await fetch(getApiUrl, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `Schedule request failed: ${response.status}`
        );
    }

    const schedule = await response.json();

    saveScheduleToCache(schedule);

    return schedule;
}

// ==============================
// Save routine selection
// ==============================

function saveSelectedRoutine() {
    localStorage.setItem(
        "selectedBatch",
        activeBatch
    );

    localStorage.setItem(
        "selectedSection",
        activeSection
    );
}

// ==============================
// Get selected routine
// ==============================

function getSelectedRoutine() {
    const batch = localStorage.getItem("selectedBatch");
    const section = localStorage.getItem("selectedSection");

    if (!batch || !section) {
        return null;
    }

    return {
        batch,
        section
    };
}

// ==============================
// Fixed timeslot
// ==============================

const TIME_SLOTS = [
    "8:45 AM",
    "10:05 AM",
    "11:25 AM",
    "1:15 PM",
    "2:35 PM",
    "3:55 PM"
];

// ==============================
// Error handling
// ==============================

function showError(message) {
    scheduleContainer.innerHTML = `
        <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center text-red-700">
            ${message}
        </div>
    `;
}

// ==============================
// Current slot highlight
// ==============================

function timeToMinutes(timeString) {
    const [time, period] = timeString.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (period === "PM" && hours !== 12) {
        hours += 12;
    }

    if (period === "AM" && hours === 12) {
        hours = 0;
    }

    return hours * 60 + minutes;
}

function isCurrentClass(day, time) {
    const now = new Date();

    const currentDay = now.toLocaleDateString("en-US", {
        weekday: "long"
    });

    if (day !== currentDay) {
        return false;
    }

    const [startTime, endTime] = time.split(" - ");
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ==============================
// Build schedule table
// ==============================

function buildScheduleTable(schedule) {
    let tableHTML = `
        <table class="w-full border-collapse text-sm text-center">
            <thead>
                <tr>
                <th class="border border-gray-300 bg-gray-100 px-3 py-3 text-left font-semibold"> Day </th>
                ${TIME_SLOTS.map(time => `<th class="border border-gray-300 bg-gray-100 px-3 py-3 text-center font-semibold whitespace-nowrap"> ${time} </th>`).join("")}
                </tr>
            </thead>
            <tbody>
    `;

    schedule.forEach(dayData => {
        tableHTML += `<tr>`;

        // Day
        tableHTML += `<td class="border border-gray-300 bg-gray-50 px-3 py-3 font-semibold whitespace-nowrap text-center align-middle"> ${dayData.day} </td>`;

        let currentSlot = 1;

        dayData.classes.forEach(classData => {
            // Empty slots before this class
            while (currentSlot < classData.slotStart) {
                tableHTML += `
                    <td class="border border-gray-300 px-3 py-3 text-center">
                    </td>
                `;
                currentSlot++;
            }

            const currentClass = isCurrentClass(dayData.day, classData.time);
            
            // Class
            tableHTML += `
                <td colspan="${classData.slotSpan}" class="border border-gray-300 px-3 py-3 align-middle text-center ${currentClass ? "bg-green-100" : ""}" >
                <strong class="font-semibold text-gray-900"> ${classData.subject || "<i>Subject not specified</i>"} </strong>
                <br>
                <span class="text-gray-700"> ${classData.title || "<i>Title not specified</i>"} </span>
                <br>
                <span class="text-gray-500"> ${classData.faculty || "<i>Faculty not specified</i>"} </span>
                <br>
                <span class="text-gray-500"> ${classData.room || "<i>Room not specified</i>"} </span>
                </td>
            `;

            // Move to the next available slot
            currentSlot += classData.slotSpan;
        });

        // Empty slots after the last class
        while (currentSlot <= 6) {
            tableHTML += `<td class="border border-gray-300 px-3 py-3 text-center"> </td>`;
            currentSlot++;
        }

        tableHTML += `</tr>`;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    scheduleContainer.innerHTML = `<div class="overflow-x-auto rounded-lg"> ${tableHTML} </div>`;
}

// ==============================
// Fetch available batches
// ==============================

async function fetchBatches() {
    const response = await fetch(`${API_URL}/batches`);

    if (!response.ok) {
        throw new Error(`Batch request failed: ${response.status}`);
    }

    const batches = await response.json();

    return batches;
}

// ==============================
// Fetch available sections
// ==============================

async function fetchSections(batch) {
    const response = await fetch(`${API_URL}/sections/${batch}`);

    if (!response.ok) {
        throw new Error(`Section request failed: ${response.status}`);
    }

    const sections = await response.json();
    return sections;
}

// ==============================
// Build batch buttons
// ==============================

function buildBatchButtons(batches) {
    batchRow.innerHTML = "";

    batches.forEach(batch => {
        const button = document.createElement("button");

        button.className = "rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-100";
        button.dataset.batch = batch;
        button.textContent = batch;

        button.addEventListener("click", async () => {
            activeBatch = batch;

            const sections = await fetchSections(activeBatch);

            buildSectionButtons(sections);

            batchRow.classList.add("hidden");
            sectionRow.classList.remove("hidden");
        });

        batchRow.appendChild(button);
    });
}

// ==============================
// Build section buttons
// ==============================

function buildSectionButtons(sections) {
    sectionRow.innerHTML = "";

    // Change batch button
    const changeButton = document.createElement("button");

    changeButton.className = "rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-100";    changeButton.textContent = `< ${activeBatch}`;

    changeButton.addEventListener("click", () => {
        batchRow.classList.remove("hidden");
        sectionRow.classList.add("hidden");

        sectionRow.innerHTML = "";

        activeBatch = undefined;
        activeSection = undefined;

        scheduleContainer.innerHTML = "";
    });

    sectionRow.appendChild(changeButton);

    // Section buttons
    sections.forEach(section => {
        const button = document.createElement("button");
        const normalSectionClasses = "bg-white text-gray-700";
        const selectedSectionClasses = "bg-gray-900 text-white";

        button.className = "section-button rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-100";
        button.dataset.section = section;
        button.textContent = section;

        button.addEventListener("click", async () => {
            activeSection = section;
            saveSelectedRoutine();
            highlightSection(section);
            
            document.querySelectorAll(".section-button").forEach(button => {
                button.classList.remove("bg-gray-900", "text-white");
                button.classList.add("bg-white", "text-gray-700");
            });

            button.classList.remove("bg-white", "text-gray-700");
            button.classList.add("bg-gray-900", "text-white");
            
            const cachedSchedule = getScheduleFromCache();

            if (cachedSchedule) {
                buildScheduleTable(cachedSchedule);
            } else {
                scheduleContainer.innerHTML = `<div class="py-8 text-center text-gray-500"> Loading routine... </div>`;
            }

            try {
                const freshSchedule = await fetchFreshSchedule();

                buildScheduleTable(freshSchedule);
            } catch (error) {
                console.error(error);

                if (!cachedSchedule) {
                    showError("Couldn't load the routine. Please check your connection.");
                }
            }
        });
        sectionRow.appendChild(button);
    });
}

// ==============================
// Restore highlight on reload
// ==============================

function highlightSection(section) {
    document.querySelectorAll(".section-button").forEach(button => {
        button.classList.remove(
            "bg-gray-900",
            "text-white"
        );

        button.classList.add(
            "bg-white",
            "text-gray-700"
        );
    });

    const selectedButton =
        document.querySelector(
            `.section-button[data-section="${section}"]`
        );

    if (selectedButton) {
        selectedButton.classList.remove(
            "bg-white",
            "text-gray-700"
        );

        selectedButton.classList.add(
            "bg-gray-900",
            "text-white"
        );
    }
}

// ==============================
// Get batches with page load 
// ==============================

async function init() {
    const batches = await fetchBatches();
    buildBatchButtons(batches);

    const selectedRoutine = getSelectedRoutine();

    if (!selectedRoutine) {
        return;
    }

    activeBatch = selectedRoutine.batch;

    const sections = await fetchSections(activeBatch);
    buildSectionButtons(sections);

    activeSection = selectedRoutine.section;
    highlightSection(activeSection);

    const cachedSchedule = getScheduleFromCache();

    if (cachedSchedule) {
        buildScheduleTable(cachedSchedule);
    } else {
        scheduleContainer.innerHTML = `
            <div class="py-8 text-center text-gray-500">
                Loading routine...
            </div>
        `;
    }

    try {
        const freshSchedule = await fetchFreshSchedule();
        buildScheduleTable(freshSchedule);
    } catch (error) {
        console.error(error);

        if (!cachedSchedule) {
            showError(
                "Couldn't load the routine. Please check your connection."
            );
        }
    }

    batchRow.classList.add("hidden");
    sectionRow.classList.remove("hidden");
}

init();

// ==============================
// Slot refresh every 5 mins
// ==============================

setInterval(() => {
    if (activeSection) {
        fetchFreshSchedule()
            .then(schedule => buildScheduleTable(schedule))
            .catch(error => console.error(error));
    }
}, 300 * 1000);

// ==============================
// Service worker registration
// ==============================

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
}