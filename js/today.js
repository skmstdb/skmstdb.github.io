// 格式化日期为本地字符串
function formatDate(date) {
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// 解析CSV数据
async function parseCSV() {
    try {
        const response = await fetch('/data/data.csv');
        const data = await response.text();
        
        // 使用更可靠的CSV解析方法
        const rows = data.split('\n').filter(row => row.trim());
        const header = rows[0].split(',').map(col => col.trim()); // 获取表头
        
        return rows.slice(1).map(row => {
            // 使用更可靠的方式来分割CSV行，考虑引号内的逗号
            const columns = processCSVRow(row);
            
            // 使用表头作为键来解析数据
            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }
            
            return {
                startDate: eventData[header[0]] ? new Date(eventData[header[0]]) : null,
                endDate: eventData[header[1]] ? new Date(eventData[header[1]]) : null,
                title: eventData[header[2]] || '',
                url: eventData[header[3]] || '#'
            };
        }).filter(event => 
            (event.startDate && !isNaN(event.startDate.getTime())) || 
            (event.endDate && !isNaN(event.endDate.getTime()))
        );
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
}

// 处理CSV行，考虑引号内的逗号
function processCSVRow(row) {
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

// 检查日期是否匹配今天（只比较月和日）
function isDateMatchingToday(date, today) {
    if (!date) return false;
    return date.getMonth() === today.getMonth() && 
           date.getDate() === today.getDate();
}

// 计算周年数
function calculateAnniversary(date, today) {
    return today.getFullYear() - date.getFullYear();
}

// 获取星期几的日语表示
function getJapaneseWeekday(date) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getDay()];
}

// 创建日期导航
function createDateNavigation() {
    const today = new Date();
    const dateNavigation = document.getElementById('date-navigation');
    let navigationHTML = '';
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const day = date.getDate();
        const weekday = getJapaneseWeekday(date);
        const isActive = i === 0 ? 'active' : '';
        
        navigationHTML += `
        <div class="date-item ${isActive}" data-date="${date.toISOString()}" onclick="changeDate(this)">
            <div class="date-day">${day}</div>
            <div class="date-weekday">${weekday}</div>
        </div>
        `;
    }
    
    dateNavigation.innerHTML = navigationHTML;
}

