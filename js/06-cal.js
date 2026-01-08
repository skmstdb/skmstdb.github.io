const CHARACTER_BIRTHDAYS = [
    { name: '乃木憂助の誕生日', month: 0, day: 25, startYear: 2024, url: 'https://h2col.notion.site/1b68a08476c780e78f0fe8e8e8441e1b' },
    { name: '伊達一義の誕生日', month: 5, day: 29, startYear: 2011, url: 'https://h2col.notion.site/1b68a08476c780caa667e03f4ffdffb8' },
    { name: '木村一樹の誕生日', month: 9, day: 11, startYear: 2008, url: 'https://h2col.notion.site/1b68a08476c78015ab14f23054250d11' },
    { name: '半沢直樹の誕生日', month: 11, day: 8, startYear: 2013, url: 'https://h2col.notion.site/1b68a08476c7804dba68d1ae0ae9e9cc' }
];

let currentViewMode = 'schedule'; // 'schedule', 'anniversary', 'year'

function calculateSakaiMilestones(year, month) {
    const milestones = [];
    // 1973年10月14日 (JS月份0-11，10月是9)
    const startDate = createJSTDate(1973, 9, 14); 
    
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    for (let d = 1; d <= lastDayOfMonth; d++) {
        const currentDate = createJSTDate(year, month, d);
        
        const diffTime = currentDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const dayCount = diffDays + 1;

        // 每100天提醒一次
        if (dayCount > 0 && dayCount % 100 === 0) {
            milestones.push({
                startDate: currentDate,
                endDate: currentDate,
                title: `S-${dayCount}th`,
                url: 'https://sakai-masato.com/',
                source: 'sakai-milestone',
                color: 'rgba(46, 204, 113, 0.8)', // 绿色
                id: 'milestone-' + dayCount
            });
        }
    }
    return milestones;
}

