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

// 统一的日期格式化函数，确保格式一致
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    console.log('Unrecognized WorksType normalized to その他:', worksType);
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
const BIRTH_DATE = new Date('1973-10-14');
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', '🎂', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();
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

    let rowLabels = [];
    let columnLabels = [];
    let startColumn = 0;

    if (type === 'month') {
        // Month view (existing logic)
        const latestYear = Math.max(CURRENT_YEAR, ...Object.keys(labelMap).map(key => parseInt(key.split('-')[0])));
        const years = [];
        for (let year = latestYear; year >= START_YEAR_MONTH_VIEW; year--) {
            years.push(year);
        }
        columnLabels = years;
        rowLabels = MONTH_NAMES;
        startColumn = 48; // Spacer width for month labels
        
        // Create year headers - each digit of the year on a separate row
        for (let digitPosition = 0; digitPosition < 4; digitPosition++) {
            const digitRow = document.createElement('div');
            digitRow.className = 'digit-row';

            const emptySpacer = document.createElement('div');
            emptySpacer.className = 'year-digit-spacer';
            digitRow.appendChild(emptySpacer);

            years.forEach(year => {
                const digit = document.createElement('div');
                digit.className = 'year-digit';
                digit.textContent = String(year)[digitPosition];
                digitRow.appendChild(digit);
            });
            graphHTML.appendChild(digitRow);
        }

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
                
                const activitiesForKey = dataMap[key]; // This now holds distinct works for the month

                if (activitiesForKey && activitiesForKey.length > 0) {
                    activitiesForKey.sort((a, b) => getActivityOrder(a.type) - getActivityOrder(b.type));
                    const totalActivities = activitiesForKey.length;
                    let heightPerActivity = 100 / totalActivities;

                    activitiesForKey.forEach((activity, index) => {
                        const activitySegment = document.createElement('div');
                        activitySegment.className = `activity-segment ${getActivityTypeClass(activity.type)} ${activity.count >= 2 ? 'high' : ''}`;
                        activitySegment.style.height = `${heightPerActivity}%`;
                        activitySegment.style.top = `${index * heightPerActivity}%`;
                        yearBox.appendChild(activitySegment);
                    });
                    
                    yearBox.classList.add('clickable');
                    yearBox.setAttribute('data-key', key);
                    yearBox.addEventListener('click', function() {
                        showWorksDetail(this.getAttribute('data-key'), labelMap, type);
                    });
                } else {
                    yearBox.classList.add('year-box-empty');
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
                const value = decadeStart + i;
                const yearOrAgeCell = document.createElement('div');
                yearOrAgeCell.className = `${type}-view-cell`;

                const yearOrAgeBox = document.createElement('div');
                yearOrAgeBox.className = `${type === 'year' ? 'year-box-year-view' : 'year-box-age-view'}`; // Re-using for consistent styling
                
                const activitiesForKey = dataMap[value];

                if (activitiesForKey && activitiesForKey.length > 0) {
                    activitiesForKey.sort((a, b) => getActivityOrder(a.type) - getActivityOrder(b.type));
                    const totalActivities = activitiesForKey.length;
                    let heightPerActivity = 100 / totalActivities;

                    activitiesForKey.forEach((activity, index) => {
                        const activitySegment = document.createElement('div');
                        activitySegment.className = `activity-segment ${getActivityTypeClass(activity.type)} ${activity.count >= 2 ? 'high' : ''}`;
                        activitySegment.style.height = `${heightPerActivity}%`;
                        activitySegment.style.top = `${index * heightPerActivity}%`;
                        yearOrAgeBox.appendChild(activitySegment);
                    });

                    yearOrAgeBox.classList.add('clickable');
                    yearOrAgeBox.setAttribute('data-key', value);
                    yearOrAgeBox.addEventListener('click', function() {
                        showWorksDetail(this.getAttribute('data-key'), labelMap, type);
                    });
                } else {
                    yearOrAgeBox.classList.add('year-box-empty');
                }
                yearOrAgeCell.appendChild(yearOrAgeBox);
                decadeRow.appendChild(yearOrAgeCell);
            }
            graphHTML.appendChild(decadeRow);
        }
    }

    graphContainer.appendChild(graphHTML);
}


