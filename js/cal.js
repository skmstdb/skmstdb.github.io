// 解析CSV数据
async function parseCSV() {
    try {
        const response = await fetch('../data/worksdata.csv');
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        const header = rows[0].split(',').map(col => col.trim()); // 获取表头
        const dataStartIndex = 1; // 数据起始行索引

        const events = rows.slice(dataStartIndex).map(row => {
            const columns = row.split(',').map(col => col.trim());
            // 使用表头作为键来解析数据
            const eventData = {};
            for (let i = 0; i < header.length; i++) {
                eventData[header[i]] = columns[i];
            }

            return {
                startDate: new Date(eventData['DateStart']),
                endDate: eventData['DateEnd'] ? new Date(eventData['DateEnd']) : new Date(eventData['DateStart']),
                title: eventData['Title'],
                url: eventData['URL'] || '#',
                id: Math.random().toString(36).substr(2, 9),
                weekday: eventData['Weekday'] || '' // 添加星期几属性
            };
        }).filter(event => !isNaN(event.startDate.getTime()) && event.title);

        return events;
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
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
            birthdayContainer.href = 'https://h2col.notion.site/Sakai-Masato-Database-1a88a08476c78096abe6c40b9c9c9bb7'; // 添加Notion链接
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

        if (endDate < new Date(year, month, 1) || startDate > new Date(year, month + 1, 0)) {
            return;
        }

        const displayStart = new Date(Math.max(startDate, new Date(year, month, 1)));
        const displayEnd = new Date(Math.min(endDate, new Date(year, month + 1, 0)));

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
                
                // 检查日期是否在事件范围内且应该显示
                if (date >= startDate && date <= endDate && shouldDisplay) {
                    const dayIndex = day + firstDayOfWeek - 1;
                    if (dayIndex >= 0 && dayIndex < dayElements.length) {
                        const dayElement = dayElements[dayIndex];
                        
                        // 创建 Bento 的包装容器
                        const bentoContainer = document.createElement('a');
                        bentoContainer.href = event.url;
                        bentoContainer.target = '_blank';
                        bentoContainer.classList.add('bento-container');
                        
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

                // 创建 Bento 的包装容器
                const bentoContainer = document.createElement('a');
                bentoContainer.href = event.url;
                bentoContainer.target = '_blank';
                bentoContainer.classList.add('bento-container');

                // 创建 Bento 项目
                const bentoItem = document.createElement('div');
                bentoItem.classList.add('bento-item');
                bentoItem.textContent = event.title;
                bentoContainer.appendChild(bentoItem);

                //将bento容器添加到日历
                dayElement.appendChild(bentoContainer);
            }
        }
    });
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
