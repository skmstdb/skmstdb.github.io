// 格式化日期为日语显示格式 (JST) - 用于用户界面显示
function formatDateForDisplay(date) {
    return formatJSTDateJapanese(date);
}

// 解析CSV数据
async function parseCSV() {
    try {
        const response = await fetch('/data/biography.csv');
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

            // 解析DateDelete（多个日期用逗号分隔）
            const dateDeleteStr = eventData['DateDelete'] || '';
            const dateDeleteArray = dateDeleteStr
                .split(',')
                .map(d => d.trim())
                .filter(d => d)
                .map(d => parseJSTDate(d));

            return {
                pageActivity: eventData['PageToday'] || '',
                startDate: eventData['DateStart'] ? parseJSTDate(eventData['DateStart']) : null,
                endDate: eventData['DateEnd'] ? parseJSTDate(eventData['DateEnd']) : null,
                title: eventData['Title'] || '',
                url: eventData['URL'] || '#',
                weekday: eventData['Weekday'] ? eventData['Weekday'].trim() : '',
                dateDelete: dateDeleteArray
            };
        }).filter(event =>
            // 只包含 PageToday 列不为空的数据
            event.pageActivity && event.pageActivity.trim() !== '' &&
            ((event.startDate && !isNaN(event.startDate.getTime())) ||
                (event.endDate && !isNaN(event.endDate.getTime())))
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
    return date.getUTCMonth() === today.getUTCMonth() &&
        date.getUTCDate() === today.getUTCDate();
}

// 检查日期是否在DateDelete列表中
function isDateDeleted(selectedDate, dateDeleteArray) {
    if (!dateDeleteArray || dateDeleteArray.length === 0) return false;
    return dateDeleteArray.some(deleteDate =>
        !isNaN(deleteDate.getTime()) && isSameDay(deleteDate, selectedDate)
    );
}

// 计算周年数
function calculateAnniversary(date, today) {
    return today.getUTCFullYear() - date.getUTCFullYear();
}

// 获取星期几的日语表示
function getJapaneseWeekday(date) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getUTCDay()];
}

