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
let availableRooms = [];

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
// Fetch available rooms
// ==============================

async function fetchAvailableRooms() {
    const response = await fetch(
        `${API_URL}/available-rooms`,
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error(
            `Available rooms request failed: ${response.status}`
        );
    }

    return await response.json();
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
                    <th class="border border-gray-300 bg-gray-100 px-3 py-3 text-left font-semibold">
                        Day
                    </th>

                    ${TIME_SLOTS.map(time => `
                        <th class="border border-gray-300 bg-gray-100 px-3 py-3 text-center font-semibold whitespace-nowrap">
                            ${time}
                        </th>
                    `).join("")}
                </tr>
            </thead>

            <tbody>
    `;

    schedule.forEach(dayData => {
        tableHTML += `<tr>`;

        // Day
        tableHTML += `
            <td class="border border-gray-300 bg-gray-50 px-3 py-3 font-semibold whitespace-nowrap text-center align-middle">
                ${dayData.day}
            </td>
        `;

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

            const currentClass =
                isCurrentClass(dayData.day, classData.time);

            // Class
            tableHTML += `
                <td
                    colspan="${classData.slotSpan}"
                    class="border border-gray-300 px-3 py-3 align-middle text-center ${currentClass ? "bg-green-100" : ""}"
                >
                    <strong class="font-semibold text-gray-900">
                        ${classData.subject || "<i>Subject not specified</i>"}
                    </strong>

                    <br>

                    <span class="text-gray-700">
                        ${classData.title || "<i>Title not specified</i>"}
                    </span>

                    <br>

                    <span class="text-gray-500">
                        ${classData.faculty || "<i>Faculty not specified</i>"}
                    </span>

                    <br>

                    <span class="text-gray-500">
                        ${classData.room || "<i>Room not specified</i>"}
                    </span>
                </td>
            `;

            currentSlot += classData.slotSpan;
        });

        // Empty slots after the last class
        while (currentSlot <= 6) {
            tableHTML += `
                <td class="border border-gray-300 px-3 py-3 text-center">
                </td>
            `;

            currentSlot++;
        }

        tableHTML += `</tr>`;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    scheduleContainer.innerHTML = `
        <div class="overflow-x-auto rounded-lg">
            ${tableHTML}
        </div>
    `;

    // Add the room table underneath
    buildAvailableRoomsTable();
}

// ==============================
// Build available rooms
// ==============================

function buildAvailableRoomsTable() {
    let desktopHTML = `
        <div class="hidden md:block">
            <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="w-full border-collapse text-sm text-center">
                    <thead>
                        <tr>
                            <th class="border-b border-r border-gray-200 bg-gray-100 px-3 py-3 text-left font-semibold">
                                Day
                            </th>

                            ${TIME_SLOTS.map(time => `
                                <th class="border-b border-r border-gray-200 bg-gray-100 px-3 py-3 font-semibold whitespace-nowrap last:border-r-0">
                                    ${time}
                                </th>
                            `).join("")}
                        </tr>
                    </thead>

                    <tbody>
                        ${availableRooms.map(dayData => `
                            <tr>
                                <td class="border-b border-r border-gray-200 bg-gray-50 px-3 py-3 font-semibold whitespace-nowrap">
                                    ${dayData.day}
                                </td>

                                ${dayData.slots.map(slotData => {
                                    const rooms = slotData.availableRooms || [];

                                    return `
                                        <td class="border-b border-r border-gray-200 px-3 py-3 align-top last:border-r-0">
                                            ${rooms.length > 0 ? `<div class="flex flex-wrap justify-center gap-1">
                                                ${rooms.map(room =>
                                                    `<span class="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                                        ${room}
                                                    </span>`).join("")}</div>` : `<span class="text-xs italic text-gray-400"> No rooms </span>`
                                            }
                                        </td>
                                    `;
                                }).join("")}
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    let mobileHTML = `
        <div class="md:hidden space-y-6">
            ${availableRooms.map(dayData => `
                <section>
                    <h3 class="mb-3 text-base font-semibold text-gray-900">
                        ${dayData.day}
                    </h3>

                    <div class="space-y-3">
                        ${dayData.slots.map(slotData => {
                            const rooms = slotData.availableRooms || [];

                            return `
                                <div class="rounded-lg border border-gray-200 bg-white p-3">
                                    <div class="mb-2 flex items-center justify-between gap-3">
                                        <span class="text-sm font-semibold text-gray-800">
                                            ${TIME_SLOTS[slotData.slot - 1]}
                                        </span>

                                        <span class="text-xs text-gray-500">
                                            ${rooms.length}
                                            ${rooms.length === 1 ? "room" : "rooms"}
                                        </span>
                                    </div>

                                    ${
                                        rooms.length > 0
                                            ? `
                                                <div class="flex flex-wrap gap-2">
                                                    ${rooms.map(room => `
                                                        <span class="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700">
                                                            ${room}
                                                        </span>
                                                    `).join("")}
                                                </div>
                                            `
                                            : `
                                                <p class="text-xs italic text-gray-400">
                                                    No rooms available
                                                </p>
                                            `
                                    }
                                </div>
                            `;
                        }).join("")}
                    </div>
                </section>
            `).join("")}
        </div>
    `;

    const roomsSection = `
        <div class="mt-8">
            <div class="mb-4">
                <h2 class="text-lg font-semibold text-gray-900">
                    Available Rooms
                </h2>

                <p class="mt-1 text-sm text-gray-500">
                    Rooms that are not occupied during each time slot.
                </p>
            </div>

            ${desktopHTML}
            ${mobileHTML}
        </div>
    `;

    scheduleContainer.innerHTML += roomsSection;
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

        localStorage.removeItem("selectedBatch");
        localStorage.removeItem("selectedSection");

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
    try {
        const batches = await fetchBatches();

        availableRooms = await fetchAvailableRooms();

        buildBatchButtons(batches);
    } catch (error) {
        console.error(error);

        showError(
            "Couldn't load the routine. Please check your connection."
        );

        return;
    }

    const selectedRoutine = getSelectedRoutine();

    // No saved routine
    if (!selectedRoutine) {
        batchRow.classList.remove("hidden");
        sectionRow.classList.add("hidden");
        return;
    }

    // Restore saved batch
    activeBatch = Number(selectedRoutine.batch);

    try {
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

        const freshSchedule = await fetchFreshSchedule();

        buildScheduleTable(freshSchedule);

        // We restored the user's routine,
        // so show the section selector.
        batchRow.classList.add("hidden");
        sectionRow.classList.remove("hidden");

    } catch (error) {
        console.error(error);

        const cachedSchedule = getScheduleFromCache();

        if (cachedSchedule) {
            buildScheduleTable(cachedSchedule);
        } else {
            showError(
                "Couldn't load the routine. Please check your connection."
            );
        }

        batchRow.classList.add("hidden");
        sectionRow.classList.remove("hidden");
    }
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
    navigator.serviceWorker.register("/service-worker.js", {
        updateViaCache: "none"
    });
}