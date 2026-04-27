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
    const validTypes = ['映画', 'TV', '舞台', 'BOOK', 'その他', '声の出演', 'Location'];
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
        '声の出演': 'activity-voice',
        'Location': 'activity-location'
    };
    return mapping[normalizedType] || 'activity-other';
}

function getActivityOrder(worksType) {
    const normalizedType = normalizeWorksType(worksType);
    const mapping = {
        '映画': 1,
        'TV': 2,
        '舞台': 3,
        'その他': 4,
        '声の出演': 5,
        'BOOK': 6,
        'Location': 7
    };
    return mapping[normalizedType] || 99;
}

// --- Constants ---
const BIRTH_DATE = parseJSTDate('1973/10/14');
const MONTH_NAMES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const CURRENT_YEAR = getJSTYear();
const START_YEAR_MONTH_VIEW = 1992;
const START_YEAR_GLOBAL = 1970;
const AGE_START = 0;
const ACTIVITY_LOCATION_COUNTRY_CONFIG = {
    "Japan": { name: "Japan", flag: "🇯🇵" },
    "China": { name: "China", flag: "🇨🇳" },
    "Mainland China": { name: "China", flag: "🇨🇳" },
    "Macau China": { name: "China", flag: "🇨🇳" },
    "France": { name: "France", flag: "🇫🇷" },
    "Israel": { name: "Israel", flag: "🇮🇱" },
    "Egypt": { name: "Egypt", flag: "🇪🇬" },
    "Scotland": { name: "United Kingdom", flag: "🇬🇧" },
    "United Kingdom": { name: "United Kingdom", flag: "🇬🇧" },
    "Germany": { name: "Germany", flag: "🇩🇪" },
    "United States": { name: "United States of America", flag: "🇺🇸" },
    "United States of America": { name: "United States of America", flag: "🇺🇸" },
    "Mongolia": { name: "Mongolia", flag: "🇲🇳" },
    "Azerbaijan": { name: "Azerbaijan", flag: "🇦🇿" },
    "Thailand": { name: "Thailand", flag: "🇹🇭" }
};
const ACTIVITY_MAP_LIBRARY_URLS = {
    d3: "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js",
    topojson: "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js",
    atlas: "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
};
const activityMapState = {
    initialized: false,
    pendingInit: null,
    locationFlagsMap: new Map(),
    dismissalBound: false
};
let locationData = [];
let workLocationMap = {};

function getAgeAtDate(birthDate, targetDate) {
    let age = targetDate.getUTCFullYear() - birthDate.getUTCFullYear();
    const m = targetDate.getUTCMonth() - birthDate.getUTCMonth();
    if (m < 0 || (m === 0 && targetDate.getUTCDate() < birthDate.getUTCDate())) {
        age--;
    }
    return age;
}

