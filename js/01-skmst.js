document.addEventListener('DOMContentLoaded', function () {
    // Initialize Showcase
    initShowcase();

    // Update every minute
    setInterval(updateProgressBars, 60000);
});

function updateProgressBars() {
    const now = getJSTNow();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-11

    // 1. Decade Progress (2020-2029)
    const startOfDecade = new Date(Date.UTC(Math.floor(year / 10) * 10, 0, 1));
    const endOfDecade = new Date(Date.UTC((Math.floor(year / 10) + 1) * 10, 0, 1));
    const decadeProgress = (now - startOfDecade) / (endOfDecade - startOfDecade) * 100;
    updateBar('decade', decadeProgress);
    document.getElementById('decade-label').textContent = `${Math.floor(year / 10) * 10}s`;

    // 2. Year Progress
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year + 1, 0, 1));
    const yearProgress = (now - startOfYear) / (endOfYear - startOfYear) * 100;
    updateBar('year', yearProgress);
    document.getElementById('year-label').textContent = `${year}`;

    // 3. Quarter Progress
    const quarter = Math.floor(month / 3);
    const startOfQuarter = new Date(Date.UTC(year, quarter * 3, 1));
    const endOfQuarter = new Date(Date.UTC(year, (quarter + 1) * 3, 1));
    const quarterProgress = (now - startOfQuarter) / (endOfQuarter - startOfQuarter) * 100;
    updateBar('quarter', quarterProgress);
    document.getElementById('quarter-label').textContent = `Q${quarter + 1}`;

    // 4. Month Progress
    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 1));
    const monthProgress = (now - startOfMonth) / (endOfMonth - startOfMonth) * 100;
    updateBar('month', monthProgress);
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    document.getElementById('month-label').textContent = `${monthNames[month]}`;

    // 5. Sakai Masato Age Progress
    // Born: 1973-10-14
    const birthMonth = 9; // October (0-indexed)
    const birthDay = 14;

    // Calculate current age
    let age = year - 1973;
    if (month < birthMonth || (month === birthMonth && now.getUTCDate() < birthDay)) {
        age--;
    }

    let lastBirthday = new Date(Date.UTC(year, birthMonth, birthDay));
    let nextBirthday = new Date(Date.UTC(year + 1, birthMonth, birthDay));

    if (now < lastBirthday) {
        lastBirthday = new Date(Date.UTC(year - 1, birthMonth, birthDay));
        nextBirthday = new Date(Date.UTC(year, birthMonth, birthDay));
    }

    const ageProgress = (now - lastBirthday) / (nextBirthday - lastBirthday) * 100;
    updateBar('age', ageProgress);
    document.getElementById('age-label').textContent = `${age}`;

    // 6. 50s Decade Progress (or whatever decade he is in)
    // Born 1973. 
    // 50s: 50-59. Starts at 50th birthday, ends at 60th birthday.
    const currentDecadeStartAge = Math.floor(age / 10) * 10;
    const currentDecadeEndAge = currentDecadeStartAge + 10;

    const decadeStartBirthday = new Date(Date.UTC(1973 + currentDecadeStartAge, birthMonth, birthDay));
    const decadeEndBirthday = new Date(Date.UTC(1973 + currentDecadeEndAge, birthMonth, birthDay));

    const lifeDecadeProgress = (now - decadeStartBirthday) / (decadeEndBirthday - decadeStartBirthday) * 100;
    updateBar('life-decade', lifeDecadeProgress);
    document.getElementById('life-decade-label').textContent = `${currentDecadeStartAge}s`;

    // 7. Website Uptime
    // Launched: 2025-02-27 (JST)
    const launchDate = createJSTDate(2025, 1, 27); // Feb is 1 (0-indexed)
    const diffTime = Math.abs(now - launchDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('uptime-days').textContent = `${diffDays} Days`;
}

function updateBar(idPrefix, percentage) {
    const circle = document.getElementById(`${idPrefix}-bar`);
    const text = document.getElementById(`${idPrefix}-percent`);

    // Clamp percentage between 0 and 100
    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

    // Circumference = 2 * PI * 36 = 226.19
    const circumference = 226.19;
    const offset = circumference - (clampedPercentage / 100) * circumference;

    if (circle) circle.style.strokeDashoffset = offset;
    // No decimal places
    if (text) text.textContent = `${Math.floor(clampedPercentage)}%`;
}

// --- Showcase Logic ---

async function initShowcase() {
    const works = await fetchWorks();
    if (works.length === 0) return;
    renderShowcase('showcase-list', works);
}

