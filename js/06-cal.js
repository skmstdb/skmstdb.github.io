/**
 * Group 1: Schedule Exclusive
 */
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

/**
 * Group 2: Anniversary Exclusive
 * (None - Anniversary view uses shared grid logic from Schedule)
 */

/**
 * Group 3: Year Exclusive
 */
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
        const monthDetail = document.createElement('div');
        monthDetail.className = 'year-mobile-detail';

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
                const status = getEventStatusOnDate(e, date);
                return status.isActive;
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
                dayEvents.forEach(event => {
                    const tooltipEvent = document.createElement('div');
                    tooltipEvent.className = 'tooltip-event';
                    tooltipEvent.textContent = event.title;
                    tooltip.appendChild(tooltipEvent);
                });
                dayCell.appendChild(tooltip);
                dayCell.addEventListener('click', (event) => {
                    event.stopPropagation();
                    toggleYearMobileDetail(dayCell, monthDetail, date, dayEvents);
                });
            }
            monthGrid.appendChild(dayCell);
        }

        const totalCells = firstDayOfWeek + lastDay.getUTCDate();
        const trailingEmptyCells = Math.max(0, 42 - totalCells);
        for (let i = 0; i < trailingEmptyCells; i++) {
            const empty = document.createElement('div');
            empty.className = 'year-day other-month';
            monthGrid.appendChild(empty);
        }

        monthContainer.appendChild(monthGrid);
        monthContainer.appendChild(monthDetail);
        calendarGrid.appendChild(monthContainer);
    });
}

function clearYearMobileDetails() {
    document.querySelectorAll('.year-mobile-detail').forEach(detail => {
        detail.classList.remove('is-visible');
        detail.innerHTML = '';
    });
    document.querySelectorAll('.year-day.is-selected').forEach(day => {
        day.classList.remove('is-selected');
    });
}

