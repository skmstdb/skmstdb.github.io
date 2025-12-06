// 解析CSV数据
let currentViewMode = 'schedule'; // 'schedule', 'anniversary', 'year'

async function parseCSV() {
    try {
        // 加载主数据文件 - 从 biography.csv 读取
        const response = await fetch('../data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        const header = rows[0].split(',').map(col => col.trim()); // 获取表头
        const dataStartIndex = 1; // 数据起始行索引

        const events = rows.slice(dataStartIndex).map(row => {
            // 使用更可靠的方式来分割CSV行，考虑引号内的逗号
            const columns = parseCSVRow(row);

            // 使用表头作为键来解析数据
            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }

            // 处理排除日期 - 使用 DateDelete 列
            let excludeDates = [];
            if (eventData['DateDelete'] && eventData['DateDelete'].trim() !== '') {
                excludeDates = eventData['DateDelete'].split(',').map(date => date.trim());
                console.log('Event:', eventData['Title'], 'Exclude dates:', excludeDates); // 调试信息
            }

            // 处理DateAdd列的日期
            let additionalDates = [];
            if (eventData['DateAdd'] && eventData['DateAdd'].trim() !== '') {
                additionalDates = eventData['DateAdd'].split(',').map(date => date.trim());
                console.log('Event:', eventData['Title'], 'Additional dates:', additionalDates); // 调试信息
            }

            return {
                pageCalendar: eventData['PageCalendar'] || '',
                startDate: parseJSTDate(eventData['DateStart']),
                endDate: eventData['DateEnd'] ? parseJSTDate(eventData['DateEnd']) : parseJSTDate(eventData['DateStart']),
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#', // 确保URL被正确处理
                id: Math.random().toString(36).substr(2, 9),
                weekday: eventData['Weekday'] || '', // 添加星期几属性
                excludeDates: excludeDates, // 添加需要排除的日期
                additionalDates: additionalDates, // 添加DateAdd列中的额外日期
                source: 'main' // 标记数据来源
            };
        }).filter(event =>
            // 只包含 PageCalendar 列不为空的数据
            event.pageCalendar && event.pageCalendar.trim() !== '' &&
            !isNaN(event.startDate.getTime()) && event.title
        );

        // 加载other.csv数据
        const otherEvents = await parseOtherCSV();

        // 合并两个数据源的事件
        return [...events, ...otherEvents];
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
}

// 解析 biography.csv 中 PageAnn 不为空的数据
async function parseAnniversaryCSV() {
    try {
        const response = await fetch('../data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        const header = rows[0].split(',').map(col => col.trim());
        const dataStartIndex = 1;

        const events = rows.slice(dataStartIndex).map(row => {
            const columns = parseCSVRow(row);
            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }

            return {
                pageAnn: eventData['PageAnn'] || '',
                startDate: parseJSTDate(eventData['DateStart']),
                endDate: eventData['DateEnd'] ? parseJSTDate(eventData['DateEnd']) : parseJSTDate(eventData['DateStart']),
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#',
                id: Math.random().toString(36).substr(2, 9),
                source: 'anniversary'
            };
        }).filter(event =>
            // 只包含 PageAnn 列不为空的数据
            event.pageAnn && event.pageAnn.trim() !== '' &&
            !isNaN(event.startDate.getTime()) && event.title
        );

        return events;
    } catch (error) {
        console.error('Error loading Anniversary CSV data:', error);
        return [];
    }
}

function calculateAnniversaries(events, year, month) {
    const anniversaryEvents = [];
    const targetMonth = month; // 0-indexed
    const targetYear = year;

    events.forEach(event => {
        const startDate = event.startDate;
        const endDate = event.endDate;
        const isSingleDay = startDate.getTime() === endDate.getTime();

        // Helper to add anniversary event
        const addEvent = (date, title, color) => {
            if (date.getFullYear() === targetYear && date.getMonth() === targetMonth) {
                anniversaryEvents.push({
                    startDate: date,
                    endDate: date,
                    title: title,
                    url: event.url,
                    id: Math.random().toString(36).substr(2, 9),
                    source: 'anniversary',
                    color: color
                });
            }
        };

        // 1. Yearly Anniversary
        // Calculate years passed
        const startYearsDiff = targetYear - startDate.getFullYear();
        if (startYearsDiff > 0) {
            const annDate = new Date(startDate);
            annDate.setFullYear(targetYear);
            addEvent(annDate, `${event.title} (${startYearsDiff}周年)`, 'rgba(231, 76, 60, 0.8)');
        }

        if (!isSingleDay) {
            const endYearsDiff = targetYear - endDate.getFullYear();
            if (endYearsDiff > 0) {
                const annDate = new Date(endDate);
                annDate.setFullYear(targetYear);
                addEvent(annDate, `${event.title} 終了 (${endYearsDiff}周年)`, 'rgba(231, 76, 60, 0.8)');
            }
        }

        // 2. Day-count Anniversary (100, 200, ..., 1000, 2000, ...)
        // Check if any significant day count falls in this month
        // Iterate through days in the month to find matches? Or calculate directly?
        // Calculating directly is better.

        // We need to find if (targetDate - baseDate) is a significant number.
        // Let's iterate through the days of the target month.
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const currentDay = new Date(targetYear, targetMonth, d);

            // Check Start Date
            const diffTimeStart = currentDay.getTime() - startDate.getTime();
            const diffDaysStart = Math.floor(diffTimeStart / (1000 * 60 * 60 * 24));

            if (diffDaysStart > 0) {
                if (isSignificantDay(diffDaysStart)) {
                    addEvent(currentDay, `${event.title} (${diffDaysStart}日)`, 'rgba(155, 89, 182, 0.8)');
                }
            }

            // Check End Date (if not single day)
            if (!isSingleDay) {
                const diffTimeEnd = currentDay.getTime() - endDate.getTime();
                const diffDaysEnd = Math.floor(diffTimeEnd / (1000 * 60 * 60 * 24));
                if (diffDaysEnd > 0) {
                    if (isSignificantDay(diffDaysEnd)) {
                        addEvent(currentDay, `${event.title} 終了 (${diffDaysEnd}日)`, 'rgba(155, 89, 182, 0.8)');
                    }
                }
            }
        }
    });

    return anniversaryEvents;
}

