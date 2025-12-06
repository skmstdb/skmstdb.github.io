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

// 统一的日期格式化函数，确保格式一致YYYY-MM-DD (JST)
function formatDate(date) {
    return formatJSTDate(date);
}

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
    let age = targetDate.getFullYear() - birthDate.getFullYear();
    const m = targetDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) {
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
    let currentIterateDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    let safetyCounter = 0;
    const MAX_ITERATIONS = 366 * 100; // Max 100 years to prevent infinite loops

    while (currentIterateDate <= endDate && safetyCounter < MAX_ITERATIONS) {
        // Get day of the week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        let dayOfWeek = currentIterateDate.getDay();
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
        currentIterateDate.setDate(currentIterateDate.getDate() + 1); // Move to next day
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
        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const filteredActivityDates = getFilteredActivityDates(item); // Get all active dates for this item

        filteredActivityDates.forEach(dateStr => {
            const dateObj = new Date(dateStr); // Convert back to Date object for month/year extraction
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth();
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
        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const filteredActivityDates = getFilteredActivityDates(item); // Get all active dates for this item

        // Process unique years from filtered dates
        const yearsWithActivity = new Set();
        filteredActivityDates.forEach(dateStr => {
            const dateObj = new Date(dateStr);
            yearsWithActivity.add(dateObj.getFullYear());
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
        works = worksDataMap[parseInt(key)] || [];
        title = `Year: ${key}`;
    } else if (viewType === 'age') {
        works = worksDataMap[parseInt(key)] || [];
        title = `公開時年齢: ${key}`;
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

        const yearViewActive = document.getElementById('year-view-filter').checked;
        const ageViewActive = document.getElementById('age-view-filter').checked;

        if (yearViewActive) {
            monthGraph.style.display = 'none';
            ageGraph.style.display = 'none';
            yearGraph.style.display = 'block';
            createYearGraph(worksData, showLeadRoleOnly, selectedTypes);
        } else if (ageViewActive) {
            monthGraph.style.display = 'none';
            yearGraph.style.display = 'none';
            ageGraph.style.display = 'block';
            createAgeGraph(worksData, showLeadRoleOnly, selectedTypes);
        } else {
            // Default to month view
            yearGraph.style.display = 'none';
            ageGraph.style.display = 'none';
            monthGraph.style.display = 'block';
            createMonthGraph(worksData, showLeadRoleOnly, selectedTypes);
        }
    }

    // Fetch CSV data
    fetch('../data/biography.csv')
        .then(response => response.text())
        .then(data => {
            const allData = parseCSV(data); // Parse all data

            // Filter data: only include rows where PageActivity is not empty
            worksData = allData.filter(item => item.PageActivity && item.PageActivity.trim() !== '');

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