function toggleYearMobileDetail(dayCell, detailContainer, date, dayEvents) {
    if (!detailContainer) return;

    const isSelected = dayCell.classList.contains('is-selected');
    clearYearMobileDetails();

    if (isSelected) return;

    const detailDate = document.createElement('div');
    detailDate.className = 'year-mobile-detail-date';
    detailDate.textContent = `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;

    const detailList = document.createElement('div');
    detailList.className = 'year-mobile-detail-list';

    dayEvents.forEach(event => {
        const item = document.createElement('div');
        item.className = 'year-mobile-detail-item';
        item.textContent = event.title;
        detailList.appendChild(item);
    });

    detailContainer.innerHTML = '';
    detailContainer.appendChild(detailDate);
    detailContainer.appendChild(detailList);
    detailContainer.classList.add('is-visible');
    dayCell.classList.add('is-selected');
}

/**
 * Group 4: Upcoming Exclusive
 */
async function renderUpcomingView() {
    const upcomingGrid = document.getElementById('upcoming-grid');
    if (!upcomingGrid) return;
    upcomingGrid.innerHTML = '';

    const now = getJSTNow();
    const today = createJSTDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    const dayOfWeek = today.getUTCDay();
    const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const startMonday = createJSTDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - diffToMonday);
    const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
    weekdays.forEach(wd => {
        const header = document.createElement('div');
        header.className = 'upcoming-grid-header';
        header.textContent = wd;
        upcomingGrid.appendChild(header);
    });

    const days = [];
    for (let i = 0; i < 35; i++) {
        const current = createJSTDate(startMonday.getUTCFullYear(), startMonday.getUTCMonth(), startMonday.getUTCDate() + i);
        days.push(current);
    }

    const events = await parseCSV();
    const rawAnniversary = await parseAnniversaryCSV();
    const holidays = await parseSyukujitsuCSV();

    document.getElementById('calendar-title').textContent = 'Upcoming';

    for (const day of days) {
        const year = day.getUTCFullYear();
        const month = day.getUTCMonth();

        let dayEvents = [];

        // Sakai Milestones
        const milestones = calculateSakaiMilestones(year, month).filter(m => isSameJSTDay(m.startDate, day));
        dayEvents.push(...milestones);

        // Character Birthdays
        const specialDays = special_memo
            .filter(bday => year >= bday.startYear && bday.month === month && bday.day === day.getUTCDate())
            .map(bday => ({
                title: bday.name,
                source: 'character-birthday',
                url: bday.url
            }));
        dayEvents.push(...specialDays);

        // Sakai Birthday
        const bdayInfo = getSakaiBirthdayInfo(day);
        if (bdayInfo.isBirthday) {
            dayEvents.push({ title: '堺さんの誕生日 🎂', source: 'sakai-birthday', url: 'https://sakai-masato.com/' });
        }

        // Calculated Anniversaries
        const annEvents = calculateAnniversaries(rawAnniversary, year, month)
            .filter(e => isSameJSTDay(e.startDate, day))
            .map(formatAnniversaryEvent);
        dayEvents.push(...annEvents);

        // Biography/Other events occurring today
        const activeEvents = events.filter(e => {
            const status = getEventStatusOnDate(e, day);
            if (status.isActive) {
                e._tmpIsMovieShowing = status.isMovieShowing;
                return true;
            }
            return false;
        }).map(e => {
            const clone = { ...e };
            if (e._tmpIsMovieShowing) clone.isMovieShowing = true;
            delete e._tmpIsMovieShowing;
            return clone;
        });
        dayEvents.push(...activeEvents);

        // Holidays
        const dayHolidays = holidays.filter(h => isSameJSTDay(h.startDate, day));
        dayEvents.push(...dayHolidays.map(h => ({ ...h, source: 'syukujitsu' })));

        const dayBlock = document.createElement('div');
        dayBlock.className = 'upcoming-day';
        if (isSameJSTDay(day, today)) dayBlock.classList.add('is-today');

        const header = document.createElement('div');
        header.className = 'upcoming-day-header';

        const numberLabel = document.createElement('div');
        numberLabel.className = 'upcoming-day-number';
        numberLabel.textContent = day.getUTCDate();

        const hasRealScheduleEvent = dayEvents.some(e => e.source === 'main' || e.source === 'other');
        const hasAnniversaryEvent = dayEvents.some(e =>
            e.source === 'sakai-milestone' ||
            e.source === 'anniversary' ||
            e.source === 'character-birthday' ||
            e.source === 'sakai-birthday'
        );
        const hasHoliday = dayEvents.some(e => e.source === 'syukujitsu');

        if (hasRealScheduleEvent) {
            numberLabel.style.color = 'rgba(52, 152, 219, 1)';
        } else if (hasAnniversaryEvent) {
            numberLabel.style.color = '#e74c3c';
        }

        header.appendChild(numberLabel);

        const subLabel = document.createElement('div');
        subLabel.className = 'upcoming-month-label';
        const isToday = isSameJSTDay(day, today);
        if (isToday && hasHoliday) {
            subLabel.textContent = `${day.getUTCMonth() + 1}月·祝日`;
        } else if (isToday) {
            subLabel.textContent = `${day.getUTCMonth() + 1}月`;
        } else if (hasHoliday) {
            subLabel.textContent = '祝日';
        } else {
            subLabel.style.visibility = 'hidden';
            subLabel.textContent = '·';
        }
        header.appendChild(subLabel);

        dayBlock.appendChild(header);

        const nonHolidayEvents = dayEvents.filter(e => e.source !== 'syukujitsu');
        if (nonHolidayEvents.length > 0) {
            dayBlock.classList.add('has-events');
            dayBlock.addEventListener('click', () => {
                document.querySelectorAll('.upcoming-day').forEach(d => d.classList.remove('is-selected'));
                dayBlock.classList.add('is-selected');
                showUpcomingDetails(day, nonHolidayEvents);
            });
        }

        upcomingGrid.appendChild(dayBlock);
    }
}

function showUpcomingDetails(date, events) {
    const dateLabel = document.getElementById('upcoming-details-date');
    const container = document.getElementById('upcoming-details-container');
    const modal = document.getElementById('upcoming-modal-overlay');
    if (!dateLabel || !container || !modal) return;
    dateLabel.textContent = formatJSTDateJapanese(date);
    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = '<div class="no-events" style="text-align: center; padding: 20px; opacity: 0.5;"> </div>';
        return;
    }

    const eventsWithDates = events.map(e => {
        let originalDate = e.originalDate;
        if (!originalDate) {
            if (e.source === 'sakai-milestone' || e.source === 'sakai-birthday') originalDate = createJSTDate(SAKAI_BIRTH.year, SAKAI_BIRTH.month, SAKAI_BIRTH.day);
            else if (e.source === 'character-birthday' || e.source === 'syukujitsu') originalDate = new Date(0);
            else originalDate = e.startDate || new Date(0);
        }
        return { ...e, originalDate };
    });

    const sortedEvents = eventsWithDates.map(formatAnniversaryEvent).sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());

    sortedEvents.forEach(event => {
        let displayTitle = event.title.trim();
        let anniversaryText = '';

        const match = displayTitle.match(/^(.*)\s*[\(（](.*周年|.*日|.*歳|.*日前)[\)）]$/);
        if (match) {
            displayTitle = match[1].trim();
            anniversaryText = match[2].trim();
        }

        const statusKeywords = ['終了', '公開', '放送開始', '放送終了', '初回', '最終回'];
        for (const kw of statusKeywords) {
            if (displayTitle.endsWith(kw)) {
                displayTitle = displayTitle.substring(0, displayTitle.length - kw.length).trim();
                anniversaryText = kw + (anniversaryText ? ' ' + anniversaryText : '');
                break;
            }
        }

        if (event.isMovieShowing) {
            anniversaryText = '上映中';
        }

        const isHoliday = event.source === 'syukujitsu';
        const card = createUpcomingDetailCard(displayTitle, anniversaryText, event.url, isHoliday);
        container.appendChild(card);
    });

    modal.classList.add('is-active');
}

function createUpcomingDetailCard(title, anniversaryText, url, isHoliday) {
    const card = document.createElement('div');
    card.className = 'upcoming-detail-card';

    const hasUrl = url && url !== '#' && url !== '';
    if (hasUrl && !isHoliday) {
        card.classList.add('is-clickable');
        card.addEventListener('click', () => window.open(url, '_blank'));
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'upcoming-detail-title';
    titleEl.textContent = title;
    card.appendChild(titleEl);

    if (anniversaryText) {
        const infoEl = document.createElement('div');
        infoEl.className = 'upcoming-detail-info';
        infoEl.textContent = anniversaryText;
        card.appendChild(infoEl);
    }

    return card;
}

/**
 * Group 5: Week Exclusive
 */
let currentWeekSelectedDate = null;

async function renderWeekView() {
    const weekDates = getWeekViewDates();
    const selectedDate = (currentWeekSelectedDate && weekDates.some(date => isSameJSTDay(date, currentWeekSelectedDate)))
        ? currentWeekSelectedDate
        : weekDates[0];

    currentWeekSelectedDate = selectedDate;
    createWeekDateNavigation();
    await loadWeekEventsForDate(selectedDate);
}

function createWeekDateNavigation() {
    const navigation = document.getElementById('week-date-navigation');
    if (!navigation) return;

    const weekDates = getWeekViewDates();
    const selectedDate = (currentWeekSelectedDate && weekDates.some(date => isSameJSTDay(date, currentWeekSelectedDate)))
        ? currentWeekSelectedDate
        : weekDates[0];

    navigation.innerHTML = '';

    weekDates.forEach(date => {
        const item = document.createElement('div');
        item.className = 'date-item';
        if (isSameJSTDay(date, selectedDate)) {
            item.classList.add('active');
        }
        if (isSameJSTDay(date, getJSTNow())) {
            item.classList.add('is-today');
        }
        item.dataset.date = formatJSTDate(date);

        const day = document.createElement('div');
        day.className = 'date-day';
        day.textContent = date.getUTCDate();

        const weekday = document.createElement('div');
        weekday.className = 'date-weekday';
        weekday.textContent = getJapaneseWeekday(date);

        item.appendChild(day);
        item.appendChild(weekday);
        item.addEventListener('click', () => {
            currentWeekSelectedDate = parseJSTDate(item.dataset.date);
            createWeekDateNavigation();
            loadWeekEventsForDate(currentWeekSelectedDate);
        });

        navigation.appendChild(item);
    });

    const activeItem = navigation.querySelector('.date-item.active');
    if (activeItem && isWeekViewMobile()) {
        requestAnimationFrame(() => {
            activeItem.scrollIntoView({
                block: 'nearest',
                inline: 'nearest',
                behavior: 'smooth'
            });
        });
    }
}

function getWeekViewDates() {
    const baseDate = getWeekViewDayStart(getJSTNow());
    return Array.from({ length: 7 }, (_, index) => createJSTDate(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate() + index
    ));
}

function createWeekViewCard(title, url, anniversaryText = '', dateText = '') {
    const card = document.createElement('div');
    card.className = 'today-item';
    card.addEventListener('click', () => {
        window.open(url, '_blank');
    });

    const titleEl = document.createElement('div');
    titleEl.className = 'today-title';
    titleEl.textContent = title;
    card.appendChild(titleEl);

    if (anniversaryText) {
        const anniversaryEl = document.createElement('div');
        anniversaryEl.className = 'today-anniversary';
        anniversaryEl.textContent = anniversaryText;
        card.appendChild(anniversaryEl);
    }

    if (dateText) {
        const dateEl = document.createElement('div');
        dateEl.className = 'today-date';
        dateEl.textContent = dateText;
        card.appendChild(dateEl);
    }

    return card;
}

function getWeekViewUpcomingEventCards(events, selectedDate) {
    const upcomingEvents = events
        .filter(event => event.startDate && event.startDate > selectedDate)
        .sort((a, b) => a.startDate - b.startDate)
        .slice(0, 100);

    return upcomingEvents.map(event => {
        const daysUntilStart = Math.ceil((event.startDate - selectedDate) / (1000 * 60 * 60 * 24));
        return createWeekViewCard(`『 ${event.title} 』の公開まであと${daysUntilStart}日`, event.url);
    });
}

function getWeekViewEventCards(events, selectedDate) {
    return events.map(event => {
        let anniversaryText = '';
        let dateText = '';

        switch (event.matchType) {
            case 'start': {
                const startAnniversary = selectedDate.getUTCFullYear() - event.startDate.getUTCFullYear();
                anniversaryText = startAnniversary === 0 ? 'Premiere' : `${startAnniversary}周年`;
                dateText = `${formatWeekDateForDisplay(event.startDate)} 公開`;
                break;
            }
            case 'end': {
                const endAnniversary = selectedDate.getUTCFullYear() - event.endDate.getUTCFullYear();
                anniversaryText = endAnniversary === 0 ? 'Finale' : `${endAnniversary}周年`;
                dateText = `${formatWeekDateForDisplay(event.endDate)} 終了`;
                break;
            }
            case 'tv-start':
                anniversaryText = '初回';
                dateText = `${formatWeekDateForDisplay(event.startDate)} 放送開始`;
                break;
            case 'tv-end':
                anniversaryText = '最終回';
                dateText = `${formatWeekDateForDisplay(event.endDate)} 放送終了`;
                break;
            case 'tv-weekday':
                anniversaryText = '放送日';
                dateText = `${formatWeekDateForDisplay(event.startDate)} - ${formatWeekDateForDisplay(event.endDate)}`;
                break;
            case 'film':
                anniversaryText = '公開中';
                dateText = `${formatWeekDateForDisplay(event.startDate)} 公開`;
                break;
            case 'milestone-start':
                anniversaryText = `${event.milestone.days} Days Ago`;
                dateText = `${formatWeekDateForDisplay(event.startDate)} 公開`;
                break;
            case 'milestone-end':
                anniversaryText = `${event.milestone.days} Days Ago`;
                dateText = `${formatWeekDateForDisplay(event.endDate)} 終了`;
                break;
        }

        return createWeekViewCard(event.title, event.url, anniversaryText, dateText);
    });
}

async function loadWeekEventsForDate(selectedDate) {
    const container = document.getElementById('week-container');
    if (!container) return;

    const normalizedDate = getWeekViewDayStart(selectedDate);
    const today = getWeekViewDayStart(getJSTNow());
    const events = await parseWeekViewCSV();
    const dateEvents = [];
    const cards = [];

    currentWeekSelectedDate = normalizedDate;
    const titleEl = document.getElementById('calendar-title');
    if (titleEl) titleEl.textContent = formatWeekDateForDisplay(normalizedDate);

    for (const event of events) {
        let matchType = null;
        let milestone = null;

        if (isWeekViewDateDeleted(normalizedDate, event.dateDelete)) continue;

        const worksType = event.worksType || '';
        const isTVMode = worksType === 'TV' && event.weekday && /^-?\d+([,，]\s*-?\d+)*$/.test(event.weekday.trim());
        const isTVCurrentlyAiring = isTVMode && event.startDate && event.endDate &&
            normalizedDate >= event.startDate && normalizedDate <= event.endDate;

        if (worksType === '映画' && isFilmShowing(event.startDate, normalizedDate)) {
            matchType = 'film';
        } else if (isTVCurrentlyAiring && isWeekViewDateMatching(event.startDate, normalizedDate)) {
            matchType = 'tv-start';
        } else if (isTVCurrentlyAiring && isWeekViewDateMatching(event.endDate, normalizedDate)) {
            matchType = 'tv-end';
        } else if (isTVCurrentlyAiring &&
            normalizedDate > event.startDate &&
            normalizedDate < event.endDate &&
            isValidWeekdayForDate(event.weekday, normalizedDate)) {
            matchType = 'tv-weekday';
        } else if ((!isTVMode || !isTVCurrentlyAiring) && isWeekViewDateMatching(event.startDate, normalizedDate)) {
            matchType = 'start';
        } else if ((!isTVMode || !isTVCurrentlyAiring) && isWeekViewDateMatching(event.endDate, normalizedDate)) {
            matchType = 'end';
        }

        if (!matchType) {
            if (event.startDate) {
                const startMilestone = checkWeekViewMilestone(event.startDate, normalizedDate);
                if (startMilestone && normalizedDate > event.startDate) {
                    matchType = 'milestone-start';
                    milestone = startMilestone;
                }
            }
            if (!matchType && event.endDate) {
                const endMilestone = checkWeekViewMilestone(event.endDate, normalizedDate);
                if (endMilestone && normalizedDate > event.endDate) {
                    matchType = 'milestone-end';
                    milestone = endMilestone;
                }
            }
        }

        if (matchType) {
            dateEvents.push({ ...event, matchType, milestone });
        }
    }

    const bdayInfo = getSakaiBirthdayInfo(normalizedDate);
    if (isSameJSTDay(normalizedDate, today)) {
        if (bdayInfo.isBirthday) {
            cards.push(createWeekViewCard(`堺さん、${bdayInfo.age}歳のお誕生日おめでとうございます！！`, 'https://sakai-masato.com/'));
        } else {
            if (bdayInfo.daysUntilBirthday === 300 || bdayInfo.daysUntilBirthday === 200 || bdayInfo.daysUntilBirthday <= 100) {
                cards.push(createWeekViewCard(`${bdayInfo.nextAge}歳の誕生日まであと${bdayInfo.daysUntilBirthday}日`, 'https://sakai-masato.com/'));
            }
        }
        cards.push(...getWeekViewUpcomingEventCards(events, normalizedDate));
    }

    if (dateEvents.length > 0) {
        cards.push(...getWeekViewEventCards(dateEvents, normalizedDate));
    }

    container.innerHTML = '';
    cards.forEach(card => container.appendChild(card));
}

function getWeekViewDayStart(date) {
    return createJSTDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isWeekViewDateMatching(date, selectedDate) {
    if (!date || !selectedDate) return false;
    return formatJSTDate(date)?.substring(5) === formatJSTDate(selectedDate)?.substring(5);
}

function isWeekViewDateDeleted(selectedDate, dateDeleteArray) {
    if (!dateDeleteArray || dateDeleteArray.length === 0) return false;
    return dateDeleteArray.some(deleteDate => !isNaN(deleteDate.getTime()) && isSameJSTDay(deleteDate, selectedDate));
}

function checkWeekViewMilestone(date, selectedDate) {
    const days = Math.abs(getJSTDaysDifference(selectedDate, date));
    if (days === 0) return null;

    if (isSignificantDay(days)) {
        return { days };
    }
    return null;
}

function isWeekViewMobile() {
    return window.innerWidth <= 767;
}

function getJapaneseWeekday(date) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getUTCDay()];
}

function formatWeekDateForDisplay(date) {
    return formatJSTDateJapanese(date);
}

/**
 * Group 6: Shared Content (Highest Priority: Schedule)
 */

// --- Global State & Constants ---
// [Used by: Schedule, Anniversary, Year, Upcoming, Week]
let currentViewMode = getInitialViewMode();

// [Used by: Schedule, Anniversary, Upcoming]
const special_memo = [
    { name: '乃木憂助の誕生日', month: 0, day: 25, startYear: 2024, url: 'https://h2col.notion.site/1b68a08476c780e78f0fe8e8e8441e1b' },
    { name: '伊達一義の誕生日', month: 5, day: 29, startYear: 2011, url: 'https://h2col.notion.site/1b68a08476c780caa667e03f4ffdffb8' },
    { name: '木村一樹の誕生日', month: 9, day: 11, startYear: 2008, url: 'https://h2col.notion.site/1b68a08476c78015ab14f23054250d11' },
    { name: '半沢直樹の誕生日', month: 11, day: 8, startYear: 2013, url: 'https://h2col.notion.site/1b68a08476c7804dba68d1ae0ae9e9cc' }
];

// --- Initialization Helpers ---
// [Used by: Schedule, Anniversary, Year, Upcoming, Week]
function getInitialViewMode() {
    const requestedView = new URLSearchParams(window.location.search).get('view');
    const validViews = new Set(['schedule', 'anniversary', 'upcoming', 'week', 'year']);
    if (requestedView && validViews.has(requestedView)) return requestedView;
    return 'upcoming';
}

// [Used by: Schedule, Anniversary, Year]
function getInitialCalendarSelection() {
    const params = new URLSearchParams(window.location.search);
    const requestedYear = parseInt(params.get('year'), 10);
    const requestedMonth = parseInt(params.get('month'), 10);
    const currentYear = getJSTYear();
    const fallback = { year: currentYear, month: getJSTMonth() };

    if (!Number.isInteger(requestedYear) || !Number.isInteger(requestedMonth)) return fallback;
    if (requestedMonth < 1 || requestedMonth > 12) return fallback;
    const maxYear = currentYear + 3;
    if (requestedYear < 1992 || requestedYear > maxYear) return fallback;

    return { year: requestedYear, month: requestedMonth - 1 };
}

// --- Main View Controllers ---
// [Used by: Schedule, Anniversary, Year, Upcoming, Week]
async function initializeCalendar() {
    initializeSelectors();
    await updateCalendar();
}

// [Used by: Schedule, Anniversary, Year]
function initializeSelectors() {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const viewModeSelect = document.getElementById('view-mode-select');
    const initialSelection = getInitialCalendarSelection();
    const currentYear = getJSTYear();

    yearSelect.innerHTML = '';
    for (let year = currentYear + 3; year >= 1992; year--) {
        const opt = document.createElement('option');
        opt.value = year; opt.textContent = year;
        yearSelect.appendChild(opt);
    }
    yearSelect.value = initialSelection.year;

    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    monthSelect.innerHTML = '';
    months.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = name;
        monthSelect.appendChild(opt);
    });
    monthSelect.value = initialSelection.month;
    if (viewModeSelect) viewModeSelect.value = currentViewMode;

    yearSelect.addEventListener('change', updateCalendar);
    monthSelect.addEventListener('change', updateCalendar);
}

// [Used by: Schedule, Anniversary, Year, Upcoming, Week]
async function updateCalendar() {
    const year = parseInt(document.getElementById('year-select').value);
    const month = parseInt(document.getElementById('month-select').value);
    setCalendarViewLayout();

    if (currentViewMode === 'week') {
        await renderWeekView();
        updateNavigationButtons(year, month);
        const container = document.querySelector('.calendar-container');
        if (container) { container.style.opacity = '1'; container.style.visibility = 'visible'; }
        return;
    }

    if (currentViewMode === 'upcoming') {
        await renderUpcomingView();
        const container = document.querySelector('.calendar-container');
        if (container) { container.style.opacity = '1'; container.style.visibility = 'visible'; }
        return;
    }

    let events = await parseCSV();

    if (currentViewMode !== 'year') {
        const sakaiMilestones = calculateSakaiMilestones(year, month);
        events = [...events, ...sakaiMilestones];

        if (currentViewMode === 'anniversary') {
            const specialDays = special_memo
                .filter(bday => year >= bday.startYear)
                .map(bday => ({
                    startDate: createJSTDate(year, bday.month, bday.day),
                    endDate: createJSTDate(year, bday.month, bday.day),
                    title: `${bday.name}`,
                    source: 'character-birthday',
                    url: bday.url
                }));
            events = [...events, ...specialDays];
        }

        const sakaiBirthday = {
            startDate: createJSTDate(year, SAKAI_BIRTH.month, SAKAI_BIRTH.day),
            endDate: createJSTDate(year, SAKAI_BIRTH.month, SAKAI_BIRTH.day),
            title: '堺さんの誕生日 🎂',
            source: 'sakai-birthday',
            url: 'https://sakai-masato.com/'
        };
        events = [...events, sakaiBirthday];
    }

    if (currentViewMode === 'year') {
        document.getElementById('calendar-title').textContent = `${year}年`;
        generateYearCalendar(year, events);
    } else if (currentViewMode === 'anniversary') {
        const rawAnniversary = await parseAnniversaryCSV();
        const annEvents = calculateAnniversaries(rawAnniversary, year, month);
        const formattedAnn = annEvents.map(formatAnniversaryEvent);
        events = [...events, ...formattedAnn];
        document.getElementById('calendar-title').textContent = `${year}年${month + 1}月`;
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

// [Used by: Schedule, Anniversary, Year, Upcoming, Week]
function setCalendarViewLayout() {
    const calendarGrid = document.querySelector('.calendar-grid');
    const weekPanel = document.getElementById('week-view-panel');
    const upcomingPanel = document.getElementById('upcoming-view-panel');
    const prevButton = document.getElementById('prev-month');
    const nextButton = document.getElementById('next-month');
    const todayButton = document.getElementById('today-button');
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const container = document.querySelector('.calendar-container');
    const isWeekView = currentViewMode === 'week';
    const isUpcomingView = currentViewMode === 'upcoming';

    if (calendarGrid) calendarGrid.style.display = (isWeekView || isUpcomingView) ? 'none' : '';
    if (weekPanel) weekPanel.classList.toggle('is-active', isWeekView);
    if (upcomingPanel) upcomingPanel.classList.toggle('is-active', isUpcomingView);
    if (container) container.classList.toggle('week-mode', isWeekView);

    [prevButton, nextButton, todayButton, yearSelect, monthSelect].forEach(control => {
        if (control) control.style.display = (isWeekView || isUpcomingView) ? 'none' : '';
    });
}

// [Used by: Schedule, Anniversary, Year, Upcoming, Week]
function updateNavigationButtons(year, month) {
    const prev = document.getElementById('prev-month');
    const next = document.getElementById('next-month');
    const currentYear = getJSTYear();
    const minYear = 1992;
    const maxYear = currentYear + 3;

    if (currentViewMode === 'week') {
        prev.disabled = false;
        next.disabled = false;
    } else if (currentViewMode === 'year') {
        prev.disabled = year <= minYear;
        next.disabled = year >= maxYear;
    } else {
        prev.disabled = (year <= minYear && month <= 0);
        next.disabled = (year >= maxYear && month >= 11);
    }
    prev.style.opacity = prev.disabled ? '0.5' : '1';
    next.style.opacity = next.disabled ? '0.5' : '1';
}

// [Used by: Schedule, Anniversary, Year, Upcoming, Week]
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

// --- Month Grid (Schedule/2 Shared) ---
// [Used by: Schedule, Anniversary]
function generateCalendar(year, month, events) {
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.className = 'calendar-grid';
    calendarGrid.innerHTML = '';

    const cornerHeader = document.createElement('div');
    cornerHeader.className = 'calendar-day-header';
    cornerHeader.textContent = '';
    calendarGrid.appendChild(cornerHeader);

    const days = ['月', '火', '水', '木', '金', '土', '日'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header day-of-week';
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

    const daysArray = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
        const day = prevMonthLastDay - firstDayOfWeek + i + 1;
        const date = createJSTDate(year, month - 1, day);
        daysArray.push({ day, date, isOtherMonth: true, isToday: false });
    }
    for (let day = 1; day <= lastDay.getUTCDate(); day++) {
        const date = createJSTDate(year, month, day);
        const isToday = isCurrentMonth && today.getUTCDate() === day;
        daysArray.push({ day, date, isOtherMonth: false, isToday });
    }
    const totalDaysDisplayed = firstDayOfWeek + lastDay.getUTCDate();
    const remainingCells = (7 - (totalDaysDisplayed % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
        const date = createJSTDate(year, month + 1, day);
        daysArray.push({ day, date, isOtherMonth: true, isToday: false });
    }

    for (let i = 0; i < daysArray.length; i += 7) {
        const thursday = daysArray[i + 3].date;
        const weekNum = getWeekNumber(thursday);
        const weekCell = document.createElement('div');
        weekCell.className = 'week-number-cell';
        weekCell.textContent = weekNum;
        calendarGrid.appendChild(weekCell);
        for (let j = 0; j < 7; j++) {
            const data = daysArray[i + j];
            calendarGrid.appendChild(createDayElement(data.day, data.date, data.isOtherMonth, data.isToday));
        }
    }

    if (events && events.length > 0) renderEvents(calendarGrid, year, month, events);

    if (window.innerWidth > 768) {
        requestAnimationFrame(() => {
            const headerCell = calendarGrid.querySelector('.day-of-week');
            if (headerCell) calendarGrid.style.setProperty('--week-col-width', `${headerCell.offsetHeight}px`);
        });
    } else {
        calendarGrid.style.removeProperty('--week-col-width');
    }
}

// [Used by: Schedule, Anniversary]
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
                    if (dayElements[dayIndex]) appendBento(dayElements[dayIndex], event, 'rgba(52, 152, 219, 0.8)');
                }
            });
        }

        const monthStart = createJSTDate(year, month, 1);
        const monthEnd = createJSTDate(year, month + 1, 0);
        if (endDate < monthStart || startDate > monthEnd) return;

        const displayStart = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
        const displayEnd = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));

        let backgroundColor = 'rgba(52, 152, 219, 0.8)';
        if (event.source === 'sakai-birthday' || event.source === 'sakai-milestone') backgroundColor = 'rgba(46, 204, 113, 0.8)';
        else if (event.source === 'character-birthday') backgroundColor = '#43AA8B';
        else if (event.source === 'other') backgroundColor = 'rgba(241, 196, 15, 0.8)';
        else if (event.source === 'anniversary') backgroundColor = event.color || 'rgba(231, 76, 60, 0.8)';
        else if (event.source === 'syukujitsu') backgroundColor = '#FFD1D1';

        const isNumericWeekday = event.weekday && !isNaN(parseInt(event.weekday)) && event.weekday.trim() !== '';
        if (isNumericWeekday) {
            const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const date = createJSTDate(year, month, day);
                if (date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime() && isValidWeekdayForDate(event.weekday, date)) {
                    const dateString = formatDate(date);
                    if (!(event.excludeDates && event.excludeDates.includes(dateString))) {
                        const dayIndex = day + firstDayOfWeek - 1;
                        if (dayElements[dayIndex]) appendBento(dayElements[dayIndex], event, backgroundColor);
                    }
                }
            }
        } else {
            const startIndex = displayStart.getUTCDate() + firstDayOfWeek - 1;
            const endIndex = displayEnd.getUTCDate() + firstDayOfWeek - 1;
            for (let i = startIndex; i <= endIndex && i < dayElements.length; i++) {
                const currentDate = createJSTDate(year, month, i - firstDayOfWeek + 1);
                const dateString = formatJSTDate(currentDate);
                if (!(event.excludeDates && event.excludeDates.includes(dateString))) appendBento(dayElements[i], event, backgroundColor);
            }
        }
    });
}

// [Used by: Schedule, Anniversary]
function appendBento(element, event, bgColor) {
    const interactiveSources = new Set(['main', 'other', 'anniversary', 'sakai-birthday']);
    const isInteractive = interactiveSources.has(event.source);
    let bento;
    if (event.source === 'syukujitsu') {
        bento = document.createElement('div'); bento.style.color = '#c0392b';
    } else {
        bento = document.createElement('a'); bento.href = event.url; bento.target = '_blank';
    }
    bento.classList.add('bento-container');
    bento.classList.add(isInteractive ? 'is-interactive' : 'is-static');
    bento.style.backgroundColor = bgColor;
    const item = document.createElement('div');
    item.classList.add('bento-item'); item.textContent = event.title;
    bento.appendChild(item);
    element.appendChild(bento);
}

// [Used by: Schedule, Anniversary]
function createDayElement(day, date, isOtherMonth, isToday = false) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (isOtherMonth) dayElement.classList.add('other-month');
    if (isToday) dayElement.classList.add('today');
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    if (isToday) {
        dayNumber.style.cssText = 'background-color:red;color:white;border-radius:50%;padding:5px;width:25px;height:25px;display:flex;justify-content:center;align-items:center;';
    }
    dayElement.appendChild(dayNumber);
    dayElement.dataset.date = date.toISOString().split('T')[0];
    return dayElement;
}

// [Used by: Schedule, Anniversary]
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayOfWeek = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayOfWeek + 3);
    const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    return 1 + Math.round((d.getTime() - jan4.getTime()) / 604800000);
}

// --- Core Calculation Logic ---
/**
 * Shared with Year (Priority: Year)
 */

// [Used by: Year, Upcoming]
function getEventStatusOnDate(event, date) {
    let isActive = false;
    let isMovieShowing = false;

    if (event.worksType === '映画') {
        isMovieShowing = isFilmShowing(event.startDate, date);
        isActive = isMovieShowing;
        
        // Still respect specific exclusions/additions even for movies
        const dateStr = formatDate(date);
        if (event.excludeDates && event.excludeDates.includes(dateStr)) isActive = false;
        if (event.additionalDates && event.additionalDates.includes(dateStr)) isActive = true;
    } else {
        isActive = isEventActiveOnDate(event, date);
    }

    return { isActive, isMovieShowing };
}

// [Used by: Year, Upcoming, Week]
function isFilmShowing(startDate, targetDate) {
    if (!startDate || !targetDate) return false;
    const start = startDate.getTime();
    const target = targetDate.getTime();
    return target >= start && target < start + (35 * 24 * 60 * 60 * 1000);
}

/**
 * Shared with Schedule (Priority: Schedule)
 */

// [Used by: Schedule, Anniversary, Upcoming]
function calculateSakaiMilestones(year, month) {
    const milestones = [];
    const startDate = createJSTDate(SAKAI_BIRTH.year, SAKAI_BIRTH.month, SAKAI_BIRTH.day);
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let d = 1; d <= lastDayOfMonth; d++) {
        const currentDate = createJSTDate(year, month, d);
        const diffTime = currentDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const dayCount = diffDays + 1;
        if (dayCount > 0 && dayCount % 100 === 0) {
            milestones.push({
                startDate: currentDate, endDate: currentDate,
                title: `S-${dayCount}th`, url: 'https://sakai-masato.com/',
                source: 'sakai-milestone', id: 'milestone-' + dayCount
            });
        }
    }
    return milestones;
}

// [Used by: Schedule, Anniversary, Upcoming]
function formatAnniversaryEvent(event) {
    if (event.source !== 'anniversary') return event;
    let title = event.originalTitle || '';
    let color = 'rgba(231, 76, 60, 0.8)';
    if (event.anniversaryType === 'start') title += ` (${event.diffValue}周年)`;
    else if (event.anniversaryType === 'end') title += ` 終了 (${event.diffValue}周年)`;
    else if (event.anniversaryType === 'days_start') {
        title += ` (${event.diffValue}日前)`; color = 'rgba(155, 89, 182, 0.8)';
    } else if (event.anniversaryType === 'days_end') {
        title += ` 終了 (${event.diffValue}日前)`; color = 'rgba(155, 89, 182, 0.8)';
    }
    return { ...event, title, color };
}

// --- Theme & UI ---
// [Used by: Schedule, Anniversary, Year, Upcoming, Week]
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

// --- Main Entry Point ---
// [Used by: Schedule, Anniversary, Year, Upcoming, Week]
document.addEventListener('DOMContentLoaded', async function () {
    document.body.style.visibility = 'visible';
    await initializeCalendar();
    applyDarkModeToCalendar();

    const upcomingModalClose = document.getElementById('upcoming-modal-close');
    const upcomingModalOverlay = document.getElementById('upcoming-modal-overlay');
    if (upcomingModalClose && upcomingModalOverlay) {
        const closeModal = () => {
            upcomingModalOverlay.classList.remove('is-active');
            document.querySelectorAll('.upcoming-day').forEach(d => d.classList.remove('is-selected'));
        };
        upcomingModalClose.addEventListener('click', closeModal);
        upcomingModalOverlay.addEventListener('click', (e) => {
            if (e.target === upcomingModalOverlay) closeModal();
        });
    }

    const obs = new MutationObserver(muts => {
        muts.forEach(m => { if (m.attributeName === 'class') applyDarkModeToCalendar(); });
    });
    obs.observe(document.body, { attributes: true });

    window.addEventListener('resize', () => {
        if (currentViewMode === 'week') {
            const weekDates = getWeekViewDates();
            const resizedDate = (currentWeekSelectedDate && weekDates.some(date => isSameJSTDay(date, currentWeekSelectedDate)))
                ? currentWeekSelectedDate
                : weekDates[0];
            currentWeekSelectedDate = resizedDate;
            createWeekDateNavigation();
            loadWeekEventsForDate(resizedDate);
            return;
        }
        const calendarGrid = document.querySelector('.calendar-grid');
        if (!calendarGrid || calendarGrid.classList.contains('year-mode-grid')) return;
        if (window.innerWidth > 768) {
            const headerCell = calendarGrid.querySelector('.day-of-week');
            if (headerCell) calendarGrid.style.setProperty('--week-col-width', `${headerCell.offsetHeight}px`);
        } else {
            calendarGrid.style.removeProperty('--week-col-width');
        }
    });

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
        if (currentViewMode === 'week') currentWeekSelectedDate = getWeekViewDayStart(getJSTNow());
        updateCalendar();
    });

    document.addEventListener('click', (event) => {
        if (currentViewMode !== 'year') return;
        if (event.target.closest('.year-day.has-event') || event.target.closest('.year-mobile-detail')) return;
        clearYearMobileDetails();
    });
});
