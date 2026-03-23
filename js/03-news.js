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
    1992: 'https://h2col.notion.site/1b48a08476c7804fbcf5da0fe9e27489',
    1993: 'https://h2col.notion.site/1b38a08476c780e3ad97f016a29df253',
    1994: 'https://h2col.notion.site/1b38a08476c780728fdccd841c9c48cd',
    1995: 'https://h2col.notion.site/1b38a08476c78029862acf3b40192c10',
    1996: 'https://h2col.notion.site/1b38a08476c780f6a4bfcb29e7a98f90',
    1997: 'https://h2col.notion.site/1b38a08476c780c6aa50fa372a4d233b',
    1998: 'https://h2col.notion.site/1b38a08476c780e59dfbf444c1586088',
    1999: 'https://h2col.notion.site/1b38a08476c780738c0be840094ded4c',
    2000: 'https://h2col.notion.site/1b38a08476c780a89cc9cece82bf63c0',
    2001: 'https://h2col.notion.site/1b38a08476c78016962fd49ae6357fff',
    2002: 'https://h2col.notion.site/1b38a08476c78082a2c0d68638f0664d',
    2003: 'https://h2col.notion.site/1b38a08476c78073a1d2dcca6af2f9de',
    2004: 'https://h2col.notion.site/1b38a08476c780a289b0f4646c31b9e6',
    2005: 'https://h2col.notion.site/1b38a08476c78081afc8fb1dcec3c011',
    2006: 'https://h2col.notion.site/1b38a08476c78050852cf68fb50aec6c',
    2007: 'https://h2col.notion.site/1b38a08476c7800cb138c813d550d89a',
    2008: 'https://h2col.notion.site/1b38a08476c7809980cdf1964eed3a43',
    2009: 'https://h2col.notion.site/1b38a08476c780b8913cd8e1c9453450',
    2010: 'https://h2col.notion.site/1b38a08476c780718663c325ff17e59a',
    2011: 'https://h2col.notion.site/1b38a08476c780e8a63cf17c1ec21fb2',
    2012: 'https://h2col.notion.site/1b38a08476c7801fbf0ae2f37f36fbf8',
    2013: 'https://h2col.notion.site/1b38a08476c7801893b9eb590399a314',
    2014: 'https://h2col.notion.site/1b38a08476c780d8a33df337d328659a',
    2015: 'https://h2col.notion.site/1b38a08476c78016973cffba305f3669',
    2016: 'https://h2col.notion.site/1b38a08476c780d9b745de1175b41452',
    2017: 'https://h2col.notion.site/1b38a08476c7805fbb38cb314bd3dd8b',
    2018: 'https://h2col.notion.site/1b38a08476c780c5932eea192d06e092',
    2019: 'https://h2col.notion.site/1b38a08476c780ba959bebfee043a420',
    2020: 'https://h2col.notion.site/1b38a08476c78097ba6be2c69ebcadd1',
    2021: 'https://h2col.notion.site/1b48a08476c7806fa7e8ed389e14e946',
    2022: 'https://h2col.notion.site/1b38a08476c7804fa097f4d4d5b674cd',
    2023: 'https://h2col.notion.site/1b38a08476c780a0ad42dec228e954ee',
    2024: 'https://h2col.notion.site/1b38a08476c7806492d6c10c9bc4ec9f',
    2025: 'https://h2col.notion.site/1b38a08476c780ea90c6c2b9bb21ae02',
    2026: 'https://h2col.notion.site/1b38a08476c780568dacedd8eacccc8e',
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
