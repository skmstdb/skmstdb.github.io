// Function to load navbar
async function loadNavbar() {
    try {
        const response = await fetch('../Navi/navbar.html');
        const navbarContent = await response.text();
        document.querySelector('.sidebar').innerHTML = navbarContent;
        initializeHamburger();
        return true; // 返回成功标志
    } catch (error) {
        console.error('Error loading navbar:', error);
        document.querySelector('.sidebar').innerHTML = '<p>Failed to load navigation.</p>';
        return false;
    }
}

// Function to initialize hamburger menu
function initializeHamburger() {
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('nav');

    if (hamburger && nav) {
        hamburger.addEventListener('click', function () {
            nav.classList.toggle('active');
            this.classList.toggle('is-active');

            if (this.classList.contains('is-active')) {
                this.innerHTML = `<span style="transform: rotate(45deg); position: absolute; top: 50%; left: 0; width: 100%; margin-top: -1px;"></span><span style="transform: rotate(-45deg); position: absolute; top: 50%; left: 0; width: 100%; margin-top: -1px;"></span>`;
            } else {
                this.innerHTML = `<span></span><span></span><span></span>`;
            }
        });
    } else {
        console.warn('Hamburger or nav element not found in navbar.html');
    }
}

// Function to highlight current page in navbar
function highlightCurrentPage() {
    // 获取完整路径并提取最后一部分
    const fullPath = window.location.pathname;
    const pathParts = fullPath.split('/');
    const currentPage = pathParts[pathParts.length - 1] || 'activity.html';
    const currentFolder = pathParts[pathParts.length - 2] || '';
    
    console.log('当前页面:', currentPage, '当前文件夹:', currentFolder);
    
    const navLinks = document.querySelectorAll('.sidebar nav a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        const hrefParts = href.split('/');
        const hrefPage = hrefParts[hrefParts.length - 1];
        
        // 检查当前页面是否匹配链接
        if (currentPage === hrefPage || 
            (currentPage === 'activity.html' && hrefPage === 'activity.html') ||
            (currentFolder === 'Activity' && href.includes('activity.html'))) {
            link.classList.add('active');
            console.log('高亮链接:', href);
        }
    });
}

// Improved function to parse CSV data with quote handling
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = processCSVLine(lines[0]);
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        const values = processCSVLine(lines[i]);
        const entry = {};

        for (let j = 0; j < headers.length; j++) {
            entry[headers[j].trim()] = values[j] ? values[j].trim() : '';
        }

        result.push(entry);
    }

    return result;
}

// Helper function to process CSV lines with quotes
function processCSVLine(line) {
    const result = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Push the last value
    result.push(currentValue);
    return result;
}

// Function to normalize worksType values
function normalizeWorksType(worksType) {
    if (!worksType) return 'その他';
    
    // Valid types in our application
    const validTypes = ['映画', 'TV', '舞台', 'BOOK', 'その他', '声の出演'];
    
    // First trim whitespace
    const trimmedType = worksType.trim();
    
    // Check if it's already a valid type (exact match)
    if (validTypes.includes(trimmedType)) {
        return trimmedType;
    }
        
    // Default to "other" if no match
    console.log('Unrecognized WorksType normalized to その他:', worksType);
    return 'その他';
}

// Function to get activity type class
function getActivityTypeClass(worksType) {
    // Normalize the input worksType first
    const normalizedType = normalizeWorksType(worksType);
    
    const mapping = {
        '映画': 'activity-movie',
        'TV': 'activity-tv',
        '舞台': 'activity-stage',
        'BOOK': 'activity-book',
        'その他': 'activity-other',
        '声の出演': 'activity-voice'
    };

    return mapping[normalizedType] || 'activity-other';
}

// Function to get activity order
function getActivityOrder(worksType) {
    // Normalize the input worksType first
    const normalizedType = normalizeWorksType(worksType);
    
    const mapping = {
        '映画': 1,
        'TV': 2,
        '舞台': 3,
        'BOOK': 4,
        'その他': 5,
        '声の出演': 6
    };

    return mapping[normalizedType] || 99;
}