function loadScriptOnce(src) {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
        if (existingScript.dataset.loaded === 'true') return Promise.resolve();
        return new Promise((resolve, reject) => {
            existingScript.addEventListener('load', () => {
                existingScript.dataset.loaded = 'true';
                resolve();
            }, { once: true });
            existingScript.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

function ensureActivityMapLibraries() {
    const tasks = [];
    if (!window.d3) tasks.push(loadScriptOnce(ACTIVITY_MAP_LIBRARY_URLS.d3));
    return Promise.all(tasks).then(() => {
        if (window.topojson) return Promise.resolve();
        return loadScriptOnce(ACTIVITY_MAP_LIBRARY_URLS.topojson);
    });
}

function normalizeLocationDataset(locationData) {
    const activeCountries = new Map();
    const countryEvents = new Map();
    const locationFlagsMap = new Map();

    activeCountries.set('Japan', null);

    locationData.forEach(row => {
        if (!row.Location) return;
        const locations = row.Location.split(',').map(location => location.trim()).filter(Boolean);

        if (row.Name && row.Name.includes('Location')) {
            locations.forEach(location => {
                const config = ACTIVITY_LOCATION_COUNTRY_CONFIG[location];
                if (config) locationFlagsMap.set(config.name, row.Url || '');
            });
            return;
        }

        locations.forEach(location => {
            const config = ACTIVITY_LOCATION_COUNTRY_CONFIG[location];
            if (!config) return;

            const mappedName = config.name;
            if (!activeCountries.has(mappedName)) activeCountries.set(mappedName, []);
            if (!countryEvents.has(mappedName)) countryEvents.set(mappedName, []);

            countryEvents.get(mappedName).push({
                year: row.Year || '',
                name: row.Name || '',
                location: row.Location || '',
                url: row.Url || ''
            });
        });
    });

    if (activeCountries.has('China')) {
        activeCountries.set('Taiwan', activeCountries.get('China'));
        if (countryEvents.has('China')) {
            countryEvents.set('Taiwan', countryEvents.get('China'));
        }
    }

    return { activeCountries, countryEvents, locationFlagsMap };
}

function hideActivityMapEvents() {
    const container = document.getElementById('activity-map-events-container');
    if (container) container.style.display = 'none';
}

function displayActivityMapEvents(events, countryName) {
    const container = document.getElementById('activity-map-events-container');
    const eventsGrid = document.getElementById('activity-map-events-grid');
    const flagsSection = document.getElementById('activity-map-flags-section');
    if (!container || !eventsGrid || !flagsSection) return;

    eventsGrid.innerHTML = '';
    flagsSection.innerHTML = '';
    container.style.display = 'flex';

    const flagCountryName = countryName === 'Taiwan' ? 'China' : countryName;
    const config = ACTIVITY_LOCATION_COUNTRY_CONFIG[flagCountryName];
    const flag = config ? config.flag : '';
    const url = activityMapState.locationFlagsMap.get(flagCountryName);

    if (flag) {
        const flagItem = document.createElement('span');
        flagItem.className = 'activity-map-flag-item';
        flagItem.textContent = flag;
        flagItem.title = flagCountryName;
        flagItem.addEventListener('click', event => {
            event.stopPropagation();
            if (url) window.open(url, '_blank', 'noopener');
        });
        flagsSection.appendChild(flagItem);
    }

    events.forEach(eventData => {
        const card = document.createElement('div');
        card.className = 'activity-map-event-card';
        card.innerHTML = `
            <div class="year">${eventData.year}</div>
            <div class="name">${eventData.name}</div>
            <div class="location">${eventData.location}</div>
        `;
        card.addEventListener('click', event => {
            event.stopPropagation();
            if (eventData.url) window.open(eventData.url, '_blank', 'noopener');
        });
        eventsGrid.appendChild(card);
    });
}

function bindActivityMapDismissal() {
    if (activityMapState.dismissalBound) return;
    document.addEventListener('click', event => {
        const container = document.getElementById('activity-map-events-container');
        const mapWrapper = document.getElementById('activity-map-wrapper');
        if (!container || !mapWrapper || container.style.display !== 'flex') return;
        if (!container.contains(event.target) && !mapWrapper.contains(event.target)) {
            hideActivityMapEvents();
        }
    });
    activityMapState.dismissalBound = true;
}

function renderActivityMap(worldData, locationData) {
    const mapWrapper = document.getElementById('activity-map-wrapper');
    const loading = document.getElementById('activity-map-loading');
    const svgElement = document.getElementById('activity-world-map');
    if (!mapWrapper || !loading || !svgElement) return;

    const parentWidth = mapWrapper.parentElement ? mapWrapper.parentElement.clientWidth : 1200;
    const width = Math.max(320, Math.min(parentWidth - 20, 1200));
    const height = Math.max(320, Math.round(width * 0.5));
    const { activeCountries, countryEvents, locationFlagsMap } = normalizeLocationDataset(locationData);

    activityMapState.locationFlagsMap = locationFlagsMap;

    const svg = window.d3.select(svgElement);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const defs = svg.append('defs');
    const filter = defs.append('filter')
        .attr('id', 'activity-map-drop-shadow')
        .attr('height', '130%');

    filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 1.5)
        .attr('result', 'blur');

    filter.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 1)
        .attr('dy', 1)
        .attr('result', 'offsetBlur');

    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'offsetBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');
    const zoom = window.d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', event => {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    if (mapWrapper.dataset.wheelBound !== 'true') {
        mapWrapper.addEventListener('wheel', event => {
            event.preventDefault();
        }, { passive: false });
        mapWrapper.dataset.wheelBound = 'true';
    }

    document.getElementById('activity-map-zoom-in').onclick = () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.5);
    };
    document.getElementById('activity-map-zoom-out').onclick = () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.67);
    };
    document.getElementById('activity-map-zoom-reset').onclick = () => {
        svg.transition().duration(500).call(zoom.transform, window.d3.zoomIdentity);
    };

    const projection = window.d3.geoNaturalEarth1()
        .scale(width / 5.4)
        .translate([width / 2, height / 2]);
    const path = window.d3.geoPath().projection(projection);

    const countries = window.topojson.feature(worldData, worldData.objects.countries).features;
    const land = window.topojson.feature(worldData, worldData.objects.land);

    g.append('path')
        .datum(land)
        .attr('class', 'activity-map-continent')
        .attr('d', path);

    g.selectAll('.activity-map-active-country')
        .data(countries.filter(country => activeCountries.has(country.properties.name)))
        .enter()
        .append('path')
        .attr('class', country => country.properties.name === 'Japan' ? 'activity-map-japan' : 'activity-map-country')
        .attr('d', path)
        .style('filter', 'url(#activity-map-drop-shadow)')
        .on('click', (event, country) => {
            const countryName = country.properties.name;
            if (countryName === 'Japan') return;
            const events = countryEvents.get(countryName);
            if (events && events.length > 0) {
                displayActivityMapEvents(events, countryName);
            }
        });

    g.selectAll('.activity-map-flag-label')
        .data(countries.filter(country => activeCountries.has(country.properties.name)))
        .enter()
        .append('text')
        .attr('class', 'activity-map-flag-label')
        .attr('transform', country => {
            const centroid = path.centroid(country);
            if (!centroid[0] || !centroid[1]) return 'translate(0,0)';
            return `translate(${centroid[0]}, ${centroid[1]})`;
        })
        .text(country => {
            const config = ACTIVITY_LOCATION_COUNTRY_CONFIG[country.properties.name];
            return config ? config.flag : '';
        });

    loading.style.display = 'none';
    mapWrapper.style.display = 'flex';
    bindActivityMapDismissal();
}