function isSignificantDay(days) {
    if (days < 100) return false;
    if (days < 1000) {
        return days % 100 === 0;
    }
    if (days < 10000) {
        return days % 1000 === 0;
    }
    return days % 10000 === 0;
}


// 解析other.csv数据
async function parseOtherCSV() {
    try {
        const response = await fetch('../data/other.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        const header = rows[0].split(',').map(col => col.trim()); // 获取表头
        const dataStartIndex = 1; // 数据起始行索引

        const events = rows.slice(dataStartIndex).map(row => {
            // 使用更可靠的方式来分割CSV行，考虑引号内的逗号
            const columns = parseCSVRow(row);

            // 使用表头作为键来解析数据
            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }

            // 从Date字段获取日期
            const date = eventData['Date'] ? parseJSTDate(eventData['Date']) : null;

            return {
                startDate: date,
                endDate: date, // 单日事件，开始和结束日期相同
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#',
                id: Math.random().toString(36).substr(2, 9),
                source: 'other' // 标记数据来源为other.csv
            };
        }).filter(event => event.startDate && !isNaN(event.startDate.getTime()) && event.title);

        return events;
    } catch (error) {
        console.error('Error loading other CSV data:', error);
        return [];
    }
}

// 更可靠的CSV行解析函数，考虑引号内的逗号
function parseCSVRow(row) {
    const result = [];
    let insideQuotes = false;
    let currentValue = '';

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

    // 添加最后一个值
    result.push(currentValue);

    // 清理结果中的引号
    return result.map(value => value.replace(/^"(.*)"$/, '$1'));
}

