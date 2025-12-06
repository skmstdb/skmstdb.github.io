// Improved function to parse CSV data with quote handling
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = processCSVLine(lines[0]);
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        const values = processCSVLine(lines[i]);
        const entry = {};

        for (let j = 0; j < headers.length; j++) {
            entry[headers[j].trim()] = values[j] ? values[j].trim() : '';
        }

        result.push(entry);
    }

    return result;
}

// Helper function to process CSV lines with quotes
function processCSVLine(line) {
    const result = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }

    // Push the last value
    result.push(currentValue);
    return result;
}

// formatDate is now defined in jst-utils.js


// Helper function to parse and format a list of date strings (e.g., from 'Add' or 'Date' columns)
// This ensures that all dates from CSV are consistently YYYY-MM-DD (JST)
function parseAndFormatDates(dateStringList) {
    if (!dateStringList) return [];
    return dateStringList.split(',').map(dateStr => {
        const dateObj = parseJSTDate(dateStr.trim());
        return formatDate(dateObj); // Use our consistent formatDate
    }).filter(d => d !== null); // Filter out any invalid or null formatted dates
}


// Function to normalize worksType values
function normalizeWorksType(worksType) {
    if (!worksType) return 'その他';

    // Valid types in our application
    const validTypes = ['映画', 'TV', '舞台', 'BOOK', 'その他', '声の出演'];

    // First trim whitespace
    const trimmedType = worksType.trim();

    // Check if it's already a valid type (exact match)
    if (validTypes.includes(trimmedType)) {
        return trimmedType;
    }

    // Default to "other" if no match
    // console.warn('Unrecognized WorksType normalized to その他:', worksType); // Only warn if necessary
    return 'その他';
}

// Function to get activity type class
function getActivityTypeClass(worksType) {
    // Normalize the input worksType first
    const normalizedType = normalizeWorksType(worksType);

    const mapping = {
        '映画': 'activity-movie',
        'TV': 'activity-tv',
        '舞台': 'activity-stage',
        'BOOK': 'activity-book',
        'その他': 'activity-other',
        '声の出演': 'activity-voice'
    };

    return mapping[normalizedType] || 'activity-other';
}

// Function to get activity order
function getActivityOrder(worksType) {
    // Normalize the input worksType first
    const normalizedType = normalizeWorksType(worksType);

    const mapping = {
        '映画': 1,
        'TV': 2,
        '舞台': 3,
        'BOOK': 4,
        'その他': 5,
        '声の出演': 6
    };

    return mapping[normalizedType] || 99;
}

// --- Constants for Graph Generation ---
const BIRTH_DATE = parseJSTDate('1973/10/14');
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', '🎂', 'Nov', 'Dec'];
const CURRENT_YEAR = getJSTYear();
const START_YEAR_MONTH_VIEW = 1992;
const START_YEAR_GLOBAL = 1970; // For Year View
const AGE_START = 0; // For Age View

// --- Helper to get age at a specific date ---
function getAgeAtDate(birthDate, targetDate) {
    let age = targetDate.getUTCFullYear() - birthDate.getUTCFullYear();
    const m = targetDate.getUTCMonth() - birthDate.getUTCMonth();
    if (m < 0 || (m === 0 && targetDate.getUTCDate() < birthDate.getUTCDate())) {
        age--;
    }
    return age;
}