// Function to create the contribution graph (Month View)
function createMonthGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    console.log('Creating Month Graph...');
    const activities = {}; // Stores activity counts per type per month, counts should now be distinct works
    const monthlyWorks = {}; // Stores detailed works for each month

    data.forEach(item => {
        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const startDate = new Date(item.DateStart);
        let endDate = startDate;
        if (item.DateEnd && item.DateEnd.trim() !== '') {
            const parsedEndDate = new Date(item.DateEnd);
            if (!isNaN(parsedEndDate.getTime())) {
                endDate = parsedEndDate;
            }
        }
        if (isNaN(startDate.getTime())) return;

        const excludeDates = item.Date ? item.Date.split(',').map(d => d.trim()) : [];
        const additionalDates = item.Add ? item.Add.split(',').map(d => d.trim()) : [];

        // Logic for continuous periods (DateStart to DateEnd)
        let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        // Ensure endDate is at least the start of the month, or actual end if within the same month
        let effectiveEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate());

        while (currentDate.getFullYear() < effectiveEndDate.getFullYear() || 
               (currentDate.getFullYear() === effectiveEndDate.getFullYear() && currentDate.getMonth() <= effectiveEndDate.getMonth())) {
            
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const key = `${year}-${month}`; // e.g., "2016-0" for Jan 2016

            // Check if this specific month is explicitly excluded by a date within excludeDates
            let isMonthExcluded = false;
            for (const excludedDateStr of excludeDates) {
                const excludedDate = new Date(excludedDateStr);
                if (excludedDate.getFullYear() === year && excludedDate.getMonth() === month) {
                    isMonthExcluded = true;
                    break;
                }
            }

            if (!isMonthExcluded) {
                // Initialize if not present
                if (!monthlyWorks[key]) monthlyWorks[key] = [];
                if (!activities[key]) activities[key] = [];

                // Add work to monthlyWorks if not already present for this month
                // This ensures each unique work is counted only once per month for detail view
                if (!monthlyWorks[key].some(work => work.Title === item.Title)) {
                    monthlyWorks[key].push(item);
                }

                // For activities, we want to count unique *types* of works within this month
                // This will determine the segments and color intensity
                const existingActivityType = activities[key].find(a => a.type === item.WorksType);
                if (!existingActivityType) {
                    // If this work type is not yet registered for this month, add it
                    activities[key].push({ type: item.WorksType, count: 1 });
                } else {
                    // If the type already exists, increment its count (for intensity, if needed, though totalActivities handles this)
                    existingActivityType.count++;
                }
            }
            
            // Move to the next month
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Logic for additional specific dates
        additionalDates.forEach(dateStr => {
            const additionalDate = new Date(dateStr);
            if (!isNaN(additionalDate.getTime()) && !excludeDates.includes(dateStr)) {
                const year = additionalDate.getFullYear();
                const month = additionalDate.getMonth();
                const key = `${year}-${month}`;

                if (!monthlyWorks[key]) monthlyWorks[key] = [];
                if (!activities[key]) activities[key] = [];

                if (!monthlyWorks[key].some(work => work.Title === item.Title)) {
                    monthlyWorks[key].push(item);
                }

                const existingActivityType = activities[key].find(a => a.type === item.WorksType);
                if (!existingActivityType) {
                    activities[key].push({ type: item.WorksType, count: 1, isAdditional: true });
                } else {
                    existingActivityType.count++;
                    existingActivityType.isAdditional = true;
                }
            }
        });
    });

    renderGraphStructure('contribution-graph', activities, monthlyWorks, 'month', showLeadRoleOnly, selectedTypes);
}