function generateCalendar(year, month, events) {
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.className = 'calendar-grid'; // Reset class to default
    calendarGrid.innerHTML = ''; // Clear previous content (important when switching from Year View)

    // Restore headers
    const days = ['月', '火', '水', '木', '金', '土', '日'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    const calendarTitle = document.getElementById('calendar-title');

    while (calendarGrid.childElementCount > 7) {
        calendarGrid.removeChild(calendarGrid.lastChild);
    }

    calendarTitle.textContent = `${year}年${month + 1}月`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 获取第一天是星期几（0是星期一，6是星期日）
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // 将星期天(0)转换为6，其他日期-1

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const today = getJSTNow();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let i = 0; i < firstDayOfWeek; i++) {
        const day = prevMonthLastDay - firstDayOfWeek + i + 1;
        const date = new Date(year, month - 1, day);
        const dayElement = createDayElement(day, date, true);
        calendarGrid.appendChild(dayElement);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const isToday = isCurrentMonth && today.getDate() === day;
        const dayElement = createDayElement(day, date, false, isToday);
        calendarGrid.appendChild(dayElement);
    }

    const totalDaysDisplayed = firstDayOfWeek + lastDay.getDate();
    const remainingCells = 42 - totalDaysDisplayed;

    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(year, month + 1, day);
        const dayElement = createDayElement(day, date, true);
        calendarGrid.appendChild(dayElement);
    }

    if (events && events.length > 0) {
        renderEvents(calendarGrid, year, month, events);
    }
}

