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
                url: eventData[header[3]] || '#',
                weekday: eventData[header[4]] ? eventData[header[4]].trim() : ''
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

// 获取英文星期对应的数字 (0-6, Sunday-Saturday)
function getWeekdayNumber(weekdayName) {
    const weekdays = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
    };
    return weekdays[weekdayName.toLowerCase()];
}

// 检查日期是否匹配weekday
function isMatchingWeekday(date, weekdayName) {
    const weekdayNum = getWeekdayNumber(weekdayName);
    return weekdayNum !== undefined && date.getDay() === weekdayNum;
}

// 计算两个日期之间的天数差
function getDaysDifference(date1, date2) {
    const timeDiff = Math.abs(date2 - date1);
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

// 获取合适的整数倍（100/1000/10000）
function getMilestoneInterval(days) {
    if (days >= 10000) return 10000;
    if (days >= 1000) return 1000;
    return 100;
}

// 检查是否是整数倍纪念日
function checkMilestone(date, selectedDate) {
    const days = getDaysDifference(date, selectedDate);
    if (days === 0) return null;
    
    const interval = getMilestoneInterval(days);
    if (days % interval === 0) {
        return { days, interval };
    }
    return null;
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

// 检查两个日期是否是同一天
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 為指定日期加載事件
async function loadEventsForDate(selectedDate) {
    const container = document.getElementById('today-container');
    const currentDateElement = document.getElementById('current-date');
    const today = new Date(); // 获取真正的今天
    
    // 顯示選中日期
    currentDateElement.textContent = formatDate(selectedDate);
    
    const events = await parseCSV();
    
    // 筛选匹配的事件
    const dateEvents = [];
    
    for (const event of events) {
        let matchType = null;
        let milestone = null;
        
        // 1. 检查是否是开始或结束日期当天
        if (isDateMatchingToday(event.startDate, selectedDate)) {
            matchType = 'start';
        } else if (isDateMatchingToday(event.endDate, selectedDate)) {
            matchType = 'end';
        }
        // 2. 检查weekday规则
        else if (event.weekday) {
            const weekdayLower = event.weekday.toLowerCase();
            
            // 2.1 weekday为Film的情况
            if (weekdayLower === 'film') {
                // 检查是否在开始后60天内
                if (event.startDate && selectedDate >= event.startDate) {
                    const daysSinceStart = getDaysDifference(event.startDate, selectedDate);
                    if (daysSinceStart <= 60) {
                        matchType = 'film';
                    }
                }
            }
            // 2.2 weekday为星期名称的情况
            else if (getWeekdayNumber(weekdayLower) !== undefined) {
                // 只在DateStart到DateEnd范围内的对应星期数显示
                if (event.startDate && event.endDate && 
                    selectedDate >= event.startDate && 
                    selectedDate <= event.endDate &&
                    isMatchingWeekday(selectedDate, weekdayLower)) {
                    matchType = 'weekday';
                }
            }
        }
        // 3. 检查整数倍天数纪念日
        if (!matchType) {
            if (event.startDate) {
                const startMilestone = checkMilestone(event.startDate, selectedDate);
                if (startMilestone && selectedDate > event.startDate) {
                    matchType = 'milestone-start';
                    milestone = startMilestone;
                }
            }
            if (!matchType && event.endDate) {
                const endMilestone = checkMilestone(event.endDate, selectedDate);
                if (endMilestone && selectedDate > event.endDate) {
                    matchType = 'milestone-end';
                    milestone = endMilestone;
                }
            }
        }
        
        if (matchType) {
            dateEvents.push({ ...event, matchType, milestone });
        }
    }
    
    let htmlContent = '';
    
    // 只在今天（真正的当前日期）显示生日检查和即将开始/结束的事件
    if (isSameDay(selectedDate, today)) {
        // 檢查是否是堺雅人的生日（10月14日）
        const isBirthday = selectedDate.getMonth() === 9 && selectedDate.getDate() === 14; // 月份從0開始，所以10月是9
        
        // 如果是生日，添加生日祝福
        if (isBirthday) {
            const age = selectedDate.getFullYear() - 1973;
            htmlContent += `
            <div class="today-item" onclick="window.open('https://sakai-masato.com/', '_blank')">
                <div class="today-title">堺さん、${age}歳のお誕生日おめでとうございます！！</div>
            </div>
            `;
        } else {
            // 計算距離下一個生日的天數
            const nextBirthday = new Date(selectedDate.getFullYear(), 9, 14); // 10月14日
            if (selectedDate > nextBirthday) {
                nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
            }
            const daysUntilBirthday = Math.ceil((nextBirthday - selectedDate) / (1000 * 60 * 60 * 24));
            const nextAge = nextBirthday.getFullYear() - 1973;
            
            htmlContent += `
            <div class="today-item" onclick="window.open('https://sakai-masato.com/', '_blank')">
                <div class="today-title">${nextAge}歳の誕生日まであと${daysUntilBirthday}日</div>
            </div>
            `;
        }
        
        // 查找即将开始或结束的事件
        htmlContent += getUpcomingEventsHTML(events, selectedDate);
    }
    
    // 添加当天的事件
    if (dateEvents.length > 0) {
        htmlContent += createEventsHTML(dateEvents, selectedDate);
    }
    
    container.innerHTML = htmlContent;
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
    
    // 最多显示100个即将到来的事件
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
            // 检查是否需要跳过显示：如果weekday是星期名称且今天是放送日
            let shouldSkip = false;
            if (event.weekday) {
                const weekdayLower = event.weekday.toLowerCase();
                // 如果weekday是星期名称且今天匹配该星期
                if (getWeekdayNumber(weekdayLower) !== undefined && 
                    isMatchingWeekday(selectedDate, weekdayLower)) {
                    shouldSkip = true;
                }
            }
            
            // 只有在不需要跳过时才显示
            if (!shouldSkip) {
                // 计算距离结束日期的天数
                const daysUntilEnd = Math.ceil((event.endDate - selectedDate) / (1000 * 60 * 60 * 24));
                upcomingHTML += `
                <div class="today-item" onclick="window.open('${event.url}', '_blank')">
                    <div class="today-title">『 ${event.title} 』の完結まであと${daysUntilEnd}日</div>
                </div>
                `;
            }
        }
    }
    
    return upcomingHTML;
}