// --- Common function to render graph HTML structure ---
function renderGraphStructure(containerId, dataMap, labelMap, type, showLeadRoleOnly, selectedTypes) {
    const graphContainer = document.getElementById(containerId);
    if (!graphContainer) return;

    graphContainer.innerHTML = ''; // Clear previous graph

    const graphHTML = document.createElement('div');
    graphHTML.className = 'graph-container';

    if (type === 'month') {
        const latestYear = Math.max(CURRENT_YEAR, ...Object.keys(labelMap).map(key => parseInt(key.split('-')[0]) || 0));
        const years = [];
        for (let year = latestYear; year >= START_YEAR_MONTH_VIEW; year--) {
            years.push(year);
        }

        // Create year headers - each digit of the year on a separate row
        // Create year headers - single row with vertical text
        const yearHeaderRow = document.createElement('div');
        yearHeaderRow.className = 'year-header-row';

        const emptySpacer = document.createElement('div');
        emptySpacer.className = 'year-header-spacer';
        yearHeaderRow.appendChild(emptySpacer);

        years.forEach(year => {
            const yearCell = document.createElement('div');
            yearCell.className = 'year-header-cell';
            const yearSpan = document.createElement('span');
            yearSpan.className = 'year-text';
            yearSpan.textContent = String(year);
            yearCell.appendChild(yearSpan);
            yearHeaderRow.appendChild(yearCell);
        });
        graphHTML.appendChild(yearHeaderRow);

        // Create month rows
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const monthRow = document.createElement('div');
            monthRow.className = 'month-row';

            const monthLabel = document.createElement('div');
            monthLabel.className = 'month-label';
            monthLabel.textContent = MONTH_NAMES[monthIndex];
            monthRow.appendChild(monthLabel);

            years.forEach(year => {
                const key = `${year}-${monthIndex}`;
                const yearCell = document.createElement('div');
                yearCell.className = 'year-container';

                const yearBox = document.createElement('div');
                yearBox.className = 'year-box';

                // worksForKey now directly holds the list of work items for this month
                const worksForKey = dataMap[key];

                if (worksForKey && worksForKey.length > 0) {
                    const totalWorksInCell = worksForKey.length; // 总作品数，用于格子背景颜色变化
                    yearBox.setAttribute('data-total-works', totalWorksInCell);

                    // NEW LOGIC: Group works by type and determine segment height based on distinct types
                    const groupedWorksByType = {};
                    worksForKey.forEach(work => {
                        const normalizedType = normalizeWorksType(work.WorksType);
                        if (!groupedWorksByType[normalizedType]) {
                            groupedWorksByType[normalizedType] = [];
                        }
                        groupedWorksByType[normalizedType].push(work);
                    });

                    // Get distinct types and sort them for consistent order
                    const distinctTypes = Object.keys(groupedWorksByType).sort((a, b) =>
                        getActivityOrder(a) - getActivityOrder(b)
                    );

                    // Calculate height per distinct type segment
                    const heightPerTypeSegment = 100 / distinctTypes.length;

                    // Create segments based on types
                    distinctTypes.forEach((type, index) => {
                        const worksOfType = groupedWorksByType[type];
                        const typeCount = worksOfType.length; // Count of works for this specific type

                        const activitySegment = document.createElement('div');
                        const typeClass = getActivityTypeClass(type);

                        let highClass = '';
                        if (typeCount >= 2) { // Apply 'high' class if this type has 2 or more works
                            highClass = 'high';
                        }

                        activitySegment.className = `activity-segment ${typeClass} ${highClass}`;
                        activitySegment.style.height = `${heightPerTypeSegment}%`;
                        activitySegment.style.top = `${index * heightPerTypeSegment}%`;

                        yearBox.appendChild(activitySegment);
                    });

                    yearBox.classList.add('clickable');
                    yearBox.setAttribute('data-key', key);
                    yearBox.addEventListener('click', function () {
                        showWorksDetail(this.getAttribute('data-key'), labelMap, type);
                    });
                } else {
                    yearBox.classList.add('year-box-empty');
                    yearBox.setAttribute('data-total-works', 0); // Explicitly mark empty
                }
                yearCell.appendChild(yearBox);
                monthRow.appendChild(yearCell);
            });
            graphHTML.appendChild(monthRow);
        }

    } else if (type === 'year' || type === 'age') {
        const currentYearOrAge = type === 'year' ? CURRENT_YEAR : getAgeAtDate(BIRTH_DATE, new Date());
        const startValue = type === 'year' ? START_YEAR_GLOBAL : AGE_START;

        // Decade labels (0-9)
        const digitLabelRow = document.createElement('div');
        digitLabelRow.className = 'digit-label-row';

        const digitSpacer = document.createElement('div');
        digitSpacer.className = 'digit-label-spacer';
        digitLabelRow.appendChild(digitSpacer);

        for (let i = 0; i < 10; i++) {
            const digitCell = document.createElement('div');
            digitCell.className = 'digit-label-cell';
            digitCell.textContent = i;
            digitLabelRow.appendChild(digitCell);
        }
        graphHTML.appendChild(digitLabelRow);

        // Rows for decades
        let currentDecadeStart = Math.floor(startValue / 10) * 10;
        const lastRelevantValue = type === 'year' ? CURRENT_YEAR : getAgeAtDate(BIRTH_DATE, new Date());
        const lastDecadeStart = Math.floor(lastRelevantValue / 10) * 10;

        for (let decadeStart = currentDecadeStart; decadeStart <= lastDecadeStart; decadeStart += 10) {
            const decadeRow = document.createElement('div');
            decadeRow.className = `${type}-view-row`;

            const decadeLabel = document.createElement('div');
            decadeLabel.className = `${type}-view-label`;
            decadeLabel.textContent = type === 'year' ? `${decadeStart}s` : `${decadeStart}s`; // e.g., 1970s, 0s
            decadeRow.appendChild(decadeLabel);

            for (let i = 0; i < 10; i++) {
                const value = decadeStart + i; // This is the year or age
                const yearOrAgeCell = document.createElement('div');
                yearOrAgeCell.className = `${type}-view-cell`;

                const yearOrAgeBox = document.createElement('div');
                yearOrAgeBox.className = `${type === 'year' ? 'year-box-year-view' : 'year-box-age-view'}`;

                // worksForKey now directly holds the list of work items for this year/age
                const worksForKey = dataMap[value];

                if (worksForKey && worksForKey.length > 0) {
                    const totalWorksInCell = worksForKey.length; // 总作品数，用于格子背景颜色变化
                    yearOrAgeBox.setAttribute('data-total-works', totalWorksInCell);

                    // NEW LOGIC: Group works by type and determine segment height based on distinct types
                    const groupedWorksByType = {};
                    worksForKey.forEach(work => {
                        const normalizedType = normalizeWorksType(work.WorksType);
                        if (!groupedWorksByType[normalizedType]) {
                            groupedWorksByType[normalizedType] = [];
                        }
                        groupedWorksByType[normalizedType].push(work);
                    });

                    // Get distinct types and sort them for consistent order
                    const distinctTypes = Object.keys(groupedWorksByType).sort((a, b) =>
                        getActivityOrder(a) - getActivityOrder(b)
                    );

                    // Calculate height per distinct type segment
                    const heightPerTypeSegment = 100 / distinctTypes.length;

                    // Create segments based on types
                    distinctTypes.forEach((type, index) => {
                        const worksOfType = groupedWorksByType[type];
                        const typeCount = worksOfType.length; // Count of works for this specific type

                        const activitySegment = document.createElement('div');
                        const typeClass = getActivityTypeClass(type);

                        let highClass = '';
                        if (typeCount >= 2) { // Apply 'high' class if this type has 2 or more works
                            highClass = 'high';
                        }

                        activitySegment.className = `activity-segment ${typeClass} ${highClass}`;
                        activitySegment.style.height = `${heightPerTypeSegment}%`;
                        activitySegment.style.top = `${index * heightPerTypeSegment}%`;
                        yearOrAgeBox.appendChild(activitySegment);
                    });

                    yearOrAgeBox.classList.add('clickable');
                    yearOrAgeBox.setAttribute('data-key', value);
                    yearOrAgeBox.addEventListener('click', function () {
                        showWorksDetail(this.getAttribute('data-key'), labelMap, type);
                    });
                } else {
                    yearOrAgeBox.classList.add('year-box-empty');
                    yearOrAgeBox.setAttribute('data-total-works', 0); // Explicitly mark empty
                }
                yearOrAgeCell.appendChild(yearOrAgeBox);
                decadeRow.appendChild(yearOrAgeCell);
            }
            graphHTML.appendChild(decadeRow);
        }
    }

    graphContainer.appendChild(graphHTML);
}