async function parseCSV() {
    try {
        const response = await fetch('/data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        if (rows.length < 2) return [];

        const headerRow = rows[0];
        const header = parseCSVRow(headerRow);

        const events = rows.slice(1).map(row => {
            const cols = parseCSVRow(row);
            if (cols.length < header.length) return null;

            const eventData = {};
            for (let i = 0; i < header.length && i < cols.length; i++) {
                eventData[header[i]] = cols[i] ? cols[i].trim() : '';
            }

            let excludeDates = [];
            if (eventData['DateDelete']) {
                excludeDates = eventData['DateDelete'].split(',').map(d => {
                    const parsed = parseJSTDate(d.trim());
                    return parsed ? formatDate(parsed) : null;
                }).filter(d => d !== null);
            }

            let additionalDates = [];
            if (eventData['DateAdd']) {
                additionalDates = eventData['DateAdd'].split(',').map(d => {
                    const parsed = parseJSTDate(d.trim());
                    return parsed ? formatDate(parsed) : null;
                }).filter(d => d !== null);
            }

            const startDate = parseJSTDate(eventData['DateStart']);
            if (!startDate) return null;

            return {
                startDate: startDate,
                endDate: eventData['DateEnd'] ? parseJSTDate(eventData['DateEnd']) : startDate,
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#',
                id: Math.random().toString(36).substr(2, 9),
                weekday: eventData['Weekday'] || '',
                excludeDates: excludeDates,
                additionalDates: additionalDates,
                source: 'main'
            };
        }).filter(event => event && event.title);

        const otherEvents = await parseOtherCSV();
        return [...events, ...otherEvents];
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
}

async function parseAnniversaryCSV() {
    try {
        const response = await fetch('/data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        if (rows.length < 2) return [];

        const header = parseCSVRow(rows[0]);
        const events = rows.slice(1).map(row => {
            const cols = parseCSVRow(row);
            if (cols.length < header.length) return null;
            const eventData = {};
            for (let i = 0; i < header.length && i < cols.length; i++) {
                eventData[header[i]] = cols[i] ? cols[i].trim() : '';
            }
            const startDate = parseJSTDate(eventData['DateStart']);
            if (!startDate) return null;
            return {
                startDate: startDate,
                endDate: eventData['DateEnd'] ? parseJSTDate(eventData['DateEnd']) : startDate,
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#',
                id: Math.random().toString(36).substr(2, 9),
                source: 'anniversary'
            };
        }).filter(event => event && event.title);
        return events;
    } catch (error) {
        console.error('Error loading Anniversary CSV data:', error);
        return [];
    }
}

function calculateAnniversaries(events, year, month) {
    const anniversaryEvents = [];
    const targetMonth = month;
    const targetYear = year;

    events.forEach(event => {
        const startDate = event.startDate;
        const endDate = event.endDate;
        const isSingleDay = startDate.getTime() === endDate.getTime();

        const addEvent = (date, title, color) => {
            if (date.getUTCFullYear() === targetYear && date.getUTCMonth() === targetMonth) {
                anniversaryEvents.push({
                    startDate: date,
                    endDate: date,
                    title: title,
                    url: event.url,
                    id: Math.random().toString(36).substr(2, 9),
                    source: 'anniversary',
                    color: color
                });
            }
        };

        const startYearsDiff = targetYear - startDate.getUTCFullYear();
        if (startYearsDiff > 0) {
            const annDate = new Date(startDate);
            annDate.setUTCFullYear(targetYear);
            addEvent(annDate, `${event.title} (${startYearsDiff}周年)`, 'rgba(231, 76, 60, 0.8)');
        }

        if (!isSingleDay) {
            const endYearsDiff = targetYear - endDate.getUTCFullYear();
            if (endYearsDiff > 0) {
                const annDate = new Date(endDate);
                annDate.setUTCFullYear(targetYear);
                addEvent(annDate, `${event.title} 終了 (${endYearsDiff}周年)`, 'rgba(231, 76, 60, 0.8)');
            }
        }

        const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDay = new Date(Date.UTC(targetYear, targetMonth, d));
            const diffTimeStart = currentDay.getTime() - startDate.getTime();
            const diffDaysStart = Math.floor(diffTimeStart / (1000 * 60 * 60 * 24));
            if (diffDaysStart > 0 && isSignificantDay(diffDaysStart)) {
                addEvent(currentDay, `${event.title} (${diffDaysStart}日)`, 'rgba(155, 89, 182, 0.8)');
            }
            if (!isSingleDay) {
                const diffTimeEnd = currentDay.getTime() - endDate.getTime();
                const diffDaysEnd = Math.floor(diffTimeEnd / (1000 * 60 * 60 * 24));
                if (diffDaysEnd > 0 && isSignificantDay(diffDaysEnd)) {
                    addEvent(currentDay, `${event.title} 終了 (${diffDaysEnd}日)`, 'rgba(155, 89, 182, 0.8)');
                }
            }
        }
    });
    return anniversaryEvents;
}

function isSignificantDay(days) {
    if (days < 100) return false;
    if (days < 1000) return days % 100 === 0;
    if (days < 10000) return days % 500 === 0;
    return days % 5000 === 0;
}

async function parseOtherCSV() {
    try {
        const response = await fetch('/data/other.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        if (rows.length < 2) return [];
        const header = parseCSVRow(rows[0]);
        const events = rows.slice(1).map(row => {
            const columns = parseCSVRow(row);
            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }
            const date = eventData['Date'] ? parseJSTDate(eventData['Date']) : null;
            if (!date) return null;
            return {
                startDate: date, endDate: date,
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#',
                id: Math.random().toString(36).substr(2, 9),
                source: 'other'
            };
        }).filter(event => event && event.title);
        return events;
    } catch (error) {
        console.error('Error loading other CSV data:', error);
        return [];
    }
}

function parseCSVRow(row) {
    const result = [];
    let insideQuotes = false;
    let currentValue = '';
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') insideQuotes = !insideQuotes;
        else if (char === ',' && !insideQuotes) {
            result.push(currentValue.trim());
            currentValue = '';
        } else currentValue += char;
    }
    result.push(currentValue.trim());
    return result.map(value => value.replace(/^"(.*)"$/, '$1'));
}

function generateCalendar(year, month, events) {
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.className = 'calendar-grid';
    calendarGrid.innerHTML = '';

    const days = ['月', '火', '水', '木', '金', '土', '日'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    const calendarTitle = document.getElementById('calendar-title');
    calendarTitle.textContent = `${year}年${month + 1}月`;

    const firstDay = createJSTDate(year, month, 1);
    const lastDay = createJSTDate(year, month + 1, 0);
    const firstDayOfWeek = (firstDay.getUTCDay() + 6) % 7;
    const prevMonthLastDay = createJSTDate(year, month, 0).getUTCDate();
    const today = getJSTNow();
    const isCurrentMonth = today.getUTCFullYear() === year && today.getUTCMonth() === month;

    for (let i = 0; i < firstDayOfWeek; i++) {
        const day = prevMonthLastDay - firstDayOfWeek + i + 1;
        const date = createJSTDate(year, month - 1, day);
        calendarGrid.appendChild(createDayElement(day, date, true));
    }

    for (let day = 1; day <= lastDay.getUTCDate(); day++) {
        const date = createJSTDate(year, month, day);
        const isToday = isCurrentMonth && today.getUTCDate() === day;
        calendarGrid.appendChild(createDayElement(day, date, false, isToday));
    }

    const totalDaysDisplayed = firstDayOfWeek + lastDay.getUTCDate();
    const totalCells = totalDaysDisplayed <= 35 ? 35 : 42;
    const remainingCells = totalCells - totalDaysDisplayed;
    for (let day = 1; day <= remainingCells; day++) {
        const date = createJSTDate(year, month + 1, day);
        calendarGrid.appendChild(createDayElement(day, date, true));
    }

    if (events && events.length > 0) renderEvents(calendarGrid, year, month, events);
}

function renderEvents(calendarGrid, year, month, events) {
    const dayElements = Array.from(calendarGrid.querySelectorAll('.calendar-day'));
    const firstDay = createJSTDate(year, month, 1);
    const firstDayOfWeek = (firstDay.getUTCDay() + 6) % 7;

    events.forEach(event => {
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);

        if (event.additionalDates) {
            event.additionalDates.forEach(formattedDateStr => {
                const additionalDate = parseJSTDate(formattedDateStr);
                if (additionalDate && additionalDate.getUTCFullYear() === year && additionalDate.getUTCMonth() === month) {
                    const dayIndex = additionalDate.getUTCDate() + firstDayOfWeek - 1;
                    if (dayElements[dayIndex]) {
                        const bento = document.createElement('a');
                        bento.href = event.url; bento.target = '_blank';
                        bento.classList.add('bento-container');
                        bento.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
                        const item = document.createElement('div');
                        item.classList.add('bento-item'); item.textContent = event.title;
                        bento.appendChild(item);
                        dayElements[dayIndex].appendChild(bento);
                    }
                }
            });
        }

        const monthStart = createJSTDate(year, month, 1);
        const monthEnd = createJSTDate(year, month + 1, 0);
        if (endDate < monthStart || startDate > monthEnd) return;

        const displayStart = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
        const displayEnd = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));

        let backgroundColor = 'rgba(52, 152, 219, 0.8)';
        if (event.source === 'sakai-birthday' || event.source === 'sakai-milestone') {
            backgroundColor = 'rgba(46, 204, 113, 0.8)';
        } else if (event.source === 'character-birthday') {
            backgroundColor = '#43AA8B';
        } else if (event.source === 'other') {
            backgroundColor = 'rgba(241, 196, 15, 0.8)';
        } else if (event.source === 'anniversary') {
            backgroundColor = event.color || 'rgba(231, 76, 60, 0.8)';
        } else if (event.source === 'syukujitsu') {
            backgroundColor = '#FFD1D1';
        }

        const weekdayValue = parseInt(event.weekday);
        const isNumericWeekday = event.weekday && !isNaN(weekdayValue) && event.weekday.trim() !== '';

        if (isNumericWeekday) {
            const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const date = createJSTDate(year, month, day);
                const dayOfWeek = date.getUTCDay();
                const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
                const isExcludeMode = weekdayValue < 0;
                const absWeekday = Math.abs(weekdayValue);
                let shouldDisplay = isExcludeMode ? (adjustedDayOfWeek !== absWeekday) : (event.weekday.includes(String(adjustedDayOfWeek)));

                const dateString = formatDate(date);
                const isExcluded = event.excludeDates && event.excludeDates.includes(dateString);

                if (date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime() && shouldDisplay && !isExcluded) {
                    const dayIndex = day + firstDayOfWeek - 1;
                    if (dayElements[dayIndex]) {
                        appendBento(dayElements[dayIndex], event, backgroundColor);
                    }
                }
            }
        } else {
            const startIndex = displayStart.getUTCDate() + firstDayOfWeek - 1;
            const endIndex = displayEnd.getUTCDate() + firstDayOfWeek - 1;
            for (let i = startIndex; i <= endIndex && i < dayElements.length; i++) {
                const currentDate = createJSTDate(year, month, i - firstDayOfWeek + 1);
                const dateString = formatJSTDate(currentDate);
                if (!(event.excludeDates && event.excludeDates.includes(dateString))) {
                    appendBento(dayElements[i], event, backgroundColor);
                }
            }
        }
    });
}

