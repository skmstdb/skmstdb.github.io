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
        
        // 简单的CSV解析
        const rows = data.split('\n').filter(row => row.trim());
        return rows.map(row => {
            const columns = row.split(',').map(col => col.trim());
            return {
                startDate: columns[0] ? new Date(columns[0]) : null,
                endDate: columns[1] ? new Date(columns[1]) : null,
                title: columns[2] || '',
                url: columns[3] || '#'
            };
        });
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return [];
    }
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

// 为指定日期加载事件
async function loadEventsForDate(selectedDate) {
    const container = document.getElementById('today-container');
    const currentDateElement = document.getElementById('current-date');
    
    // 显示选中日期
    currentDateElement.textContent = formatDate(selectedDate);
    
    // 检查是否是堺雅人的生日（10月14日）
    const isBirthday = selectedDate.getMonth() === 9 && selectedDate.getDate() === 14; // 月份从0开始，所以10月是9
    
    const events = await parseCSV();
    const dateEvents = events.filter(event => 
        isDateMatchingToday(event.startDate, selectedDate) || 
        isDateMatchingToday(event.endDate, selectedDate)
    );
    
    // 如果是生日，添加生日祝福
    if (isBirthday) {
        const age = selectedDate.getFullYear() - 1973;
        const birthdayHTML = `
        <div class="today-item" onclick="window.open('https://h2col.notion.site/Sakai-Masato-Database-1a88a08476c78096abe6c40b9c9c9bb7', '_blank')">
            <div class="today-title">堺さん、${age}歳のお誕生日おめでとうございます！！</div>
        </div>
        `;
        
        if (dateEvents.length === 0) {
            container.innerHTML = birthdayHTML;
        } else {
            const eventsHTML = dateEvents.map(event => {
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
            
            container.innerHTML = birthdayHTML + eventsHTML;
        }
        return;
    }
    
    if (dateEvents.length === 0) {
        container.innerHTML = ''; // イベントがない日は何も表示しない
        return;
    }
    
    const eventsHTML = dateEvents.map(event => {
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
    
    container.innerHTML = eventsHTML;
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