// --- Unified Function to Process Relevant Dates for a Single Item ---
function getFilteredActivityDates(item) {
    const startDate = new Date(item.DateStart);
    let endDate = startDate;
    if (item.DateEnd && item.DateEnd.trim() !== '') {
        const parsedEndDate = new Date(item.DateEnd);
        if (!isNaN(parsedEndDate.getTime())) {
            endDate = parsedEndDate;
        }
    }
    // If DateStart is invalid, return empty set as no range can be established
    if (isNaN(startDate.getTime())) {
        console.warn('Invalid DateStart for item:', item.Title, item.DateStart);
        return new Set();
    }

    // Parse Weekday filter: 1=Mon, 7=Sun. Can be comma-separated.
    // If empty/invalid, assume no weekday filter.
    const weekdayFilterRaw = item.Weekday ? item.Weekday.trim() : '';
    let weekdayFilterSet = null; // Will store a Set of allowed weekdays (1-7) or null if no filter

    if (weekdayFilterRaw !== '') {
        const parsedWeekdays = weekdayFilterRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 7);
        if (parsedWeekdays.length > 0) {
            weekdayFilterSet = new Set(parsedWeekdays);
        } else {
            // Only warn if the entire string was non-empty but parsed to no valid weekdays
            console.warn('Invalid or empty Weekday values for item (after parsing):', item.Title, item.Weekday);
        }
    }

    // Dates to be unconditionally excluded (highest priority)
    const excludeDates = new Set(parseAndFormatDates(item.DateDelete));
    // Dates to be unconditionally added (after range, before final exclusion)
    const additionalDates = parseAndFormatDates(item.DateAdd);

    const relevantDates = new Set(); // Stores 'YYYY-MM-DD' strings

    // 1. Process dates from DateStart to DateEnd, applying Weekday filter
    let currentIterateDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    let safetyCounter = 0;
    const MAX_ITERATIONS = 366 * 100; // Max 100 years to prevent infinite loops

    while (currentIterateDate <= endDate && safetyCounter < MAX_ITERATIONS) {
        // Get day of the week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        let dayOfWeek = currentIterateDate.getUTCDay();
        // Convert to 1=Monday, ..., 7=Sunday to match CSV Weekday column
        let csvDayOfWeek = (dayOfWeek === 0) ? 7 : dayOfWeek;

        // Check if the current day passes the weekday filter
        // If weekdayFilterSet is null, no restriction. Otherwise, check if csvDayOfWeek is in the set.
        const passesWeekdayFilter = (weekdayFilterSet === null || weekdayFilterSet.has(csvDayOfWeek));

        if (passesWeekdayFilter) {
            const formattedDate = formatDate(currentIterateDate);
            if (formattedDate) { // Make sure date is validly formatted
                relevantDates.add(formattedDate);
            }
        }
        currentIterateDate.setUTCDate(currentIterateDate.getUTCDate() + 1); // Move to next day
        safetyCounter++;
    }

    // 2. Add dates from 'DateAdd' column (independent of Weekday, but will be subject to final 'DateDelete' exclusion)
    additionalDates.forEach(dateStr => {
        relevantDates.add(dateStr);
    });

    // 3. Remove dates specified in 'DateDelete' column (highest priority exclusion)
    excludeDates.forEach(dateStr => {
        relevantDates.delete(dateStr);
    });

    return relevantDates;
}