// 切换日期
function changeDate(element) {
    // 移除所有active类
    document.querySelectorAll('.date-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 添加active类到当前元素
    element.classList.add('active');
    
    // 获取选中的日期
    const selectedDate = new Date(element.getAttribute('data-date'));
    
    // 更新显示
    loadEventsForDate(selectedDate);
}

// 為指定日期加載事件
async function loadEventsForDate(selectedDate) {
    const container = document.getElementById('today-container');
    const currentDateElement = document.getElementById('current-date');
    
    // 顯示選中日期
    currentDateElement.textContent = formatDate(selectedDate);
    
    // 檢查是否是堺雅人的生日（10月14日）
    const isBirthday = selectedDate.getMonth() === 9 && selectedDate.getDate() === 14; // 月份從0開始，所以10月是9
    
    const events = await parseCSV();
    const dateEvents = events.filter(event => 
        isDateMatchingToday(event.startDate, selectedDate) || 
        isDateMatchingToday(event.endDate, selectedDate)
    );
    
    // 如果是生日，添加生日祝福
    if (isBirthday) {
        const age = selectedDate.getFullYear() - 1973;
        const birthdayHTML = `
        <div class="today-item" onclick="window.open('https://sakai-masato.com/', '_blank')">
            <div class="today-title">堺さん、${age}歳のお誕生日おめでとうございます！！</div>
        </div>
        `;
        
        // 查找即将开始或结束的事件
        const upcomingEventsHTML = getUpcomingEventsHTML(events, selectedDate);
        
        if (dateEvents.length === 0) {
            container.innerHTML = birthdayHTML + upcomingEventsHTML;
        } else {
            container.innerHTML = birthdayHTML + upcomingEventsHTML + createEventsHTML(dateEvents, selectedDate);
        }
        return;
    }
    
    // 計算距離下一個生日的天數
    const nextBirthday = new Date(selectedDate.getFullYear(), 9, 14); // 10月14日
    if (selectedDate > nextBirthday) {
        nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    }
    const daysUntilBirthday = Math.ceil((nextBirthday - selectedDate) / (1000 * 60 * 60 * 24));
    const nextAge = nextBirthday.getFullYear() - 1973;
    
    const birthdayCountdownHTML = `
    <div class="today-item" onclick="window.open('https://sakai-masato.com/', '_blank')">
        <div class="today-title">${nextAge}歳の誕生日まであと${daysUntilBirthday}日</div>
    </div>
    `;
    
    // 查找即将开始或结束的事件
    const upcomingEventsHTML = getUpcomingEventsHTML(events, selectedDate);
    
    if (dateEvents.length === 0) {
        container.innerHTML = birthdayCountdownHTML + upcomingEventsHTML;
        return;
    }
    
    container.innerHTML = birthdayCountdownHTML + upcomingEventsHTML + createEventsHTML(dateEvents, selectedDate);
}

// 获取即将开始或结束的事件HTML
function getUpcomingEventsHTML(events, selectedDate) {
    let upcomingHTML = '';
    
    // 筛选出开始日期或结束日期在今天之后的事件
    const upcomingEvents = events.filter(event => {
        // 跳过没有日期的事件
        if (!event.startDate || !event.endDate) return false;
        
        // 检查开始日期是否在今天之后
        const isStartAfterToday = event.startDate > selectedDate;
        
        // 检查结束日期是否在今天之后且不是开始日期当天
        const isEndAfterToday = event.endDate > selectedDate && 
                               !isDateMatchingToday(event.startDate, selectedDate);
        
        return isStartAfterToday || isEndAfterToday;
    });
    
    // 按日期排序（先显示最近的事件）
    upcomingEvents.sort((a, b) => {
        // 如果a的开始日期在今天之后，使用开始日期
        const dateA = a.startDate > selectedDate ? a.startDate : a.endDate;
        // 如果b的开始日期在今天之后，使用开始日期
        const dateB = b.startDate > selectedDate ? b.startDate : b.endDate;
        
        return dateA - dateB;
    });
    
    // 最多显示3个即将到来的事件
    const eventsToShow = upcomingEvents.slice(0, 100);
    
    for (const event of eventsToShow) {
        // 如果开始日期在今天之后且不是开始日期当天
        if (event.startDate > selectedDate && !isDateMatchingToday(event.startDate, selectedDate)) {
            // 计算距离开始日期的天数
            const daysUntilStart = Math.ceil((event.startDate - selectedDate) / (1000 * 60 * 60 * 24));
            upcomingHTML += `
            <div class="today-item" onclick="window.open('${event.url}', '_blank')">
                <div class="today-title">『 ${event.title} 』の公開まであと${daysUntilStart}日</div>
            </div>
            `;
        }
        // 如果今天在开始日期之后但在结束日期之前，且不是结束日期当天
        else if (selectedDate >= event.startDate && event.endDate > selectedDate && 
                !isDateMatchingToday(event.endDate, selectedDate)) {
            // 计算距离结束日期的天数
            const daysUntilEnd = Math.ceil((event.endDate - selectedDate) / (1000 * 60 * 60 * 24));
            upcomingHTML += `
            <div class="today-item" onclick="window.open('${event.url}', '_blank')">
                <div class="today-title">『 ${event.title} 』の完結まであと${daysUntilEnd}日</div>
            </div>
            `;
        }
    }
    
    return upcomingHTML;
}

// 创建事件HTML的辅助函数
function createEventsHTML(events, selectedDate) {
    return events.map(event => {
        const isStartDate = isDateMatchingToday(event.startDate, selectedDate);
        const date = isStartDate ? event.startDate : event.endDate;
        const anniversary = calculateAnniversary(date, selectedDate);
        const dateText = formatDate(date);
        
        const anniversaryText = anniversary === 0 ? 'Premiere' : `${anniversary}周年`;
        
        return `
        <div class="today-item" onclick="window.open('${event.url}', '_blank')">
            <div class="today-title">${event.title}</div>
            <div class="today-anniversary">${anniversaryText}</div>
            <div class="today-date">${dateText} ${isStartDate ? '公開' : '終了'}</div>
        </div>
        `;
    }).join('');
}

// 加载今日事件
async function loadTodayEvents() {
    const today = new Date();
    
    // 检查是否为移动设备
    const isMobile = window.innerWidth <= 767;
    
    // 在电脑端创建日期导航，移动端不创建
    if (!isMobile) {
        createDateNavigation();
    }
    
    // 加载今天的事件
    loadEventsForDate(today);
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    // 监听窗口大小变化，以便在调整窗口大小时更新界面
    window.addEventListener('resize', function() {
        const isMobile = window.innerWidth <= 767;
        const dateNavigation = document.getElementById('date-navigation');
        
        if (isMobile) {
            dateNavigation.style.display = 'none';
            // 在移动设备上，始终显示今天的内容
            loadEventsForDate(new Date());
        } else {
            dateNavigation.style.display = 'flex';
        }
    });
    
    loadTodayEvents();
});

