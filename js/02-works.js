document.addEventListener('DOMContentLoaded', async function () {
    let allWorks = [];
    let currentTypeFilter = 'all'; // Type filter: all, 映画, TV, 舞台, etc.
    let isLeadFilterActive = false; // Lead role filter: true/false

    // ============================================
    // INITIALIZATION - Ensure navbar loads first
    // ============================================
    // 1. Load navbar first (explicit control)
    // Note: loadNavbar() already calls highlightCurrentPage() and initializeHamburger()
    if (typeof loadNavbar === 'function') {
        await loadNavbar();
    }

    // 2. Then load main content
    await loadData();

    // Parse CSV and generate timeline
    async function loadData() {
        try {
            const response = await fetch('/data/biography.csv');
            const data = await response.text();
            const rows = data.split('\n');
            
            if (rows.length < 2) return; // Need at least header and one data row
            
            // Extract header row
            const headerRow = rows[0];
            const header = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < headerRow.length; i++) {
                const char = headerRow[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    header.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            header.push(current.trim());

            allWorks = rows.slice(1) // Skip header
                .map(row => {
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

                    if (cols.length < header.length) return null;

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

                    const dateStartStr = eventData['DateStart'];
                    let dateStart = null;
                    if (dateStartStr && dateStartStr.trim() !== '') {
                        dateStart = parseJSTDate(dateStartStr);
                    }

                    // Calculate year from DateStart or Note column
                    let year = 0;
                    if (dateStart) {
                        year = dateStart.getUTCFullYear();
                    } else {
                        // Check Note column for year (YYYY format) if DateStart is empty
                        const noteText = eventData['Note'] || '';
                        if (noteText && !noteWords.includes('uwasa')) {
                            const yearMatch = noteText.match(/\b(19|20)\d{2}\b/);
                            if (yearMatch) {
                                year = parseInt(yearMatch[0]);
                            }
                        }
                    }

                    return {
                        year: year,
                        name: eventData['Name'],
                        title: eventData['Title'],
                        role: eventData['Role'],
                        type: eventData['WorksType'],
                        dateStart: dateStart,
                        url: eventData['URL']
                    };
                })
                .filter(work => work && work.year > 0);

            // Sort by year descending, then by date descending
            // Using UTC methods consistently for JST-based dates
            allWorks.sort((a, b) => {
                if (b.year !== a.year) {
                    return b.year - a.year;
                }
                if (a.dateStart && b.dateStart) {
                    // Compare dates using UTC methods for JST-based date comparison
                    // Since parseJSTDate returns dates with UTC components representing JST dates,
                    // we use UTC methods for consistent timezone handling
                    const aYear = a.dateStart.getUTCFullYear();
                    const bYear = b.dateStart.getUTCFullYear();
                    if (bYear !== aYear) {
                        return bYear - aYear;
                    }
                    
                    const aMonth = a.dateStart.getUTCMonth();
                    const bMonth = b.dateStart.getUTCMonth();
                    if (bMonth !== aMonth) {
                        return bMonth - aMonth;
                    }
                    
                    const aDate = a.dateStart.getUTCDate();
                    const bDate = b.dateStart.getUTCDate();
                    return bDate - aDate;
                }
                return 0;
            });

            generateTimeline(allWorks);
            setupFilterButtons();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    function setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const typeFilters = ['all', '映画', 'TV', '舞台', '声の出演', 'その他', 'BOOK'];
        const leadToggle = document.getElementById('lead-role-toggle');

        // Handle Lead Role Toggle
        if (leadToggle) {
            leadToggle.addEventListener('change', (e) => {
                isLeadFilterActive = e.target.checked;

                // Interaction with "All":
                // If turning ON lead filter, deselect "All" button if it was active?
                // Or keep "All" active because it means "All types" + "Lead Only"?
                // Current logic implies "All" button creates a "Reset" state.
                // Let's decide: If Lead is ON, "All" (Reset) button should probably NOT be active visually 
                // if "All" button means "Reset Everything".
                // But usually "All" means "All Types". 
                // Let's stick to previous behavior: logic de-activated 'all' button.

                if (isLeadFilterActive) {
                    filterButtons.forEach(b => {
                        if (b.dataset.filter === 'all') {
                            b.classList.remove('active');
                        }
                    });
                } else if (currentTypeFilter === 'all') {
                    filterButtons.forEach(b => {
                        if (b.dataset.filter === 'all') {
                            b.classList.add('active');
                        }
                    });
                }

                applyFilters();
            });
        }

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;

                if (filter === 'all') {
                    // Reset all filters
                    currentTypeFilter = 'all';
                    isLeadFilterActive = false;
                    if (leadToggle) leadToggle.checked = false; // Uncheck toggle

                    // Update button states
                    filterButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                } else if (typeFilters.includes(filter)) {
                    // Type filter clicked
                    currentTypeFilter = filter;

                    // Remove active from all type filter buttons
                    filterButtons.forEach(b => {
                        if (typeFilters.includes(b.dataset.filter)) {
                            b.classList.remove('active');
                        }
                    });

                    // Add active to clicked button
                    btn.classList.add('active');

                    // "All" button visual update
                    filterButtons.forEach(b => {
                        if (b.dataset.filter === 'all') {
                            b.classList.remove('active');
                        }
                    });
                }

                // Apply combined filters
                applyFilters();
            });
        });
    }

    function applyFilters() {
        let filteredWorks = allWorks;

        // Apply type filter first
        if (currentTypeFilter !== 'all') {
            filteredWorks = filteredWorks.filter(w => w.type === currentTypeFilter);
        }

        // Apply lead role filter if active
        if (isLeadFilterActive) {
            filteredWorks = filteredWorks.filter(w => w.role && w.role.includes('主演'));
        }

        generateTimeline(filteredWorks);
    }

    function generateTimeline(works) {
        const totalWorks = works.length;
        const leadRoles = works.filter(w => w.role && w.role.includes('主演')).length;

        // Generate stats summary based on filtered works
        const statsSummary = document.getElementById('stats-summary');
        statsSummary.innerHTML = `
            <div class="stat-item">
                <span class="stat-number">${totalWorks}</span>
                <span>in Total</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${leadRoles}</span>
                <span>主演</span>
            </div>
        `;

        // Group works by year
        const worksByYear = {};
        works.forEach(work => {
            if (!worksByYear[work.year]) {
                worksByYear[work.year] = [];
            }
            worksByYear[work.year].push(work);
        });

        // Generate all years from 1992 to current year (or max year in data)
        // Use JST-based current year for consistent timezone handling
        const currentYear = getJSTNow().getUTCFullYear();
        const maxYearInData = Math.max(...allWorks.map(w => w.year));
        const endYear = Math.max(currentYear, maxYearInData);
        const startYear = 1992;

        // Generate years list: [endYear, ..., 1992, 1973]
        const yearsToRender = [];
        for (let y = endYear; y >= startYear; y--) {
            yearsToRender.push(y);
        }
        yearsToRender.push(1973);

        // Prepare year sections data
        const yearSectionsData = yearsToRender.map(year => ({
            year,
            works: worksByYear[year] || []
        }));

        // Clear skeleton and render progressively
        const timelineContainer = document.getElementById('timeline-container');
        timelineContainer.innerHTML = '';

        renderTimelineProgressively(yearSectionsData, timelineContainer);
    }

    // ============================================
    // CREATE YEAR SECTION - Extracted for clarity
    // ============================================
    function createYearSection(yearData) {
        const { year, works } = yearData;

        const yearDiv = document.createElement('div');
        yearDiv.className = 'timeline-year';

        const yearLabel = document.createElement('div');
        yearLabel.className = 'year-label';
        yearLabel.textContent = year;
        yearDiv.appendChild(yearLabel);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'timeline-items';

        if (works && works.length > 0) {
            works.forEach((work, index) => {
                const isLead = work.role && work.role.includes('主演');
                const roleClass = isLead ? 'lead-role' : 'non-lead-role';

                const itemDiv = document.createElement('div');
                itemDiv.className = `timeline-item ${roleClass}`;
                itemDiv.style.animationDelay = `${index * 0.1}s`;
                itemDiv.onclick = () => window.open(work.url, '_blank');

                const contentDiv = document.createElement('div');
                contentDiv.className = 'timeline-content';

                const titleDiv = document.createElement('div');
                titleDiv.className = 'work-title';
                titleDiv.textContent = work.title || work.name;
                contentDiv.appendChild(titleDiv);

                if (work.name && work.title) {
                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'work-name';
                    nameDiv.textContent = work.name;
                    contentDiv.appendChild(nameDiv);
                }

                itemDiv.appendChild(contentDiv);
                itemsDiv.appendChild(itemDiv);
            });
        }

        yearDiv.appendChild(itemsDiv);
        return yearDiv;
    }

    // ============================================
    // PROGRESSIVE RENDERING - Render in batches
    // ============================================
    function renderTimelineProgressively(yearSectionsData, container) {
        return new Promise((resolve) => {
            const BATCH_SIZE = 3; // Render 3 years per frame
            let currentIndex = 0;

            function renderBatch() {
                const endIndex = Math.min(currentIndex + BATCH_SIZE, yearSectionsData.length);

                for (let i = currentIndex; i < endIndex; i++) {
                    const yearSection = createYearSection(yearSectionsData[i]);
                    container.appendChild(yearSection);
                }

                currentIndex = endIndex;

                if (currentIndex < yearSectionsData.length) {
                    requestAnimationFrame(renderBatch);
                } else {
                    resolve();
                }
            }

            renderBatch();
        });
    }

    // Original timeline generation logic (now replaced by progressive rendering above)
    function generateTimelineOld_UNUSED(works) {
        // This function is kept for reference but not used
        // The new implementation uses progressive rendering
        const totalWorks = works.length;
        const leadRoles = works.filter(w => w.role && w.role.includes('主演')).length;

        // Generate stats summary based on filtered works
        const statsSummary = document.getElementById('stats-summary');
        statsSummary.innerHTML = `
            <div class="stat-item">
                <span class="stat-number">${totalWorks}</span>
                <span>in Total</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${leadRoles}</span>
                <span>主演</span>
            </div>
        `;

        // Group works by year
        const worksByYear = {};
        works.forEach(work => {
            if (!worksByYear[work.year]) {
                worksByYear[work.year] = [];
            }
            worksByYear[work.year].push(work);
        });

        // Generate all years from 1992 to current year (or max year in data)
        // Use JST-based current year for consistent timezone handling
        const currentYear = getJSTNow().getUTCFullYear();
        const maxYearInData = Math.max(...allWorks.map(w => w.year));
        const endYear = Math.max(currentYear, maxYearInData);
        const startYear = 1992;
    }
});