// Function to create the contribution graph (Month View)
function createMonthGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    // console.log('Creating Month Graph...');
    const monthlyWorksMap = {}; // Stores detailed works for each month (key: "YYYY-M")

    data.forEach(item => {
        // Filter by PageActivity for Month Graph
        if (!item.PageActivity || item.PageActivity.trim() === '') return;

        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const filteredActivityDates = getFilteredActivityDates(item); // Get all active dates for this item

        filteredActivityDates.forEach(dateStr => {
            const dateObj = new Date(dateStr); // Convert back to Date object for month/year extraction
            const year = dateObj.getUTCFullYear();
            const month = dateObj.getUTCMonth();
            const key = `${year}-${month}`; // Key for month view

            if (!monthlyWorksMap[key]) monthlyWorksMap[key] = [];
            // Ensure unique work item per month. If a work spans multiple days within a month, it should only be counted once for that month.
            // Check if a work with the same title already exists for this month to prevent duplicates
            if (!monthlyWorksMap[key].some(work => work.Title === item.Title)) {
                monthlyWorksMap[key].push(item);
            }
        });
    });

    // Pass the same map for both dataMap and labelMap
    renderGraphStructure('contribution-graph', monthlyWorksMap, monthlyWorksMap, 'month', showLeadRoleOnly, selectedTypes);
}

// Function to create the Year View graph
function createYearGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    // console.log('Creating Year Graph...');
    const yearlyWorksMap = {}; // Stores detailed works for each year (key: "YYYY")

    data.forEach(item => {
        // Filter by PageActivity for Year Graph
        if (!item.PageActivity || item.PageActivity.trim() === '') return;

        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const filteredActivityDates = getFilteredActivityDates(item); // Get all active dates for this item

        // Process unique years from filtered dates
        const yearsWithActivity = new Set();
        filteredActivityDates.forEach(dateStr => {
            const dateObj = new Date(dateStr);
            yearsWithActivity.add(dateObj.getUTCFullYear());
        });

        yearsWithActivity.forEach(year => {
            if (!yearlyWorksMap[year]) yearlyWorksMap[year] = [];
            // Ensure unique work item per year
            if (!yearlyWorksMap[year].some(work => work.Title === item.Title)) {
                yearlyWorksMap[year].push(item);
            }
        });
    });
    // Pass the same map for both dataMap and labelMap
    renderGraphStructure('year-graph-container', yearlyWorksMap, yearlyWorksMap, 'year', showLeadRoleOnly, selectedTypes);
}

// Function to create the Age View graph
function createAgeGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    // console.log('Creating Age Graph...');
    const ageWorksMap = {}; // Stores detailed works for each age (key: "age")

    data.forEach(item => {
        // Filter by PageActivity for Age Graph
        if (!item.PageActivity || item.PageActivity.trim() === '') return;

        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const filteredActivityDates = getFilteredActivityDates(item); // Get all active dates for this item

        // Process unique ages from filtered dates
        const agesWithActivity = new Set();
        filteredActivityDates.forEach(dateStr => {
            const dateObj = new Date(dateStr);
            agesWithActivity.add(getAgeAtDate(BIRTH_DATE, dateObj));
        });

        agesWithActivity.forEach(age => {
            if (!ageWorksMap[age]) ageWorksMap[age] = [];
            // Ensure unique work item per age
            if (!ageWorksMap[age].some(work => work.Title === item.Title)) {
                ageWorksMap[age].push(item);
            }
        });
    });
    // Pass the same map for both dataMap and labelMap
    renderGraphStructure('age-graph-container', ageWorksMap, ageWorksMap, 'age', showLeadRoleOnly, selectedTypes);
}


// --- Chart View Implementation ---
let currentChartMode = 'year'; // year, decade, age, age-decade