async function fetchWorks() {
    try {
        const response = await fetch('/data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n');
        
        if (rows.length < 2) return []; // Need at least header and one data row
        
        // Extract header row and create column name mapping
        const headerRow = rows[0];
        const header = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < headerRow.length; i++) {
            const char = headerRow[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                header.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        header.push(current.trim()); // Push last column
        
        const today = getJSTNow();
        today.setUTCHours(0, 0, 0, 0); // Reset time to midnight for date comparison

        const works = rows
            .slice(1) // Skip header row
            .map(row => {
                // Handle CSV with potential commas in quoted fields
                const cols = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        cols.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                cols.push(current.trim()); // Push last column

                if (cols.length < header.length) return null;

                // Build eventData object with named properties
                const eventData = {};
                for (let i = 0; i < header.length && i < cols.length; i++) {
                    eventData[header[i]] = cols[i] ? cols[i].trim() : '';
                }

                // Filter by Note column: exclude rows containing 'memo' or 'uwasa'
                const note = eventData['Note'] || '';
                const noteWords = note.toLowerCase().split(',').map(word => word.trim());
                if (noteWords.includes('memo') || noteWords.includes('uwasa')) {
                    return null;
                }

                const dateStartStr = eventData['DateStart'];
                let dateStart = null;
                if (dateStartStr && dateStartStr.trim() !== '') {
                    dateStart = parseJSTDate(dateStartStr);
                }

                const dateEndStr = eventData['DateEnd'];
                let dateEnd = null;
                if (dateEndStr && dateEndStr.trim() !== '') {
                    dateEnd = parseJSTDate(dateEndStr);
                }

                const dateAddStr = eventData['DateAdd'];
                let dateAdd = [];
                if (dateAddStr && dateAddStr.trim() !== '') {
                    dateAdd = dateAddStr.split(',').map(d => parseJSTDate(d.trim())).filter(d => d);
                }

                // Calculate year from DateStart, DateEnd, and DateAdd
                let year = 0;
                const years = new Set();
                
                if (dateStart) years.add(dateStart.getUTCFullYear());
                if (dateEnd) years.add(dateEnd.getUTCFullYear());
                dateAdd.forEach(date => years.add(date.getUTCFullYear()));
                
                if (years.size > 0) {
                    year = Math.max(...years); // Use the latest year
                }

                return {
                    year: year,
                    name: eventData['Name'],
                    title: eventData['Title'],
                    role: eventData['Role'],
                    type: eventData['WorksType'],
                    dateStart: dateStart,
                    dateEnd: dateEnd,
                    dateAdd: dateAdd,
                    url: eventData['URL'],
                    isLead: (eventData['Role'] && eventData['Role'].includes('主演'))
                };
            })
            // Filter for Lead roles, valid names, and Year 
            .filter(work => {
                if (!work || !work.name || work.name.trim() === '' || !work.isLead) {
                    return false;
                }
                // Must have Year
                if (!work.year || work.year === 0) return false;
                return true;
            });

        // Group by Name
        const nameGroups = new Map();
        for (const work of works) {
            if (!nameGroups.has(work.name)) {
                nameGroups.set(work.name, []);
            }
            nameGroups.get(work.name).push(work);
        }

        // Consolidate each name group
        const consolidatedWorks = [];
        for (const [name, worksInGroup] of nameGroups) {
            // Sort by dateStart to find the earliest
            worksInGroup.sort((a, b) => a.dateStart - b.dateStart);

            // Use the earliest work's type for grid sizing
            const earliestWork = worksInGroup[0];

            // Calculate min DateStart and max DateEnd, including DateAdd
            let minDateStart = null;
            let maxDateEnd = null;
            const allYears = new Set();

            worksInGroup.forEach(w => {
                if (w.dateStart) {
                    if (!minDateStart || w.dateStart < minDateStart) minDateStart = w.dateStart;
                    allYears.add(w.dateStart.getUTCFullYear());
                }
                if (w.dateEnd) {
                    if (!maxDateEnd || w.dateEnd > maxDateEnd) maxDateEnd = w.dateEnd;
                    allYears.add(w.dateEnd.getUTCFullYear());
                }
                // Include DateAdd dates
                if (w.dateAdd && w.dateAdd.length > 0) {
                    w.dateAdd.forEach(date => {
                        allYears.add(date.getUTCFullYear());
                        if (!minDateStart || date < minDateStart) minDateStart = date;
                        if (!maxDateEnd || date > maxDateEnd) maxDateEnd = date;
                    });
                }
            });

            // Check if this work spans multiple years AND appears in different rows
            const uniqueYears = [...allYears].sort((a, b) => a - b);
            const isMultiYear = uniqueYears.length > 1 && worksInGroup.length > 1;

            // Use the earliest work's URL (or could use the most recent, depending on preference)
            consolidatedWorks.push({
                name: name,
                year: Math.max(...uniqueYears), // Use the latest year for sorting
                years: uniqueYears.join(' '),
                type: earliestWork.type,
                url: earliestWork.url,
                dateStart: minDateStart,
                dateEnd: maxDateEnd,
                isMultiYear: isMultiYear
            });
        }

        // Sort by Year Descending, then by DateStart Descending
        return consolidatedWorks.sort((a, b) => {
            // First, sort by year (most recent first)
            if (b.year !== a.year) {
                return b.year - a.year;
            }
            // If years are the same, sort by DateStart (most recent first)
            // Handle cases where DateStart might be null
            if (!a.dateStart && !b.dateStart) return 0;
            if (!a.dateStart) return 1; // Put items without dateStart at the end
            if (!b.dateStart) return -1;
            return b.dateStart - a.dateStart;
        });
    } catch (error) {
        console.error('Error fetching works:', error);
        return [];
    }
}

function renderShowcase(containerId, works) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // 1. Render Progress Tiles First
    renderProgressTiles(container);

    // 2. Render Works
    works.forEach((work) => {
        const item = document.createElement('div');
        item.className = 'showcase-item';
        item.setAttribute('data-type', work.type || 'その他');

        // Check if work spans multiple years and appears in different rows
        if (work.isMultiYear) {
            item.setAttribute('data-multi-year', 'true');
        }

        // Check if work is recent (within 30 days of start/end or active)
        // Criteria:
        // 1. |Today - DateStart| <= 30 days
        // 2. |Today - DateEnd| <= 30 days
        // 3. DateStart <= Today <= DateEnd
        // Effectively: DateStart - 30 <= Today <= DateEnd + 30

        let isRecent = false;
        if (work.dateStart) {
            const today = getJSTNow();
            today.setUTCHours(0, 0, 0, 0);

            const startLimit = new Date(work.dateStart);
            startLimit.setUTCDate(startLimit.getUTCDate() - 30);

            // If dateEnd is missing, assume it's just a start date event (like a movie release)
            // So we check if today is within 30 days of start
            let endLimit = new Date(work.dateEnd || work.dateStart);
            endLimit.setUTCDate(endLimit.getUTCDate() + 30);

            if (today >= startLimit && today <= endLimit) {
                isRecent = true;
                item.setAttribute('data-recent', 'true');
            }
        }

        // Content Wrapper
        const content = document.createElement('div');
        content.className = 'showcase-content';

        const title = document.createElement('div');
        title.className = 'showcase-title';
        title.textContent = work.name;

        const meta = document.createElement('div');
        meta.className = 'showcase-meta';
        meta.textContent = work.years;

        content.appendChild(title);
        content.appendChild(meta);
        item.appendChild(content);

        // Click to navigate to URL or search
        item.onclick = () => {
            if (work.url && work.url.trim() !== '') {
                window.open(work.url, '_blank');
            } else {
                window.open(`https://www.google.com/search?q=堺雅人 ${work.name}`, '_blank');
            }
        };

        container.appendChild(item);

        // Dynamic Check: Apply vertical text if rowSpan > colSpan
        // Must be done AFTER appending to DOM to get computed styles
        const style = window.getComputedStyle(item);

        const getSpanFromProp = (prop) => {
            const val = style[prop];
            if (!val) return 0;
            const match = val.match(/span\s+(\d+)/);
            return match ? parseInt(match[1]) : 0;
        };

        // Check both start and end for 'span'
        const colSpan = Math.max(getSpanFromProp('gridColumnStart'), getSpanFromProp('gridColumnEnd'), 1);
        const rowSpan = Math.max(getSpanFromProp('gridRowStart'), getSpanFromProp('gridRowEnd'), 1);

        if (rowSpan > colSpan) {
            item.classList.add('vertical-text');
        }
    });


    // Update progress bars after rendering
    updateProgressBars();
}