// 更新renderEvents函数，根据事件来源设置不同的背景色和边框色
function renderEvents(calendarGrid, year, month, events) {
    const dayElements = Array.from(calendarGrid.querySelectorAll('.calendar-day'));
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

    // 堺雅人さんの誕生日イベントを追加（10月14日）
    if (month === 9) { // JavaScriptでは月は0から始まるため、10月は9
        const birthdayDate = 14;
        const birthdayIndex = birthdayDate + firstDayOfWeek - 1;

        if (birthdayIndex >= 0 && birthdayIndex < dayElements.length) {
            const dayElement = dayElements[birthdayIndex];

            // 誕生日イベントのコンテナを作成
            const birthdayContainer = document.createElement('a');
            birthdayContainer.href = 'https://sakai-masato.com/';
            birthdayContainer.target = '_blank'; // 在新标签页打开
            birthdayContainer.classList.add('bento-container');
            birthdayContainer.style.backgroundColor = 'rgba(46, 204, 113, 0.8)'; // 绿色背景
            birthdayContainer.style.borderLeftColor = '#27ae60'; // 深绿色边框

            // 誕生日イベントの内容
            const birthdayItem = document.createElement('div');
            birthdayItem.classList.add('bento-item');
            birthdayItem.textContent = '堺さんの誕生日 🎂';
            birthdayContainer.appendChild(birthdayItem);

            // カレンダーに追加
            dayElement.appendChild(birthdayContainer);
        }
    }

    events.forEach(event => {
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);

        // 处理Add列中的额外日期
        if (event.additionalDates && event.additionalDates.length > 0) {
            event.additionalDates.forEach(dateStr => {
                const additionalDate = new Date(dateStr);
                // 检查额外日期是否在当前月份
                if (additionalDate.getFullYear() === year && additionalDate.getMonth() === month) {
                    const dayIndex = additionalDate.getDate() + firstDayOfWeek - 1;
                    if (dayIndex >= 0 && dayIndex < dayElements.length) {
                        const dayElement = dayElements[dayIndex];

                        // 创建 Bento 的包装容器
                        const bentoContainer = document.createElement('a');
                        bentoContainer.href = event.url;
                        bentoContainer.target = '_blank';
                        bentoContainer.classList.add('bento-container');
                        bentoContainer.style.backgroundColor = 'rgba(52, 152, 219, 0.8)'; // 蓝色背景，区分额外日期
                        bentoContainer.style.borderLeftColor = '#3498db'; // 蓝色边框

                        // 创建 Bento 项目
                        const bentoItem = document.createElement('div');
                        bentoItem.classList.add('bento-item');
                        bentoItem.textContent = event.title;
                        bentoContainer.appendChild(bentoItem);

                        // 将bento容器添加到日历
                        dayElement.appendChild(bentoContainer);
                    }
                }
            });
        }

        if (endDate < new Date(year, month, 1) || startDate > new Date(year, month + 1, 0)) {
            return;
        }

        const displayStart = new Date(Math.max(startDate, new Date(year, month, 1)));
        const displayEnd = new Date(Math.min(endDate, new Date(year, month + 1, 0)));

        // 设置事件背景色和边框色
        let backgroundColor = 'rgba(52, 152, 219, 0.8)'; // 默认蓝色背景
        let borderColor = '#3498db'; // 默认蓝色边框

        // 根据事件来源设置不同的背景色和边框色
        // 根据事件来源设置不同的背景色和边框色
        if (event.source === 'other') {
            backgroundColor = '#43AA8B';
            borderColor = '#2E8B57'; // 深海绿
        } else if (event.source === 'anniversary') {
            backgroundColor = event.color || 'rgba(231, 76, 60, 0.8)';
            // 根据背景色判断边框色
            if (backgroundColor.includes('231, 76, 60')) { // 红色 (Yearly)
                borderColor = '#c0392b';
            } else { // 紫色 (Day-count)
                borderColor = '#8e44ad';
            }
        } else if (event.source === 'syukujitsu') {
            backgroundColor = '#FFD1D1'; // 浅红色背景
            borderColor = '#FF6B6B'; // 红色边框
        }

        // 检查 weekday 是否为数字（包括负数）
        const weekdayValue = parseInt(event.weekday);
        const isNumericWeekday = event.weekday && !isNaN(weekdayValue) && event.weekday.trim() !== '';

        // 如果有指定星期几且为数字，则只在特定星期几显示
        if (isNumericWeekday) {
            // weekday 是数字，执行星期过滤逻辑
            // 获取当月的所有日期
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                // 获取星期几 (0-6，0是星期日)
                const dayOfWeek = date.getDay();
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
                const dateString = formatDate(date); // 使用统一的日期格式化函数
                const isExcludedDate = event.excludeDates && event.excludeDates.length > 0 &&
                    event.excludeDates.some(excludeDate => {
                        if (dateString === excludeDate) {
                            console.log('排除日期匹配:', dateString, '事件:', event.title); // 调试信息
                            return true;
                        }
                        return false;
                    });

                // 检查日期是否在事件范围内且应该显示且不在排除列表中
                if (date >= startDate && date <= endDate && shouldDisplay && !isExcludedDate) {
                    const dayIndex = day + firstDayOfWeek - 1;
                    if (dayIndex >= 0 && dayIndex < dayElements.length) {
                        const dayElement = dayElements[dayIndex];

                        // 创建 Bento 的包装容器
                        let bentoContainer;
                        if (event.source === 'syukujitsu') {
                            bentoContainer = document.createElement('div');
                            bentoContainer.style.cursor = 'default';
                            bentoContainer.style.color = '#c0392b'; // 深红色文字
                        } else {
                            bentoContainer = document.createElement('a');
                            bentoContainer.href = event.url;
                            bentoContainer.target = '_blank';
                        }

                        bentoContainer.classList.add('bento-container');
                        bentoContainer.style.backgroundColor = backgroundColor; // 使用根据来源设置的背景色
                        bentoContainer.style.borderLeftColor = borderColor; // 设置边框色

                        // 创建 Bento 项目
                        const bentoItem = document.createElement('div');
                        bentoItem.classList.add('bento-item');
                        bentoItem.textContent = event.title;
                        bentoContainer.appendChild(bentoItem);

                        // 将bento容器添加到日历
                        dayElement.appendChild(bentoContainer);
                    }
                }
            }
        } else {
            // weekday 不是数字或为空，按照没有指定星期几的逻辑处理
            const startIndex = displayStart.getDate() + firstDayOfWeek - 1;
            const endIndex = displayEnd.getDate() + firstDayOfWeek - 1;

            for (let i = startIndex; i <= endIndex && i < dayElements.length; i++) {
                const dayElement = dayElements[i];
                const currentDate = new Date(year, month, i - firstDayOfWeek + 1);
                const dateString = formatDate(currentDate); // 使用统一的日期格式化函数

                // 检查当前日期是否在排除列表中
                const isExcludedDate = event.excludeDates && event.excludeDates.length > 0 &&
                    event.excludeDates.some(excludeDate => {
                        if (dateString === excludeDate) {
                            console.log('排除日期匹配:', dateString, '事件:', event.title); // 调试信息
                            return true;
                        }
                        return false;
                    });

                // 如果当前日期不在排除列表中，则显示事件
                if (!isExcludedDate) {
                    // 创建 Bento 的包装容器
                    let bentoContainer;
                    if (event.source === 'syukujitsu') {
                        bentoContainer = document.createElement('div');
                        bentoContainer.style.cursor = 'default';
                        bentoContainer.style.color = '#c0392b'; // 深红色文字
                    } else {
                        bentoContainer = document.createElement('a');
                        bentoContainer.href = event.url;
                        bentoContainer.target = '_blank';
                    }

                    bentoContainer.classList.add('bento-container');
                    bentoContainer.style.backgroundColor = backgroundColor; // 使用根据来源设置的背景色
                    bentoContainer.style.borderLeftColor = borderColor; // 设置边框色

                    // 创建 Bento 项目
                    const bentoItem = document.createElement('div');
                    bentoItem.classList.add('bento-item');
                    bentoItem.textContent = event.title;
                    bentoContainer.appendChild(bentoItem);

                    //将bento容器添加到日历
                    dayElement.appendChild(bentoContainer);
                }
            }
        }
    });
}

