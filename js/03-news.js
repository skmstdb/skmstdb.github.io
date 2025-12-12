// ============================================
// INITIALIZATION - Ensure navbar loads first
// ============================================
document.addEventListener('DOMContentLoaded', async function () {
    // 1. Load navbar first (explicit control)
    // Note: loadNavbar() already calls highlightCurrentPage() and initializeHamburger()
    if (typeof loadNavbar === 'function') {
        await loadNavbar();
    }

    // 2. Then load main content
    await loadMonthData();
});

// ============================================
// YEAR-BASED URL MAPPING
// Configure URLs for each year below
// All months in a year will link to the same URL
// ============================================
const YEAR_URLS = {
    1992: 'https://h2col.notion.site/1958a08476c7801d8592f2b7d8677082',
    1993: 'https://h2col.notion.site/1958a08476c78095a96bdf5bfef6a6be',
    1994: 'https://h2col.notion.site/1958a08476c7804e90b5d1feaf6598e6',
    1995: 'https://h2col.notion.site/1958a08476c780b0be19f0c38c2bb844',
    1996: 'https://h2col.notion.site/1958a08476c78028bfbff191eceb5c82',
    1997: 'https://h2col.notion.site/1958a08476c780749ca4dd0f95e23648',
    1998: 'https://h2col.notion.site/1958a08476c78048b4a5f3fe425c598d',
    1999: 'https://h2col.notion.site/1958a08476c7809d8589c5aaddfc7d59',
    2000: 'https://h2col.notion.site/1958a08476c780469c3ee24a037e4a8b',
    2001: 'https://h2col.notion.site/1958a08476c780f6a5e6ec42d896c98f',
    2002: 'https://h2col.notion.site/1958a08476c780e49a7cdce496b53ccf',
    2003: 'https://h2col.notion.site/1958a08476c78028bf64eb3df56289ca',
    2004: 'https://h2col.notion.site/1958a08476c780cab862c37ed9f3231e',
    2005: 'https://h2col.notion.site/1958a08476c780cfa067fea4c038ab03',
    2006: 'https://h2col.notion.site/1958a08476c780cf8316e93916653fdc',
    2007: 'https://h2col.notion.site/1958a08476c780f1822ef546454bd5aa',
    2008: 'https://h2col.notion.site/1958a08476c7800aac62e340a05ff09e',
    2009: 'https://h2col.notion.site/1958a08476c780ba83e9c6de8051a130',
    2010: 'https://h2col.notion.site/1958a08476c780cdba35fd29d4a85f4e',
    2011: 'https://h2col.notion.site/1958a08476c780488a2cdcbe8175f3f7',
    2012: 'https://h2col.notion.site/1958a08476c7801f8213e49f7638c790',
    2013: 'https://h2col.notion.site/1958a08476c7804c8817e2f5768ea450',
    2014: 'https://h2col.notion.site/1958a08476c780d3aa34ee312c4861dc',
    2015: 'https://h2col.notion.site/1958a08476c780008964cf32e408728f',
    2016: 'https://h2col.notion.site/1958a08476c7807096e2d0a0c124dd5a',
    2017: 'https://h2col.notion.site/1958a08476c78094932dfd3612b11aaa',
    2018: 'https://h2col.notion.site/1958a08476c7805da162ffad03ca1589',
    2019: 'https://h2col.notion.site/1958a08476c780258c92de856a312d4e',
    2020: 'https://h2col.notion.site/1958a08476c780a092bafb44d04871ad',
    2021: 'https://h2col.notion.site/1958a08476c780c3b68ac018a547d0d6',
    2022: 'https://h2col.notion.site/1958a08476c780838e5cc2616cb84e22',
    2023: 'https://h2col.notion.site/1958a08476c78040a6a2d9ffaf365777',
    2024: 'https://h2col.notion.site/1958a08476c780d281b4f062857739a2',
    2025: 'https://h2col.notion.site/1958a08476c780e9832acd8daadcf6c3',
    2026: 'https://h2col.notion.site/1968a08476c7802584eeceec01185cc1',
};
// ============================================

// Parse CSV row handling quoted fields
function parseCSVRow(row) {
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
    cols.push(current.trim());
    return cols;
}



// Check if a work occurs in a given year-month
function workOccursInMonth(work, year, month) {
    if (!work.dateStart) return false;

    // Use createJSTDate for consistent JST-based date creation
    const targetMonthStart = createJSTDate(year, month - 1, 1);
    const targetMonthEnd = createJSTDate(year, month, 0); // Last day of month

    // Check if work's date range overlaps with target month
    const workStart = work.dateStart;
    const workEnd = work.dateEnd || work.dateStart;

    // Use UTC methods for consistent JST date comparisons
    // Since parseJSTDate returns dates with UTC components representing JST dates,
    // and createJSTDate also creates dates with UTC components representing JST dates,
    // we use getTime() for consistent comparison which internally uses UTC
    return workStart.getTime() <= targetMonthEnd.getTime() && workEnd.getTime() >= targetMonthStart.getTime();
}

