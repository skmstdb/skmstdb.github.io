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

    result.push(currentValue);
    return result;
}

function parseAndFormatDates(dateStringList) {
    if (!dateStringList) return [];
    return dateStringList.split(',').map(dateStr => {
        const dateObj = parseJSTDate(dateStr.trim());
        return formatDate(dateObj);
    }).filter(d => d !== null);
}

function normalizeWorksType(worksType) {
    if (!worksType) return 'その他';
    const validTypes = ['映画', 'TV', '舞台', 'BOOK', 'その他', '声の出演'];
    const trimmedType = worksType.trim();
    if (validTypes.includes(trimmedType)) {
        return trimmedType;
    }
    return 'その他';
}

function getActivityTypeClass(worksType) {
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

// --- 更新：统一全局种类排序权重 ---
function getActivityOrder(worksType) {
    const normalizedType = normalizeWorksType(worksType);
    const mapping = {
        '映画': 1,
        'TV': 2,
        '舞台': 3,
        'その他': 4,
        '声の出演': 5,
        'BOOK': 6
    };
    return mapping[normalizedType] || 99;
}

// --- Constants ---
const BIRTH_DATE = parseJSTDate('1973/10/14');
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', '🎂', 'Nov', 'Dec'];
const CURRENT_YEAR = getJSTYear();
const START_YEAR_MONTH_VIEW = 1992;
const START_YEAR_GLOBAL = 1970;
const AGE_START = 0;

function getAgeAtDate(birthDate, targetDate) {
    let age = targetDate.getUTCFullYear() - birthDate.getUTCFullYear();
    const m = targetDate.getUTCMonth() - birthDate.getUTCMonth();
    if (m < 0 || (m === 0 && targetDate.getUTCDate() < birthDate.getUTCDate())) {
        age--;
    }
    return age;
}

function renderGraphStructure(containerId, dataMap, labelMap, type, showLeadRoleOnly, selectedTypes) {
    const graphContainer = document.getElementById(containerId);
    if (!graphContainer) return;

    graphContainer.innerHTML = '';
    const graphHTML = document.createElement('div');
    graphHTML.className = 'graph-container';

    if (type === 'month') {
        const latestYear = Math.max(CURRENT_YEAR, ...Object.keys(labelMap).map(key => parseInt(key.split('-')[0]) || 0));
        const years = [];
        for (let year = latestYear; year >= START_YEAR_MONTH_VIEW; year--) {
            years.push(year);
        }

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
                const worksForKey = dataMap[key];

                if (worksForKey && worksForKey.length > 0) {
                    const totalWorksInCell = worksForKey.length; 
                    yearBox.setAttribute('data-total-works', totalWorksInCell);
                    const groupedWorksByType = {};
                    worksForKey.forEach(work => {
                        const normalizedType = normalizeWorksType(work.WorksType);
                        if (!groupedWorksByType[normalizedType]) groupedWorksByType[normalizedType] = [];
                        groupedWorksByType[normalizedType].push(work);
                    });
                    const distinctTypes = Object.keys(groupedWorksByType).sort((a, b) =>
                        getActivityOrder(a) - getActivityOrder(b)
                    );
                    const heightPerTypeSegment = 100 / distinctTypes.length;
                    distinctTypes.forEach((type, index) => {
                        const worksOfType = groupedWorksByType[type];
                        const typeCount = worksOfType.length;
                        const activitySegment = document.createElement('div');
                        const typeClass = getActivityTypeClass(type);
                        let highClass = typeCount >= 2 ? 'high' : '';
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
                    yearBox.setAttribute('data-total-works', 0);
                }
                yearCell.appendChild(yearBox);
                monthRow.appendChild(yearCell);
            });
            graphHTML.appendChild(monthRow);
        }

    } else if (type === 'year' || type === 'age') {
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

        let currentDecadeStart = Math.floor((type === 'year' ? START_YEAR_GLOBAL : AGE_START) / 10) * 10;
        const lastRelevantValue = type === 'year' ? CURRENT_YEAR : getAgeAtDate(BIRTH_DATE, getJSTNow());
        const lastDecadeStart = Math.floor(lastRelevantValue / 10) * 10;

        for (let decadeStart = currentDecadeStart; decadeStart <= lastDecadeStart; decadeStart += 10) {
            const decadeRow = document.createElement('div');
            decadeRow.className = `${type}-view-row`;
            const decadeLabel = document.createElement('div');
            decadeLabel.className = `${type}-view-label`;
            decadeLabel.textContent = `${decadeStart}s`;
            decadeRow.appendChild(decadeLabel);

            for (let i = 0; i < 10; i++) {
                const value = decadeStart + i;
                const yearOrAgeCell = document.createElement('div');
                yearOrAgeCell.className = `${type}-view-cell`;
                const yearOrAgeBox = document.createElement('div');
                yearOrAgeBox.className = `${type === 'year' ? 'year-box-year-view' : 'year-box-age-view'}`;
                const worksForKey = dataMap[value];

                if (worksForKey && worksForKey.length > 0) {
                    yearOrAgeBox.setAttribute('data-total-works', worksForKey.length);
                    const groupedWorksByType = {};
                    worksForKey.forEach(work => {
                        const nType = normalizeWorksType(work.WorksType);
                        if (!groupedWorksByType[nType]) groupedWorksByType[nType] = [];
                        groupedWorksByType[nType].push(work);
                    });
                    const distinctTypes = Object.keys(groupedWorksByType).sort((a, b) =>
                        getActivityOrder(a) - getActivityOrder(b)
                    );
                    const heightPerTypeSegment = 100 / distinctTypes.length;
                    distinctTypes.forEach((type, index) => {
                        const typeCount = groupedWorksByType[type].length;
                        const activitySegment = document.createElement('div');
                        const typeClass = getActivityTypeClass(type);
                        let highClass = typeCount >= 2 ? 'high' : '';
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
                }
                yearOrAgeCell.appendChild(yearOrAgeBox);
                decadeRow.appendChild(yearOrAgeCell);
            }
            graphHTML.appendChild(decadeRow);
        }
    }
    graphContainer.appendChild(graphHTML);
}

function getFilteredActivityDates(item) {
    const startDate = parseJSTDate(item.DateStart);
    if (!startDate) return new Set();
    
    let endDate = startDate;
    if (item.DateEnd && item.DateEnd.trim() !== '') {
        const parsedEndDate = parseJSTDate(item.DateEnd);
        if (parsedEndDate) endDate = parsedEndDate;
    }

    const weekdayFilterRaw = item.Weekday ? item.Weekday.trim() : '';
    let weekdayFilterSet = null;
    if (weekdayFilterRaw !== '') {
        const parsedWeekdays = weekdayFilterRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 7);
        if (parsedWeekdays.length > 0) weekdayFilterSet = new Set(parsedWeekdays);
    }

    const excludeDates = new Set(parseAndFormatDates(item.DateDelete));
    const additionalDates = parseAndFormatDates(item.DateAdd);
    const relevantDates = new Set();

    let currentIterateDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    let safetyCounter = 0;
    while (currentIterateDate <= endDate && safetyCounter < 36600) {
        let dayOfWeek = currentIterateDate.getUTCDay();
        let csvDayOfWeek = (dayOfWeek === 0) ? 7 : dayOfWeek;
        if (weekdayFilterSet === null || weekdayFilterSet.has(csvDayOfWeek)) {
            const formattedDate = formatDate(currentIterateDate);
            if (formattedDate) relevantDates.add(formattedDate);
        }
        currentIterateDate.setUTCDate(currentIterateDate.getUTCDate() + 1);
        safetyCounter++;
    }
    additionalDates.forEach(dateStr => relevantDates.add(dateStr));
    excludeDates.forEach(dateStr => relevantDates.delete(dateStr));
    return relevantDates;
}

function createMonthGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    const monthlyWorksMap = {};
    data.forEach(item => {
        const note = item.Note || '';
        const noteWords = note.toLowerCase().split(',').map(word => word.trim());
        if (noteWords.includes('memo') || noteWords.includes('uwasa')) return;
        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const filteredActivityDates = getFilteredActivityDates(item);
        filteredActivityDates.forEach(dateStr => {
            const dateObj = parseJSTDate(dateStr);
            if (!dateObj) return;
            const key = `${dateObj.getUTCFullYear()}-${dateObj.getUTCMonth()}`;
            if (!monthlyWorksMap[key]) monthlyWorksMap[key] = [];
            if (!monthlyWorksMap[key].some(work => work.Title === item.Title)) {
                monthlyWorksMap[key].push(item);
            }
        });
    });
    renderGraphStructure('contribution-graph', monthlyWorksMap, monthlyWorksMap, 'month', showLeadRoleOnly, selectedTypes);
}

function createYearGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    const yearlyWorksMap = {};
    data.forEach(item => {
        const note = item.Note || '';
        const noteWords = note.toLowerCase().split(',').map(word => word.trim());
        if (noteWords.includes('memo') || noteWords.includes('uwasa')) return;
        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const filteredActivityDates = getFilteredActivityDates(item);
        const yearsWithActivity = new Set();
        filteredActivityDates.forEach(dateStr => {
            const dateObj = parseJSTDate(dateStr);
            if (dateObj) yearsWithActivity.add(dateObj.getUTCFullYear());
        });
        yearsWithActivity.forEach(year => {
            if (!yearlyWorksMap[year]) yearlyWorksMap[year] = [];
            if (!yearlyWorksMap[year].some(work => work.Title === item.Title)) yearlyWorksMap[year].push(item);
        });
    });
    renderGraphStructure('year-graph-container', yearlyWorksMap, yearlyWorksMap, 'year', showLeadRoleOnly, selectedTypes);
}

function createAgeGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    const ageWorksMap = {};
    data.forEach(item => {
        const note = item.Note || '';
        const noteWords = note.toLowerCase().split(',').map(word => word.trim());
        if (noteWords.includes('memo') || noteWords.includes('uwasa')) return;
        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const filteredActivityDates = getFilteredActivityDates(item);
        const agesWithActivity = new Set();
        filteredActivityDates.forEach(dateStr => {
            const dateObj = parseJSTDate(dateStr);
            if (dateObj) agesWithActivity.add(getAgeAtDate(BIRTH_DATE, dateObj));
        });
        agesWithActivity.forEach(age => {
            if (!ageWorksMap[age]) ageWorksMap[age] = [];
            if (!ageWorksMap[age].some(work => work.Title === item.Title)) ageWorksMap[age].push(item);
        });
    });
    renderGraphStructure('age-graph-container', ageWorksMap, ageWorksMap, 'age', showLeadRoleOnly, selectedTypes);
}