function appendBento(element, event, bgColor) {
    let bento;
    if (event.source === 'syukujitsu') {
        bento = document.createElement('div');
        bento.style.cursor = 'default';
        bento.style.color = '#c0392b';
    } else {
        bento = document.createElement('a');
        bento.href = event.url;
        bento.target = '_blank';
    }
    bento.classList.add('bento-container');
    bento.style.backgroundColor = bgColor;
    const item = document.createElement('div');
    item.classList.add('bento-item');
    item.textContent = event.title;
    bento.appendChild(item);
    element.appendChild(bento);
}

function createDayElement(day, date, isOtherMonth, isToday = false) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (isOtherMonth) dayElement.classList.add('other-month');
    if (isToday) dayElement.classList.add('today');

    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    if (isToday) {
        dayNumber.style.backgroundColor = 'red'; dayNumber.style.color = 'white';
        dayNumber.style.borderRadius = '50%'; dayNumber.style.padding = '5px';
        dayNumber.style.width = '25px'; dayNumber.style.height = '25px';
        dayNumber.style.display = 'flex'; dayNumber.style.justifyContent = 'center';
        dayNumber.style.alignItems = 'center';
    }
    dayElement.appendChild(dayNumber);
    dayElement.dataset.date = date.toISOString().split('T')[0];
    return dayElement;
}

