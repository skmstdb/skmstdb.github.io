async function parseActivityData() {
    const maxRetries = 3;
    const retryDelay = 1000; 

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); 

            const response = await fetch('/data/biography.csv', {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.text();

            if (!data || data.trim() === '') {
                throw new Error('Empty CSV file received');
            }

            const rows = data.split('\n').filter(row => row.trim());

            if (rows.length < 2) {
                console.warn('Biography CSV has insufficient data (header only or empty)');
                return [];
            }

            const header = parseCSVRow(rows[0]).map(col => col.trim());
            const events = rows.slice(1).map((row, rowIndex) => {
                try {
                    const cols = parseCSVRow(row);
                    if (cols.length < header.length) {
                        console.warn(`Row ${rowIndex + 2} has insufficient columns (${cols.length} vs ${header.length})`);
                        return null;
                    }

                    const eventData = {};
                    for (let i = 0; i < header.length && i < cols.length; i++) {
                        eventData[header[i]] = cols[i] ? cols[i].trim() : '';
                    }
                    let excludeDates = [];
                    if (eventData['DateDelete'] && eventData['DateDelete'].trim() !== '') {
                        excludeDates = eventData['DateDelete'].split(',')
                            .map(date => date.trim())
                            .map(dateStr => {
                                try {
                                    const parsedDate = parseJSTDate(dateStr);
                                    return parsedDate ? formatDate(parsedDate) : null;
                                } catch (error) {
                                    console.warn(`Invalid exclude date "${dateStr}" in row ${rowIndex + 2}:`, error);
                                    return null;
                                }
                            })
                            .filter(date => date !== null);
                    }

                    let additionalDates = [];
                    if (eventData['DateAdd'] && eventData['DateAdd'].trim() !== '') {
                        additionalDates = eventData['DateAdd'].split(',')
                            .map(date => date.trim())
                            .map(dateStr => {
                                try {
                                    const parsedDate = parseJSTDate(dateStr);
                                    return parsedDate ? formatDate(parsedDate) : null;
                                } catch (error) {
                                    console.warn(`Invalid additional date "${dateStr}" in row ${rowIndex + 2}:`, error);
                                    return null;
                                }
                            })
                            .filter(date => date !== null);
                    }

                    let startDate;
                    try {
                        startDate = parseJSTDate(eventData['DateStart']);
                        if (!startDate) {
                            console.warn(`Invalid start date "${eventData['DateStart']}" in row ${rowIndex + 2}`);
                            return null;
                        }
                    } catch (error) {
                        console.warn(`Error parsing start date "${eventData['DateStart']}" in row ${rowIndex + 2}:`, error);
                        return null;
                    }

                    let endDate = startDate;
                    if (eventData['DateEnd'] && eventData['DateEnd'].trim() !== '') {
                        try {
                            const parsedEndDate = parseJSTDate(eventData['DateEnd']);
                            if (parsedEndDate) {
                                endDate = parsedEndDate;
                            } else {
                                console.warn(`Invalid end date "${eventData['DateEnd']}" in row ${rowIndex + 2}, using start date`);
                            }
                        } catch (error) {
                            console.warn(`Error parsing end date "${eventData['DateEnd']}" in row ${rowIndex + 2}:`, error);
                        }
                    }

                    if (endDate < startDate) {
                        console.warn(`End date before start date in row ${rowIndex + 2}, swapping dates`);
                        [startDate, endDate] = [endDate, startDate];
                    }

                    return {
                        startDate: startDate,
                        endDate: endDate,
                        title: eventData['Title'] || `Event ${rowIndex + 1}`,
                        url: eventData['URL'] ? eventData['URL'].trim() : '#',
                        id: Math.random().toString(36).substring(2, 11),
                        weekday: eventData['Weekday'] || '',
                        excludeDates: excludeDates,
                        additionalDates: additionalDates,
                        source: 'main'
                    };
                } catch (error) {
                    console.warn(`Error processing row ${rowIndex + 2}:`, error);
                    return null;
                }
            }).filter(event => event && event.title);

            const otherEvents = await parseOtherActivityData();

            const allEvents = [...events, ...otherEvents];

            console.log(`Successfully loaded ${allEvents.length} events (${events.length} from biography.csv, ${otherEvents.length} from other.csv)`);
            return allEvents;

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);

            if (attempt === maxRetries) {
                console.error('All retry attempts failed, returning empty data');
                return [];
            }

            console.log(`Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    return []; 
}

async function parseOtherActivityData() {
    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch('/data/other.csv', {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.text();

            if (!data || data.trim() === '') {
                console.warn('Other CSV file is empty');
                return [];
            }

            const rows = data.split('\n').filter(row => row.trim());

            if (rows.length < 2) {
                console.warn('Other CSV has insufficient data (header only or empty)');
                return [];
            }

            const header = parseCSVRow(rows[0]).map(col => col.trim());

            const events = rows.slice(1).map((row, rowIndex) => {
                try {
                    const columns = parseCSVRow(row);
                    if (columns.length === 0) {
                        console.warn(`Empty row ${rowIndex + 2} in other.csv`);
                        return null;
                    }

                    const eventData = {};
                    for (let i = 0; i < header.length && i < columns.length; i++) {
                        eventData[header[i]] = columns[i] ? columns[i].trim() : '';
                    }

                    let date;
                    try {
                        date = eventData['Date'] ? parseJSTDate(eventData['Date']) : null;
                        if (!date) {
                            console.warn(`Invalid date "${eventData['Date']}" in other.csv row ${rowIndex + 2}`);
                            return null;
                        }
                    } catch (error) {
                        console.warn(`Error parsing date "${eventData['Date']}" in other.csv row ${rowIndex + 2}:`, error);
                        return null;
                    }

                    return {
                        startDate: date,
                        endDate: date, 
                        title: eventData['Title'] || `Other Event ${rowIndex + 1}`,
                        url: eventData['URL'] ? eventData['URL'].trim() : '#',
                        id: Math.random().toString(36).substring(2, 11),
                        source: 'other' 
                    };
                } catch (error) {
                    console.warn(`Error processing other.csv row ${rowIndex + 2}:`, error);
                    return null;
                }
            }).filter(event => event && event.title);

            return events;

        } catch (error) {
            console.error(`Other CSV attempt ${attempt} failed:`, error);

            if (attempt === maxRetries) {
                console.error('All retry attempts for other.csv failed, returning empty data');
                return [];
            }

            console.log(`Retrying other.csv in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    return [];
}

function parseCSVRow(row) {
    if (!row || typeof row !== 'string') {
        console.warn('Invalid row data provided to parseCSVRow:', row);
        return [];
    }

    const result = [];
    let insideQuotes = false;
    let currentValue = '';

    try {
        for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                result.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        result.push(currentValue);

        return result.map(value => {
            if (typeof value !== 'string') return '';
            return value.replace(/^"(.*)"$/, '$1').replace(/""/g, '"');
        });
    } catch (error) {
        console.error('Error parsing CSV row:', error);
        return [];
    }
}

function processYearlyActivity(events, year) {
    if (!Array.isArray(events)) {
        console.warn('Invalid events array provided to processYearlyActivity:', events);
        return {
            year: year,
            activityDays: new Set(),
            totalDays: isLeapYear(year) ? 366 : 365,
            hasActivity: false
        };
    }

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        console.warn('Invalid year provided to processYearlyActivity:', year);
        return {
            year: year,
            activityDays: new Set(),
            totalDays: 365,
            hasActivity: false
        };
    }

    const activityDays = new Set();
    const yearStart = createJSTDate(year, 0, 1);
    const yearEnd = createJSTDate(year, 11, 31);

    events.forEach((event, eventIndex) => {
        try {
            if (!event || !event.startDate || !event.endDate) {
                console.warn(`Invalid event at index ${eventIndex}:`, event);
                return;
            }
            const startDate = event.startDate;
            const endDate = event.endDate;

            if (!(startDate instanceof Date) || !(endDate instanceof Date) ||
                isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn(`Invalid dates in event ${eventIndex}:`, { startDate, endDate });
                return;
            }

            if (endDate < yearStart || startDate > yearEnd) {
                return;
            }

            const displayStart = new Date(Math.max(startDate.getTime(), yearStart.getTime()));
            const displayEnd = new Date(Math.min(endDate.getTime(), yearEnd.getTime()));

            const weekdayValue = parseInt(event.weekday);
            const isNumericWeekday = event.weekday && !isNaN(weekdayValue) && event.weekday.trim() !== '';

            if (isNumericWeekday) {

                const isExcludeMode = weekdayValue < 0;
                const absWeekday = Math.abs(weekdayValue);

                for (let currentDate = new Date(displayStart); currentDate <= displayEnd; currentDate.setUTCDate(currentDate.getUTCDate() + 1)) {
                    const dayOfWeek = currentDate.getUTCDay();
                    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

                    let shouldDisplay = false;
                    if (isExcludeMode) {

                        shouldDisplay = adjustedDayOfWeek !== absWeekday;
                    } else {

                        shouldDisplay = event.weekday.includes(String(adjustedDayOfWeek)) ||
                            event.weekday === String(adjustedDayOfWeek);
                    }

                    const dateString = formatDate(currentDate);
                    const isExcludedDate = event.excludeDates && event.excludeDates.length > 0 &&
                        event.excludeDates.includes(dateString);

                    if (shouldDisplay && !isExcludedDate) {
                        const dayOfYear = getDayOfYear(currentDate);
                        activityDays.add(dayOfYear);
                    }
                }
            } else {

                for (let currentDate = new Date(displayStart); currentDate <= displayEnd; currentDate.setUTCDate(currentDate.getUTCDate() + 1)) {
                    const dateString = formatDate(currentDate);

                    const isExcludedDate = event.excludeDates && event.excludeDates.length > 0 &&
                        event.excludeDates.includes(dateString);

                    if (!isExcludedDate) {
                        const dayOfYear = getDayOfYear(currentDate);
                        activityDays.add(dayOfYear);
                    }
                }
            }

            if (event.additionalDates && Array.isArray(event.additionalDates) && event.additionalDates.length > 0) {
                event.additionalDates.forEach((formattedDateStr, dateIndex) => {
                    try {
                        const additionalDate = parseJSTDate(formattedDateStr);
                        if (additionalDate && additionalDate.getUTCFullYear() === year) {
                            const dayOfYear = getDayOfYear(additionalDate);
                            if (dayOfYear >= 1 && dayOfYear <= (isLeapYear(year) ? 366 : 365)) {
                                activityDays.add(dayOfYear);
                            } else {
                                console.warn(`Invalid day of year ${dayOfYear} for additional date in event ${eventIndex}`);
                            }
                        }
                    } catch (error) {
                        console.warn(`Error processing additional date ${dateIndex} in event ${eventIndex}:`, error);
                    }
                });
            }
        } catch (error) {
            console.warn(`Error processing event ${eventIndex}:`, error);
        }
    });

    return {
        year: year,
        activityDays: activityDays,
        totalDays: isLeapYear(year) ? 366 : 365,
        hasActivity: activityDays.size > 0
    };
}

