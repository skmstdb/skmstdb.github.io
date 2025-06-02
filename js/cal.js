// 解析CSV数据
async function parseCSV() {
    try {
        // 加载主数据文件
        const response = await fetch('../data/worksdata.csv');
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

            // 处理排除日期
            let excludeDates = [];
            if (eventData['Date'] && eventData['Date'].trim() !== '') {
                excludeDates = eventData['Date'].split(',').map(date => date.trim());
                console.log('Event:', eventData['Title'], 'Exclude dates:', excludeDates); // 调试信息
            }
            
            // 处理Add列的日期
            let additionalDates = [];
            if (eventData['Add'] && eventData['Add'].trim() !== '') {
                additionalDates = eventData['Add'].split(',').map(date => date.trim());
                console.log('Event:', eventData['Title'], 'Additional dates:', additionalDates); // 调试信息
            }

            return {
                startDate: new Date(eventData['DateStart']),
                endDate: eventData['DateEnd'] ? new Date(eventData['DateEnd']) : new Date(eventData['DateStart']),
                title: eventData['Title'] || '',
                url: eventData['URL'] ? eventData['URL'].trim() : '#', // 确保URL被正确处理
                id: Math.random().toString(36).substr(2, 9),
                weekday: eventData['Weekday'] || '', // 添加星期几属性
                excludeDates: excludeDates, // 添加需要排除的日期
                additionalDates: additionalDates, // 添加Add列中的额外日期
                source: 'main' // 标记数据来源
            };
        }).filter(event => !isNaN(event.startDate.getTime()) && event.title);

        // 加载other.csv数据
        const otherEvents = await parseOtherCSV();
        
        // 合并两个数据源的事件
        return [...events, ...otherEvents];
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
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
            const date = eventData['Date'] ? new Date(eventData['Date']) : null;
            
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
    const today = new Date();
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

// 更新renderEvents函数，根据事件来源设置不同的背景色
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

        // 设置事件背景色
        let backgroundColor = 'rgba(52, 152, 219, 0.8)'; // 默认蓝色背景
        
        // 根据事件来源设置不同的背景色
        if (event.source === 'other') {
            backgroundColor = '#43AA8B'; 
        }

        // 如果有指定星期几，则只在特定星期几显示
        if (event.weekday) {
            // 获取当月的所有日期
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                // 获取星期几 (0-6，0是星期日)
                const dayOfWeek = date.getDay();
                // 将星期日的0转换为7，使1-7分别对应周一到周日
                const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
                
                // 检查是否为负数（排除模式）
                const weekdayValue = parseInt(event.weekday);
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
                        const bentoContainer = document.createElement('a');
                        bentoContainer.href = event.url;
                        bentoContainer.target = '_blank';
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
            // 原有的处理逻辑，对于没有指定星期几的事件
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
                    const bentoContainer = document.createElement('a');
                    bentoContainer.href = event.url;
                    bentoContainer.target = '_blank';
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

// 统一的日期格式化函数，确保格式一致
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    monthSelect.value = new Date().getMonth();

    yearSelect.addEventListener('change', updateCalendar);
    monthSelect.addEventListener('change', updateCalendar);
}

async function updateCalendar() {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);

    const events = await parseCSV();
    generateCalendar(year, month, events);
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
document.addEventListener('DOMContentLoaded', function() {
    // 恢复body可见性
    document.body.style.visibility = 'visible';
});

document.addEventListener('DOMContentLoaded', async function () {
    // 使用 navHighlight.js 中的函数加载导航栏
    await initializeCalendar();
    
    // 添加深色模式适配代码
    applyDarkModeToCalendar();
    
    // 监听深色模式变化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                applyDarkModeToCalendar();
            }
        });
    });
    
    observer.observe(document.body, { attributes: true });

    document.getElementById('prev-month').addEventListener('click', () => navigateMonth('prev'));
    document.getElementById('next-month').addEventListener('click', () => navigateMonth('next'));

    document.getElementById('today-button').addEventListener('click', () => {
        const today = new Date();
        document.getElementById('year-select').value = today.getFullYear();
        document.getElementById('month-select').value = today.getMonth();
        updateCalendar();
    });
});