// Function to create the Year View graph
function createYearGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    console.log('Creating Year Graph...');
    const yearlyActivities = {};
    const yearlyWorks = {}; // Stores detailed works for each year

    data.forEach(item => {
        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const startDate = new Date(item.DateStart);
        let endDate = startDate;
        if (item.DateEnd && item.DateEnd.trim() !== '') {
            const parsedEndDate = new Date(item.DateEnd);
            if (!isNaN(parsedEndDate.getTime())) {
                endDate = parsedEndDate;
            }
        }
        if (isNaN(startDate.getTime())) return;

        const excludeDates = item.Date ? item.Date.split(',').map(d => d.trim()) : [];
        const additionalDates = item.Add ? item.Add.split(',').map(d => d.trim()) : [];

        let yearsToProcess = new Set();
        let currentYearIterate = startDate.getFullYear();
        const endYearIterate = endDate.getFullYear();
        
        for (let year = currentYearIterate; year <= endYearIterate; year++) {
            yearsToProcess.add(year);
        }

        yearsToProcess.forEach(year => {
            // Check if any date within the year is excluded
            let isYearExcluded = false;
            for (let i = 0; i < excludeDates.length; i++) {
                const excludedDate = new Date(excludeDates[i]);
                if (excludedDate.getFullYear() === year) {
                    isYearExcluded = true;
                    break;
                }
            }

            if (!isYearExcluded) {
                if (!yearlyActivities[year]) yearlyActivities[year] = [];
                if (!yearlyWorks[year]) yearlyWorks[year] = [];

                if (!yearlyWorks[year].some(work => work.Title === item.Title)) {
                    yearlyWorks[year].push(item);
                }
                const existingActivity = yearlyActivities[year].find(a => a.type === item.WorksType);
                if (!existingActivity) {
                    yearlyActivities[year].push({ type: item.WorksType, count: 1, title: item.Title });
                } else {
                    existingActivity.count++;
                }
            }
        });

        // Handle additional dates separately to ensure they are always added if not excluded
        additionalDates.forEach(dateStr => {
            const additionalDate = new Date(dateStr);
            if (!isNaN(additionalDate.getTime()) && !excludeDates.includes(dateStr)) {
                const year = additionalDate.getFullYear();
                if (!yearlyActivities[year]) yearlyActivities[year] = [];
                if (!yearlyWorks[year]) yearlyWorks[year] = [];
                if (!yearlyWorks[year].some(work => work.Title === item.Title)) {
                    yearlyWorks[year].push(item);
                }
                const existingActivity = yearlyActivities[year].find(a => a.type === item.WorksType);
                if (!existingActivity) {
                    yearlyActivities[year].push({ type: item.WorksType, count: 1, title: item.Title, isAdditional: true });
                } else {
                    existingActivity.count++;
                    existingActivity.isAdditional = true;
                }
            }
        });
    });
    renderGraphStructure('year-graph-container', yearlyActivities, yearlyWorks, 'year', showLeadRoleOnly, selectedTypes);
}