function createChartView(data, showLeadRoleOnly = false, selectedTypes = []) {
    const container = document.getElementById('chart-view-container');
    if (!container) return;

    // Ensure container itself is strictly constrained
    container.style.width = '100%';
    // container.style.overflow = 'hidden'; // Let chart-content handle scroll

    // 1. Render Controls (if not present)
    let controlsDiv = container.querySelector('.chart-controls');
    if (!controlsDiv) {
        controlsDiv = document.createElement('div');
        controlsDiv.className = 'chart-controls';
        controlsDiv.style.marginBottom = '20px';
        controlsDiv.style.textAlign = 'center';

        const modes = [
            { id: 'year', label: 'Year' },
            { id: '5-year', label: '5 Years' },
            { id: 'decade', label: 'Decade' },
            { id: 'age', label: 'Age' },
            { id: '5-year-age', label: 'Age 5 Years' },
            { id: 'age-decade', label: 'Age Decade' }
        ];

        modes.forEach(mode => {
            const btn = document.createElement('button');
            btn.textContent = mode.label;
            btn.className = 'chart-mode-btn';
            if (mode.id === currentChartMode) btn.classList.add('active');

            // Basic styles for buttons (can be moved to CSS later)
            btn.style.padding = '5px 15px';
            btn.style.margin = '0 5px';
            btn.style.cursor = 'pointer';
            btn.style.border = '1px solid #ccc';
            btn.style.backgroundColor = mode.id === currentChartMode ? '#ddd' : '#fff';
            btn.style.borderRadius = '4px';

            btn.addEventListener('click', () => {
                currentChartMode = mode.id;
                // Update button styles
                container.querySelectorAll('.chart-mode-btn').forEach(b => {
                    b.style.backgroundColor = '#fff';
                    b.classList.remove('active');
                });
                btn.style.backgroundColor = '#ddd';
                btn.classList.add('active');

                // Get current filter state dynamically
                const currentShowLeadRoleOnly = document.getElementById('lead-role-filter').checked;
                const currentSelectedTypes = Array.from(document.querySelectorAll('.type-filter'))
                    .filter(input => input.checked)
                    .map(input => input.dataset.type);

                // Re-render chart with current filters
                renderChartContent(data, currentShowLeadRoleOnly, currentSelectedTypes);
            });
            controlsDiv.appendChild(btn);
        });
        container.innerHTML = ''; // Clear previous
        container.appendChild(controlsDiv);
    }

    // 2. Render Chart Content Area
    let chartArea = container.querySelector('.chart-content');
    if (!chartArea) {
        chartArea = document.createElement('div');
        chartArea.className = 'chart-content';
        chartArea.style.display = 'flex';
        chartArea.style.alignItems = 'flex-end';
        chartArea.style.height = '540px';
        chartArea.style.width = '100%'; // Match main-content width
        chartArea.style.minWidth = '0'; // Prevent flex breakout
        chartArea.style.padding = '10px 0 30px 0';
        chartArea.style.overflowX = 'auto';
        chartArea.style.justifyContent = 'space-between'; // Flexible spacing
        chartArea.style.gap = '2px'; // Minimum gap
        chartArea.style.boxSizing = 'border-box';
        container.appendChild(chartArea);
    }

    renderChartContent(data, showLeadRoleOnly, selectedTypes);
}