// 统一的日期格式化函数，确保格式一致 (JST)
function formatDate(date) {
    return formatJSTDate(date);
}

function createDayElement(day, date, isOtherMonth, isToday = false) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';

    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }

    if (isToday) {
        dayElement.classList.add('today');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;

    if (isToday) {
        dayNumber.style.backgroundColor = 'red';
        dayNumber.style.color = 'white';
        dayNumber.style.borderRadius = '50%';
        dayNumber.style.padding = '5px';
        dayNumber.style.width = '25px'; // 添加固定宽度
        dayNumber.style.height = '25px'; // 添加固定高度
        dayNumber.style.display = 'flex'; // 使用flex布局
        dayNumber.style.justifyContent = 'center'; // 水平居中
        dayNumber.style.alignItems = 'center'; // 垂直居中
    }

    dayElement.appendChild(dayNumber);
    dayElement.dataset.date = date.toISOString().split('T')[0];

    return dayElement;
}

function initializeSelectors() {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const currentYear = new Date().getFullYear();

    yearSelect.innerHTML = '';
    for (let year = currentYear + 3; year >= 1992; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    yearSelect.value = currentYear;

    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    monthNames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = name;
        monthSelect.appendChild(option);
    });
    monthSelect.value = getJSTMonth();

    yearSelect.addEventListener('change', updateCalendar);
    monthSelect.addEventListener('change', updateCalendar);
}

async function updateCalendar() {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);

    if (currentViewMode === 'year') {
        document.getElementById('calendar-title').textContent = `${year}年`;
        // Load all events for the year
        let events = await parseCSV();
        const anniversaryEvents = await parseAnniversaryCSV();
        const otherEvents = await parseOtherCSV();
        // We might want to filter events by year here to improve performance, 
        // but for now let's pass all and filter in render
        // Actually, calculateAnniversaries needs year context.

        // For Year Mode, we want to show everything? 
        // The requirement says "source is biography.csv and other.csv".
        // It doesn't explicitly say Anniversary events, but "Anniversary Mode" is a separate mode.
        // However, usually "Year Mode" implies an overview. 
        // Let's stick to the requirement: "source is biography.csv and other.csv".
        // So we load parseCSV (which includes biography.csv main events and other.csv).
        // We probably don't need Anniversary specific calculations unless requested.
        // Wait, parseCSV already merges other.csv.

        generateYearCalendar(year, events);
    } else {
        let events = await parseCSV(); // Always load schedule events

        if (currentViewMode === 'anniversary') {
            const rawAnniversaryEvents = await parseAnniversaryCSV();
            const anniversaryEvents = calculateAnniversaries(rawAnniversaryEvents, year, month);
            events = [...events, ...anniversaryEvents]; // Merge events
            document.getElementById('calendar-title').textContent = `${year}年${month + 1}月 (Anniversary)`;
        } else {
            // Schedule View: Load holidays
            const holidayEvents = await parseSyukujitsuCSV();
            events = [...events, ...holidayEvents];
            document.getElementById('calendar-title').textContent = `${year}年${month + 1}月`;
        }

        generateCalendar(year, month, events);
    }

    updateNavigationButtons(year, month);
}