// --- Chart View Implementation ---
let currentChartMode = 'year';

function createChartView(data, showLeadRoleOnly = false, selectedTypes = []) {
    const container = document.getElementById('chart-view-container');
    if (!container) return;
    container.style.width = '100%';

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
            btn.style.padding = '5px 15px';
            btn.style.margin = '0 5px';
            btn.style.cursor = 'pointer';
            btn.style.border = '1px solid #ccc';
            btn.style.backgroundColor = mode.id === currentChartMode ? '#ddd' : '#fff';
            btn.style.borderRadius = '4px';

            btn.addEventListener('click', () => {
                currentChartMode = mode.id;
                container.querySelectorAll('.chart-mode-btn').forEach(b => b.style.backgroundColor = '#fff');
                btn.style.backgroundColor = '#ddd';
                const currentShowLeadRoleOnly = document.getElementById('lead-role-filter').checked;
                const currentSelectedTypes = Array.from(document.querySelectorAll('.type-filter'))
                    .filter(input => input.checked).map(input => input.dataset.type);
                renderChartContent(data, currentShowLeadRoleOnly, currentSelectedTypes);
            });
            controlsDiv.appendChild(btn);
        });
        container.innerHTML = '';
        container.appendChild(controlsDiv);
    }

    let chartArea = container.querySelector('.chart-content');
    if (!chartArea) {
        chartArea = document.createElement('div');
        chartArea.className = 'chart-content';
        chartArea.style.display = 'flex';
        chartArea.style.alignItems = 'flex-end';
        chartArea.style.height = '540px';
        chartArea.style.width = '100%';
        chartArea.style.padding = '10px 0 30px 0';
        chartArea.style.overflowX = 'auto';
        chartArea.style.justifyContent = 'space-between';
        chartArea.style.gap = '2px';
        chartArea.style.boxSizing = 'border-box';
        container.appendChild(chartArea);
    }

    renderChartContent(data, showLeadRoleOnly, selectedTypes);
}

