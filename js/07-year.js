async function parseActivityData() {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Load main data file - biography.csv with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch('/data/biography.csv', {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.text();

            // Validate CSV data structure
            if (!data || data.trim() === '') {
                throw new Error('Empty CSV file received');
            }

            const rows = data.split('\n').filter(row => row.trim());

            if (rows.length < 2) {
                console.warn('Biography CSV has insufficient data (header only or empty)');
                return []; // Need at least header and one data row
            }

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

            const events = rows.slice(1).map((row, rowIndex) => {
                try {
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

                    if (cols.length < header.length) {
                        console.warn(`Row ${rowIndex + 2} has insufficient columns (${cols.length} vs ${header.length})`);
                        return null;
                    }

                    // Build eventData object with named properties
                    const eventData = {};
                    for (let i = 0; i < header.length && i < cols.length; i++) {
                        eventData[header[i]] = cols[i] ? cols[i].trim() : '';
                    }

                    // Process exclude dates - using DateDelete column, convert to standard format
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

                    // Process DateAdd column dates, convert to standard format
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

                    // Parse start date with error handling
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

                    // Parse end date with error handling
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

                    // Validate date range
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

            // Load other.csv data
            const otherEvents = await parseOtherActivityData();

            // Merge events from both data sources
            const allEvents = [...events, ...otherEvents];

            console.log(`Successfully loaded ${allEvents.length} events (${events.length} from biography.csv, ${otherEvents.length} from other.csv)`);
            return allEvents;

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);

            if (attempt === maxRetries) {
                console.error('All retry attempts failed, returning empty data');
                return [];
            }

            // Wait before retrying
            console.log(`Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    return []; // Fallback if all retries fail
}

// Parse other.csv data
async function parseOtherActivityData() {
    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Load other.csv with timeout
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

                    // Use header as keys to parse data
                    const eventData = {};
                    for (let i = 0; i < header.length && i < columns.length; i++) {
                        eventData[header[i]] = columns[i] ? columns[i].trim() : '';
                    }

                    // Get date from Date field with error handling
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
                        endDate: date, // Single day event, start and end dates are the same
                        title: eventData['Title'] || `Other Event ${rowIndex + 1}`,
                        url: eventData['URL'] ? eventData['URL'].trim() : '#',
                        id: Math.random().toString(36).substring(2, 11),
                        source: 'other' // Mark data source as other.csv
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

// More reliable CSV row parsing function, considering commas inside quotes
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

        // Add the last value
        result.push(currentValue);

        // Clean quotes from results and handle malformed quotes
        return result.map(value => {
            if (typeof value !== 'string') return '';
            return value.replace(/^"(.*)"$/, '$1').replace(/""/g, '"');
        });
    } catch (error) {
        console.error('Error parsing CSV row:', error);
        return [];
    }
}

// Process yearly activity data to calculate activity days per year
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

            // Validate dates
            if (!(startDate instanceof Date) || !(endDate instanceof Date) ||
                isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn(`Invalid dates in event ${eventIndex}:`, { startDate, endDate });
                return;
            }

            // Skip events that don't overlap with the target year
            if (endDate < yearStart || startDate > yearEnd) {
                return;
            }

            // Calculate the overlap period within the year
            const displayStart = new Date(Math.max(startDate.getTime(), yearStart.getTime()));
            const displayEnd = new Date(Math.min(endDate.getTime(), yearEnd.getTime()));

            // Handle weekday filtering
            const weekdayValue = parseInt(event.weekday);
            const isNumericWeekday = event.weekday && !isNaN(weekdayValue) && event.weekday.trim() !== '';

            if (isNumericWeekday) {
                // Weekday is numeric, execute weekday filtering logic
                const isExcludeMode = weekdayValue < 0;
                const absWeekday = Math.abs(weekdayValue);

                // Iterate through each day in the date range
                for (let currentDate = new Date(displayStart); currentDate <= displayEnd; currentDate.setUTCDate(currentDate.getUTCDate() + 1)) {
                    const dayOfWeek = currentDate.getUTCDay();
                    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

                    let shouldDisplay = false;
                    if (isExcludeMode) {
                        // Exclude mode: display if current weekday is not the excluded weekday
                        shouldDisplay = adjustedDayOfWeek !== absWeekday;
                    } else {
                        // Include mode: display if current weekday matches specified weekday or is included in weekday string
                        shouldDisplay = event.weekday.includes(String(adjustedDayOfWeek)) ||
                            event.weekday === String(adjustedDayOfWeek);
                    }

                    // Check if current date is in exclude list
                    const dateString = formatDate(currentDate);
                    const isExcludedDate = event.excludeDates && event.excludeDates.length > 0 &&
                        event.excludeDates.includes(dateString);

                    // Add to activity days if should display and not excluded
                    if (shouldDisplay && !isExcludedDate) {
                        const dayOfYear = getDayOfYear(currentDate);
                        activityDays.add(dayOfYear);
                    }
                }
            } else {
                // No weekday filtering or weekday is not numeric
                for (let currentDate = new Date(displayStart); currentDate <= displayEnd; currentDate.setUTCDate(currentDate.getUTCDate() + 1)) {
                    const dateString = formatDate(currentDate);

                    // Check if current date is in exclude list
                    const isExcludedDate = event.excludeDates && event.excludeDates.length > 0 &&
                        event.excludeDates.includes(dateString);

                    // Add to activity days if not excluded
                    if (!isExcludedDate) {
                        const dayOfYear = getDayOfYear(currentDate);
                        activityDays.add(dayOfYear);
                    }
                }
            }

            // Handle additional dates from DateAdd column
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

// Calculate day of year (1-366)
function getDayOfYear(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.warn('Invalid date provided to getDayOfYear:', date);
        return 1;
    }

    try {
        const start = createJSTDate(date.getUTCFullYear(), 0, 1);
        const diff = date.getTime() - start.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

        // Validate result
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

// Check if year is leap year
function isLeapYear(year) {
    if (!Number.isInteger(year)) {
        console.warn('Invalid year provided to isLeapYear:', year);
        return false;
    }
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// Calculate activity days for a specific year using the same logic as cal.js schedule mode
function calculateActivityDays(events, year) {
    return processYearlyActivity(events, year);
}

// Year Grid Rendering System

/**
 * Create a year grid DOM element with 20x20 grid structure
 * @param {number} year - The year to create grid for
 * @param {Set} activityDays - Set of day numbers (1-366) with activity
 * @returns {Promise<HTMLElement>} - The complete year grid element
 */
async function createYearGrid(year, activityDays) {
    try {
        // Validate inputs
        if (!Number.isInteger(year)) {
            console.warn('Invalid year provided to createYearGrid:', year);
            year = new Date().getFullYear();
        }

        if (!(activityDays instanceof Set)) {
            console.warn('Invalid activityDays provided to createYearGrid:', activityDays);
            activityDays = new Set();
        }

        // Create main year grid container
        const yearGrid = document.createElement('div');
        yearGrid.className = 'year-item';
        yearGrid.setAttribute('data-year', year);

        // Create and position year label in top-right corner
        const yearLabel = document.createElement('div');
        yearLabel.className = 'year-label';
        yearLabel.textContent = year.toString();
        yearGrid.appendChild(yearLabel);

        // Create 20x20 activity grid container
        const activityGrid = document.createElement('div');
        activityGrid.className = 'activity-grid';

        // Memory constraint handling: Use document fragment for batch DOM operations
        const fragment = document.createDocumentFragment();

        // Generate 400 squares (20x20 grid) in batches to avoid memory issues
        const batchSize = 50;
        for (let batch = 0; batch < 400; batch += batchSize) {
            const endIndex = Math.min(batch + batchSize, 400);

            for (let i = batch; i < endIndex; i++) {
                const square = document.createElement('div');
                square.className = 'activity-square empty';
                square.setAttribute('data-position', i);
                fragment.appendChild(square);
            }

            // Yield control to prevent blocking
            if (batch + batchSize < 400) {
                // Use setTimeout(0) to yield control, but only for large batches
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        activityGrid.appendChild(fragment);
        yearGrid.appendChild(activityGrid);

        // Populate grid with activity data
        await renderActivitySquares(yearGrid, activityDays);

        return yearGrid;

    } catch (error) {
        console.error('Error creating year grid:', error);

        // Return fallback grid
        const fallbackGrid = document.createElement('div');
        fallbackGrid.className = 'year-item error-grid';
        fallbackGrid.innerHTML = `
            <div class="year-label">${year}</div>
            <div class="error-message">Failed to load grid</div>
        `;
        return fallbackGrid;
    }
}

/**
 * Populate year grid with activity squares based on activity data
 * @param {HTMLElement} yearGrid - The year grid element
 * @param {Set} activityDays - Set of day numbers (1-366) with activity
 */
async function renderActivitySquares(yearGrid, activityDays) {
    try {
        if (!yearGrid || !(yearGrid instanceof HTMLElement)) {
            console.warn('Invalid yearGrid provided to renderActivitySquares:', yearGrid);
            return;
        }

        if (!(activityDays instanceof Set)) {
            console.warn('Invalid activityDays provided to renderActivitySquares:', activityDays);
            activityDays = new Set();
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

        // Reset all squares to empty state in batches to avoid blocking
        const batchSize = 100;
        for (let i = 0; i < squares.length; i += batchSize) {
            const endIndex = Math.min(i + batchSize, squares.length);

            for (let j = i; j < endIndex; j++) {
                const square = squares[j];
                square.className = 'activity-square empty';
                square.removeAttribute('data-day');
                square.removeAttribute('title');
            }

            // Yield control for large batches
            if (i + batchSize < squares.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Position activity squares using bottom-left fill pattern
        await positionSquares(squares, activityDays);

    } catch (error) {
        console.error('Error rendering activity squares:', error);
    }
}

/**
 * Position activity squares with bottom-left fill pattern
 * Fills from left to right, bottom to top
 * @param {NodeList} squares - All square elements in the grid
 * @param {Set} activityDays - Set of day numbers (1-366) with activity
 */
async function positionSquares(squares, activityDays) {
    try {
        if (!squares || squares.length === 0) {
            console.warn('No squares provided to positionSquares');
            return;
        }

        if (!activityDays || activityDays.size === 0) {
            return; // No activity days to display
        }

        // Convert Set to sorted array for consistent ordering
        const sortedActivityDays = Array.from(activityDays)
            .filter(day => Number.isInteger(day) && day >= 1 && day <= 366)
            .sort((a, b) => a - b);

        if (sortedActivityDays.length === 0) {
            console.warn('No valid activity days to display');
            return;
        }

        // Limit activity days to prevent memory issues (max 400 squares)
        const maxSquares = Math.min(sortedActivityDays.length, 400);
        const limitedActivityDays = sortedActivityDays.slice(0, maxSquares);

        // Fill squares using bottom-left pattern
        // Grid is 20x20, positions 0-399
        // Bottom row is positions 380-399, next row up is 360-379, etc.
        let squareIndex = 0;

        for (let row = 19; row >= 0 && squareIndex < limitedActivityDays.length; row--) {
            for (let col = 0; col < 20 && squareIndex < limitedActivityDays.length; col++) {
                const position = row * 20 + col;

                if (position >= squares.length) {
                    console.warn(`Position ${position} exceeds available squares (${squares.length})`);
                    break;
                }

                const square = squares[position];
                const dayNumber = limitedActivityDays[squareIndex];

                if (!square) {
                    console.warn(`Square at position ${position} not found`);
                    continue;
                }

                // Mark square as active (has activity)
                square.className = 'activity-square';
                square.setAttribute('data-day', dayNumber);
                square.setAttribute('title', `Day ${dayNumber}`);

                squareIndex++;
            }
        }

        if (sortedActivityDays.length > maxSquares) {
            console.warn(`Limited activity days display to ${maxSquares} out of ${sortedActivityDays.length} total days`);
        }

    } catch (error) {
        console.error('Error positioning squares:', error);
    }
}

// Main Initialization and Layout System

/**
 * Initialize all year grids from 1992 to current year
 * Uses progressive rendering for performance with large datasets
 * @param {Array} events - All activity events from CSV data
 */
async function initializeYearGrids(events) {
    const container = document.getElementById('year-grid');
    if (!container) {
        console.error('Year grid container not found');
        return;
    }

    try {
        // Clear existing content
        container.innerHTML = '';

        // Calculate year range from 1992 to current year, sorted newest first
        const currentYear = getJSTYear();
        const startYear = 1992;
        const years = [];

        // Validate year range
        if (currentYear < startYear) {
            console.warn(`Current year ${currentYear} is before start year ${startYear}`);
            return;
        }

        // Create years array sorted from newest to oldest (2025, 2024, 2023...)
        for (let year = currentYear; year >= startYear; year--) {
            years.push(year);
        }

        console.log(`Initializing ${years.length} year grids (${startYear}-${currentYear})`);

        // Create empty grids immediately for fast initial display
        const yearGrids = [];
        for (const year of years) {
            const yearGrid = createEmptyYearGrid(year);
            yearGrids.push(yearGrid);
            container.appendChild(yearGrid);
        }

        // Apply dark mode styling immediately
        applyDarkModeToYearGrids();

        // Now populate grids with data if available
        if (Array.isArray(events) && events.length > 0) {
            for (let i = 0; i < years.length; i++) {
                const year = years[i];
                const yearGrid = yearGrids[i];

                try {
                    const yearData = processYearlyActivity(events, year);
                    if (yearData.hasActivity) {
                        await populateYearGrid(yearGrid, yearData.activityDays);
                    }
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





/**
 * Apply mobile-specific performance optimizations
 * @param {HTMLElement} container - The main container
 * @param {boolean} isLowEndDevice - Whether device has limited resources
 */
function applyMobileOptimizations(container, isLowEndDevice) {
    const yearGrids = container.querySelectorAll('.year-item');

    yearGrids.forEach(grid => {
        // Add mobile-optimized class
        grid.classList.add('mobile-optimized');

        // For low-end devices, use simplified rendering
        if (isLowEndDevice) {
            const activityGrid = grid.querySelector('.activity-grid');
            if (activityGrid && activityGrid.children.length > 100) {
                // Reduce visual complexity for low-end devices
                grid.classList.add('simplified-mobile');

                // Hide some activity squares to improve performance
                const squares = activityGrid.querySelectorAll('.activity-square');
                squares.forEach((square, index) => {
                    if (index % 3 === 0) { // Show every 3rd square
                        square.style.display = 'block';
                    } else {
                        square.style.display = 'none';
                    }
                });
            }
        }
    });

    // Enable hardware acceleration for smoother animations
    container.style.transform = 'translateZ(0)';
    container.style.willChange = 'transform';
}

/**
 * Remove mobile optimizations when switching to desktop
 * @param {HTMLElement} container - The main container
 */
function removeMobileOptimizations(container) {
    const yearGrids = container.querySelectorAll('.year-item');

    yearGrids.forEach(grid => {
        grid.classList.remove('mobile-optimized', 'simplified-mobile');

        // Restore all activity squares
        const squares = grid.querySelectorAll('.activity-square');
        squares.forEach(square => {
            square.style.display = 'block';
        });
    });

    // Remove hardware acceleration
    container.style.transform = '';
    container.style.willChange = '';
}

/**
 * Add touch support for mobile interactions
 * @param {HTMLElement} container - The main container
 */
function addTouchSupport(container) {
    const yearGrids = container.querySelectorAll('.year-item');

    yearGrids.forEach(grid => {
        // Skip if touch support already added
        if (grid.hasAttribute('data-touch-enabled')) return;

        grid.setAttribute('data-touch-enabled', 'true');

        // Add touch event listeners
        let touchStartTime = 0;
        let touchStartY = 0;
        let isScrolling = false;

        // Touch start
        grid.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchStartY = e.touches[0].clientY;
            isScrolling = false;

            // Add visual feedback
            grid.classList.add('touch-active');
        }, { passive: true });

        // Touch move - detect scrolling
        grid.addEventListener('touchmove', (e) => {
            const touchMoveY = e.touches[0].clientY;
            const deltaY = Math.abs(touchMoveY - touchStartY);

            if (deltaY > 10) {
                isScrolling = true;
                grid.classList.remove('touch-active');
            }
        }, { passive: true });

        // Touch end
        grid.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;

            // Remove visual feedback
            grid.classList.remove('touch-active');

            // Handle tap (not scroll) with reasonable duration
            if (!isScrolling && touchDuration < 500) {
                handleYearGridTap(grid, e);
            }
        }, { passive: true });

        // Touch cancel
        grid.addEventListener('touchcancel', () => {
            grid.classList.remove('touch-active');
        }, { passive: true });
    });
}

/**
 * Handle tap on year grid for mobile devices
 * @param {HTMLElement} grid - The year grid element
 * @param {Event} event - Touch event
 */
function handleYearGridTap(grid, event) {
    const year = grid.getAttribute('data-year');
    if (!year) return;

    // Provide haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(50); // Short vibration
    }

    // Show year information or perform action
    showYearInfo(grid, year);
}

/**
 * Show year information in a mobile-friendly way
 * @param {HTMLElement} grid - The year grid element
 * @param {string} year - The year
 */
function showYearInfo(grid, year) {
    // Remove any existing info displays
    const existingInfo = document.querySelector('.year-info-popup');
    if (existingInfo) {
        existingInfo.remove();
    }

    // Get activity data for the year
    const activitySquares = grid.querySelectorAll('.activity-square:not(.empty)');
    const activityCount = activitySquares.length;

    // Create mobile-friendly info popup
    const infoPopup = document.createElement('div');
    infoPopup.className = 'year-info-popup';
    infoPopup.innerHTML = `
        <div class="year-info-content">
            <h3>${year}</h3>
            <p>${activityCount} active days</p>
            <button class="close-info" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Position popup near the grid
    const rect = grid.getBoundingClientRect();
    infoPopup.style.position = 'fixed';
    infoPopup.style.top = `${rect.top + window.scrollY - 60}px`;
    infoPopup.style.left = `${rect.left + rect.width / 2}px`;
    infoPopup.style.transform = 'translateX(-50%)';
    infoPopup.style.zIndex = '1000';

    document.body.appendChild(infoPopup);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (infoPopup.parentElement) {
            infoPopup.remove();
        }
    }, 3000);
}

/**
 * Apply dark mode styling to year grids following existing patterns
 */
function applyDarkModeToYearGrids() {
    const isDarkMode = document.body.classList.contains('dark-mode') ||
        document.documentElement.classList.contains('dark-mode');

    const root = document.documentElement;

    if (isDarkMode) {
        // Dark mode CSS custom properties
        root.style.setProperty('--year-grid-bg', '#1e1e1e');
        root.style.setProperty('--year-label-color', '#ffffff');
        root.style.setProperty('--activity-square-color', '#4ade80');
        root.style.setProperty('--empty-square-color', '#333333');
        root.style.setProperty('--grid-border-color', '#404040');
    } else {
        // Light mode CSS custom properties
        root.style.setProperty('--year-grid-bg', '#ffffff');
        root.style.setProperty('--year-label-color', '#333333');
        root.style.setProperty('--activity-square-color', '#22c55e');
        root.style.setProperty('--empty-square-color', '#f3f4f6');
        root.style.setProperty('--grid-border-color', '#e5e7eb');
    }
}

// Loading State Management Functions



/**
 * Create empty year grid for immediate display
 * @param {number} year - Year to create grid for
 * @returns {HTMLElement} - Empty year grid element
 */
function createEmptyYearGrid(year) {
    const yearGrid = document.createElement('div');
    yearGrid.className = 'year-item';
    yearGrid.setAttribute('data-year', year);

    // Create and position year label in top-right corner
    const yearLabel = document.createElement('div');
    yearLabel.className = 'year-label';
    yearLabel.textContent = year.toString();
    yearGrid.appendChild(yearLabel);

    // Create 20x20 activity grid container
    const activityGrid = document.createElement('div');
    activityGrid.className = 'activity-grid';

    // Generate 400 empty squares (20x20 grid)
    for (let i = 0; i < 400; i++) {
        const square = document.createElement('div');
        square.className = 'activity-square empty';
        square.setAttribute('data-position', i);
        activityGrid.appendChild(square);
    }

    yearGrid.appendChild(activityGrid);
    return yearGrid;
}

/**
 * Populate an existing year grid with activity data
 * @param {HTMLElement} yearGrid - The year grid element
 * @param {Set} activityDays - Set of day numbers (1-366) with activity
 */
async function populateYearGrid(yearGrid, activityDays) {
    try {
        if (!yearGrid || !(yearGrid instanceof HTMLElement)) {
            console.warn('Invalid yearGrid provided to populateYearGrid:', yearGrid);
            return;
        }

        if (!(activityDays instanceof Set) || activityDays.size === 0) {
            return; // No activity days to display
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

        // Position activity squares using bottom-left fill pattern
        await positionSquares(squares, activityDays);

    } catch (error) {
        console.error('Error populating year grid:', error);
    }
}

/**
 * Create fallback year grid for error cases
 * @param {number} year - Year to create fallback for
 * @returns {HTMLElement} - Fallback grid element
 */
function createFallbackYearGrid(year) {
    const fallbackGrid = document.createElement('div');
    fallbackGrid.className = 'year-item fallback-grid';
    fallbackGrid.setAttribute('data-year', year);

    fallbackGrid.innerHTML = `
        <div class="year-label">${year}</div>
        <div class="fallback-message">
            <div class="fallback-icon">📅</div>
            <div class="fallback-text">No data</div>
        </div>
    `;

    return fallbackGrid;
}



/**
 * Create simplified year grid for memory-constrained environments
 * @param {number} year - Year
 * @param {boolean} hasActivity - Whether year has activity
 * @param {number} activityCount - Number of activity days
 * @returns {HTMLElement} - Simplified grid element
 */
function createSimplifiedYearGrid(year, hasActivity, activityCount) {
    const grid = document.createElement('div');
    grid.className = `year-item simplified-grid ${hasActivity ? 'has-activity' : 'no-activity'}`;
    grid.setAttribute('data-year', year);

    grid.innerHTML = `
        <div class="year-label">${year}</div>
        <div class="simplified-activity">
            <div class="activity-indicator ${hasActivity ? 'active' : 'inactive'}"></div>
            <div class="activity-count">${activityCount} days</div>
        </div>
    `;

    return grid;
}

/**
 * Set up responsive integration between existing mobile optimizations and heatmap system
 * @param {HTMLElement} container - The year grid container
 * @param {boolean} initialIsMobile - Initial mobile state
 */
function setupResponsiveIntegration(container, initialIsMobile) {
    if (!container) return;

    let currentIsMobile = initialIsMobile;

    // Responsive handler that coordinates both systems
    const handleResponsiveChange = () => {
        const newIsMobile = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;

        // Only act on actual breakpoint changes
        if (newIsMobile !== currentIsMobile) {
            console.log(`Responsive breakpoint change: mobile=${newIsMobile}`);

            if (newIsMobile) {
                // Transitioning to mobile
                applyMobileOptimizations(container, false);

                // Ensure touch support is enabled
                if (isTouchDevice) {
                    addTouchSupport(container);
                }

                console.log('Applied mobile optimizations and touch support');
            } else {
                // Transitioning to desktop/tablet
                removeMobileOptimizations(container);
                console.log('Removed mobile optimizations');
            }

            currentIsMobile = newIsMobile;
        }
    };

    // Set up responsive monitoring with debouncing
    let resizeTimeout;
    const debouncedHandler = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResponsiveChange, 250);
    };

    window.addEventListener('resize', debouncedHandler);

    // Apply initial state
    if (currentIsMobile) {
        applyMobileOptimizations(container, false);
        if ('ontouchstart' in window) {
            addTouchSupport(container);
        }
    }
}

/**
 * Main initialization function - integrates with existing navbar loading system
 * Enhanced with mobile-specific optimizations
 */
async function initializeYearPage() {
    const maxRetries = 2;
    const retryDelay = 2000;

    // Mobile-specific initialization optimizations
    const isMobile = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window;

    // Optimize for mobile performance
    if (isMobile) {
        // Reduce visual effects for better performance
        document.documentElement.style.setProperty('--transition-duration', '0.1s');

        // Prevent zoom on input focus (mobile Safari)
        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (metaViewport && isTouchDevice) {
            metaViewport.setAttribute('content',
                'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0');
        }
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Initializing year page (attempt ${attempt}/${maxRetries})`);

            // 1. Load navbar first (following existing pattern)
            if (typeof loadNavbar === 'function') {
                try {
                    await loadNavbar();
                } catch (error) {
                    console.warn('Failed to load navbar:', error);
                    // Continue without navbar
                }
            }

            // 2. Initialize empty year grids immediately for fast display
            await initializeYearGrids([]);

            // 2.1. Set up mobile touch interactions (preserve existing functionality)
            const gridContainer = document.getElementById('year-grid');
            if (gridContainer && isTouchDevice) {
                addTouchSupport(gridContainer);
                console.log('Mobile touch support enabled for year grids');
            }

            // 3. Load and process activity data in background
            const dataLoadTimeout = 30000; // 30 seconds
            let events = [];
            try {
                events = await Promise.race([
                    parseActivityData(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Data loading timeout')), dataLoadTimeout)
                    )
                ]);

                // 4. Populate grids with actual data
                await initializeYearGrids(events);

                console.log(`Loaded ${events.length} activity events for year grids`);
            } catch (error) {
                console.warn('Failed to load activity data, showing empty grids:', error);
                events = []; // Ensure events is defined for heatmap initialization
            }

            // 4. Initialize heatmap feature AFTER year grids are created
            // Add a small delay to ensure DOM is fully rendered
            await new Promise(resolve => setTimeout(resolve, 100));

            const heatmapContainer = document.getElementById('year-grid');
            if (heatmapContainer && typeof initializeHeatmapFeature === 'function') {
                try {
                    console.log('Initializing heatmap feature...');
                    console.log('Year grids in container:', heatmapContainer.querySelectorAll('.year-item').length);

                    const heatmapManager = initializeHeatmapFeature(heatmapContainer, events || []);
                    console.log('Heatmap feature initialized successfully');
                    console.log('Heatmap enabled:', heatmapManager.isHeatmapEnabled());

                    // Store reference for later use
                    window.heatmapManager = heatmapManager;

                    // Update heatmap with loaded activity data
                    if (events && events.length > 0) {
                        heatmapManager.updateActivityData(events);
                        console.log(`Updated heatmap with ${events.length} activity events`);
                    }
                } catch (error) {
                    console.error('Failed to initialize heatmap feature:', error);
                }
            } else {
                console.warn('Heatmap feature not available - initializeHeatmapFeature function not found');
            }

            // 5. Set up dark mode monitoring (following existing pattern)
            const observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.attributeName === 'class') {
                        try {
                            applyDarkModeToYearGrids();
                            // Update heatmap colors for dark mode
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

            // Monitor both documentElement and body for dark mode changes
            try {
                observer.observe(document.documentElement, { attributes: true });
                observer.observe(document.body, { attributes: true });
            } catch (error) {
                console.warn('Failed to set up dark mode observer:', error);
            }

            // 6. Set up responsive monitoring integration
            setupResponsiveIntegration(heatmapContainer, isMobile);

            console.log('Year page initialized successfully');
            return; // Success, exit retry loop

        } catch (error) {
            console.error(`Year page initialization attempt ${attempt} failed:`, error);

            if (attempt === maxRetries) {
                // Final attempt failed
                console.error('Failed to initialize year page after all attempts');
                return;
            }

            // Wait before retrying
            console.log(`Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}



// Initialize when DOM is loaded (following existing pattern)
document.addEventListener('DOMContentLoaded', initializeYearPage);