function generateYearCalendar(year, events) {
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.innerHTML = ''; // Clear existing content
    calendarGrid.className = 'calendar-grid year-mode-grid'; // Switch to year mode grid

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    months.forEach((monthName, monthIndex) => {
        const monthContainer = document.createElement('div');
        monthContainer.className = 'year-month-container';

        const monthTitle = document.createElement('div');
        monthTitle.className = 'year-month-title';
        monthTitle.textContent = monthName;
        monthContainer.appendChild(monthTitle);

        const monthGrid = document.createElement('div');
        monthGrid.className = 'year-month-grid';

        // Add days
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);

        // Monday start (0 is Monday, 6 is Sunday)
        // Date.getDay(): 0=Sun, 1=Mon... 6=Sat
        // We want Mon=0, ..., Sun=6
        let firstDayOfWeek = firstDay.getDay() - 1;
        if (firstDayOfWeek === -1) firstDayOfWeek = 6;

        // Empty cells for previous month
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'year-day other-month';
            monthGrid.appendChild(emptyCell);
        }

        const today = getJSTNow();
        const isCurrentYear = today.getFullYear() === year;

        // Days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, monthIndex, day);
            const dayCell = document.createElement('div');
            dayCell.className = 'year-day';
            dayCell.textContent = day;

            // Highlight Today
            if (isCurrentYear && today.getMonth() === monthIndex && today.getDate() === day) {
                dayCell.classList.add('today');
            }

            // Check for events
            const dayEvents = events.filter(event => {
                const startDate = new Date(event.startDate);
                const endDate = new Date(event.endDate);
                // Simple check: is date within range?
                // Also handle excludeDates and specific weekdays if needed.
                // Reusing logic from renderEvents would be ideal but it's DOM bound.
                // Let's implement a simplified check for Year Mode.

                // Check if date is within range
                if (date < new Date(startDate.setHours(0, 0, 0, 0)) || date > new Date(endDate.setHours(0, 0, 0, 0))) {
                    return false;
                }

                // Check weekday
                if (event.weekday) {
                    const weekdayValue = parseInt(event.weekday);
                    if (!isNaN(weekdayValue)) {
                        const dayOfWeek = date.getDay();
                        const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
                        const isExcludeMode = weekdayValue < 0;
                        const absWeekday = Math.abs(weekdayValue);

                        if (isExcludeMode) {
                            if (adjustedDayOfWeek === absWeekday) return false;
                        } else {
                            // This is a simplification. The original logic handles string "1,2" etc. 
                            // But parseCSV only parses single number or string.
                            // Let's look at parseCSV... it returns weekday as string.
                            // renderEvents handles complex logic.
                            // For now, let's assume if weekday is present, we check it.
                            if (!event.weekday.includes(String(adjustedDayOfWeek))) return false;
                        }
                    }
                }

                // Check exclude dates
                const dateString = formatDate(date);
                if (event.excludeDates && event.excludeDates.includes(dateString)) {
                    return false;
                }

                // Check additional dates (if event is not in range but in additional dates)
                // Wait, the range check above might exclude valid additional dates.
                // Correct logic: (in range AND valid weekday AND not excluded) OR (in additional dates)

                // Let's refine:
                let isInRange = date >= new Date(event.startDate) && date <= new Date(event.endDate);
                // Re-evaluate range with setHours to be safe
                const dTime = date.getTime();
                const sTime = new Date(event.startDate).setHours(0, 0, 0, 0);
                const eTime = new Date(event.endDate).setHours(0, 0, 0, 0);
                isInRange = dTime >= sTime && dTime <= eTime;

                let isValidWeekday = true;
                if (event.weekday) {
                    const weekdayValue = parseInt(event.weekday);
                    if (!isNaN(weekdayValue)) {
                        const dayOfWeek = date.getDay();
                        const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
                        const isExcludeMode = weekdayValue < 0;
                        const absWeekday = Math.abs(weekdayValue);
                        if (isExcludeMode) {
                            if (adjustedDayOfWeek === absWeekday) isValidWeekday = false;
                        } else {
                            if (!event.weekday.includes(String(adjustedDayOfWeek))) isValidWeekday = false;
                        }
                    }
                }

                let isExcluded = false;
                if (event.excludeDates && event.excludeDates.includes(formatDate(date))) {
                    isExcluded = true;
                }

                let isAdditional = false;
                if (event.additionalDates && event.additionalDates.includes(formatDate(date))) {
                    isAdditional = true;
                }

                return (isInRange && isValidWeekday && !isExcluded) || isAdditional;
            });

            if (dayEvents.length > 0) {
                dayCell.classList.add('has-event');

                // Determine color class
                // Priority: biography (main) > other > schedule (wait, biography IS main/schedule)
                // Let's clarify:
                // 'main' = biography.csv (blue)
                // 'other' = other.csv (green)
                // 'syukujitsu' = holidays (red)
                // 'anniversary' = anniversary (red/purple)

                // User said: "Priority reference biography.csv events"
                // So if we have 'main' (biography), use blue.
                // If we have 'other', use green.

                const sources = new Set(dayEvents.map(e => e.source));
                if (sources.has('main')) {
                    dayCell.classList.add('event-schedule');
                    dayCell.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
                } else if (sources.has('other')) {
                    dayCell.classList.add('event-other');
                    dayCell.style.backgroundColor = '#43AA8B';
                } else if (sources.has('syukujitsu')) {
                    // Keep default or specific for holiday?
                    // Usually holidays are red text, but here we are doing background.
                    // Let's use light red for holiday if no other event?
                    // Or maybe ignore holiday background if not requested?
                    // The requirement was "biography.csv and other.csv".
                    // Holidays are from syukujitsu.csv.
                    // If we are in Year Mode, we load parseCSV (main+other).
                    // We don't load syukujitsu unless we explicitly call it.
                    // In my updateCalendar logic for Year Mode, I called parseCSV, parseAnniversary, parseOther.
                    // Wait, parseCSV calls parseOtherCSV internally?
                    // Let's check parseCSV.
                    // Yes, line 56: const otherEvents = await parseOtherCSV();
                    // So parseCSV returns main + other.
                    // So we have 'main' and 'other'.
                    // Priority: main > other.
                }

                // Tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = dayEvents.map(e => e.title).join('\n');
                dayCell.appendChild(tooltip);
            }

            monthGrid.appendChild(dayCell);
        }

        monthContainer.appendChild(monthGrid);
        calendarGrid.appendChild(monthContainer);
    });
}


