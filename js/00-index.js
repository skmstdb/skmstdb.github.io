// --- Mini Calendar Logic (Robust Mode) ---

// Global error handler for this script block
window.addEventListener('error', function (e) {
    console.error('Script Error:', e.message, 'at', e.filename, ':', e.lineno);
});

document.addEventListener('DOMContentLoaded', function () {
    console.log('Mini Calendar Script Started');
    initMiniCalendar();
});

async function initMiniCalendar() {
    try {
        // Wait for JST Utils if needed (simple check)
        if (typeof getJSTNow !== 'function') {
            console.error('timezone.js not loaded!');
            return;
        }

        const today = getJSTNow();

        // Set Header (Hidden via CSS)
        const titleEl = document.getElementById('miniCalTitle');
        if (titleEl) titleEl.textContent = `${today.getUTCFullYear()}年 ${today.getUTCMonth() + 1}月`;

        console.log('Fetching CSVs...');

        // Fetch Data with relative paths (same as schedule mode in 06-cal.js)
        const [mainEvents, otherEvents, holidayEvents] = await Promise.all([
            fetchCSV('./data/biography.csv', 'main'),
            fetchCSV('./data/other.csv', 'other'),
            fetchSyukujitsu('./data/syukujitsu.csv')
        ]);

        console.log('Events loaded:', {
            main: mainEvents.length,
            other: otherEvents.length,
            holiday: holidayEvents.length
        });
        // Combine all events
        const allEvents = [...mainEvents, ...otherEvents, ...holidayEvents];

        renderMiniCalendar(today, allEvents);
    } catch (err) {
        console.error('Critical Error in initMiniCalendar:', err);
        const grid = document.getElementById('miniCalGrid');
        if (grid) grid.innerHTML = '<div style="padding:10px; color:red;">Script Error</div>';
    }
}

// Calculate 3 weeks: Previous, Current, Next
function renderMiniCalendar(today, events) {
    const grid = document.getElementById('miniCalGrid');
    if (!grid) { console.error('Grid element #miniCalGrid not found'); return; }
    grid.innerHTML = '';

    // Headers
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(d => {
        const h = document.createElement('div');
        h.className = 'cal-day-header';
        h.textContent = d;
        grid.appendChild(h);
    });

    // Calculate Start Date (Monday of Previous Week)
    const dayOfWeek = (today.getUTCDay() + 6) % 7; // Mon=0, Sun=6

    const currentWeekMon = new Date(today);
    currentWeekMon.setUTCDate(today.getUTCDate() - dayOfWeek);

    const startDate = new Date(currentWeekMon);
    startDate.setUTCDate(currentWeekMon.getUTCDate() - 7);

    // Render 21 days
    for (let i = 0; i < 21; i++) {
        const date = new Date(startDate);
        date.setUTCDate(startDate.getUTCDate() + i);

        const cell = document.createElement('div');
        cell.className = 'calendar-day';

        if (typeof isSameJSTDay === 'function' ? isSameJSTDay(date, today) : Utils_isSameJSTDay(date, today)) {
            cell.classList.add('today');
        }

        const num = document.createElement('div');
        num.className = 'calendar-day-number';
        num.textContent = date.getUTCDate();
        cell.appendChild(num);

        const daysEvents = events.filter(e => isEventOnDate(e, date));

        daysEvents.sort((a, b) => {
            const order = { 'main': 1, 'other': 2, 'holiday': 3 };
            return (order[a.source] || 4) - (order[b.source] || 4);
        });

        daysEvents.forEach(e => {
            // Create simple text element
            let eventElement;
            if (e.source === 'holiday') {
                eventElement = document.createElement('div');
                eventElement.style.cursor = 'default';
            } else {
                eventElement = document.createElement('a');
                eventElement.href = (e.url && e.url.trim() !== '') ? e.url : '#';
                eventElement.target = '_blank';
            }
            
            eventElement.classList.add('event-text');
            eventElement.textContent = e.title;
            
            cell.appendChild(eventElement);
        });

        grid.appendChild(cell);
    }
}

// --- Helper Functions ---

function Utils_isSameJSTDay(d1, d2) {
    return d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate();
}

