document.addEventListener('DOMContentLoaded', async function () {
    if (typeof loadNavbar === 'function') {
        await loadNavbar();
    }
    await loadMonthData();
});

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

function workOccursInMonth(work, year, month) {
    if (!work.dateStart) return false;

    const targetMonthStart = createJSTDate(year, month - 1, 1);
    const targetMonthEnd = createJSTDate(year, month, 0);

    const workStart = work.dateStart;
    const workEnd = work.dateEnd || work.dateStart;

    return workStart.getTime() <= targetMonthEnd.getTime() && workEnd.getTime() >= targetMonthStart.getTime();
}

function createMonthCell(year, month, worksInMonth) {
    const cell = document.createElement('div');
    cell.className = 'month-cell';
    cell.setAttribute('data-year', year);
    cell.setAttribute('data-month', month);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'month-name';

    let totalTextLength = 0;

    if (worksInMonth.length > 0) {
        worksInMonth.forEach(work => {
            const workItem = document.createElement('div');
            workItem.className = 'work-item';
            workItem.textContent = work.name || work.title || month.toString();
            nameDiv.appendChild(workItem);
            totalTextLength += workItem.textContent.length;
        });
    } else {
        const workItem = document.createElement('div');
        workItem.className = 'work-item';
        workItem.textContent = `${month}月`;
        nameDiv.appendChild(workItem);
        totalTextLength += 3;
    }

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

    if (worksInMonth.length > 0) {
        yearDiv.textContent = `${year}年${month}月`;
    } else {
        yearDiv.textContent = `${year}`;
    }

    cell.appendChild(nameDiv);
    cell.appendChild(yearDiv);

    const isClickable = year > 1992 || (year === 1992 && month >= 1);
    if (isClickable) {
        cell.onclick = () => {
            window.location.href = `sakaical.html?year=${year}&month=${month}`;
        };
        cell.style.cursor = 'pointer';
    } else {
        cell.style.cursor = 'default';
    }

    return cell;
}

function renderCellsProgressively(cellsData, container) {
    return new Promise((resolve) => {
        const BATCH_SIZE = 24;
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

async function loadMonthData() {
    try {
        const response = await fetch('/data/biography.csv');
        const data = await response.text();
        const rows = data.split('\n');

        if (rows.length < 2) return;

        const header = parseCSVRow(rows[0]).map(col => col.trim());
        const dataRows = rows.slice(1);

        const works = dataRows.map(row => {
            const cols = parseCSVRow(row);
            if (cols.length === 0) return null;

            const eventData = {};
            for (let i = 0; i < header.length && i < cols.length; i++) {
                eventData[header[i]] = cols[i] ? cols[i].trim() : '';
            }
            const note = eventData['Note'] || '';
            const noteWords = note.toLowerCase().split(',').map(word => word.trim());
            if (noteWords.includes('memo') || noteWords.includes('uwasa')) {
                return null;
            }

            const name = eventData['Name'] || '';
            const title = eventData['Title'] || '';
            const dateStart = parseJSTDate(eventData['DateStart'] || '');
            const dateEnd = parseJSTDate(eventData['DateEnd'] || '');

            if (!dateStart) return null;

            return { name, title, dateStart, dateEnd };
        }).filter(w => w !== null);

        const currentYear = getJSTYear();
        const currentMonth = getJSTMonth() + 1;
        const cellsData = [];
        for (let year = currentYear; year >= 1973; year--) {
            const startMonth = (year === currentYear) ? currentMonth : 12;
            const endMonth = (year === 1973) ? 10 : 1;

            for (let month = startMonth; month >= endMonth; month--) {
                const worksInMonth = works.filter(w => workOccursInMonth(w, year, month));
                worksInMonth.sort((a, b) => a.dateStart - b.dateStart);
                cellsData.push({ year, month, worksInMonth });
            }
        }

        const monthGrid = document.getElementById('month-grid');
        monthGrid.innerHTML = '';

        await renderCellsProgressively(cellsData, monthGrid);

    } catch (error) {
        console.error('Error loading month data:', error);
    }
}