// 解析 syukujitsu.csv 数据
async function parseSyukujitsuCSV() {
    try {
        const response = await fetch('../data/syukujitsu.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        const header = rows[0].split(',').map(col => col.trim());
        const dataStartIndex = 1;

        const events = rows.slice(dataStartIndex).map(row => {
            const columns = parseCSVRow(row);
            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }

            const date = eventData['Date'] ? parseJSTDate(eventData['Date']) : null;

            return {
                startDate: date,
                endDate: date,
                title: eventData['Name'] || '',
                url: '', // Holidays are not clickable
                id: Math.random().toString(36).substr(2, 9),
                source: 'syukujitsu'
            };
        }).filter(event => event.startDate && !isNaN(event.startDate.getTime()) && event.title);

        return events;
    } catch (error) {
        console.error('Error loading Syukujitsu CSV data:', error);
        return [];
    }
}

function updateNavigationButtons(year, month) {
    const prevButton = document.getElementById('prev-month');
    const nextButton = document.getElementById('next-month');
    const currentYear = getJSTYear();
    const minYear = 1992;
    const maxYear = currentYear + 3;

    // Check bounds for Previous button
    if (currentViewMode === 'year') {
        if (year <= minYear) {
            prevButton.disabled = true;
            prevButton.style.opacity = '0.5';
            prevButton.style.cursor = 'not-allowed';
        } else {
            prevButton.disabled = false;
            prevButton.style.opacity = '1';
            prevButton.style.cursor = 'pointer';
        }

        if (year >= maxYear) {
            nextButton.disabled = true;
            nextButton.style.opacity = '0.5';
            nextButton.style.cursor = 'not-allowed';
        } else {
            nextButton.disabled = false;
            nextButton.style.opacity = '1';
            nextButton.style.cursor = 'pointer';
        }
    } else {
        if (year <= minYear && month <= 0) {
            prevButton.disabled = true;
            prevButton.style.opacity = '0.5';
            prevButton.style.cursor = 'not-allowed';
        } else {
            prevButton.disabled = false;
            prevButton.style.opacity = '1';
            prevButton.style.cursor = 'pointer';
        }

        // Check bounds for Next button
        if (year >= maxYear && month >= 11) {
            nextButton.disabled = true;
            nextButton.style.opacity = '0.5';
            nextButton.style.cursor = 'not-allowed';
        } else {
            nextButton.disabled = false;
            nextButton.style.opacity = '1';
            nextButton.style.cursor = 'pointer';
        }
    }
}