function renderProgressTiles(container) {
    // Helper to create ring HTML
    const createRing = (idPrefix, label) => `
        <div class="progress-item-ring">
            <div class="progress-ring-container">
                <svg class="progress-ring" width="80" height="80">
                    <circle class="progress-ring-circle-bg" cx="40" cy="40" r="36"></circle>
                    <circle class="progress-ring-circle-fill" id="${idPrefix}-bar" cx="40" cy="40" r="36"></circle>
                </svg>
                <div class="progress-text-center" id="${idPrefix}-percent">0%</div>
            </div>
            <div class="progress-label-bottom" id="${idPrefix}-label">${label}</div>
        </div>
    `;

    // Sakai Tile (2x1)
    const sakaiTile = document.createElement('div');
    sakaiTile.className = 'progress-tile sakai';
    sakaiTile.innerHTML = `
        <div class="progress-section">
            <div class="progress-title">堺さん</div>
            <div class="progress-grid">
                ${createRing('age', 'Age')}
                ${createRing('life-decade', 'Decade')}
            </div>
        </div>
    `;
    container.appendChild(sakaiTile);

    // Now Tile (2x2)
    const nowTile = document.createElement('div');
    nowTile.className = 'progress-tile now';
    nowTile.innerHTML = `
        <div class="progress-section">
            <div class="progress-title">Now</div>
            <div class="progress-grid">
                ${createRing('decade', 'Decade')}
                ${createRing('year', 'Year')}
                ${createRing('quarter', 'Quarter')}
                ${createRing('month', 'Month')}
            </div>
        </div>
    `;
    container.appendChild(nowTile);

    // Running Tile (1x1)
    const runningTile = document.createElement('div');
    runningTile.className = 'progress-tile running';
    runningTile.innerHTML = `
        <div class="progress-section">
            <div class="progress-title">Running</div>
            <div class="uptime-label">Since 2025.02.27</div>
            <div class="uptime-counter" id="uptime-days">0 Days</div>
        </div>
    `;
    container.appendChild(runningTile);
}