// 检查TV模式的weekday（支持单个数字、多个数字、负数）
function isMatchingTVWeekday(date, weekdayStr) {
    // TV模式: 1=星期一, 2=星期二, ..., 7=星期日
    // 负数表示排除: -7=除星期日外的所有日期, -2=除星期二外的所有日期
    // 多个数字用逗号分隔: 1,2=星期一和星期二

    const actualDay = date.getUTCDay(); // 0=星期日, 1=星期一, ..., 6=星期六

    // 将actualDay转换为1-7格式 (1=星期一, 7=星期日)
    const dayNum = actualDay === 0 ? 7 : actualDay;

    // 分割weekday字符串（处理逗号分隔的情况）
    const weekdays = weekdayStr.split(',').map(w => w.trim());

    for (const wd of weekdays) {
        const num = parseInt(wd);

        if (num < 0) {
            // 负数模式：排除指定的星期
            const excludeDay = Math.abs(num);
            if (dayNum !== excludeDay) {
                return true; // 不是被排除的日期，匹配成功
            }
        } else if (num >= 1 && num <= 7) {
            // 正数模式：匹配指定的星期
            if (dayNum === num) {
                return true;
            }
        }
    }

    return false;
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

// 创建日期导航 (JST)
function createDateNavigation() {
    const today = getJSTNow();
    const dateNavigation = document.getElementById('date-navigation');
    let navigationHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setUTCDate(today.getUTCDate() + i);

        const day = date.getUTCDate();
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
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate();
}

// 為指定日期加載事件 (JST)
async function loadEventsForDate(selectedDate) {
    const container = document.getElementById('today-container');
    const currentDateElement = document.getElementById('current-date');
    const today = getJSTNow(); // 获取真正的今天 (JST)

    // 顯示選中日期
    currentDateElement.textContent = formatDateForDisplay(selectedDate);

    const events = await parseCSV();

    // 筛选匹配的事件
    const dateEvents = [];

    for (const event of events) {
        let matchType = null;
        let milestone = null;

        // 检查是否在DateDelete列表中
        if (isDateDeleted(selectedDate, event.dateDelete)) {
            continue; // 跳过这个事件
        }

        // 判断weekday模式
        const weekdayLower = event.weekday ? event.weekday.toLowerCase() : '';
        // TV模式：weekday包含数字（支持单个、多个、负数）
        const isTVMode = event.weekday && /^-?\d+([,，]\s*-?\d+)*$/.test(event.weekday.trim());
        const isFilmMode = weekdayLower === 'film';

        // 1. TV模式的开始日期：显示"初回"
        if (isTVMode && isDateMatchingToday(event.startDate, selectedDate)) {
            matchType = 'tv-start';
        }
        // 2. TV模式的结束日期：显示"最終回"
        else if (isTVMode && isDateMatchingToday(event.endDate, selectedDate)) {
            matchType = 'tv-end';
        }
        // 3. TV模式的中间日期：在DateStart到DateEnd之间（不包含开始和结束日期）的对应星期数显示"放送中"
        else if (isTVMode && event.startDate && event.endDate &&
            selectedDate > event.startDate &&
            selectedDate < event.endDate &&
            isMatchingTVWeekday(selectedDate, event.weekday)) {
            matchType = 'tv-weekday';
        }
        // 4. Film模式：开始日期后45天内持续显示"公開中"
        else if (isFilmMode && event.startDate && selectedDate >= event.startDate) {
            const daysSinceStart = getDaysDifference(event.startDate, selectedDate);
            if (daysSinceStart <= 45) {
                matchType = 'film';
            }
        }
        // 5. 非TV和Film模式：检查是否是开始或结束日期当天
        else if (!isTVMode && !isFilmMode && isDateMatchingToday(event.startDate, selectedDate)) {
            matchType = 'start';
        } else if (!isTVMode && !isFilmMode && isDateMatchingToday(event.endDate, selectedDate)) {
            matchType = 'end';
        }

        // 6. 检查整数倍天数纪念日
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
        const isBirthday = selectedDate.getUTCMonth() === 9 && selectedDate.getUTCDate() === 14; // 月份從0開始，所以10月是9

        // 如果是生日，添加生日祝福
        if (isBirthday) {
            const age = selectedDate.getUTCFullYear() - 1973;
            htmlContent += `
            <div class="today-item" onclick="window.open('https://sakai-masato.com/', '_blank')">
                <div class="today-title">堺さん、${age}歳のお誕生日おめでとうございます！！</div>
            </div>
            `;
        } else {
            // 計算距離下一個生日的天數
            const nextBirthday = new Date(Date.UTC(selectedDate.getUTCFullYear(), 9, 14)); // 10月14日
            if (selectedDate > nextBirthday) {
                nextBirthday.setUTCFullYear(nextBirthday.getUTCFullYear() + 1);
            }
            const daysUntilBirthday = Math.ceil((nextBirthday - selectedDate) / (1000 * 60 * 60 * 24));
            const nextAge = nextBirthday.getUTCFullYear() - 1973;

            // 只在300天、200天、100天及100天以内显示
            if (daysUntilBirthday === 300 || daysUntilBirthday === 200 || daysUntilBirthday <= 100) {
                htmlContent += `
                <div class="today-item" onclick="window.open('https://sakai-masato.com/', '_blank')">
                    <div class="today-title">${nextAge}歳の誕生日まであと${daysUntilBirthday}日</div>
                </div>
                `;
            }
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

// 获取即将开始的事件HTML
function getUpcomingEventsHTML(events, selectedDate) {
    let upcomingHTML = '';

    // 筛选出开始日期在今天之后的事件
    const upcomingEvents = events.filter(event => {
        // 跳过没有日期的事件
        if (!event.startDate) return false;

        // 检查开始日期是否在今天之后
        return event.startDate > selectedDate;
    });

    // 按日期排序（先显示最近的事件）
    upcomingEvents.sort((a, b) => {
        return a.startDate - b.startDate;
    });

    // 最多显示100个即将到来的事件
    const eventsToShow = upcomingEvents.slice(0, 100);

    for (const event of eventsToShow) {
        // 计算距离开始日期的天数
        const daysUntilStart = Math.ceil((event.startDate - selectedDate) / (1000 * 60 * 60 * 24));
        upcomingHTML += `
        <div class="today-item" onclick="window.open('${event.url}', '_blank')">
            <div class="today-title">『 ${event.title} 』の公開まであと${daysUntilStart}日</div>
        </div>
        `;
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
                dateText = `${formatDateForDisplay(event.startDate)} 公開`;
                break;

            case 'end':
                // 结束日期当天
                const endAnniversary = calculateAnniversary(event.endDate, selectedDate);
                anniversaryText = endAnniversary === 0 ? 'Finale' : `${endAnniversary}周年`;
                dateText = `${formatDateForDisplay(event.endDate)} 終了`;
                break;

            case 'tv-start':
                // TV模式的开始日期
                anniversaryText = '初回';
                dateText = `${formatDateForDisplay(event.startDate)} 放送開始`;
                break;

            case 'tv-end':
                // TV模式的结束日期
                anniversaryText = '最終回';
                dateText = `${formatDateForDisplay(event.endDate)} 放送終了`;
                break;

            case 'tv-weekday':
                // TV模式的中间日期
                anniversaryText = '放送日';
                dateText = `${formatDateForDisplay(event.startDate)} - ${formatDateForDisplay(event.endDate)}`;
                break;

            case 'film':
                // weekday为Film
                anniversaryText = '公開中';
                dateText = `${formatDateForDisplay(event.startDate)} 公開`;
                break;

            case 'milestone-start':
                // 开始日期的整数倍纪念日
                anniversaryText = `${event.milestone.days} Days Ago`;
                dateText = `${formatDateForDisplay(event.startDate)} 公開`;
                break;

            case 'milestone-end':
                // 结束日期的整数倍纪念日
                anniversaryText = `${event.milestone.days} Days Ago`;
                dateText = `${formatDateForDisplay(event.endDate)} 終了`;
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

// 加载今日事件 (JST)
async function loadTodayEvents() {
    const today = getJSTNow();

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
    window.addEventListener('resize', function () {
        const isMobile = window.innerWidth <= 767;
        const dateNavigation = document.getElementById('date-navigation');

        if (isMobile) {
            dateNavigation.style.display = 'none';
            // 在移动设备上，始终显示今天的内容 (JST)
            loadEventsForDate(getJSTNow());
        } else {
            dateNavigation.style.display = 'flex';
        }
    });

    loadTodayEvents();
});
