const CHARACTER_BIRTHDAYS = [
    { name: '乃木憂助', month: 0, day: 25, startYear: 2024, url: 'https://h2col.notion.site/1b68a08476c780e78f0fe8e8e8441e1b' },
    { name: '伊達一義', month: 5, day: 29, startYear: 2011, url: 'https://h2col.notion.site/1b68a08476c780caa667e03f4ffdffb8' },
    { name: '木村一樹', month: 9, day: 11, startYear: 2008, url: 'https://h2col.notion.site/1b68a08476c78015ab14f23054250d11' },
    { name: '半沢直樹', month: 11, day: 8, startYear: 2013, url: 'https://h2col.notion.site/1b68a08476c7804dba68d1ae0ae9e9cc' }
];

let currentViewMode = 'schedule'; // 'schedule', 'anniversary', 'year'

async function parseCSV() {
    try {
        // 加载主数据文件 - 从 biography.csv 读取
        const response = await fetch('/data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());

        if (rows.length < 2) return []; // Need at least header and one data row

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

        const events = rows.slice(1).map(row => {
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

            if (cols.length < header.length) return null;

            // Build eventData object with named properties
            const eventData = {};
            for (let i = 0; i < header.length && i < cols.length; i++) {
                eventData[header[i]] = cols[i] ? cols[i].trim() : '';
            }

            // 处理排除日期 - 使用 DateDelete 列，转换为标准格式
            let excludeDates = [];
            if (eventData['DateDelete'] && eventData['DateDelete'].trim() !== '') {
                excludeDates = eventData['DateDelete'].split(',')
                    .map(date => date.trim())
                    .map(dateStr => {
                        const parsedDate = parseJSTDate(dateStr);
                        return parsedDate ? formatDate(parsedDate) : null;
                    })
                    .filter(date => date !== null);
            }

            // 处理DateAdd列的日期，转换为标准格式
            let additionalDates = [];
            if (eventData['DateAdd'] && eventData['DateAdd'].trim() !== '') {
                additionalDates = eventData['DateAdd'].split(',')
                    .map(date => date.trim())
                    .map(dateStr => {
                        const parsedDate = parseJSTDate(dateStr);
                        return parsedDate ? formatDate(parsedDate) : null;
                    })
                    .filter(date => date !== null);
            }

            const startDate = parseJSTDate(eventData['DateStart']);
            if (!startDate) return null;

            return {
                startDate: startDate,
                endDate: eventData['DateEnd'] ? parseJSTDate(eventData['DateEnd']) : startDate,
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#',
                id: Math.random().toString(36).substr(2, 9),
                weekday: eventData['Weekday'] || '',
                excludeDates: excludeDates,
                additionalDates: additionalDates,
                source: 'main'
            };
        }).filter(event => event && event.title);

        // 加载other.csv数据
        const otherEvents = await parseOtherCSV();

        // 合并两个数据源的事件
        return [...events, ...otherEvents];
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
}

// 解析 biography.csv 中的所有数据用于计算周年纪念
async function parseAnniversaryCSV() {
    try {
        const response = await fetch('/data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());

        if (rows.length < 2) return []; // Need at least header and one data row

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

        const events = rows.slice(1).map(row => {
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

            if (cols.length < header.length) return null;

            // Build eventData object with named properties
            const eventData = {};
            for (let i = 0; i < header.length && i < cols.length; i++) {
                eventData[header[i]] = cols[i] ? cols[i].trim() : '';
            }

            const startDate = parseJSTDate(eventData['DateStart']);
            if (!startDate) return null;

            return {
                startDate: startDate,
                endDate: eventData['DateEnd'] ? parseJSTDate(eventData['DateEnd']) : startDate,
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#',
                id: Math.random().toString(36).substr(2, 9),
                source: 'anniversary'
            };
        }).filter(event => event && event.title);

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
            if (date.getUTCFullYear() === targetYear && date.getUTCMonth() === targetMonth) {
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
        const startYearsDiff = targetYear - startDate.getUTCFullYear();
        if (startYearsDiff > 0) {
            const annDate = new Date(startDate);
            annDate.setUTCFullYear(targetYear);
            addEvent(annDate, `${event.title} (${startYearsDiff}周年)`, 'rgba(231, 76, 60, 0.8)');
        }

        if (!isSingleDay) {
            const endYearsDiff = targetYear - endDate.getUTCFullYear();
            if (endYearsDiff > 0) {
                const annDate = new Date(endDate);
                annDate.setUTCFullYear(targetYear);
                addEvent(annDate, `${event.title} 終了 (${endYearsDiff}周年)`, 'rgba(231, 76, 60, 0.8)');
            }
        }

        // 2. Day-count Anniversary (100, 200, ..., 1000, 2000, ...)
        const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const currentDay = new Date(Date.UTC(targetYear, targetMonth, d));

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
        const response = await fetch('/data/other.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());

        if (rows.length < 2) return []; // Need at least header and one data row

        const header = parseCSVRow(rows[0]).map(col => col.trim());

        const events = rows.slice(1).map(row => {
            const columns = parseCSVRow(row);
            if (columns.length === 0) return null;

            // 使用表头作为键来解析数据
            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }

            // 从Date字段获取日期
            const date = eventData['Date'] ? parseJSTDate(eventData['Date']) : null;
            if (!date) return null;

            return {
                startDate: date,
                endDate: date, // 单日事件，开始和结束日期相同
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#',
                id: Math.random().toString(36).substr(2, 9),
                source: 'other' // 标记数据来源为other.csv
            };
        }).filter(event => event && event.title);

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

    const firstDay = createJSTDate(year, month, 1);
    const lastDay = createJSTDate(year, month + 1, 0);

    // 获取第一天是星期几（0是星期一，6是星期日）
    const firstDayOfWeek = (firstDay.getUTCDay() + 6) % 7; // 将星期天(0)转换为6，其他日期-1

    const prevMonthLastDay = createJSTDate(year, month, 0).getUTCDate();
    const today = getJSTNow();
    const isCurrentMonth = today.getUTCFullYear() === year && today.getUTCMonth() === month;

    for (let i = 0; i < firstDayOfWeek; i++) {
        const day = prevMonthLastDay - firstDayOfWeek + i + 1;
        const date = createJSTDate(year, month - 1, day);
        const dayElement = createDayElement(day, date, true);
        calendarGrid.appendChild(dayElement);
    }

    for (let day = 1; day <= lastDay.getUTCDate(); day++) {
        const date = createJSTDate(year, month, day);
        const isToday = isCurrentMonth && today.getUTCDate() === day;
        const dayElement = createDayElement(day, date, false, isToday);
        calendarGrid.appendChild(dayElement);
    }

    const totalDaysDisplayed = firstDayOfWeek + lastDay.getUTCDate();
    // 计算需要的行数：如果总天数<=35则5行，否则6行
    const totalCells = totalDaysDisplayed <= 35 ? 35 : 42;
    const remainingCells = totalCells - totalDaysDisplayed;

    for (let day = 1; day <= remainingCells; day++) {
        const date = createJSTDate(year, month + 1, day);
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
    const firstDay = new Date(Date.UTC(year, month, 1));
    const firstDayOfWeek = (firstDay.getUTCDay() + 6) % 7;

    events.forEach(event => {
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);

        // 处理Add列中的额外日期
        if (event.additionalDates && event.additionalDates.length > 0) {
            event.additionalDates.forEach(formattedDateStr => {
                // additionalDates 现在已经是格式化的日期字符串 (YYYY-MM-DD)
                const additionalDate = parseJSTDate(formattedDateStr);
                // 检查额外日期是否在当前月份
                if (additionalDate && additionalDate.getUTCFullYear() === year && additionalDate.getUTCMonth() === month) {
                    const dayIndex = additionalDate.getUTCDate() + firstDayOfWeek - 1;
                    if (dayIndex >= 0 && dayIndex < dayElements.length) {
                        const dayElement = dayElements[dayIndex];

                        // 创建 Bento 的包装容器
                        const bentoContainer = document.createElement('a');
                        bentoContainer.href = event.url;
                        bentoContainer.target = '_blank';
                        bentoContainer.classList.add('bento-container');
                        bentoContainer.style.backgroundColor = 'rgba(52, 152, 219, 0.8)'; // 蓝色背景，区分额外日期

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

        const monthStart = createJSTDate(year, month, 1);
        const monthEnd = createJSTDate(year, month + 1, 0);

        if (endDate < monthStart || startDate > monthEnd) {
            return;
        }

        const displayStart = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
        const displayEnd = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));

        // 设置事件背景色
        let backgroundColor = 'rgba(52, 152, 219, 0.8)'; // 默认蓝色背景

        // 根据事件来源设置不同的背景色
        if (event.source === 'sakai-birthday') {
            backgroundColor = 'rgba(46, 204, 113, 0.8)'; // 绿色背景
        } else if (event.source === 'character-birthday') {
            backgroundColor = 'rgba(241, 196, 15, 0.8)'; // 黄色背景
        } else if (event.source === 'other') {
            backgroundColor = '#43AA8B';
        } else if (event.source === 'anniversary') {
            backgroundColor = event.color || 'rgba(231, 76, 60, 0.8)';
        } else if (event.source === 'syukujitsu') {
            backgroundColor = '#FFD1D1'; // 浅红色背景
        }

        // 检查 weekday 是否为数字（包括负数）
        const weekdayValue = parseInt(event.weekday);
        const isNumericWeekday = event.weekday && !isNaN(weekdayValue) && event.weekday.trim() !== '';

        // 如果有指定星期几且为数字，则只在特定星期几显示
        if (isNumericWeekday) {
            // weekday 是数字，执行星期过滤逻辑
            // 获取当月的所有日期
            const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(Date.UTC(year, month, day));
                // 获取星期几 (0-6，0是星期日)
                const dayOfWeek = date.getUTCDay();
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
                // Use UTC time comparison for JST consistency
                const dateTime = date.getTime();
                const startTime = startDate.getTime();
                const endTime = endDate.getTime();

                if (dateTime >= startTime && dateTime <= endTime && shouldDisplay && !isExcludedDate) {
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
            const startIndex = displayStart.getUTCDate() + firstDayOfWeek - 1;
            const endIndex = displayEnd.getUTCDate() + firstDayOfWeek - 1;

            for (let i = startIndex; i <= endIndex && i < dayElements.length; i++) {
                const dayElement = dayElements[i];
                const currentDate = createJSTDate(year, month, i - firstDayOfWeek + 1);
                const dateString = formatJSTDate(currentDate); // 使用统一的日期格式化函数

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

// formatDate is now defined in jst-utils.js


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
    const currentYear = getJSTYear();

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

    let events = await parseCSV();

    if (currentViewMode !== 'year') {
        const specialBirthdays = CHARACTER_BIRTHDAYS
            .filter(bday => year >= bday.startYear)
            .map(bday => ({
                startDate: createJSTDate(year, bday.month, bday.day),
                endDate: createJSTDate(year, bday.month, bday.day),
                title: `${bday.name}の誕生日`,
                source: 'character-birthday',
                url: bday.url
            }));

        specialBirthdays.push({
            startDate: createJSTDate(year, 9, 14),
            endDate: createJSTDate(year, 9, 14),
            title: '堺さんの誕生日 🎂',
            source: 'sakai-birthday',
            url: 'https://sakai-masato.com/'
        });

        events = [...events, ...specialBirthdays];
    }

    if (currentViewMode === 'year') {
        document.getElementById('calendar-title').textContent = `${year}年`;
        generateYearCalendar(year, events);
    } else if (currentViewMode === 'anniversary') {
        // Anniversary mode: biography.csv + other.csv + calculated anniversaries
        const rawAnniversaryEvents = await parseAnniversaryCSV();
        const anniversaryEvents = calculateAnniversaries(rawAnniversaryEvents, year, month);
        events = [...events, ...anniversaryEvents];
        document.getElementById('calendar-title').textContent = `${year}年${month + 1}月 (Anniversary)`;
        generateCalendar(year, month, events);
    } else {
        // Schedule mode: biography.csv + other.csv + syukujitsu.csv
        const holidayEvents = await parseSyukujitsuCSV();
        events = [...events, ...holidayEvents];
        document.getElementById('calendar-title').textContent = `${year}年${month + 1}月`;
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
        const firstDay = createJSTDate(year, monthIndex, 1);
        const lastDay = createJSTDate(year, monthIndex + 1, 0);

        // Monday start (0 is Monday, 6 is Sunday)
        let firstDayOfWeek = firstDay.getUTCDay() - 1;
        if (firstDayOfWeek === -1) firstDayOfWeek = 6;

        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'year-day other-month';
            monthGrid.appendChild(emptyCell);
        }

        const today = getJSTNow();
        const isCurrentYear = today.getUTCFullYear() === year;

        // Days of the month
        for (let day = 1; day <= lastDay.getUTCDate(); day++) {
            const date = createJSTDate(year, monthIndex, day);
            const dayCell = document.createElement('div');
            dayCell.className = 'year-day';
            dayCell.textContent = day;

            // Highlight Today using JST comparison
            if (isJSTToday(date)) {
                dayCell.classList.add('today');
            }

            // Check for events
            const dayEvents = events.filter(event => {
                const startDate = event.startDate;
                const endDate = event.endDate;

                // Use consistent JST date comparison
                const dateTime = date.getTime();
                const startTime = startDate.getTime();
                const endTime = endDate.getTime();

                // Check if date is within range
                let isInRange = dateTime >= startTime && dateTime <= endTime;

                // Check weekday filter
                let isValidWeekday = true;
                if (event.weekday) {
                    const weekdayValue = parseInt(event.weekday);
                    if (!isNaN(weekdayValue)) {
                        const dayOfWeek = date.getUTCDay();
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

                // Check exclude dates
                let isExcluded = false;
                const dateString = formatJSTDate(date);
                if (event.excludeDates && event.excludeDates.includes(dateString)) {
                    isExcluded = true;
                }

                // Check additional dates
                let isAdditional = false;
                if (event.additionalDates && event.additionalDates.includes(dateString)) {
                    isAdditional = true;
                }

                return (isInRange && isValidWeekday && !isExcluded) || isAdditional;
            });

            if (dayEvents.length > 0) {
                dayCell.classList.add('has-event');

                // Determine color class
                const sources = new Set(dayEvents.map(e => e.source));
                if (sources.has('sakai-birthday')) {
                    dayCell.style.backgroundColor = 'rgba(46, 204, 113, 0.8)'; // Green
                } else if (sources.has('character-birthday')) {
                    dayCell.style.backgroundColor = 'rgba(241, 196, 15, 0.8)'; // Yellow
                } else if (sources.has('main')) {
                    dayCell.classList.add('event-schedule');
                    dayCell.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
                } else if (sources.has('other')) {
                    dayCell.classList.add('event-other');
                    dayCell.style.backgroundColor = '#43AA8B';
                }
                else if (sources.has('syukujitsu')) {
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
        const response = await fetch('/data/syukujitsu.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());

        if (rows.length < 2) return []; // Need at least header and one data row

        const header = parseCSVRow(rows[0]).map(col => col.trim());

        const events = rows.slice(1).map(row => {
            const columns = parseCSVRow(row);
            if (columns.length === 0) return null;

            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }

            const date = eventData['Date'] ? parseJSTDate(eventData['Date']) : null;
            if (!date) return null;

            return {
                startDate: date,
                endDate: date,
                title: eventData['Name'] || '',
                url: '', // Holidays are not clickable
                id: Math.random().toString(36).substr(2, 9),
                source: 'syukujitsu'
            };
        }).filter(event => event && event.title);

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
        document.getElementById('year-select').value = today.getUTCFullYear();
        document.getElementById('month-select').value = today.getUTCMonth();
        updateCalendar();
    });

    const viewModeSelect = document.getElementById('view-mode-select');
    viewModeSelect.addEventListener('change', (e) => {
        currentViewMode = e.target.value;
        updateCalendar();
    });
});