function initializeSelectors() {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const currentYear = getJSTYear();

    yearSelect.innerHTML = '';
    for (let year = currentYear + 3; year >= 1992; year--) {
        const opt = document.createElement('option');
        opt.value = year; opt.textContent = year;
        yearSelect.appendChild(opt);
    }
    yearSelect.value = currentYear;

    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    monthSelect.innerHTML = '';
    months.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = name;
        monthSelect.appendChild(opt);
    });
    monthSelect.value = getJSTMonth();

    yearSelect.addEventListener('change', updateCalendar);
    monthSelect.addEventListener('change', updateCalendar);
}

async function updateCalendar() {
    const year = parseInt(document.getElementById('year-select').value);
    const month = parseInt(document.getElementById('month-select').value);

    let events = await parseCSV();

    if (currentViewMode !== 'year') {
        const sakaiMilestones = calculateSakaiMilestones(year, month);
        events = [...events, ...sakaiMilestones];

        const specialBirthdays = CHARACTER_BIRTHDAYS
            .filter(bday => year >= bday.startYear)
            .map(bday => ({
                startDate: createJSTDate(year, bday.month, bday.day),
                endDate: createJSTDate(year, bday.month, bday.day),
                title: `${bday.name}`,
                source: 'character-birthday',
                url: bday.url
            }));

        specialBirthdays.push({
            startDate: createJSTDate(year, 9, 14),
            endDate: createJSTDate(year, 9, 14),
            title: '堺さんの誕生日 🎂',
            source: 'sakai-birthday',
            url: 'https://sakai-masato.com/'
        });

        events = [...events, ...specialBirthdays];
    }

    // 根据模式进行渲染
    if (currentViewMode === 'year') {
        document.getElementById('calendar-title').textContent = `${year}年`;
        generateYearCalendar(year, events);
    } else if (currentViewMode === 'anniversary') {
        const rawAnniversary = await parseAnniversaryCSV();
        const annEvents = calculateAnniversaries(rawAnniversary, year, month);
        events = [...events, ...annEvents];
        document.getElementById('calendar-title').textContent = `${year}年${month + 1}月 (Anniversary)`;
        generateCalendar(year, month, events);
    } else {
        const holidayEvents = await parseSyukujitsuCSV();
        events = [...events, ...holidayEvents];
        document.getElementById('calendar-title').textContent = `${year}年${month + 1}月`;
        generateCalendar(year, month, events);
    }

    updateNavigationButtons(year, month);
    const container = document.querySelector('.calendar-container');
    if (container) { container.style.opacity = '1'; container.style.visibility = 'visible'; }
}