function renderChartContent(data, showLeadRoleOnly, selectedTypes) {
    const chartArea = document.querySelector('#chart-view-container .chart-content');
    if (!chartArea) return;
    chartArea.innerHTML = '';

    // Aggregate Data
    const aggregatedData = {}; // key -> { total: 0, worksList: [], typeCounts: {} }

    // Initialize Keys based on Range
    let sortedKeys = [];
    if (currentChartMode === 'year') {
        const start = 1992;
        const end = CURRENT_YEAR;
        for (let y = start; y <= end; y++) sortedKeys.push(y);
    } else if (currentChartMode === 'age') {
        const start = 19;
        const end = getAgeAtDate(BIRTH_DATE, new Date());
        for (let a = start; a <= end; a++) sortedKeys.push(a);
    } else if (currentChartMode === 'decade') {
        const start = 1990;
        const end = Math.floor(CURRENT_YEAR / 10) * 10;
        for (let d = start; d <= end; d += 10) sortedKeys.push(d + 's');
    } else if (currentChartMode === '5-year') {
        sortedKeys.push('1992-1994'); // Special first group
        const start = 1995;
        const end = CURRENT_YEAR;
        for (let y = start; y <= end; y += 5) {
            sortedKeys.push(`${y}-${y + 4}`);
        }
    } else if (currentChartMode === '5-year-age') {
        const start = 20;
        const end = getAgeAtDate(BIRTH_DATE, new Date());
        for (let a = start; a <= end; a += 5) {
            sortedKeys.push(`${a}-${a + 4}`);
        }
    } else if (currentChartMode === 'age-decade') {
        const start = 10; // Assuming 19 is start age, so 10s is the decade
        const end = Math.floor(getAgeAtDate(BIRTH_DATE, new Date()) / 10) * 10;
        for (let ad = start; ad <= end; ad += 10) sortedKeys.push(ad + 's');
    }

    // Initialize aggregation map
    sortedKeys.forEach(k => {
        aggregatedData[k] = { total: 0, worksList: [], typeCounts: {} };
    });

    data.forEach(item => {
        // Filter by PageWorks (Y or not empty)
        if (!item.PageWorks || item.PageWorks.trim() === '') return;

        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        // Determine Keys for this item
        const keys = new Set();
        const filteredActivityDates = getFilteredActivityDates(item);

        filteredActivityDates.forEach(dateStr => {
            const dateObj = new Date(dateStr);
            let key;
            if (currentChartMode === 'year') {
                key = dateObj.getUTCFullYear();
            } else if (currentChartMode === 'decade') {
                const year = dateObj.getUTCFullYear();
                key = Math.floor(year / 10) * 10 + 's';
            } else if (currentChartMode === '5-year') {
                const year = dateObj.getUTCFullYear();
                if (year < 1995) {
                    key = '1992-1994';
                } else {
                    const blockStart = 1995 + Math.floor((year - 1995) / 5) * 5;
                    key = `${blockStart}-${blockStart + 4}`;
                }
            } else if (currentChartMode === '5-year-age') {
                const age = getAgeAtDate(BIRTH_DATE, dateObj);
                if (age >= 20) {
                    const blockStart = 20 + Math.floor((age - 20) / 5) * 5;
                    key = `${blockStart}-${blockStart + 4}`;
                }
            } else if (currentChartMode === 'age') {
                key = getAgeAtDate(BIRTH_DATE, dateObj);
            } else if (currentChartMode === 'age-decade') {
                const age = getAgeAtDate(BIRTH_DATE, dateObj);
                key = Math.floor(age / 10) * 10 + 's';
            }
            if (key !== undefined && aggregatedData[key]) keys.add(key);
        });

        // Add to aggregation
        keys.forEach(key => {
            if (!aggregatedData[key].worksList.some(w => w.Title === item.Title)) {
                aggregatedData[key].worksList.push(item);
                aggregatedData[key].total++;
                const nType = normalizeWorksType(item.WorksType);
                aggregatedData[key].typeCounts[nType] = (aggregatedData[key].typeCounts[nType] || 0) + 1;
            }
        });
    });

    if (sortedKeys.length === 0) {
        chartArea.innerHTML = '<p>No data available for current selection.</p>';
        return;
    }

    // Find max total for scaling
    const maxTotal = Math.max(1, ...sortedKeys.map(k => aggregatedData[k].total));

    // Prepare map for showWorksDetail
    const worksMapForDetail = {};
    sortedKeys.forEach(k => worksMapForDetail[k] = aggregatedData[k].worksList);

    // Render Bars
    sortedKeys.forEach(key => {
        const dataPoint = aggregatedData[key];

        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar-container';
        barContainer.style.flex = '1 0 auto';

        // Conditional Min Width (Year/Age = Narrow, Decade/5-Year = Wide)
        if (currentChartMode === 'year' || currentChartMode === 'age') {
            barContainer.style.minWidth = '12px';
        } else {
            barContainer.style.minWidth = '30px';
        }

        barContainer.style.maxWidth = '60px';
        // barContainer.style.margin = '0 1px'; // REMOVE margin, rely on gap
        barContainer.style.display = 'flex';
        barContainer.style.flexDirection = 'column-reverse'; // Bottom-up stacking
        barContainer.style.alignItems = 'center';
        barContainer.style.height = '100%';
        barContainer.style.position = 'relative';
        barContainer.style.cursor = 'pointer';

        if (dataPoint.total > 0) {
            barContainer.addEventListener('click', () => {
                showWorksDetail(key, worksMapForDetail, currentChartMode);
            });
        }

        let tooltipText = `${key} (Total: ${dataPoint.total})`;
        if (dataPoint.total > 0) {
            const types = Object.keys(dataPoint.typeCounts).sort((a, b) => getActivityOrder(a) - getActivityOrder(b));
            types.forEach(t => {
                tooltipText += `\n${t}: ${dataPoint.typeCounts[t]}`;
            });
        }
        barContainer.title = tooltipText;

        // Label (Visually at Bottom)
        const label = document.createElement('div');
        label.className = 'chart-bar-label';
        label.textContent = key;
        label.style.fontSize = '10px';
        label.style.marginTop = '4px';
        label.style.textAlign = 'center';
        label.style.whiteSpace = 'nowrap';

        // Vertical Text Logic - ONLY for Year view (4 digits in 12px)
        if (currentChartMode === 'year') {
            label.style.writingMode = 'vertical-rl';
            label.style.marginTop = '8px';
        }

        // Bar Wrapper
        const barWrapper = document.createElement('div');
        barWrapper.style.width = '100%';
        barWrapper.style.height = dataPoint.total > 0 ? `${(dataPoint.total / maxTotal) * 85}%` : '0px';
        barWrapper.style.minHeight = dataPoint.total > 0 ? '1px' : '0px';
        barWrapper.style.display = 'flex';
        barWrapper.style.flexDirection = 'column-reverse'; // Stack segments bottom-up
        barWrapper.style.position = 'relative';
        barWrapper.style.borderBottom = '1px solid #999'; // X-axis line

        const typeOrder = ['映画', 'TV', '舞台', 'BOOK', 'その他', '声の出演'];
        typeOrder.forEach(type => {
            const count = dataPoint.typeCounts[type];
            if (count) {
                const segment = document.createElement('div');
                const typeClass = getActivityTypeClass(type);
                segment.className = `${typeClass} chart-bar-segment`;
                segment.style.width = '100%';
                segment.style.flex = count;
                segment.style.borderTop = '1px solid rgba(255,255,255,0.3)';
                segment.style.boxSizing = 'border-box';
                barWrapper.appendChild(segment);
            }
        });

        // Total Count Label (Visually at Top)
        const countLabel = document.createElement('div');
        countLabel.textContent = dataPoint.total > 0 ? dataPoint.total : '';
        countLabel.style.fontSize = '9px';
        countLabel.style.marginBottom = '2px';
        countLabel.style.textAlign = 'center';
        countLabel.style.height = '12px'; // Fixed height reservation

        // Append in Order for column-reverse (Bottom to Top)
        // 1. Label (Bottom)
        barContainer.appendChild(label);
        // 2. Bar (Middle)
        barContainer.appendChild(barWrapper);
        // 3. Count (Top)
        barContainer.appendChild(countLabel);

        chartArea.appendChild(barContainer);
    });
}