async function initializeCalendar() {
    initializeSelectors();
    await updateCalendar();
}

function navigateMonth(direction) {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');

    let year = parseInt(yearSelect.value);
    let month = parseInt(monthSelect.value);

    if (currentViewMode === 'year') {
        if (direction === 'prev') {
            year--;
        } else if (direction === 'next') {
            year++;
        }
    } else {
        if (direction === 'prev') {
            month--;
            if (month < 0) {
                month = 11;
                year--;
            }
        } else if (direction === 'next') {
            month++;
            if (month > 11) {
                month = 0;
                year++;
            }
        }
    }

    yearSelect.value = year;
    monthSelect.value = month;

    updateCalendar();
}

/* 添加深色模式适配函数 */
function applyDarkModeToCalendar() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const root = document.documentElement;

    if (isDarkMode) {
        root.style.setProperty('--other-month-bg-color', '#333');
        root.style.setProperty('--other-month-text-color', '#666');
        root.style.setProperty('--calendar-grid-gap-color', '#444');
        root.style.setProperty('--calendar-border-color', '#444'); // 深色模式下的灰色边框
    } else {
        root.style.setProperty('--other-month-bg-color', '#f0f0f0');
        root.style.setProperty('--other-month-text-color', '#bbb');
        root.style.setProperty('--calendar-grid-gap-color', '#ffffff');
        root.style.setProperty('--calendar-border-color', '#ffffff'); // 浅色模式下的白色边框
    }
}

// 在文件末尾添加以下代码
document.addEventListener('DOMContentLoaded', function () {
    // 恢复body可见性
    document.body.style.visibility = 'visible';
});

document.addEventListener('DOMContentLoaded', async function () {
    // 使用 navHighlight.js 中的函数加载导航栏
    await initializeCalendar();

    // 添加深色模式适配代码
    applyDarkModeToCalendar();

    // 监听深色模式变化
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.attributeName === 'class') {
                applyDarkModeToCalendar();
            }
        });
    });

    observer.observe(document.body, { attributes: true });

    document.getElementById('prev-month').addEventListener('click', () => navigateMonth('prev'));
    document.getElementById('next-month').addEventListener('click', () => navigateMonth('next'));

    document.getElementById('today-button').addEventListener('click', () => {
        const today = getJSTNow();
        document.getElementById('year-select').value = today.getFullYear();
        document.getElementById('month-select').value = today.getMonth();
        updateCalendar();
    });

    const viewModeSelect = document.getElementById('view-mode-select');
    viewModeSelect.addEventListener('change', (e) => {
        currentViewMode = e.target.value;
        updateCalendar();
    });
});