function getDayOfYear(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.warn('Invalid date provided to getDayOfYear:', date);
        return 1;
    }

    try {
        const start = createJSTDate(date.getUTCFullYear(), 0, 1);
        const diff = date.getTime() - start.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

        const maxDays = isLeapYear(date.getUTCFullYear()) ? 366 : 365;
        if (dayOfYear < 1 || dayOfYear > maxDays) {
            console.warn(`Calculated day of year ${dayOfYear} is out of range for year ${date.getUTCFullYear()}`);
            return Math.max(1, Math.min(dayOfYear, maxDays));
        }

        return dayOfYear;
    } catch (error) {
        console.error('Error calculating day of year:', error);
        return 1;
    }
}

function isLeapYear(year) {
    if (!Number.isInteger(year)) {
        console.warn('Invalid year provided to isLeapYear:', year);
        return false;
    }
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

async function positionSquares(squares, activityDays) {
    try {
        if (!squares || squares.length === 0) return;
        if (!activityDays || activityDays.size === 0) return;

        const sortedActivityDays = Array.from(activityDays)
            .filter(day => Number.isInteger(day) && day >= 1 && day <= 366)
            .sort((a, b) => a - b);

        if (sortedActivityDays.length === 0) return;

        const squaresArray = Array.from(squares);
        const isLeap = squaresArray.length === 366;
        const topRowCells = isLeap ? 6 : 5;

        const orderedCells = [];
        for (let r = 19; r >= 2; r--) {
            const rowStartIndex = topRowCells + (r - 2) * 20;
            for (let c = 0; c < 20; c++) {
                orderedCells.push(squaresArray[rowStartIndex + c]);
            }
        }

        for (let c = 0; c < topRowCells; c++) {
            orderedCells.push(squaresArray[c]);
        }

        const maxSquares = Math.min(sortedActivityDays.length, orderedCells.length);

        for (let i = 0; i < maxSquares; i++) {
            const square = orderedCells[i];
            const dayNumber = sortedActivityDays[i];

            if (square) {
                square.className = 'activity-square';
                square.setAttribute('data-day', dayNumber);
                square.setAttribute('title', `Day ${dayNumber}`);
            }
        }
    } catch (error) {
        console.error('Error positioning squares:', error);
    }
}

async function initializeYearGrids(events) {
    const container = document.getElementById('year-grid');
    if (!container) {
        console.error('Year grid container not found');
        return;
    }

    try {
        const currentYear = getJSTYear();
        const startYear = 1992;
        const years = [];

        if (currentYear < startYear) {
            console.warn(`Current year ${currentYear} is before start year ${startYear}`);
            return;
        }

        for (let year = currentYear; year >= startYear; year--) {
            years.push(year);
        }

        console.log(`Initializing ${years.length} year grids (${startYear}-${currentYear})`);

        let yearGrids = [];

        if (events === 'INITIAL') {
            container.innerHTML = '';
            for (const year of years) {
                const yearGrid = createEmptyYearGrid(year);
                yearGrid.classList.add('loading');
                yearGrids.push(yearGrid);
                container.appendChild(yearGrid);
            }
            applyDarkModeToYearGrids();
            return;
        }

        yearGrids = Array.from(container.querySelectorAll('.year-item'));

        if (yearGrids.length === 0) {
            container.innerHTML = '';
            for (const year of years) {
                const yearGrid = createEmptyYearGrid(year);
                yearGrids.push(yearGrid);
                container.appendChild(yearGrid);
            }
            applyDarkModeToYearGrids();
        }

        if (Array.isArray(events) && events.length > 0) {
            window.cachedAllEvents = events;
            for (let i = 0; i < years.length; i++) {
                const year = years[i];
                const yearGrid = yearGrids[i];

                try {
                    const yearData = processYearlyActivity(events, year);
                    if (yearData.hasActivity) {
                        await populateYearGrid(yearGrid, yearData.activityDays);
                    }
                    yearGrid.classList.remove('loading');
                } catch (error) {
                    console.error(`Error populating grid for year ${year}:`, error);
                }
            }
        }

        console.log(`Successfully initialized ${yearGrids.length} year grids`);

    } catch (error) {
        console.error('Error initializing year grids:', error);
    }
}

function applyMobileOptimizations(container, isLowEndDevice) {
    const yearGrids = container.querySelectorAll('.year-item');

    yearGrids.forEach(grid => {
        grid.classList.add('mobile-optimized');

        if (isLowEndDevice) {
            const activityGrid = grid.querySelector('.activity-grid');
            if (activityGrid && activityGrid.children.length > 100) {
                grid.classList.add('simplified-mobile');

                const squares = activityGrid.querySelectorAll('.activity-square');
                squares.forEach((square, index) => {
                    if (index % 3 === 0) {
                        square.style.display = 'block';
                    } else {
                        square.style.display = 'none';
                    }
                });
            }
        }
    });

    container.style.transform = 'translateZ(0)';
    container.style.willChange = 'transform';
}

function removeMobileOptimizations(container) {
    const yearGrids = container.querySelectorAll('.year-item');

    yearGrids.forEach(grid => {
        grid.classList.remove('mobile-optimized', 'simplified-mobile');

        const squares = grid.querySelectorAll('.activity-square');
        squares.forEach(square => {
            square.style.display = 'block';
        });
    });

    container.style.transform = '';
    container.style.willChange = '';
}

function addTouchSupport(container) {
    const yearGrids = container.querySelectorAll('.year-item');

    yearGrids.forEach(grid => {
        if (grid.hasAttribute('data-touch-enabled')) return;

        grid.setAttribute('data-touch-enabled', 'true');

        let touchStartY = 0;
        let isScrolling = false;

        grid.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            isScrolling = false;

            grid.classList.add('touch-active');
        }, { passive: true });

        grid.addEventListener('touchmove', (e) => {
            const touchMoveY = e.touches[0].clientY;
            const deltaY = Math.abs(touchMoveY - touchStartY);

            if (deltaY > 10) {
                isScrolling = true;
                grid.classList.remove('touch-active');
            }
        }, { passive: true });

        grid.addEventListener('touchend', () => {
            grid.classList.remove('touch-active');
        }, { passive: true });

        grid.addEventListener('touchcancel', () => {
            grid.classList.remove('touch-active');
        }, { passive: true });
    });
}