// Display Works Detail (Updated to handle different key types)
function showWorksDetail(key, worksDataMap, viewType) {
    const detailContainer = document.getElementById('works-detail-container');
    const detailContent = detailContainer.querySelector('.detail-content');

    if (!detailContainer || !detailContent) return;

    let works = [];
    let title = '';

    if (viewType === 'month') {
        works = worksDataMap[key] || [];
        const [year, month] = key.split('-');
        title = `${year} ${MONTH_NAMES[parseInt(month)]}`;
    } else if (viewType === 'year') {
        works = worksDataMap[parseInt(key)] || []; // Ensure key is int for map lookup
        title = `Year: ${key}`;
    } else if (viewType === 'age') {
        works = worksDataMap[parseInt(key)] || [];
        title = `公開時年齢: ${key}`;
    } else if (viewType === 'decade') {
        // worksDataMap passed from renderChartContent will be aggregatedData which stores { worksList: [...] }
        // BUT wait, existing views pass a map of key -> Array.
        // renderChartContent passes aggregatedData which is key -> Object.
        // We need to handle this difference.
        // Actually, let's make renderChartContent pass a simple key->List map to showWorksDetail
        // OR update showWorksDetail to handle list directly.
        // For simplicity, let's assume worksDataMap[key] returns the list of works.
        // We will adapt renderChartContent to pass the correct structure.

        // However, in renderChartContent below, I will construct a `worksMap` specifically for this.

        works = worksDataMap[key] || [];
        title = `Decade: ${key}`;
    } else if (viewType === '5-year') {
        works = worksDataMap[key] || [];
        title = `Period: ${key}`;
    } else if (viewType === '5-year-age') {
        works = worksDataMap[key] || [];
        title = `Age Period: ${key}`;
    } else if (viewType === 'age-decade') {
        works = worksDataMap[key] || [];
        title = `Age Decade: ${key}`;
    }

    if (works.length === 0) {
        detailContent.innerHTML = `<p>No works found for ${title}.</p>`;
    } else {
        const worksByType = {};
        works.forEach(work => {
            // Normalize WorksType before grouping
            const normalizedType = normalizeWorksType(work.WorksType);
            if (!worksByType[normalizedType]) {
                worksByType[normalizedType] = [];
            }
            worksByType[normalizedType].push(work);
        });

        let html = `<h4>${title}</h4>`;

        const typeOrder = {
            '映画': 1, 'TV': 2, '舞台': 3, 'BOOK': 4, 'その他': 5, '声の出演': 6
        };

        const sortedTypes = Object.keys(worksByType).sort((a, b) =>
            (typeOrder[a] || 99) - (typeOrder[b] || 99)
        );

        sortedTypes.forEach(type => {
            let typeWorks = worksByType[type]; // Use let here as we'll reassign after sort

            // Sort works within each type by DateStart ascending, then by Title ascending
            typeWorks.sort((a, b) => {
                const dateA = new Date(a.DateStart);
                const dateB = new Date(b.DateStart);

                // Sort by DateStart ascending
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime();
                }

                // If DateStart is the same, sort by Title ascending
                return a.Title.localeCompare(b.Title);
            });

            const typeClass = getActivityTypeClass(type);

            html += `<div class="works-type-group">
                <h5 class="${typeClass}-title">${type}</h5>
                <div class="works-row ${typeClass}-row">`;

            typeWorks.forEach(work => {
                let dateDisplay = work.DateStart;
                if (work.DateEnd && work.DateEnd !== work.DateStart) {
                    dateDisplay += ` ~ ${work.DateEnd}`;
                }

                html += `
                <div class="work-card ${typeClass}">
                    <div class="work-title">${work.Title}</div>
                    <div class="work-date">${dateDisplay}</div>
                    ${work.Role ? `<div class="work-role">${work.Role}</div>` : ''}
                </div>
                `;
            });

            html += '</div></div>';
        });

        detailContent.innerHTML = html;
    }

    detailContainer.style.display = 'block';
    detailContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// --- Main Logic for Loading and Filtering ---