function renderChartContent(data, showLeadRoleOnly, selectedTypes) {
    const chartArea = document.querySelector('#chart-view-container .chart-content');
    if (!chartArea) return;
    chartArea.innerHTML = '';

    const aggregatedData = {};
    let sortedKeys = [];

    // --- Key generation based on fixed ranges ---
    if (currentChartMode === 'year') {
        for (let y = 1992; y <= CURRENT_YEAR; y++) sortedKeys.push(y);
    } else if (currentChartMode === 'age') {
        const endAge = getAgeAtDate(BIRTH_DATE, getJSTNow());
        for (let a = 19; a <= endAge; a++) sortedKeys.push(a);
    } else if (currentChartMode === 'decade') {
        for (let d = 1990; d <= Math.floor(CURRENT_YEAR / 10) * 10; d += 10) sortedKeys.push(d + 's');
    } else if (currentChartMode === '5-year') {
        sortedKeys.push('1992-1994');
        for (let y = 1995; y <= CURRENT_YEAR; y += 5) sortedKeys.push(`${y}-${y + 4}`);
    } else if (currentChartMode === '5-year-age') {
        const endAge = getAgeAtDate(BIRTH_DATE, getJSTNow());
        for (let a = 19; a < 20; a++) {
            sortedKeys.push(`${a}`);
        }
        for (let a = 20; a <= endAge; a += 5) {
            sortedKeys.push(`${a}-${a + 4}`);
        }
    } else if (currentChartMode === 'age-decade') {
        const endAgeDecade = Math.floor(getAgeAtDate(BIRTH_DATE, getJSTNow()) / 10) * 10;
        for (let ad = 10; ad <= endAgeDecade; ad += 10) sortedKeys.push(ad + 's');
    }

    sortedKeys.forEach(k => {
        aggregatedData[k] = { total: 0, worksList: [], typeCounts: {} };
    });

    data.forEach(item => {
        const note = item.Note || '';
        if (note.toLowerCase().includes('memo') || note.toLowerCase().includes('uwasa')) return;
        if (showLeadRoleOnly && item.Role !== '主演') return;
        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

        const keys = new Set();
        const filteredActivityDates = getFilteredActivityDates(item);
        filteredActivityDates.forEach(dateStr => {
            const dateObj = parseJSTDate(dateStr);
            if (!dateObj) return;
            let key;
            if (currentChartMode === 'year') key = dateObj.getUTCFullYear();
            else if (currentChartMode === 'decade') key = Math.floor(dateObj.getUTCFullYear() / 10) * 10 + 's';
            else if (currentChartMode === '5-year') {
                const y = dateObj.getUTCFullYear();
                key = y < 1995 ? '1992-1994' : `${1995 + Math.floor((y - 1995) / 5) * 5}-${1995 + Math.floor((y - 1995) / 5) * 5 + 4}`;
            } else if (currentChartMode === '5-year-age') {
                const age = getAgeAtDate(BIRTH_DATE, dateObj);
                if (age >= 19) key = age < 20 ? `${age}` : `${Math.floor(age / 5) * 5}-${Math.floor(age / 5) * 5 + 4}`;
            } else if (currentChartMode === 'age') key = getAgeAtDate(BIRTH_DATE, dateObj);
            else if (currentChartMode === 'age-decade') key = Math.floor(getAgeAtDate(BIRTH_DATE, dateObj) / 10) * 10 + 's';
            
            if (key !== undefined && aggregatedData[key]) keys.add(key);
        });

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

    const maxTotal = Math.max(1, ...sortedKeys.map(k => aggregatedData[k].total));
    const worksMapForDetail = {};
    sortedKeys.forEach(k => worksMapForDetail[k] = aggregatedData[k].worksList);

    // --- 更新：更新柱状图种类排序（顺序 1-6） ---
    const typeOrder = ['映画', 'TV', '舞台', 'その他', '声の出演', 'BOOK'];

    sortedKeys.forEach(key => {
        const dataPoint = aggregatedData[key];
        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar-container';
        barContainer.style.flex = '1 0 auto';
        barContainer.style.minWidth = (currentChartMode === 'year' || currentChartMode === 'age') ? '12px' : '30px';
        barContainer.style.maxWidth = '60px';
        barContainer.style.display = 'flex';
        barContainer.style.flexDirection = 'column-reverse'; // 从下往上堆叠
        barContainer.style.alignItems = 'center';
        barContainer.style.height = '100%';
        barContainer.style.cursor = 'pointer';
        barContainer.style.position = 'relative';

        // Tooltip
        let tooltipText = `${key} (Total: ${dataPoint.total})`;
        if (dataPoint.total > 0) {
            typeOrder.forEach(t => {
                if (dataPoint.typeCounts[t]) {
                    tooltipText += `\n${t}: ${dataPoint.typeCounts[t]}`;
                }
            });
        }
        barContainer.title = tooltipText;

        if (dataPoint.total > 0) {
            barContainer.addEventListener('click', () => showWorksDetail(key, worksMapForDetail, currentChartMode));
        }

        const label = document.createElement('div');
        label.className = 'chart-bar-label';
        label.textContent = currentChartMode === 'year' ? String(key).slice(-2) : key;
        label.style.fontSize = '10px';
        label.style.marginTop = '4px';

        const barWrapper = document.createElement('div');
        barWrapper.style.width = '100%';
        barWrapper.style.height = dataPoint.total > 0 ? `${(dataPoint.total / maxTotal) * 85}%` : '0px';
        barWrapper.style.display = 'flex';
        barWrapper.style.flexDirection = 'column-reverse';
        barWrapper.style.borderBottom = '1px solid #999';

        typeOrder.forEach(type => {
            const count = dataPoint.typeCounts[type];
            if (count) {
                const segment = document.createElement('div');
                segment.className = `${getActivityTypeClass(type)} chart-bar-segment`;
                segment.style.width = '100%';
                segment.style.flex = count;
                segment.style.borderTop = '1px solid rgba(255,255,255,0.3)';
                barWrapper.appendChild(segment);
            }
        });

        const countLabel = document.createElement('div');
        countLabel.textContent = dataPoint.total > 0 ? dataPoint.total : '';
        countLabel.style.fontSize = '9px';
        countLabel.style.height = '12px';

        barContainer.appendChild(label);
        barContainer.appendChild(barWrapper);
        barContainer.appendChild(countLabel);
        chartArea.appendChild(barContainer);
    });
}

function showWorksDetail(key, worksDataMap, viewType) {
    const detailContainer = document.getElementById('works-detail-container');
    const detailContent = detailContainer.querySelector('.detail-content');
    if (!detailContainer || !detailContent) return;

    let works = worksDataMap[key] || [];
    let title = '';
    if (viewType === 'month') {
        const [y, m] = key.split('-');
        title = `${y} ${MONTH_NAMES[parseInt(m)]}`;
    } else if (viewType === 'year') title = `Year: ${key}`;
    else if (viewType === 'age') title = `公開時年齢: ${key}`;
    else if (viewType === 'decade') title = `Decade: ${key}`;
    else if (viewType === '5-year') title = `Period: ${key}`;
    else if (viewType === '5-year-age') title = `Age Period: ${key}`;
    else if (viewType === 'age-decade') title = `Age Decade: ${key}`;

    if (works.length === 0) {
        detailContent.innerHTML = `<p>No works found for ${title}.</p>`;
    } else {
        const worksByType = {};
        works.forEach(work => {
            const nType = normalizeWorksType(work.WorksType);
            if (!worksByType[nType]) worksByType[nType] = [];
            worksByType[nType].push(work);
        });

        let html = `<h4>${title}</h4>`;
        
        // --- 更新：详情面板种类排序逻辑（顺序 1-6） ---
        const typeOrderMap = { 
            '映画': 1, 
            'TV': 2, 
            '舞台': 3, 
            'その他': 4, 
            '声の出演': 5, 
            'BOOK': 6 
        };

        const sortedTypes = Object.keys(worksByType).sort((a, b) => 
            (typeOrderMap[a] || 99) - (typeOrderMap[b] || 99)
        );

        sortedTypes.forEach(type => {
            let typeWorks = worksByType[type];
            typeWorks.sort((a, b) => {
                const dA = parseJSTDate(a.DateStart), dB = parseJSTDate(b.DateStart);
                if (!dA && !dB) return 0; if (!dA) return 1; if (!dB) return -1;
                return dA.getTime() !== dB.getTime() ? dA.getTime() - dB.getTime() : a.Title.localeCompare(b.Title);
            });
            const tClass = getActivityTypeClass(type);
            html += `<div class="works-type-group"><h5 class="${tClass}-title">${type}</h5><div class="works-row ${tClass}-row">`;
            typeWorks.forEach(work => {
                let dDisp = work.DateStart + (work.DateEnd && work.DateEnd !== work.DateStart ? ` ~ ${work.DateEnd}` : '');
                html += `<div class="work-card ${tClass}"><div class="work-title">${work.Title}</div><div class="work-date">${dDisp}</div>${work.Role ? `<div class="work-role">${work.Role}</div>` : ''}</div>`;
            });
            html += '</div></div>';
        });
        detailContent.innerHTML = html;
    }
    detailContainer.style.display = 'block';
    detailContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', function () {
    const leadRoleFilter = document.getElementById('lead-role-filter');
    const typeFilters = document.querySelectorAll('.type-filter');
    const viewFilters = document.querySelectorAll('.view-filter');
    let worksData = [];

    function updateGraphView() {
        const showLeadRoleOnly = leadRoleFilter.checked;
        const selectedTypes = Array.from(typeFilters).filter(i => i.checked).map(i => i.dataset.type);
        const views = {
            month: document.getElementById('contribution-graph'),
            year: document.getElementById('year-graph-container'),
            age: document.getElementById('age-graph-container'),
            chart: document.getElementById('chart-view-container')
        };

        Object.values(views).forEach(v => { if(v) v.style.display = 'none'; });

        if (document.getElementById('year-view-filter').checked) {
            views.year.style.display = 'block'; createYearGraph(worksData, showLeadRoleOnly, selectedTypes);
        } else if (document.getElementById('age-view-filter').checked) {
            views.age.style.display = 'block'; createAgeGraph(worksData, showLeadRoleOnly, selectedTypes);
        } else if (document.getElementById('chart-view-filter')?.checked) {
            views.chart.style.display = 'block'; createChartView(worksData, showLeadRoleOnly, selectedTypes);
        } else {
            views.month.style.display = 'block'; createMonthGraph(worksData, showLeadRoleOnly, selectedTypes);
        }
    }

    fetch('../data/biography.csv')
        .then(res => res.text())
        .then(data => {
            worksData = parseCSV(data);
            worksData.forEach(item => item.WorksType = normalizeWorksType(item.WorksType));
            updateGraphView();
            leadRoleFilter.addEventListener('change', updateGraphView);
            typeFilters.forEach(f => f.addEventListener('change', updateGraphView));
            viewFilters.forEach(f => f.addEventListener('change', function() {
                viewFilters.forEach(o => { if(o !== this) o.checked = false; });
                updateGraphView();
            }));
            const closeBtn = document.querySelector('#works-detail-container .close-detail');
            if (closeBtn) closeBtn.addEventListener('click', () => document.getElementById('works-detail-container').style.display = 'none');
        });
});
