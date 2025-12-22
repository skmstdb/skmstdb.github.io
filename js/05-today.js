function formatDateForDisplay(date) {
    return formatJSTDateJapanese(date);
}

async function parseCSV() {
    try {
        const response = await fetch('/data/biography.csv');
        const data = await response.text();

        const rows = data.split('\n').filter(row => row.trim());
        const header = rows[0].split(',').map(col => col.trim());

        return rows.slice(1).map(row => {
            const columns = processCSVRow(row);

            const eventData = {};
            for (let i = 0; i < header.length && i < columns.length; i++) {
                eventData[header[i]] = columns[i] ? columns[i].trim() : '';
            }

            const dateDeleteStr = eventData['DateDelete'] || '';
            const dateDeleteArray = dateDeleteStr
                .split(',')
                .map(d => d.trim())
                .filter(d => d)
                .map(d => parseJSTDate(d));

            return {
                startDate: eventData['DateStart'] ? parseJSTDate(eventData['DateStart']) : null,
                endDate: eventData['DateEnd'] ? parseJSTDate(eventData['DateEnd']) : null,
                title: eventData['Title'] || '',
                url: eventData['URL'] || '#',
                weekday: eventData['Weekday'] ? eventData['Weekday'].trim() : '',
                worksType: eventData['WorksType'] || '',
                dateDelete: dateDeleteArray
            };
        }).filter(event =>
        // Include all events with valid dates
        ((event.startDate && !isNaN(event.startDate.getTime())) ||
            (event.endDate && !isNaN(event.endDate.getTime())))
        );
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
}

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

    result.push(currentValue);

    return result.map(value => value.replace(/^"(.*)"$/, '$1'));
}

function isDateMatchingToday(date, today) {
    if (!date || !today) return false;
    const d1 = formatJSTDate(date);
    const d2 = formatJSTDate(today);
    if (!d1 || !d2) return false;
    return d1.substring(5) === d2.substring(5);
}

function isDateDeleted(selectedDate, dateDeleteArray) {
    if (!dateDeleteArray || dateDeleteArray.length === 0) return false;
    return dateDeleteArray.some(deleteDate =>
        !isNaN(deleteDate.getTime()) && isSameJSTDay(deleteDate, selectedDate)
    );
}

function calculateAnniversary(date, today) {
    return today.getUTCFullYear() - date.getUTCFullYear();
}

function getJapaneseWeekday(date) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getUTCDay()];
}

function isMatchingTVWeekday(date, weekdayStr) {
    const actualDay = date.getUTCDay();
    const dayNum = actualDay === 0 ? 7 : actualDay;
    const weekdays = weekdayStr.split(',').map(w => w.trim());

    for (const wd of weekdays) {
        const num = parseInt(wd);

        if (num < 0) {
            const excludeDay = Math.abs(num);
            if (dayNum !== excludeDay) {
                return true;
            }
        } else if (num >= 1 && num <= 7) {
            if (dayNum === num) {
                return true;
            }
        }
    }

    return false;
}