function applyDarkModeToYearGrids() {
    const isDarkMode = document.body.classList.contains('dark-mode') ||
        document.documentElement.classList.contains('dark-mode');

    const root = document.documentElement;

    if (isDarkMode) {

        root.style.setProperty('--year-grid-bg', '#1e1e1e');
        root.style.setProperty('--year-label-color', '#ffffff');
        root.style.setProperty('--activity-square-color', '#4ade80');
        root.style.setProperty('--empty-square-color', '#333333');
        root.style.setProperty('--grid-border-color', '#404040');
    } else {

        root.style.setProperty('--year-grid-bg', '#ffffff');
        root.style.setProperty('--year-label-color', '#333333');
        root.style.setProperty('--activity-square-color', '#22c55e');
        root.style.setProperty('--empty-square-color', '#f3f4f6');
        root.style.setProperty('--grid-border-color', '#e5e7eb');
    }
}

function createEmptyYearGrid(year) {
    const yearGrid = document.createElement('div');
    yearGrid.className = 'year-item';
    yearGrid.setAttribute('data-year', year);

    const yearLabel = document.createElement('div');
    yearLabel.className = 'year-label';
    yearLabel.textContent = year.toString();
    yearGrid.appendChild(yearLabel);

    const activityGrid = document.createElement('div');
    activityGrid.className = 'activity-grid';

    const isLeap = isLeapYear(year);
    const topRowCells = isLeap ? 6 : 5;

    for (let visualRow = 1; visualRow <= 19; visualRow++) {
        const isTopRow = visualRow === 1;
        const cellsInRow = isTopRow ? topRowCells : 20;

        for (let col = 0; col < cellsInRow; col++) {
            const square = document.createElement('div');
            square.className = 'activity-square empty';

            if (isTopRow) {

                square.style.gridColumn = 20 - topRowCells + col + 1;
                square.style.gridRow = 1;
            } else {
                square.style.gridColumn = col + 1;
                square.style.gridRow = visualRow;
            }

            activityGrid.appendChild(square);
        }
    }

    yearGrid.appendChild(activityGrid);

    yearGrid.addEventListener('click', (e) => {
        if (yearGrid.classList.contains('loading')) return;
        e.stopPropagation();
        toggleHeatmap(yearGrid, year);
    });

    return yearGrid;
}

