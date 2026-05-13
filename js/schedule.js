const SAKAI_BIRTH = { year: 1973, month: 9, day: 14 };

let cachedBiographyEvents = null;

async function fetchBiographyCSV() {
    if (cachedBiographyEvents) return cachedBiographyEvents;
    try {
        const response = await fetch('/data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        if (rows.length < 2) return [];

        const header = parseCSVRow(rows[0]);
        cachedBiographyEvents = rows.slice(1).map(row => {
            const cols = parseCSVRow(row);
            if (cols.length < header.length) return null;

            const eventData = {};
            for (let i = 0; i < header.length && i < cols.length; i++) {
                eventData[header[i]] = cols[i] ? cols[i].trim() : '';
            }

            const startDate = parseJSTDate(eventData['DateStart']);
            if (!startDate) return null;

            const excludeDates = (eventData['DateDelete'] || '').split(',').map(d => {
                const parsed = parseJSTDate(d.trim());
                return parsed ? formatDate(parsed) : null;
            }).filter(d => d !== null);

            const dateDelete = (eventData['DateDelete'] || '').split(',').map(d => parseJSTDate(d.trim())).filter(d => d && !isNaN(d.getTime()));

            const additionalDates = (eventData['DateAdd'] || '').split(',').map(d => {
                const parsed = parseJSTDate(d.trim());
                return parsed ? formatDate(parsed) : null;
            }).filter(d => d !== null);

            return {
                startDate: startDate,
                endDate: eventData['DateEnd'] ? parseJSTDate(eventData['DateEnd']) : startDate,
                title: eventData['Title'] || '',
                name: eventData['Name'] || '',
                note: eventData['Note'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#',
                id: Math.random().toString(36).substr(2, 9),
                weekday: eventData['Weekday'] || '',
                worksType: eventData['WorksType'] || '',
                excludeDates,
                dateDelete,
                additionalDates,
                source: 'main'
            };
        }).filter(event => event && event.title);
        return cachedBiographyEvents;
    } catch (error) {
        console.error('Error loading biography CSV:', error);
        return [];
    }
}

async function parseCSV() {
    const events = await fetchBiographyCSV();
    const otherEvents = await parseOtherCSV();
    return [...events, ...otherEvents];
}

async function parseAnniversaryCSV() {
    const events = await fetchBiographyCSV();
    return events.map(e => ({ ...e, source: 'anniversary' }));
}

async function parseWeekViewCSV() {
    return await fetchBiographyCSV();
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
                worksType: eventData['WorksType'] || '',
                source: 'other'
            };
        }).filter(event => event && event.title);
        return events;
    } catch (error) {
        console.error('Error loading other CSV data:', error);
        return [];
    }
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

// --- Schedule & Anniversary Calculations ---

function calculateAnniversaries(events, year, month) {
    const anniversaryEvents = [];
    const targetMonth = month;
    const targetYear = year;

    events.forEach(event => {
        const startDate = event.startDate;
        const endDate = event.endDate;
        const isSingleDay = startDate.getTime() === endDate.getTime();

        const addEvent = (date, anniversaryType, diffValue) => {
            if (date.getUTCFullYear() === targetYear && date.getUTCMonth() === targetMonth) {
                anniversaryEvents.push({
                    startDate: date,
                    endDate: date,
                    url: event.url,
                    id: Math.random().toString(36).substr(2, 9),
                    originalDate: event.startDate,
                    source: 'anniversary',
                    anniversaryType,
                    diffValue,
                    originalTitle: event.title
                });
            }
        };

        const startYearsDiff = targetYear - startDate.getUTCFullYear();
        if (startYearsDiff > 0) {
            const annDate = new Date(startDate);
            annDate.setUTCFullYear(targetYear);
            addEvent(annDate, 'start', startYearsDiff);
        }

        if (!isSingleDay) {
            const endYearsDiff = targetYear - endDate.getUTCFullYear();
            if (endYearsDiff > 0) {
                const annDate = new Date(endDate);
                annDate.setUTCFullYear(targetYear);
                addEvent(annDate, 'end', endYearsDiff);
            }
        }

        const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDay = new Date(Date.UTC(targetYear, targetMonth, d));
            const diffTimeStart = currentDay.getTime() - startDate.getTime();
            const diffDaysStart = Math.floor(diffTimeStart / (1000 * 60 * 60 * 24));
            if (diffDaysStart > 0 && isSignificantDay(diffDaysStart)) {
                addEvent(currentDay, 'days_start', diffDaysStart);
            }
            if (!isSingleDay) {
                const diffTimeEnd = currentDay.getTime() - endDate.getTime();
                const diffDaysEnd = Math.floor(diffTimeEnd / (1000 * 60 * 60 * 24));
                if (diffDaysEnd > 0 && isSignificantDay(diffDaysEnd)) {
                    addEvent(currentDay, 'days_end', diffDaysEnd);
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

// --- Shared Helpers ---

function isValidWeekdayForDate(weekdayStr, date) {
    if (!weekdayStr) return true;
    const actualDay = date.getUTCDay();
    const dayNum = actualDay === 0 ? 7 : actualDay;
    const weekdays = weekdayStr.split(',').map(w => w.trim());

    for (const wd of weekdays) {
        const num = parseInt(wd, 10);
        if (Number.isNaN(num)) continue;

        if (num < 0) {
            if (dayNum !== Math.abs(num)) return true;
        } else if (dayNum === num) {
            return true;
        }
    }
    return false;
}

function getSakaiBirthdayInfo(date) {
    const isBirthday = date.getUTCMonth() === (SAKAI_BIRTH.month) && date.getUTCDate() === SAKAI_BIRTH.day;
    const age = date.getUTCFullYear() - SAKAI_BIRTH.year;

    const nextBirthday = createJSTDate(date.getUTCFullYear(), SAKAI_BIRTH.month, SAKAI_BIRTH.day);
    if (date > nextBirthday) {
        nextBirthday.setUTCFullYear(nextBirthday.getUTCFullYear() + 1);
    }
    const daysUntilBirthday = Math.ceil((nextBirthday - date) / (1000 * 60 * 60 * 24));
    const nextAge = nextBirthday.getUTCFullYear() - SAKAI_BIRTH.year;

    return { isBirthday, age, daysUntilBirthday, nextAge };
}

//[Used by: Schedule, Anniversary, Year, Upcoming, Week, Month View, Activity View]
function isEventActiveOnDate(event, date) {
    const dateStr = formatDate(date);

    // 1. Check additional dates (Whitelist)
    if (event.additionalDates && event.additionalDates.includes(dateStr)) {
        return true;
    }

    // 2. Check exclude dates (Blacklist)
    if (event.excludeDates && event.excludeDates.includes(dateStr)) {
        return false;
    }

    // 3. Check date range
    const startTime = event.startDate.getTime();
    const endTime = event.endDate ? event.endDate.getTime() : startTime;
    const dateTime = date.getTime();

    if (dateTime < startTime || dateTime > endTime) {
        return false;
    }

    // 4. Check weekday requirement
    return isValidWeekdayForDate(event.weekday, date);
}