// Function to create the contribution graph
function createContributionGraph(data, showLeadRoleOnly = false, selectedTypes = []) {
    const graphContainer = document.getElementById('contribution-graph');
    const currentYear = new Date().getFullYear();
    const startYear = 1992;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', '🎂', 'Nov', 'Dec'];

    // Process data
    const activities = {};
    // 存储每个月份的详细作品信息
    const monthlyWorks = {};

    // Normalize WorksType in data before processing
    data.forEach(item => {
        if (item.WorksType) {
            const originalType = item.WorksType;
            item.WorksType = normalizeWorksType(item.WorksType);
            if (originalType !== item.WorksType) {
                console.log(`Normalized WorksType for "${item.Title}": ${originalType} -> ${item.WorksType}`);
            }
        } else {
            item.WorksType = 'その他';
            console.log(`Missing WorksType for "${item.Title}", defaulting to その他`);
        }
    });

    // Find the earliest and latest years in the data
    let earliestYear = currentYear;
    let latestYear = startYear;

    data.forEach(item => {
        const startDate = new Date(item.DateStart);
        if (!isNaN(startDate.getTime())) {
            const year = startDate.getFullYear();
            earliestYear = Math.min(earliestYear, year);
            latestYear = Math.max(latestYear, year);
        }

        const endDate = item.DateEnd ? new Date(item.DateEnd) : null;
        if (endDate && !isNaN(endDate.getTime())) {
            const year = endDate.getFullYear();
            latestYear = Math.max(latestYear, year);
        }
    });

    // Ensure we include the current year if it's greater than the latest year in data
    latestYear = Math.max(latestYear, currentYear);

    // 改进活动数据处理逻辑
    data.forEach(item => {
        // 应用过滤条件
        if (showLeadRoleOnly && item.Role !== '主演') {
            return;
        }

        if (selectedTypes.length > 0 && !selectedTypes.includes(item.WorksType)) {
            return;
        }

        const startDate = new Date(item.DateStart);
        // 确保结束日期有效，如果无效则使用开始日期
        let endDate = startDate;
        if (item.DateEnd && item.DateEnd.trim() !== '') {
            const parsedEndDate = new Date(item.DateEnd);
            if (!isNaN(parsedEndDate.getTime())) {
                endDate = parsedEndDate;
            }
        }

        // 确保有效日期
        if (isNaN(startDate.getTime())) return;

        // 更精确地处理月份范围
        let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const lastDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
        
        while (currentDate <= lastDate) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const key = `${year}-${month}`;

            if (!activities[key]) {
                activities[key] = [];
            }
            
            // 存储每个月份的作品详情
            if (!monthlyWorks[key]) {
                monthlyWorks[key] = [];
            }
            // 避免重复添加同一作品
            if (!monthlyWorks[key].some(work => work.Title === item.Title)) {
                monthlyWorks[key].push(item);
            }

            // 改进活动类型检查和计数逻辑
            const existingActivity = activities[key].find(a => a.type === item.WorksType);
            if (!existingActivity) {
                activities[key].push({
                    type: item.WorksType,
                    count: 1,
                    title: item.Title // 可选：添加标题以便调试
                });
            } else {
                existingActivity.count++;
            }

            // 移动到下个月的第一天
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    });

    // Create graph container with table structure
    const graphHTML = document.createElement('div');
    graphHTML.className = 'graph-container';

    // 创建一个容器用于显示详细信息
    const detailContainer = document.createElement('div');
    detailContainer.id = 'works-detail-container';
    detailContainer.className = 'works-detail-container';
    detailContainer.style.display = 'none';
    detailContainer.innerHTML = '<div class="detail-header"><h3>出演</h3><button class="close-detail">×</button></div><div class="detail-content"></div>';

    // Get years in descending order
    const years = [];
    for (let year = latestYear; year >= startYear; year--) {
        years.push(year);
    }

    // Create year headers - each digit of the year on a separate row
    for (let digitPosition = 0; digitPosition < 4; digitPosition++) {
        const digitRow = document.createElement('div');
        digitRow.className = 'digit-row';

        // Add empty cell for alignment with month labels
        const emptySpacer = document.createElement('div');
        emptySpacer.className = 'year-digit-spacer';
        digitRow.appendChild(emptySpacer);

        // Add year digits
        years.forEach(year => {
            const digit = document.createElement('div');
            digit.className = 'year-digit';
            digit.textContent = String(year)[digitPosition];
            digit.style.height = '16px';
            digit.style.lineHeight = '1';
            digit.style.fontSize = '0.7rem';
            digitRow.appendChild(digit);
        });

        graphHTML.appendChild(digitRow);
    }

    // Create month rows
    for (let month = 0; month < 12; month++) {
        const monthRow = document.createElement('div');
        monthRow.className = 'month-row';

        // Add month label
        const monthLabel = document.createElement('div');
        monthLabel.className = 'month-label';
        monthLabel.textContent = monthNames[month];
        monthRow.appendChild(monthLabel);

        // Add year cells for this month
        years.forEach(year => {
            const key = `${year}-${month}`;
            const yearCell = document.createElement('div');
            yearCell.className = 'year-container';

            const yearBox = document.createElement('div');
            yearBox.className = 'year-box';
            
            // 如果有活动，添加点击事件
            if (activities[key] && activities[key].length > 0) {
                // Sort activities by type order
                activities[key].sort((a, b) => getActivityOrder(a.type) - getActivityOrder(b.type));

                const totalActivities = activities[key].length;
                let heightPerActivity = 100 / totalActivities;

                activities[key].forEach((activity, index) => {
                    const activitySegment = document.createElement('div');
                    activitySegment.className = `activity-segment ${getActivityTypeClass(activity.type)} ${activity.count >= 2 ? 'high' : ''}`;
                    activitySegment.style.height = `${heightPerActivity}%`;
                    activitySegment.style.top = `${index * heightPerActivity}%`;
                    yearBox.appendChild(activitySegment);
                });
                
                // 添加可点击的样式和事件
                yearBox.classList.add('clickable');
                yearBox.setAttribute('data-year', year);
                yearBox.setAttribute('data-month', month);
                yearBox.setAttribute('data-key', key);
                
                yearBox.addEventListener('click', function() {
                    showWorksDetail(this.getAttribute('data-key'), monthlyWorks, monthNames);
                });
            } else {
                yearBox.classList.add('year-box-empty');
            }

            yearCell.appendChild(yearBox);
            monthRow.appendChild(yearCell);
        });

        graphHTML.appendChild(monthRow);
    }

    graphContainer.innerHTML = '';
    graphContainer.appendChild(graphHTML);
    graphContainer.appendChild(detailContainer);
    
    // 添加关闭详情按钮的事件
    const closeButton = detailContainer.querySelector('.close-detail');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            detailContainer.style.display = 'none';
        });
    }
}