document.addEventListener('DOMContentLoaded', function () {
    // console.log('Activity visualization initializing...');

    // Assuming loadNavbar and highlightCurrentPage are defined elsewhere
    if (typeof loadNavbar === 'function') {
        loadNavbar().then(() => {
            if (typeof highlightCurrentPage === 'function') {
                highlightCurrentPage();
            }
        });
    }

    const leadRoleFilter = document.getElementById('lead-role-filter');
    const typeFilters = document.querySelectorAll('.type-filter');
    const viewFilters = document.querySelectorAll('.view-filter'); // New: Year/Age view filters

    let worksData = []; // Store fetched data globally

    // Function to update the graph based on current filter selections
    function updateGraphView() {
        const showLeadRoleOnly = leadRoleFilter.checked;
        const selectedTypes = Array.from(typeFilters)
            .filter(input => input.checked)
            .map(input => input.dataset.type);

        const monthGraph = document.getElementById('contribution-graph');
        const yearGraph = document.getElementById('year-graph-container');
        const ageGraph = document.getElementById('age-graph-container');

        const chartGraph = document.getElementById('chart-view-container');

        const yearViewActive = document.getElementById('year-view-filter').checked;
        const ageViewActive = document.getElementById('age-view-filter').checked;
        const chartViewActive = document.getElementById('chart-view-filter') ? document.getElementById('chart-view-filter').checked : false;

        monthGraph.style.display = 'none';
        yearGraph.style.display = 'none';
        ageGraph.style.display = 'none';
        if (chartGraph) chartGraph.style.display = 'none';

        if (yearViewActive) {
            yearGraph.style.display = 'block';
            createYearGraph(worksData, showLeadRoleOnly, selectedTypes);
        } else if (ageViewActive) {
            ageGraph.style.display = 'block';
            createAgeGraph(worksData, showLeadRoleOnly, selectedTypes);
        } else if (chartViewActive) {
            if (chartGraph) {
                chartGraph.style.display = 'block';
                createChartView(worksData, showLeadRoleOnly, selectedTypes);
            }
        } else {
            // Default to month view
            monthGraph.style.display = 'block';
            createMonthGraph(worksData, showLeadRoleOnly, selectedTypes);
        }
    }

    // Fetch CSV data
    fetch('../data/biography.csv')
        .then(response => response.text())
        .then(data => {
            const allData = parseCSV(data); // Parse all data

            // Store ALL data initially, filtering happens in create functions
            worksData = allData;

            // Normalize WorksType in the data
            worksData.forEach(item => {
                if (item.WorksType) {
                    item.WorksType = normalizeWorksType(item.WorksType);
                } else {
                    item.WorksType = 'その他';
                }
            });

            // Initial graph creation (default to month view)
            updateGraphView();

            // Add event listener for lead role filter
            leadRoleFilter.addEventListener('change', updateGraphView);

            // Add event listener for type filters
            typeFilters.forEach(filter => {
                filter.addEventListener('change', updateGraphView);
            });

            // Add event listener for new view filters (Year/Age)
            viewFilters.forEach(filter => {
                filter.addEventListener('change', function () {
                    // Ensure only one view filter is checked at a time
                    viewFilters.forEach(otherFilter => {
                        if (otherFilter !== this) {
                            otherFilter.checked = false;
                        }
                    });
                    updateGraphView();
                });
            });

            // Add closing event for detail container
            const closeButton = document.querySelector('#works-detail-container .close-detail');
            if (closeButton) {
                closeButton.addEventListener('click', function () {
                    document.getElementById('works-detail-container').style.display = 'none';
                });
            }

        })
        .catch(error => {
            console.error('Error loading works data:', error);
            document.getElementById('contribution-graph').innerHTML = '<p>Failed to load activity data.</p>';
        });
});