function initActivityMapView() {
    const loading = document.getElementById('activity-map-loading');
    const mapWrapper = document.getElementById('activity-map-wrapper');
    if (!loading || !mapWrapper) return Promise.resolve();
    if (activityMapState.initialized) return Promise.resolve();
    if (activityMapState.pendingInit) return activityMapState.pendingInit;

    loading.textContent = '地図を読み込んでいます...';
    loading.style.display = 'block';
    mapWrapper.style.display = 'none';

    activityMapState.pendingInit = ensureActivityMapLibraries()
        .then(() => Promise.all([
            window.d3.json(ACTIVITY_MAP_LIBRARY_URLS.atlas),
            fetch('data/location.csv').then(response => response.text()).then(parseCSV)
        ]))
        .then(([worldData, locationData]) => {
            renderActivityMap(worldData, locationData);
            activityMapState.initialized = true;
        })
        .catch(error => {
            console.error('Map loading error:', error);
            loading.textContent = `Map loading failed: ${error.message}`;
        })
        .finally(() => {
            activityMapState.pendingInit = null;
        });

    return activityMapState.pendingInit;
}

function renderGraphStructure(containerId, dataMap, labelMap, type) {
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
            const yearBox = document.createElement('div');
            yearBox.className = 'label-cell year-label-box';
            yearBox.textContent = String(year).slice(-2);
            yearCell.appendChild(yearBox);
            yearHeaderRow.appendChild(yearCell);
        });
        graphHTML.appendChild(yearHeaderRow);

        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const monthRow = document.createElement('div');
            monthRow.className = 'month-row';
            const monthLabelCell = document.createElement('div');
            monthLabelCell.className = 'month-label';
            const monthBox = document.createElement('div');
            monthBox.className = 'label-cell month-label-box';
            monthBox.textContent = MONTH_NAMES[monthIndex];
            monthLabelCell.appendChild(monthBox);
            monthRow.appendChild(monthLabelCell);

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
            const digitBox = document.createElement('div');
            digitBox.className = 'label-cell';
            digitBox.textContent = i;
            digitCell.appendChild(digitBox);
            digitLabelRow.appendChild(digitCell);
        }
        graphHTML.appendChild(digitLabelRow);

        let currentDecadeStart = Math.floor((type === 'year' ? START_YEAR_GLOBAL : AGE_START) / 10) * 10;
        const lastRelevantValue = type === 'year' ? CURRENT_YEAR : getAgeAtDate(BIRTH_DATE, getJSTNow());
        const lastDecadeStart = Math.floor(lastRelevantValue / 10) * 10;

        for (let decadeStart = currentDecadeStart; decadeStart <= lastDecadeStart; decadeStart += 10) {
            const decadeRow = document.createElement('div');
            decadeRow.className = `${type}-view-row`;
            const decadeLabelCell = document.createElement('div');
            decadeLabelCell.className = `${type}-view-label`;
            const decadeBox = document.createElement('div');
            decadeBox.className = 'label-cell';
            decadeBox.textContent = `${String(decadeStart).slice(-2)}s`;
            decadeLabelCell.appendChild(decadeBox);
            decadeRow.appendChild(decadeLabelCell);

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

const NON_LEAD_APPLICABLE_TYPES = ['映画', 'TV', '舞台', 'その他', '声の出演'];

function createMonthGraph(data, showLeadRoleOnly = false, selectedTypes = [], showNonLeadOnly = false, showAwardOnly = false) {
    const monthlyWorksMap = {};
    data.forEach(item => {
        const note = item.Note || '';
        const noteWords = note.toLowerCase().split(',').map(word => word.trim());
        if (noteWords.includes('memo') || noteWords.includes('uwasa')) return;
        if (showLeadRoleOnly || showNonLeadOnly) {
            const isLead = item.Role === '主演';
            const matchLead = showLeadRoleOnly && isLead && item.WorksType !== 'BOOK';
            const matchNonLead = showNonLeadOnly && !isLead && NON_LEAD_APPLICABLE_TYPES.includes(item.WorksType);
            if (!matchLead && !matchNonLead) return;
        }
        if (showAwardOnly) {
            const hasAward = item.Award && item.Award.trim() !== '';
            if (!hasAward) return;
        }
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
    renderGraphStructure('contribution-graph', monthlyWorksMap, monthlyWorksMap, 'month');
}


function createYearGraph(data, showLeadRoleOnly = false, selectedTypes = [], showNonLeadOnly = false, showAwardOnly = false) {
    const yearlyWorksMap = {};
    data.forEach(item => {
        const note = item.Note || '';
        const noteWords = note.toLowerCase().split(',').map(word => word.trim());
        if (noteWords.includes('memo') || noteWords.includes('uwasa')) return;
        if (showLeadRoleOnly || showNonLeadOnly) {
            const isLead = item.Role === '主演';
            const matchLead = showLeadRoleOnly && isLead && item.WorksType !== 'BOOK';
            const matchNonLead = showNonLeadOnly && !isLead && NON_LEAD_APPLICABLE_TYPES.includes(item.WorksType);
            if (!matchLead && !matchNonLead) return;
        }
        if (showAwardOnly) {
            const hasAward = item.Award && item.Award.trim() !== '';
            if (!hasAward) return;
        }
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
    renderGraphStructure('year-graph-container', yearlyWorksMap, yearlyWorksMap, 'year');
}

function createAgeGraph(data, showLeadRoleOnly = false, selectedTypes = [], showNonLeadOnly = false, showAwardOnly = false) {
    const ageWorksMap = {};
    data.forEach(item => {
        const note = item.Note || '';
        const noteWords = note.toLowerCase().split(',').map(word => word.trim());
        if (noteWords.includes('memo') || noteWords.includes('uwasa')) return;
        if (showLeadRoleOnly || showNonLeadOnly) {
            const isLead = item.Role === '主演';
            const matchLead = showLeadRoleOnly && isLead && item.WorksType !== 'BOOK';
            const matchNonLead = showNonLeadOnly && !isLead && NON_LEAD_APPLICABLE_TYPES.includes(item.WorksType);
            if (!matchLead && !matchNonLead) return;
        }
        if (showAwardOnly) {
            const hasAward = item.Award && item.Award.trim() !== '';
            if (!hasAward) return;
        }
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
    renderGraphStructure('age-graph-container', ageWorksMap, ageWorksMap, 'age');
}

let currentChartMode = 'year';

function createChartView(data, showLeadRoleOnly = false, selectedTypes = [], showNonLeadOnly = false, showAwardOnly = false) {
    const container = document.getElementById('chart-view-container');
    if (!container) return;
    container.style.width = '100%';

    let controlsDiv = container.querySelector('.chart-controls');
    if (!controlsDiv) {
        controlsDiv = document.createElement('div');
        controlsDiv.className = 'chart-controls';

        const modes = [
            { id: 'year', label: 'Year' },
            { id: '5-year', label: '5-Year' },
            { id: 'decade', label: 'Decade' },
            { id: 'age', label: 'Age' },
            { id: '5-year-age', label: 'Age-5Y' },
            { id: 'age-decade', label: 'Age-Decade' },
            { id: 'works-type', label: 'Work Type' },
            { id: 'role-type', label: 'Role Type' },
            { id: 'role', label: 'Role' },
            { id: 'location', label: 'Location' },
            { id: 'place', label: 'Place' }
        ];

        modes.forEach(mode => {
            const btn = document.createElement('button');
            btn.textContent = mode.label;
            btn.className = 'chart-mode-btn';
            if (mode.id === currentChartMode) btn.classList.add('active');

            btn.addEventListener('click', () => {
                currentChartMode = mode.id;
                container.querySelectorAll('.chart-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const currentShowLeadRoleOnly = document.getElementById('lead-role-filter').checked;
                const currentShowNonLeadOnly = document.getElementById('non-lead-role-filter')?.checked || false;
                const currentShowAwardOnly = document.getElementById('individual-award-filter')?.checked || false;
                const currentSelectedTypes = Array.from(document.querySelectorAll('.type-filter'))
                    .filter(input => input.checked).map(input => input.dataset.type);
                renderChartContent(data, currentShowLeadRoleOnly, currentSelectedTypes, currentShowNonLeadOnly, currentShowAwardOnly);
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
        container.appendChild(chartArea);
    }

    renderChartContent(data, showLeadRoleOnly, selectedTypes, showNonLeadOnly, showAwardOnly);
}

function renderChartContent(data, showLeadRoleOnly, selectedTypes, showNonLeadOnly = false, showAwardOnly = false) {
    const chartArea = document.querySelector('#chart-view-container .chart-content');
    if (!chartArea) return;
    chartArea.innerHTML = '';

    const aggregatedData = {};
    let sortedKeys = [];

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
    } else if (currentChartMode === 'works-type') {
        sortedKeys = ['映画', 'TV', '舞台', 'その他', '声の出演', 'BOOK'];
    } else if (currentChartMode === 'role-type') {
        sortedKeys = ['主演', '非主演'];
    } else if (currentChartMode === 'role') {
        sortedKeys = ['Actor', 'Voice Actor', 'Writer'];
    } else if (currentChartMode === 'location') {
        const countries = new Set();
        Object.values(workLocationMap).forEach(countrySet => {
            countrySet.forEach(c => countries.add(c));
        });
        sortedKeys = Array.from(countries).sort();
    } else if (currentChartMode === 'place') {
        const prefSet = new Set();
        data.forEach(item => {
            if (showLeadRoleOnly || showNonLeadOnly) {
                const isLead = item.Role === '主演';
                const matchLead = showLeadRoleOnly && isLead && item.WorksType !== 'BOOK';
                const matchNonLead = showNonLeadOnly && !isLead && NON_LEAD_APPLICABLE_TYPES.includes(item.WorksType);
                if (!matchLead && !matchNonLead) return;
            }
            if (showAwardOnly) {
                const hasAward = item.Award && item.Award.trim() !== '';
                if (!hasAward) return;
            }
            if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) return;

            if (item.Place) {
                item.Place.split(',').forEach(p => {
                    const pref = getPrefectureFromVenue(p.trim());
                    if (pref) prefSet.add(pref);
                });
            }
        });
        const regionOrder = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'];
        sortedKeys = Array.from(prefSet).sort((a, b) => {
            const pA = JAPAN_TILE_PREFS.find(p => p.name === a);
            const pB = JAPAN_TILE_PREFS.find(p => p.name === b);
            const regA = pA ? regionOrder.indexOf(pA.region) : 99;
            const regB = pB ? regionOrder.indexOf(pB.region) : 99;
            if (regA !== regB) return regA - regB;
            return a.localeCompare(b);
        });
    }

    sortedKeys.forEach(k => {
        aggregatedData[k] = { total: 0, worksList: [], typeCounts: {} };
    });

    if (currentChartMode === 'location') {
        locationData.forEach(loc => {
            if (!loc.Location || (loc.Name && loc.Name.trim() === 'Location')) return;
            const countries = loc.Location.split(',').map(c => c.trim()).filter(Boolean);
            countries.forEach(c => {
                const config = ACTIVITY_LOCATION_COUNTRY_CONFIG[c];
                const mappedName = config ? config.name : c;
                if (aggregatedData[mappedName]) {
                    aggregatedData[mappedName].total++;
                    aggregatedData[mappedName].worksList.push({
                        Title: loc.Name || '',
                        DateStart: loc.Year || '',
                        WorksType: 'Location',
                        Location: loc.Location,
                        Url: loc.Url
                    });
                    aggregatedData[mappedName].typeCounts['Location'] = (aggregatedData[mappedName].typeCounts['Location'] || 0) + 1;
                }
            });
        });
    } else {
        data.forEach(item => {
            const note = item.Note || '';
            if (note.toLowerCase().includes('memo') || note.toLowerCase().includes('uwasa')) return;
            if (showLeadRoleOnly || showNonLeadOnly) {
                const isLead = item.Role === '主演';
                const matchLead = showLeadRoleOnly && isLead && item.WorksType !== 'BOOK';
                const matchNonLead = showNonLeadOnly && !isLead && NON_LEAD_APPLICABLE_TYPES.includes(item.WorksType);
                if (!matchLead && !matchNonLead) return;
            }
            if (showAwardOnly) {
                const hasAward = item.Award && item.Award.trim() !== '';
                if (!hasAward) return;
            }
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
                else if (currentChartMode === 'works-type') key = normalizeWorksType(item.WorksType);
                else if (currentChartMode === 'role-type') {
                    if (item.WorksType === 'BOOK') {
                        key = undefined;
                    } else {
                        key = item.Role === '主演' ? '主演' : '非主演';
                    }
                }
                else if (currentChartMode === 'role') {
                    const nt = normalizeWorksType(item.WorksType);
                    if (['映画', 'TV', '舞台', 'その他'].includes(nt)) key = 'Actor';
                    else if (nt === '声の出演') key = 'Voice Actor';
                    else if (nt === 'BOOK') key = 'Writer';
                } else if (currentChartMode === 'place') {
                    if (item.Place) {
                        item.Place.split(',').forEach(p => {
                            const pref = getPrefectureFromVenue(p.trim());
                            if (pref && aggregatedData[pref]) keys.add(pref);
                        });
                    }
                }

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
    }

    if (sortedKeys.length === 0) {
        chartArea.innerHTML = '<p>No data available for current selection.</p>';
        return;
    }

    const maxTotal = Math.max(1, ...sortedKeys.map(k => aggregatedData[k].total));
    const worksMapForDetail = {};
    sortedKeys.forEach(k => worksMapForDetail[k] = aggregatedData[k].worksList);

    const typeOrder = ['映画', 'TV', '舞台', 'その他', '声の出演', 'BOOK', 'Location'];

    sortedKeys.forEach(key => {
        const dataPoint = aggregatedData[key];
        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar-container';
        barContainer.style.flex = '0 0 auto';
        barContainer.style.minWidth = (currentChartMode === 'year' || currentChartMode === 'age') ? '12px' : '45px';
        barContainer.style.maxWidth = '100px';
        barContainer.style.margin = '0 5px';
        barContainer.style.display = 'flex';
        barContainer.style.flexDirection = 'column-reverse';
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
        let labelText = key;
        if (currentChartMode === 'year') labelText = String(key).slice(-2);
        else if (currentChartMode === 'works-type') {
            labelText = key;
        } else if (currentChartMode === 'location') {
            const config = Object.values(ACTIVITY_LOCATION_COUNTRY_CONFIG).find(c => c.name === key);
            if (config) labelText = config.flag;
        }
        label.textContent = labelText;
        if (currentChartMode === 'location') label.style.fontSize = '1.4rem';

        if (currentChartMode === 'place') {
            const prefObj = JAPAN_TILE_PREFS.find(p => p.name === key);
            if (prefObj) {
                const color = REGION_COLORS[prefObj.region].base;
                label.style.backgroundColor = color;
                label.style.color = '#fff';
                label.style.padding = '2px 4px';
                label.style.borderRadius = '3px';
                label.style.fontSize = '0.7rem';
            }
        }
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
        const monthNum = (parseInt(m) + 1).toString().padStart(2, '0');
        title = `Month: ${y}-${monthNum}`;
    } else if (viewType === 'year') title = `Year: ${key}`;
    else if (viewType === 'age') title = `公開時年齢: ${key}`;
    else if (viewType === 'decade') title = `Decade: ${key}`;
    else if (viewType === '5-year') title = `Period: ${key}`;
    else if (viewType === '5-year-age') title = `Age Period: ${key}`;
    else if (viewType === 'age-decade') title = `Age Decade: ${key}`;
    else if (viewType === 'works-type') title = `Work Type: ${key}`;
    else if (viewType === 'role-type') title = `Role Type: ${key}`;
    else if (viewType === 'role') title = `Role: ${key}`;
    else if (viewType === 'location') title = `Location: ${key}`;
    else if (viewType === 'place') title = `Place: ${key}`;

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

        if (viewType === 'location') {
            html += `<div class="location-works-list">`;
            works.sort((a, b) => (b.DateStart || '').localeCompare(a.DateStart || ''));
            works.forEach(work => {
                const cardContent = `
                    <div class="location-work-card">
                        <div class="year">${work.DateStart}</div>
                        <div class="name">${work.Title}</div>
                        <div class="location-detail">${work.Location || ''}</div>
                    </div>
                `;
                if (work.Url) {
                    html += `<a href="${work.Url}" target="_blank" class="location-work-link">${cardContent}</a>`;
                } else {
                    html += cardContent;
                }
            });
            html += `</div>`;
        } else {
            const sortedTypes = Object.keys(worksByType).sort((a, b) =>
                getActivityOrder(a) - getActivityOrder(b)
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
        }
        detailContent.innerHTML = html;
    }
    detailContainer.style.display = 'block';
    detailContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', function () {
    const leadRoleFilter = document.getElementById('lead-role-filter');
    const nonLeadRoleFilter = document.getElementById('non-lead-role-filter');
    const individualAwardFilter = document.getElementById('individual-award-filter');
    const typeFilters = document.querySelectorAll('.type-filter');
    const viewFilters = document.querySelectorAll('.view-filter');
    let worksData = [];

    function updateGraphView() {
        const showLeadRoleOnly = leadRoleFilter.checked;
        const showNonLeadOnly = nonLeadRoleFilter ? nonLeadRoleFilter.checked : false;
        const showAwardOnly = individualAwardFilter ? individualAwardFilter.checked : false;
        const selectedTypes = Array.from(typeFilters).filter(i => i.checked).map(i => i.dataset.type);
        const mapFilterOn = document.getElementById('map-view-filter')?.checked;
        const stageFilterOn = Array.from(typeFilters).some(i => i.checked && i.dataset.type === '舞台');
        const views = {
            month: document.getElementById('contribution-graph'),
            year: document.getElementById('year-graph-container'),
            age: document.getElementById('age-graph-container'),
            chart: document.getElementById('chart-view-container'),
            map: document.getElementById('map-view-container'),
            japanMap: document.getElementById('japan-map-view-container')
        };

        Object.values(views).forEach(v => { if (v) v.style.display = 'none'; });
        if (!mapFilterOn) {
            hideActivityMapEvents();
        }

        if (document.getElementById('year-view-filter').checked) {
            views.year.style.display = 'block'; createYearGraph(worksData, showLeadRoleOnly, selectedTypes, showNonLeadOnly, showAwardOnly);
        } else if (document.getElementById('age-view-filter').checked) {
            views.age.style.display = 'block'; createAgeGraph(worksData, showLeadRoleOnly, selectedTypes, showNonLeadOnly, showAwardOnly);
        } else if (document.getElementById('chart-view-filter')?.checked) {
            views.chart.style.display = 'block'; createChartView(worksData, showLeadRoleOnly, selectedTypes, showNonLeadOnly, showAwardOnly);
        } else if (mapFilterOn && stageFilterOn) {
            // Japan prefecture map: Map View + 舞台 both ON
            views.japanMap.style.display = 'block';
            const detailContainer = document.getElementById('works-detail-container');
            if (detailContainer) detailContainer.style.display = 'none';
            initJapanPrefectureMap(worksData);
        } else if (mapFilterOn) {
            views.map.style.display = 'block';
            const detailContainer = document.getElementById('works-detail-container');
            if (detailContainer) detailContainer.style.display = 'none';
            initActivityMapView();
        } else {
            views.month.style.display = 'block'; createMonthGraph(worksData, showLeadRoleOnly, selectedTypes, showNonLeadOnly, showAwardOnly);
        }
    }

    Promise.all([
        fetch('../data/biography.csv').then(res => res.text()),
        fetch('../data/location.csv').then(res => res.text())
    ]).then(([bioData, locData]) => {
        worksData = parseCSV(bioData);
        locationData = parseCSV(locData);

        locationData.forEach(row => {
            if (row.Location && row.Name && row.Name.trim() !== 'Location') {
                const locations = row.Location.split(',').map(l => l.trim()).filter(Boolean);
                locations.forEach(l => {
                    const config = ACTIVITY_LOCATION_COUNTRY_CONFIG[l];
                    const mappedName = config ? config.name : l;
                    if (!workLocationMap[row.Name]) workLocationMap[row.Name] = new Set();
                    workLocationMap[row.Name].add(mappedName);
                });
            }
        });

        worksData.forEach(item => item.WorksType = normalizeWorksType(item.WorksType));
        updateGraphView();

        leadRoleFilter.addEventListener('change', updateGraphView);
        if (nonLeadRoleFilter) {
            nonLeadRoleFilter.addEventListener('change', updateGraphView);
        }
        if (individualAwardFilter) {
            individualAwardFilter.addEventListener('change', updateGraphView);
        }

        typeFilters.forEach(f => f.addEventListener('change', updateGraphView));
        viewFilters.forEach(f => f.addEventListener('change', function () {
            viewFilters.forEach(o => { if (o !== this) o.checked = false; });
            updateGraphView();
        }));
        const closeBtn = document.querySelector('#works-detail-container .close-detail');
        if (closeBtn) closeBtn.addEventListener('click', () => document.getElementById('works-detail-container').style.display = 'none');
    });
});
function getPrefectureFromVenue(venueName) {
    if (!venueName) return null;
    let pref = typeof VENUE_PREFECTURE_MAP !== 'undefined' ? VENUE_PREFECTURE_MAP[venueName] : null;
    if (!pref) return null;
    if (pref === '東京') return '東京都';
    return pref;
}