async function populateYearGrid(yearGrid, activityDays) {
    try {
        if (!yearGrid || !(yearGrid instanceof HTMLElement)) {
            console.warn('Invalid yearGrid provided to populateYearGrid:', yearGrid);
            return;
        }

        if (!(activityDays instanceof Set) || activityDays.size === 0) {
            return; 
        }

        const activityGrid = yearGrid.querySelector('.activity-grid');
        if (!activityGrid) {
            console.warn('Activity grid not found in year grid');
            return;
        }

        const squares = activityGrid.querySelectorAll('.activity-square');
        if (squares.length === 0) {
            console.warn('No activity squares found in grid');
            return;
        }

        await positionSquares(squares, activityDays);

    } catch (error) {
        console.error('Error populating year grid:', error);
    }
}

function setupResponsiveIntegration(container, initialIsMobile) {
    if (!container) return;

    let currentIsMobile = initialIsMobile;

    const handleResponsiveChange = () => {
        const newIsMobile = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;

        if (newIsMobile !== currentIsMobile) {
            console.log(`Responsive breakpoint change: mobile=${newIsMobile}`);

            if (newIsMobile) {

                applyMobileOptimizations(container, false);

                if (isTouchDevice) {
                    addTouchSupport(container);
                }

                console.log('Applied mobile optimizations and touch support');
            } else {

                removeMobileOptimizations(container);
                console.log('Removed mobile optimizations');
            }

            currentIsMobile = newIsMobile;
        }
    };

    let resizeTimeout;
    const debouncedHandler = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResponsiveChange, 250);
    };

    window.addEventListener('resize', debouncedHandler);

    if (currentIsMobile) {
        applyMobileOptimizations(container, false);
        if ('ontouchstart' in window) {
            addTouchSupport(container);
        }
    }
}