// ============================================
// CREATE MONTH CELL - Extracted for clarity
// ============================================
function createMonthCell(year, month, worksInMonth) {
    const cell = document.createElement('div');
    cell.className = 'month-cell';
    cell.setAttribute('data-year', year);
    cell.setAttribute('data-month', month);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'month-name';

    let totalTextLength = 0;

    if (worksInMonth.length > 0) {
        // Display all works in this month
        worksInMonth.forEach(work => {
            const workItem = document.createElement('div');
            workItem.className = 'work-item';
            // Priority: Name > Title > Month
            workItem.textContent = work.name || work.title || month.toString();
            nameDiv.appendChild(workItem);
            totalTextLength += workItem.textContent.length;
        });
    } else {
        // No works - show month number with "月" suffix
        const workItem = document.createElement('div');
        workItem.className = 'work-item';
        workItem.textContent = `${month}月`;
        nameDiv.appendChild(workItem);
        totalTextLength += 3;
    }

    // Dynamic font sizing based on content length
    let fontSize = '1.3rem';
    if (totalTextLength > 60) {
        fontSize = '0.6rem';
    } else if (totalTextLength > 40) {
        fontSize = '0.7rem';
    } else if (totalTextLength > 25) {
        fontSize = '0.8rem';
    } else if (totalTextLength > 15) {
        fontSize = '0.9rem';
    } else if (totalTextLength > 10) {
        fontSize = '1.1rem';
    }
    nameDiv.style.fontSize = fontSize;

    const yearDiv = document.createElement('div');
    yearDiv.className = 'month-year';

    // Show year+month for cells with works, only year for empty cells
    if (worksInMonth.length > 0) {
        yearDiv.textContent = `${year}年${month}月`;
    } else {
        yearDiv.textContent = `${year}`;
    }

    cell.appendChild(nameDiv);
    cell.appendChild(yearDiv);

    // Add click handler based on year URL mapping
    if (YEAR_URLS[year]) {
        cell.onclick = () => {
            window.open(YEAR_URLS[year], '_blank');
        };
        cell.style.cursor = 'pointer';
    } else {
        cell.style.cursor = 'default';
    }

    return cell;
}

// ============================================
// PROGRESSIVE RENDERING - Render in batches
// ============================================
function renderCellsProgressively(cellsData, container) {
    return new Promise((resolve) => {
        const BATCH_SIZE = 24; // Render 24 cells per frame (4 rows of 6)
        let currentIndex = 0;

        function renderBatch() {
            const endIndex = Math.min(currentIndex + BATCH_SIZE, cellsData.length);

            for (let i = currentIndex; i < endIndex; i++) {
                const { year, month, worksInMonth } = cellsData[i];
                const cell = createMonthCell(year, month, worksInMonth);
                container.appendChild(cell);
            }

            currentIndex = endIndex;

            if (currentIndex < cellsData.length) {
                requestAnimationFrame(renderBatch);
            } else {
                resolve();
            }
        }

        renderBatch();
    });
}

// ============================================
// LOAD AND PROCESS DATA
// ============================================
async function loadMonthData() {
    try {
        const response = await fetch('/data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n');
        
        if (rows.length < 2) return; // Need at least header and one data row
        
        // Extract header row and create column mapping
        const header = parseCSVRow(rows[0]).map(col => col.trim());
        const dataRows = rows.slice(1); // Skip header

        // Parse all works
        const works = dataRows.map(row => {
            const cols = parseCSVRow(row);
            if (cols.length === 0) return null;

            // Build eventData object with named properties
            const eventData = {};
            for (let i = 0; i < header.length && i < cols.length; i++) {
                eventData[header[i]] = cols[i] ? cols[i].trim() : '';
            }

            // Filter by Note column: exclude rows containing 'memo' or 'uwasa'
            const note = eventData['Note'] || '';
            const noteWords = note.toLowerCase().split(',').map(word => word.trim());
            if (noteWords.includes('memo') || noteWords.includes('uwasa')) {
                return null;
            }

            // Access columns by name instead of numeric indices
            const name = eventData['Name'] || '';
            const title = eventData['Title'] || '';
            const dateStart = parseJSTDate(eventData['DateStart'] || '');
            const dateEnd = parseJSTDate(eventData['DateEnd'] || '');
            const url = eventData['URL'] || '';

            if (!dateStart) return null;

            return {
                name: name,
                title: title,
                dateStart: dateStart,
                dateEnd: dateEnd,
                url: url
            };
        }).filter(w => w !== null);

        // Generate cells data (prepare all data first)
        const currentYear = getJSTYear();
        const currentMonth = getJSTMonth() + 1; // 1-12
        
        // Verify JST consistency using UTC methods
        const now = getJSTNow();
        const verifyYear = now.getUTCFullYear();
        const verifyMonth = now.getUTCMonth() + 1;
        const cellsData = [];

        // Generate from current year December to 1973 October
        for (let year = currentYear; year >= 1973; year--) {
            const startMonth = (year === currentYear) ? currentMonth : 12;
            const endMonth = (year === 1973) ? 10 : 1;

            // Descending order: 12 to 1
            for (let month = startMonth; month >= endMonth; month--) {
                // Find works in this month
                const worksInMonth = works.filter(w => workOccursInMonth(w, year, month));

                // Sort works by dateStart (chronological order)
                worksInMonth.sort((a, b) => a.dateStart - b.dateStart);

                cellsData.push({ year, month, worksInMonth });
            }
        }

        // Clear skeleton and render progressively
        const monthGrid = document.getElementById('month-grid');
        monthGrid.innerHTML = '';

        await renderCellsProgressively(cellsData, monthGrid);

    } catch (error) {
        console.error('Error loading month data:', error);
    }
}