function isEventOnDate(event, date) {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    // 处理Add列中的额外日期 (same as 06-cal.js)
    if (event.additionalDates && event.additionalDates.length > 0) {
        const dateStr = formatJSTDate(date);
        if (event.additionalDates.includes(dateStr)) {
            return true;
        }
    }

    // 检查 weekday 是否为数字（包括负数）
    const weekdayValue = parseInt(event.weekday);
    const isNumericWeekday = event.weekday && !isNaN(weekdayValue) && event.weekday.trim() !== '';

    // 如果有指定星期几且为数字，则只在特定星期几显示
    if (isNumericWeekday) {
        // 获取星期几 (0-6，0是星期日)
        const dayOfWeek = date.getUTCDay();
        // 将星期日的0转换为7，使1-7分别对应周一到周日
        const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        // 检查是否为负数（排除模式）
        const isExcludeMode = weekdayValue < 0;
        const absWeekday = Math.abs(weekdayValue);

        // 判断是否应该显示事件
        let shouldDisplay = false;

        if (isExcludeMode) {
            // 排除模式：如果当前星期不等于排除的星期，则显示
            shouldDisplay = adjustedDayOfWeek !== absWeekday;
        } else {
            // 包含模式：如果当前星期等于指定的星期，或者weekday包含当前星期，则显示
            shouldDisplay = event.weekday.includes(String(adjustedDayOfWeek)) ||
                event.weekday === String(adjustedDayOfWeek);
        }

        // 检查当前日期是否在排除列表中
        const dateString = formatJSTDate(date);
        const isExcludedDate = event.excludeDates && event.excludeDates.length > 0 &&
            event.excludeDates.some(excludeDate => {
                return dateString === excludeDate;
            });

        // 检查日期是否在事件范围内且应该显示且不在排除列表中
        const dateTime = date.getTime();
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();
        
        return dateTime >= startTime && dateTime <= endTime && shouldDisplay && !isExcludedDate;
    } else {
        // weekday 不是数字或为空，按照没有指定星期几的逻辑处理
        const dateTime = date.getTime();
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();

        // 检查日期是否在事件范围内
        if (dateTime < startTime || dateTime > endTime) {
            return false;
        }

        // 检查当前日期是否在排除列表中
        const dateString = formatJSTDate(date);
        const isExcludedDate = event.excludeDates && event.excludeDates.length > 0 &&
            event.excludeDates.some(excludeDate => {
                return dateString === excludeDate;
            });

        // 如果当前日期不在排除列表中，则显示事件
        return !isExcludedDate;
    }
}

async function fetchCSV(url, source) {
    try {
        // Cache busting
        const bustUrl = url + '?t=' + Date.now();
        console.log(`Fetching ${bustUrl}...`);
        const resp = await fetch(bustUrl);
        if (!resp.ok) {
            console.error(`Failed to fetch ${url}: ${resp.status}`);
            return [];
        }
        const text = await resp.text();

        // HTML Response Check
        if (text.trim().startsWith('<')) {
            console.error(`Fetch returned HTML for ${url}. Path is likely wrong.`);
            return [];
        }

        const rows = text.split('\n').filter(r => r.trim());
        if (rows.length < 2) return [];

        const header = parseCSVRow(rows[0]);
        const dateColName = header.includes('DateStart') ? 'DateStart' : 'Date';

        const results = rows.slice(1).map((row, index) => {
            const cols = parseCSVRow(row);
            if (cols.length < 1) return null;
            const data = {};
            header.forEach((h, i) => data[h.trim()] = cols[i]?.trim());

            const startVal = data[dateColName];
            const start = parseJSTDate(startVal);
            if (!start) {
                // Skip events without valid start date
                return null;
            }

            // Process exclude dates (DateDelete column)
            let excludeDates = [];
            if (data['DateDelete'] && data['DateDelete'].trim() !== '') {
                excludeDates = data['DateDelete'].split(',').map(d => {
                    const p = parseJSTDate(d.trim());
                    return p ? formatJSTDate(p) : null;
                }).filter(d => d);
            }

            // Process additional dates (DateAdd column)
            let additionalDates = [];
            if (data['DateAdd'] && data['DateAdd'].trim() !== '') {
                additionalDates = data['DateAdd'].split(',').map(d => {
                    const p = parseJSTDate(d.trim());
                    return p ? formatJSTDate(p) : null;
                }).filter(d => d);
            }

            return {
                startDate: start,
                endDate: data['DateEnd'] ? parseJSTDate(data['DateEnd']) : start,
                title: data['Title'] || data['Name'] || 'No Title',
                weekday: data['Weekday'],
                excludeDates: excludeDates,
                additionalDates: additionalDates,
                source: source
            };
        }).filter(e => e);

        console.log(`Parsed ${results.length} events from ${source}`);
        
        return results;
    } catch (e) { console.error('Fetch CSV Error:', url, e); return []; }
}

async function fetchSyukujitsu(url) {
    try {
        const bustUrl = url + '?t=' + Date.now();
        const resp = await fetch(bustUrl);
        const text = await resp.text();
        if (text.trim().startsWith('<')) return [];

        const rows = text.split('\n').filter(r => r.trim());
        if (rows.length < 2) return [];

        const header = parseCSVRow(rows[0]);
        return rows.slice(1).map(row => {
            const cols = parseCSVRow(row);
            const data = {};
            header.forEach((h, i) => data[h.trim()] = cols[i]?.trim());

            const date = parseJSTDate(data['Date']);
            if (!date) return null;

            return {
                startDate: date,
                endDate: date,
                title: data['Name'],
                source: 'holiday'
            };
        }).filter(e => e);
    } catch (e) { return []; }
}

// Basic CSV Row parser
function parseCSVRow(row) {
    if (!row) return [];
    const res = [];
    let inQ = false, val = '';
    for (let c of row) {
        if (c === '"') inQ = !inQ;
        else if (c === ',' && !inQ) { res.push(val); val = ''; }
        else val += c;
    }
    res.push(val);
    return res.map(v => v.replace(/^"(.*)"$/, '$1'));
}