async function initializeYearPage() {
    const maxRetries = 2;
    const retryDelay = 2000;

    const isMobile = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window;

    if (isMobile) {

        document.documentElement.style.setProperty('--transition-duration', '0.1s');

        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (metaViewport && isTouchDevice) {
            metaViewport.setAttribute('content',
                'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0');
        }
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Initializing year page (attempt ${attempt}/${maxRetries})`);

            if (typeof loadNavbar === 'function') {
                try {
                    await loadNavbar();
                } catch (error) {
                    console.warn('Failed to load navbar:', error);

                }
            }

            await initializeYearGrids('INITIAL');

            const gridContainer = document.getElementById('year-grid');

            const dataLoadTimeout = 30000; 
            let events = [];
            try {
                events = await Promise.race([
                    parseActivityData(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Data loading timeout')), dataLoadTimeout)
                    )
                ]);

                await initializeYearGrids(events);

                console.log(`Loaded ${events.length} activity events for year grids`);
            } catch (error) {
                console.warn('Failed to load activity data, showing empty grids:', error);
                events = []; 
            }

            const observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.attributeName === 'class') {
                        try {
                            applyDarkModeToYearGrids();

                            const heatmapManager = window.heatmapManager || (getHeatmapManager && getHeatmapManager());
                            if (heatmapManager && heatmapManager.renderer) {
                                const isDarkMode = document.body.classList.contains('dark-mode') ||
                                    document.documentElement.classList.contains('dark-mode');
                                heatmapManager.renderer.updateColorsForDarkMode(isDarkMode);
                                console.log('Updated heatmap colors for dark mode:', isDarkMode);
                            }
                        } catch (error) {
                            console.warn('Error applying dark mode:', error);
                        }
                    }
                });
            });

            try {
                observer.observe(document.documentElement, { attributes: true });
                observer.observe(document.body, { attributes: true });
            } catch (error) {
                console.warn('Failed to set up dark mode observer:', error);
            }

            const containerForResponsive = document.getElementById('year-grid-container') || gridContainer;
            setupResponsiveIntegration(containerForResponsive, isMobile);

            console.log('Year page initialized successfully');
            return; 

        } catch (error) {
            console.error(`Year page initialization attempt ${attempt} failed:`, error);

            if (attempt === maxRetries) {

                console.error('Failed to initialize year page after all attempts');
                return;
            }

            console.log(`Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}

document.addEventListener('DOMContentLoaded', initializeYearPage);

function toggleHeatmap(yearGrid, year) {
    let existingHeatmap = yearGrid.nextElementSibling;

    if (existingHeatmap && existingHeatmap.classList.contains('heatmap-container')) {

        existingHeatmap.classList.remove('expanded');
        setTimeout(() => existingHeatmap.remove(), 300);
        return;
    }

    document.querySelectorAll('.heatmap-container').forEach(hm => {
        hm.classList.remove('expanded');
        setTimeout(() => hm.remove(), 300);
    });

    const heatmap = createHeatmap(year);
    yearGrid.parentNode.insertBefore(heatmap, yearGrid.nextSibling);

    heatmap.offsetHeight;
    heatmap.classList.add('expanded');

    setTimeout(() => {
        heatmap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function createHeatmap(year) {
    const container = document.createElement('div');
    container.className = 'heatmap-container';

    const yearBlock = document.createElement('div');
    yearBlock.className = 'heatmap-grid';
    yearBlock.style.display = 'grid';
    yearBlock.style.gridTemplateColumns = `16px repeat(54, 16px)`;
    yearBlock.style.gridTemplateRows = `16px repeat(7, 16px)`;
    yearBlock.style.gap = '2px';

    const cornerLabel = document.createElement('div');
    cornerLabel.className = 'heatmap-cell empty-corner';
    cornerLabel.style.gridColumn = '1';
    cornerLabel.style.gridRow = '1';
    yearBlock.appendChild(cornerLabel);

    const days = ['月', '火', '水', '木', '金', '土', '日'];
    days.forEach((d, i) => {
        const lbl = document.createElement('div');
        lbl.className = 'heatmap-cell label-cell';
        lbl.textContent = d;
        lbl.style.gridColumn = '1';
        lbl.style.gridRow = i + 2;
        yearBlock.appendChild(lbl);
    });

    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const jan1Day = startOfYear.getUTCDay() || 7;
    const firstMonday = new Date(startOfYear);
    firstMonday.setUTCDate(startOfYear.getUTCDate() - jan1Day + 1);

    let activityDaysSet = new Set();
    if (window.cachedAllEvents) {
        activityDaysSet = processYearlyActivity(window.cachedAllEvents, year).activityDays;
    }

    const todayJST = typeof getJSTNow === 'function'
        ? getJSTNow()
        : new Date(Date.now() + 9 * 60 * 60 * 1000);

    for (let w = 0; w < 54; w++) {
        const start = new Date(firstMonday);
        start.setUTCDate(firstMonday.getUTCDate() + w * 7);

        let labelText = '';
        for (let dscan = 0; dscan < 7; dscan++) {
            const sDate = new Date(start);
            sDate.setUTCDate(start.getUTCDate() + dscan);
            if (sDate.getUTCDate() === 1 && sDate.getUTCFullYear() === year) {
                if (sDate.getUTCMonth() === 0) {
                    labelText = String(year); 
                } else {
                    labelText = String(sDate.getUTCMonth() + 1);
                }
                break;
            }
        }

        const topLbl = document.createElement('div');
        topLbl.className = 'heatmap-cell label-cell';
        if (labelText) {
            topLbl.textContent = labelText;
        }
        topLbl.style.gridColumn = w + 2;
        topLbl.style.gridRow = '1';
        yearBlock.appendChild(topLbl);

        let currentDay = new Date(start);
        for (let dIndex = 0; dIndex < 7; dIndex++) {
            const date = new Date(currentDay);
            if (date.getUTCFullYear() === year) {
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';

                const cDayOfYear = getDayOfYear(date);
                if (activityDaysSet.has(cDayOfYear)) {
                    cell.classList.add('activity-cell');
                }

                if (typeof isSameJSTDay === 'function'
                    ? isSameJSTDay(date, todayJST)
                    : (
                        date.getUTCFullYear() === todayJST.getUTCFullYear() &&
                        date.getUTCMonth() === todayJST.getUTCMonth() &&
                        date.getUTCDate() === todayJST.getUTCDate()
                    )) {
                    cell.classList.add('today-cell');
                }

                cell.setAttribute('title', `${year}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`);
                cell.style.gridColumn = w + 2;
                cell.style.gridRow = dIndex + 2;
                yearBlock.appendChild(cell);
            }
            currentDay.setUTCDate(currentDay.getUTCDate() + 1);
        }
    }

    container.appendChild(yearBlock);
    return container;
}

document.addEventListener('click', (e) => {

    if (!e.target.isConnected) return;

    if (e.target.closest('.year-item') || e.target.closest('.heatmap-container')) {
        return;
    }
    document.querySelectorAll('.heatmap-container.expanded').forEach(hm => {
        hm.classList.remove('expanded');
        setTimeout(() => hm.remove(), 300);
    });
});