function generateYearCalendar(year, events) {
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.innerHTML = '';
    calendarGrid.className = 'calendar-grid year-mode-grid';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    months.forEach((monthName, monthIndex) => {
        const monthContainer = document.createElement('div');
        monthContainer.className = 'year-month-container';
        const monthTitle = document.createElement('div');
        monthTitle.className = 'year-month-title'; monthTitle.textContent = monthName;
        monthContainer.appendChild(monthTitle);

        const monthGrid = document.createElement('div');
        monthGrid.className = 'year-month-grid';

        const firstDay = createJSTDate(year, monthIndex, 1);
        const lastDay = createJSTDate(year, monthIndex + 1, 0);
        let firstDayOfWeek = (firstDay.getUTCDay() + 6) % 7;

        for (let i = 0; i < firstDayOfWeek; i++) {
            const empty = document.createElement('div');
            empty.className = 'year-day other-month';
            monthGrid.appendChild(empty);
        }

        for (let day = 1; day <= lastDay.getUTCDate(); day++) {
            const date = createJSTDate(year, monthIndex, day);
            const dayCell = document.createElement('div');
            dayCell.className = 'year-day'; dayCell.textContent = day;
            if (isJSTToday(date)) dayCell.classList.add('today');

            const dayEvents = events.filter(e => {
                const startTime = e.startDate.getTime();
                const endTime = e.endDate.getTime();
                const dateTime = date.getTime();
                let isInRange = dateTime >= startTime && dateTime <= endTime;
                let isValidWeekday = true;
                if (e.weekday) {
                    const val = parseInt(e.weekday);
                    if (!isNaN(val)) {
                        const dow = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
                        isValidWeekday = val < 0 ? (dow !== Math.abs(val)) : e.weekday.includes(String(dow));
                    }
                }
                const dateStr = formatJSTDate(date);
                const isEx = e.excludeDates && e.excludeDates.includes(dateStr);
                const isAdd = e.additionalDates && e.additionalDates.includes(dateStr);
                return (isInRange && isValidWeekday && !isEx) || isAdd;
            });

            if (dayEvents.length > 0) {
                dayCell.classList.add('has-event');
                const sources = new Set(dayEvents.map(e => e.source));
                
                if (sources.has('sakai-birthday') || sources.has('sakai-milestone')) {
                    dayCell.style.backgroundColor = 'rgba(46, 204, 113, 0.8)';
                } else if (sources.has('character-birthday')) {
                    dayCell.style.backgroundColor = '#43AA8B';
                } else if (sources.has('main')) {
                    dayCell.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
                } else if (sources.has('other')) {
                    dayCell.style.backgroundColor = 'rgba(241, 196, 15, 0.8)';
                }

                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = dayEvents.map(e => e.title).join('\n');
                dayCell.appendChild(tooltip);
            }
            monthGrid.appendChild(dayCell);
        }
        monthContainer.appendChild(monthGrid);
        calendarGrid.appendChild(monthContainer);
    });
}

