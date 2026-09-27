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

const availableRoomsContainer =
    document.getElementById("availableRooms");

// ==============================
// Fixed timeslots
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
// Error handling
// ==============================

function showError(message) {
    availableRoomsContainer.innerHTML = `
        <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center text-red-700">
            ${message}
        </div>
    `;
}

// ==============================
// Build available rooms
// ==============================

function buildAvailableRoomsTable(availableRooms) {

    // ==============================
    // Desktop
    // ==============================

    const desktopHTML = `
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

                                    const rooms =
                                        slotData.availableRooms || [];

                                    return `
                                        <td class="border-b border-r border-gray-200 px-3 py-3 align-top last:border-r-0">

                                            ${
                                                rooms.length > 0
                                                    ? `
                                                        <div class="flex flex-wrap justify-center gap-1">
                                                            ${rooms.map(room => `
                                                                <span class="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                                                    ${room}
                                                                </span>
                                                            `).join("")}
                                                        </div>
                                                    `
                                                    : `
                                                        <span class="text-xs italic text-gray-400">
                                                            No rooms
                                                        </span>
                                                    `
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

    // ==============================
    // Mobile
    // ==============================

    const mobileHTML = `
        <div class="md:hidden space-y-6">

            ${availableRooms.map(dayData => `
                <section>

                    <h3 class="mb-3 text-base font-semibold text-gray-900">
                        ${dayData.day}
                    </h3>

                    <div class="space-y-3">

                        ${dayData.slots.map(slotData => {

                            const rooms =
                                slotData.availableRooms || [];

                            return `
                                <div class="rounded-lg border border-gray-200 bg-white p-3">

                                    <div class="mb-2 flex items-center justify-between gap-3">

                                        <span class="text-sm font-semibold text-gray-800">
                                            ${TIME_SLOTS[slotData.slot - 1]}
                                        </span>

                                        <span class="text-xs text-gray-500">
                                            ${rooms.length}
                                            ${rooms.length === 1
                                                ? "room"
                                                : "rooms"}
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

    availableRoomsContainer.innerHTML = `
        ${desktopHTML}
        ${mobileHTML}
    `;
}

// ==============================
// Initialize
// ==============================

async function init() {
    try {
        availableRoomsContainer.innerHTML = `
            <div class="py-8 text-center text-gray-500">
                Loading available rooms...
            </div>
        `;

        const availableRooms =
            await fetchAvailableRooms();

        buildAvailableRoomsTable(
            availableRooms
        );

    } catch (error) {
        console.error(error);

        showError(
            "Couldn't load available rooms. Please check your connection."
        );
    }
}

init();

// ==============================
// Refresh every 5 mins
// ==============================

setInterval(async () => {
    try {
        const availableRooms =
            await fetchAvailableRooms();

        buildAvailableRoomsTable(
            availableRooms
        );

    } catch (error) {
        console.error(error);
    }
}, 300 * 1000);

// ==============================
// Service worker registration
// ==============================

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(
        "/service-worker.js",
        {
            updateViaCache: "none"
        }
    );
}