function getDaysDifference(date1, date2) {
    const timeDiff = Math.abs(date2 - date1);
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

function getMilestoneInterval(days) {
    if (days >= 10000) return 10000;
    if (days >= 1000) return 1000;
    return 100;
}

function checkMilestone(date, selectedDate) {
    const days = getDaysDifference(date, selectedDate);
    if (days === 0) return null;

    const interval = getMilestoneInterval(days);
    if (days % interval === 0) {
        return { days, interval };
    }
    return null;
}

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

function changeDate(element) {
    document.querySelectorAll('.date-item').forEach(item => {
        item.classList.remove('active');
    });

    element.classList.add('active');

    const selectedDate = new Date(element.getAttribute('data-date'));

    loadEventsForDate(selectedDate);
}

async function loadEventsForDate(selectedDate) {
    const container = document.getElementById('today-container');
    const currentDateElement = document.getElementById('current-date');
    const today = getJSTNow();

    currentDateElement.textContent = formatDateForDisplay(selectedDate);

    const events = await parseCSV();
    const dateEvents = [];

    for (const event of events) {
        let matchType = null;
        let milestone = null;

        if (isDateDeleted(selectedDate, event.dateDelete)) {
            continue;
        }
        const worksType = event.worksType || '';
        const isTVMode = worksType === 'TV' && event.weekday && /^-?\d+([,，]\s*-?\d+)*$/.test(event.weekday.trim());

        const isTVCurrentlyAiring = isTVMode && event.startDate && event.endDate &&
            selectedDate >= event.startDate && selectedDate <= event.endDate;

        const daysSinceStart = (worksType === '映画' && event.startDate && selectedDate >= event.startDate)
            ? getDaysDifference(event.startDate, selectedDate)
            : -1;

        if (worksType === '映画' && daysSinceStart >= 0 && daysSinceStart <= 33) {
            matchType = 'film';
        }
        else if (isTVCurrentlyAiring && isDateMatchingToday(event.startDate, selectedDate)) {
            matchType = 'tv-start';
        }
        else if (isTVCurrentlyAiring && isDateMatchingToday(event.endDate, selectedDate)) {
            matchType = 'tv-end';
        }
        else if (isTVCurrentlyAiring &&
            selectedDate > event.startDate &&
            selectedDate < event.endDate &&
            isMatchingTVWeekday(selectedDate, event.weekday)) {
            matchType = 'tv-weekday';
        }
        else if ((!isTVMode || !isTVCurrentlyAiring) && isDateMatchingToday(event.startDate, selectedDate)) {
            matchType = 'start';
        } else if ((!isTVMode || !isTVCurrentlyAiring) && isDateMatchingToday(event.endDate, selectedDate)) {
            matchType = 'end';
        }

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

    if (isSameJSTDay(selectedDate, today)) {
        const isBirthday = selectedDate.getUTCMonth() === 9 && selectedDate.getUTCDate() === 14; // 月份從0開始，所以10月是9
        if (isBirthday) {
            const age = selectedDate.getUTCFullYear() - 1973;
            htmlContent += `
            <div class="today-item" onclick="window.open('https://sakai-masato.com/', '_blank')">
                <div class="today-title">堺さん、${age}歳のお誕生日おめでとうございます！！</div>
            </div>
            `;
        } else {
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

        htmlContent += getUpcomingEventsHTML(events, selectedDate);
    }

    if (dateEvents.length > 0) {
        htmlContent += createEventsHTML(dateEvents, selectedDate);
    }

    container.innerHTML = htmlContent;
}

function getUpcomingEventsHTML(events, selectedDate) {
    let upcomingHTML = '';

    const upcomingEvents = events.filter(event => {
        if (!event.startDate) return false;
        return event.startDate > selectedDate;
    });

    upcomingEvents.sort((a, b) => {
        return a.startDate - b.startDate;
    });

    // 最多显示100个即将到来的事件
    const eventsToShow = upcomingEvents.slice(0, 100);

    for (const event of eventsToShow) {
        const daysUntilStart = Math.ceil((event.startDate - selectedDate) / (1000 * 60 * 60 * 24));
        upcomingHTML += `
        <div class="today-item" onclick="window.open('${event.url}', '_blank')">
            <div class="today-title">『 ${event.title} 』の公開まであと${daysUntilStart}日</div>
        </div>
        `;
    }

    return upcomingHTML;
}

function createEventsHTML(events, selectedDate) {
    return events.map(event => {
        let anniversaryText = '';
        let dateText = '';

        switch (event.matchType) {
            case 'start':
                const startAnniversary = calculateAnniversary(event.startDate, selectedDate);
                anniversaryText = startAnniversary === 0 ? 'Premiere' : `${startAnniversary}周年`;
                dateText = `${formatDateForDisplay(event.startDate)} 公開`;
                break;

            case 'end':
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
                // WorksType为映画且在44天内
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