async function parseSyukujitsuCSV() {
    try {
        const response = await fetch('/data/syukujitsu.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        if (rows.length < 2) return [];
        const header = parseCSVRow(rows[0]);
        const events = rows.slice(1).map(row => {
            const columns = parseCSVRow(row);
            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }
            const date = eventData['Date'] ? parseJSTDate(eventData['Date']) : null;
            if (!date) return null;
            return {
                startDate: date, endDate: date,
                title: eventData['Name'] || '', url: '',
                source: 'syukujitsu'
            };
        }).filter(e => e && e.title);
        return events;
    } catch (e) { return []; }
}

function updateNavigationButtons(year, month) {
    const prev = document.getElementById('prev-month');
    const next = document.getElementById('next-month');
    const currentYear = getJSTYear();
    const minYear = 1992;
    const maxYear = currentYear + 3;

    if (currentViewMode === 'year') {
        prev.disabled = year <= minYear;
        next.disabled = year >= maxYear;
    } else {
        prev.disabled = (year <= minYear && month <= 0);
        next.disabled = (year >= maxYear && month >= 11);
    }
    prev.style.opacity = prev.disabled ? '0.5' : '1';
    next.style.opacity = next.disabled ? '0.5' : '1';
}

async function initializeCalendar() {
    initializeSelectors();
    await updateCalendar();
}

function navigateMonth(direction) {
    const yrSel = document.getElementById('year-select');
    const moSel = document.getElementById('month-select');
    let yr = parseInt(yrSel.value);
    let mo = parseInt(moSel.value);

    if (currentViewMode === 'year') {
        yr = (direction === 'prev') ? yr - 1 : yr + 1;
    } else {
        if (direction === 'prev') {
            mo--; if (mo < 0) { mo = 11; yr--; }
        } else {
            mo++; if (mo > 11) { mo = 0; yr++; }
        }
    }
    yrSel.value = yr; moSel.value = mo;
    updateCalendar();
}

function applyDarkModeToCalendar() {
    const isDark = document.body.classList.contains('dark-mode');
    const root = document.documentElement;
    if (isDark) {
        root.style.setProperty('--other-month-bg-color', '#333');
        root.style.setProperty('--other-month-text-color', '#666');
        root.style.setProperty('--calendar-grid-gap-color', '#444');
        root.style.setProperty('--calendar-border-color', '#444');
    } else {
        root.style.setProperty('--other-month-bg-color', '#f0f0f0');
        root.style.setProperty('--other-month-text-color', '#bbb');
        root.style.setProperty('--calendar-grid-gap-color', '#ffffff');
        root.style.setProperty('--calendar-border-color', '#ffffff');
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    document.body.style.visibility = 'visible';
    await initializeCalendar();
    applyDarkModeToCalendar();

    const obs = new MutationObserver(muts => {
        muts.forEach(m => { if (m.attributeName === 'class') applyDarkModeToCalendar(); });
    });
    obs.observe(document.body, { attributes: true });

    document.getElementById('prev-month').addEventListener('click', () => navigateMonth('prev'));
    document.getElementById('next-month').addEventListener('click', () => navigateMonth('next'));
    document.getElementById('today-button').addEventListener('click', () => {
        const t = getJSTNow();
        document.getElementById('year-select').value = t.getUTCFullYear();
        document.getElementById('month-select').value = t.getUTCMonth();
        updateCalendar();
    });

    document.getElementById('view-mode-select').addEventListener('change', (e) => {
        currentViewMode = e.target.value;
        updateCalendar();
    });
});
