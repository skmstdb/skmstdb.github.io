document.addEventListener('DOMContentLoaded', function () {
    initShowcase();
    setInterval(updateProgressBars, 60000);
});

function updateProgressBars() {
    const now = getJSTNow();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-11

    // 1. Decade Progress
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

    const birthMonth = 9;
    const birthDay = 14;

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

    const currentDecadeStartAge = Math.floor(age / 10) * 10;
    const currentDecadeEndAge = currentDecadeStartAge + 10;

    const decadeStartBirthday = new Date(Date.UTC(1973 + currentDecadeStartAge, birthMonth, birthDay));
    const decadeEndBirthday = new Date(Date.UTC(1973 + currentDecadeEndAge, birthMonth, birthDay));

    const lifeDecadeProgress = (now - decadeStartBirthday) / (decadeEndBirthday - decadeStartBirthday) * 100;
    updateBar('life-decade', lifeDecadeProgress);
    document.getElementById('life-decade-label').textContent = `${currentDecadeStartAge}s`;

    const launchDate = createJSTDate(1973, 9, 14);
    const diffTime = Math.abs(now - launchDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('uptime-days').textContent = `${diffDays} Days`;
}

function updateBar(idPrefix, percentage) {
    const circle = document.getElementById(`${idPrefix}-bar`);
    const text = document.getElementById(`${idPrefix}-percent`);

    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

    const circumference = 226.19;
    const offset = circumference - (clampedPercentage / 100) * circumference;

    if (circle) circle.style.strokeDashoffset = offset;
    if (text) text.textContent = `${Math.floor(clampedPercentage)}%`;
}

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

        if (rows.length < 2) return [];

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
        header.push(current.trim());

        const today = getJSTNow();
        today.setUTCHours(0, 0, 0, 0);

        const works = rows
            .slice(1)
            .map(row => {
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
                cols.push(current.trim());

                if (cols.length < header.length) return null;

                const eventData = {};
                for (let i = 0; i < header.length && i < cols.length; i++) {
                    eventData[header[i]] = cols[i] ? cols[i].trim() : '';
                }

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

                let year = 0;
                const years = new Set();

                if (dateStart) years.add(dateStart.getUTCFullYear());
                if (dateEnd) years.add(dateEnd.getUTCFullYear());
                dateAdd.forEach(date => years.add(date.getUTCFullYear()));

                if (years.size > 0) {
                    year = Math.max(...years);
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
            .filter(work => {
                if (!work || !work.name || work.name.trim() === '' || !work.isLead) {
                    return false;
                }
                if (!work.year || work.year === 0) return false;
                return true;
            });

        const nameGroups = new Map();
        for (const work of works) {
            if (!nameGroups.has(work.name)) {
                nameGroups.set(work.name, []);
            }
            nameGroups.get(work.name).push(work);
        }

        const consolidatedWorks = [];
        for (const [name, worksInGroup] of nameGroups) {
            worksInGroup.sort((a, b) => a.dateStart - b.dateStart);

            const earliestWork = worksInGroup[0];

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
                if (w.dateAdd && w.dateAdd.length > 0) {
                    w.dateAdd.forEach(date => {
                        allYears.add(date.getUTCFullYear());
                        if (!minDateStart || date < minDateStart) minDateStart = date;
                        if (!maxDateEnd || date > maxDateEnd) maxDateEnd = date;
                    });
                }
            });

            const uniqueYears = [...allYears].sort((a, b) => a - b);
            const isMultiYear = uniqueYears.length > 1 && worksInGroup.length > 1;

            const todayForRecent = getJSTNow();
            todayForRecent.setUTCHours(0, 0, 0, 0);

            let hasRecentActivity = false;
            for (const iw of worksInGroup) {
                const dates = [];
                if (iw.dateStart) dates.push(iw.dateStart);
                if (iw.dateEnd) dates.push(iw.dateEnd);
                if (iw.dateAdd && iw.dateAdd.length > 0) dates.push(...iw.dateAdd);

                if (dates.length === 0) continue;

                const minDate = dates.reduce((a, b) => a < b ? a : b);
                const maxDate = dates.reduce((a, b) => a > b ? a : b);

                const startLimit = new Date(minDate);
                startLimit.setUTCDate(startLimit.getUTCDate() - 30);

                const endLimit = new Date(maxDate);
                endLimit.setUTCDate(endLimit.getUTCDate() + 30);

                if (todayForRecent >= startLimit && todayForRecent <= endLimit) {
                    hasRecentActivity = true;
                    break;
                }
            }

            consolidatedWorks.push({
                name: name,
                year: Math.max(...uniqueYears),
                years: uniqueYears.join(' '),
                type: earliestWork.type,
                url: earliestWork.url,
                dateStart: minDateStart,
                dateEnd: maxDateEnd,
                isMultiYear: isMultiYear,
                isRecent: hasRecentActivity
            });
        }

        // Sort by Year Descending, then by DateStart Descending
        return consolidatedWorks.sort((a, b) => {
            if (b.year !== a.year) {
                return b.year - a.year;
            }
            if (!a.dateStart && !b.dateStart) return 0;
            if (!a.dateStart) return 1;
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

        if (work.isMultiYear) {
            item.setAttribute('data-multi-year', 'true');
        }

        if (work.isRecent) {
            item.setAttribute('data-recent', 'true');
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

        const style = window.getComputedStyle(item);

        const getSpanFromProp = (prop) => {
            const val = style[prop];
            if (!val) return 0;
            const match = val.match(/span\s+(\d+)/);
            return match ? parseInt(match[1]) : 0;
        };

        const colSpan = Math.max(getSpanFromProp('gridColumnStart'), getSpanFromProp('gridColumnEnd'), 1);
        const rowSpan = Math.max(getSpanFromProp('gridRowStart'), getSpanFromProp('gridRowEnd'), 1);

        if (rowSpan > colSpan) {
            item.classList.add('vertical-text');
        }
    });

    updateProgressBars();
}

function renderProgressTiles(container) {
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
            <div class="progress-title"></div>
            <div class="uptime-label"></div>
            <div class="uptime-counter" id="uptime-days"></div>
        </div>
    `;
    container.appendChild(runningTile);
}