// 显示作品详情
function showWorksDetail(key, monthlyWorks, monthNames) {
    const detailContainer = document.getElementById('works-detail-container');
    const detailContent = detailContainer.querySelector('.detail-content');
    
    if (!detailContainer || !detailContent) return;
    
    // 解析年月
    const [year, month] = key.split('-');
    const monthName = monthNames[parseInt(month)];
    
    // 获取该月的作品
    const works = monthlyWorks[key] || [];
    
    if (works.length === 0) {
        detailContent.innerHTML = '<p>该月份没有作品记录</p>';
    } else {
        // 按作品类型分组
        const worksByType = {};
        works.forEach(work => {
            if (!worksByType[work.WorksType]) {
                worksByType[work.WorksType] = [];
            }
            worksByType[work.WorksType].push(work);
        });
        
        // 构建HTML
        let html = `<h4>${year} ${monthName}</h4>`;
        
        // 按类型顺序排序
        const typeOrder = {
            '映画': 1,
            'TV': 2,
            '舞台': 3,
            'BOOK': 4,
            'その他': 5,
            '声の出演': 6
        };
        
        // 排序类型
        const sortedTypes = Object.keys(worksByType).sort((a, b) => 
            (typeOrder[a] || 99) - (typeOrder[b] || 99)
        );
        
        // 生成每种类型的作品卡片
        sortedTypes.forEach(type => {
            const typeWorks = worksByType[type];
            const typeClass = getActivityTypeClass(type);
            
            html += `<div class="works-type-group">
                <h5 class="${typeClass}-title">${type}</h5>
                <div class="works-row ${typeClass}-row">`;
            
            typeWorks.forEach(work => {
                // 判断开始日期和结束日期是否相同
                let dateDisplay = work.DateStart;
                if (work.DateEnd && work.DateEnd !== work.DateStart) {
                    dateDisplay += ` ~ ${work.DateEnd}`;
                }
                
                html += `
                <div class="work-card ${typeClass}">
                    <div class="work-title">${work.Title}</div>
                    <div class="work-date">${dateDisplay}</div>
                    ${work.Role ? `<div class="work-role">${work.Role}</div>` : ''}
                </div>
                `;
            });
            
            html += '</div></div>';
        });
        
        detailContent.innerHTML = html;
    }
    
    // 显示详情容器
    detailContainer.style.display = 'block';
    
    // 滚动到详情区域
    detailContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Load data and initialize graph
document.addEventListener('DOMContentLoaded', function () {
    // Log initialization
    console.log('Activity visualization initializing...');
    
    loadNavbar().then(() => {
        // 确保导航栏加载完成后手动调用高亮函数
        highlightCurrentPage();
    });

    // Get the lead role filter
    const leadRoleFilter = document.getElementById('lead-role-filter');
    const typeFilters = document.querySelectorAll('.type-filter');

    // Fetch CSV data
    fetch('../data/worksdata.csv')
        .then(response => response.text())
        .then(data => {
            const worksData = parseCSV(data);
            
            // Log uniqueworksTypes for debugging
            const uniqueTypes = new Set();
            worksData.forEach(item => {
                if (item.WorksType) uniqueTypes.add(item.WorksType);
            });
            console.log('Original WorksTypes in data:', [...uniqueTypes]);
            
            // Normalize worksTypes in the data
            worksData.forEach(item => {
                if (item.WorksType) {
                    const original = item.WorksType;
                    item.WorksType = normalizeWorksType(item.WorksType);
                    if (original !== item.WorksType) {
                        console.log(`Normalized: "${original}" -> "${item.WorksType}" for "${item.Title}"`);
                    }
                } else {
                    item.WorksType = 'その他';
                    console.log(`Missing WorksType for "${item.Title}", defaulted to その他`);
                }
            });
            
            // Log normalized types
            const normalizedTypes = new Set();
            worksData.forEach(item => {
                if (item.WorksType) normalizedTypes.add(item.WorksType);
            });
            console.log('Normalized WorksTypes:', [...normalizedTypes]);

            // Initial graph creation
            createContributionGraph(worksData, false, []);

            // Add event listener for lead role filter
            leadRoleFilter.addEventListener('change', function () {
                const selectedTypes = Array.from(typeFilters)
                    .filter(input => input.checked)
                    .map(input => input.dataset.type);
                createContributionGraph(worksData, this.checked, selectedTypes);
            });

            // Add event listener for type filters
            typeFilters.forEach(filter => {
                filter.addEventListener('change', function () {
                    const selectedTypes = Array.from(typeFilters)
                        .filter(input => input.checked)
                        .map(input => input.dataset.type);
                    createContributionGraph(worksData, leadRoleFilter.checked, selectedTypes);
                });
            });
        })
        .catch(error => {
            console.error('Error loading works data:', error);
            document.getElementById('contribution-graph').innerHTML = '<p>Failed to load activity data.</p>';
        });
});