// Function to create the Age View graph
function createAgeGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    console.log('Creating Age Graph...');
    const ageActivities = {};
    const ageWorks = {}; // Stores detailed works for each age

    data.forEach(item => {
        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const startDate = new Date(item.DateStart);
        let endDate = startDate;
        if (item.DateEnd && item.DateEnd.trim() !== '') {
            const parsedEndDate = new Date(item.DateEnd);
            if (!isNaN(parsedEndDate.getTime())) {
                endDate = parsedEndDate;
            }
        }
        if (isNaN(startDate.getTime())) return;

        const excludeDates = item.Date ? item.Date.split(',').map(d => d.trim()) : [];
        const additionalDates = item.Add ? item.Add.split(',').map(d => d.trim()) : [];

        let agesToProcess = new Set();
        let currentIterateDate = new Date(startDate);
        while (currentIterateDate <= endDate) {
            const age = getAgeAtDate(BIRTH_DATE, currentIterateDate);
            agesToProcess.add(age);
            // Increment by a fixed interval, e.g., 1 day, to ensure all ages covered
            // For monthly granularity, maybe iterate month by month
            currentIterateDate.setDate(currentIterateDate.getDate() + 1); 
            // Prevent infinite loops if dates are somehow invalid
            if (currentIterateDate.getTime() === new Date(currentIterateDate.getFullYear(), currentIterateDate.getMonth(), 1).getTime() && 
                currentIterateDate.getMonth() === startDate.getMonth() && 
                currentIterateDate.getFullYear() === startDate.getFullYear() && 
                currentIterateDate.getDate() === startDate.getDate() &&
                (endDate - startDate > 0)
            ) {
                 // Break if we've looped back to the start date for a range. This is a failsafe.
                console.warn("Infinite loop detected in age calculation for item:", item.Title);
                break;
            }
            if (currentIterateDate > new Date(endDate.getFullYear() + 2, 0, 1)) { // Safety break if endDate is far future
                console.warn("Age calculation exceeding reasonable bounds for item:", item.Title);
                break;
            }
        }

        agesToProcess.forEach(age => {
            let isAgeExcluded = false;
            // For simplicity, if any excluded date falls in this age, we mark as excluded.
            // A precise solution would require iterating days within the age range.
            for (let i = 0; i < excludeDates.length; i++) {
                const excludedDate = new Date(excludeDates[i]);
                if (getAgeAtDate(BIRTH_DATE, excludedDate) === age) {
                    isAgeExcluded = true;
                    break;
                }
            }

            if (!isAgeExcluded) {
                if (!ageActivities[age]) ageActivities[age] = [];
                if (!ageWorks[age]) ageWorks[age] = [];

                if (!ageWorks[age].some(work => work.Title === item.Title)) {
                    ageWorks[age].push(item);
                }
                const existingActivity = ageActivities[age].find(a => a.type === item.WorksType);
                if (!existingActivity) {
                    ageActivities[age].push({ type: item.WorksType, count: 1, title: item.Title });
                } else {
                    existingActivity.count++;
                }
            }
        });

        // Handle additional dates
        additionalDates.forEach(dateStr => {
            const additionalDate = new Date(dateStr);
            if (!isNaN(additionalDate.getTime()) && !excludeDates.includes(dateStr)) {
                const age = getAgeAtDate(BIRTH_DATE, additionalDate);
                if (!ageActivities[age]) ageActivities[age] = [];
                if (!ageWorks[age]) ageWorks[age] = [];
                if (!ageWorks[age].some(work => work.Title === item.Title)) {
                    ageWorks[age].push(item);
                }
                const existingActivity = ageActivities[age].find(a => a.type === item.WorksType);
                if (!existingActivity) {
                    ageActivities[age].push({ type: item.WorksType, count: 1, title: item.Title, isAdditional: true });
                } else {
                    existingActivity.count++;
                    existingActivity.isAdditional = true;
                }
            }
        });
    });

    renderGraphStructure('age-graph-container', ageActivities, ageWorks, 'age', showLeadRoleOnly, selectedTypes);
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

            // ------ 新增的排序逻辑开始 ------
            typeWorks.sort((a, b) => {
                const dateA = new Date(a.DateStart);
                const dateB = new Date(b.DateStart);

                // 按 DateStart 升序排序
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime();
                }

                // 如果 DateStart 相同，则按 Title 字母顺序升序排序
                return a.Title.localeCompare(b.Title);
            });
            // ------ 新增的排序逻辑结束 ------

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
    console.log('Activity visualization initializing...');
    
    loadNavbar().then(() => {
        highlightCurrentPage();
    });

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
    fetch('../data/worksdata.csv')
        .then(response => response.text())
        .then(data => {
            worksData = parseCSV(data); // Store data

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
                filter.addEventListener('change', function() {
                    // Ensure only one view filter is checked at a time
                    viewFilters.forEach(otherFilter => {
                        if (otherFilter !== this) {
                            otherFilter.checked = false;
                        }
                    });
                    // If no view filter is selected, default to month view
                    if (!this.checked) {
                        // This handles unchecking the current view filter and reverts to month view
                        // If both Year and Age are unchecked, `updateGraphView` will show month.
                        // No explicit need to check the month filter, as it's the default display.
                    }
                    updateGraphView();
                });
            });

            // Add closing event for detail container
            const closeButton = document.querySelector('#works-detail-container .close-detail');
            if (closeButton) {
                closeButton.addEventListener('click', function() {
                    document.getElementById('works-detail-container').style.display = 'none';
                });
            }

        })
        .catch(error => {
            console.error('Error loading works data:', error);
            document.getElementById('contribution-graph').innerHTML = '<p>Failed to load activity data.</p>';
        });
});