// 创建事件HTML的辅助函数
function createEventsHTML(events, selectedDate) {
    return events.map(event => {
        let anniversaryText = '';
        let dateText = '';
        
        switch (event.matchType) {
            case 'start':
                // 开始日期当天
                const startAnniversary = calculateAnniversary(event.startDate, selectedDate);
                anniversaryText = startAnniversary === 0 ? 'Premiere' : `${startAnniversary}周年`;
                dateText = `${formatDate(event.startDate)} 公開`;
                break;
                
            case 'end':
                // 结束日期当天
                const endAnniversary = calculateAnniversary(event.endDate, selectedDate);
                anniversaryText = endAnniversary === 0 ? 'Finale' : `${endAnniversary}周年`;
                dateText = `${formatDate(event.endDate)} 終了`;
                break;
                
            case 'film':
                // weekday为Film
                anniversaryText = '公開中';
                dateText = `${formatDate(event.startDate)} 公開`;
                break;
                
            case 'weekday':
                // 特定星期显示
                anniversaryText = '放送中';
                dateText = `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`;
                break;
                
            case 'milestone-start':
                // 开始日期的整数倍纪念日
                anniversaryText = `${event.milestone.days} Days Ago`;
                dateText = `${formatDate(event.startDate)} 公開`;
                break;
                
            case 'milestone-end':
                // 结束日期的整数倍纪念日
                anniversaryText = `${event.milestone.days} Days Ago`;
                dateText = `${formatDate(event.endDate)} 終了`;
                break;
        }
        
        return `
        <div class="today-item" onclick="window.open('${event.url}', '_blank')">
            <div class="today-title">${event.title}</div>
            <div class="today-anniversary">${anniversaryText}</div>
            <div class="today-date">${dateText}</div>
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
