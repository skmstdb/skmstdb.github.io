document.addEventListener('DOMContentLoaded', async function () {

    // ============================================
    // INITIALIZATION
    // ============================================
    if (typeof loadNavbar === 'function') {
        await loadNavbar();
    }

    await loadAwardData();

    // ============================================
    // DATA LOADING & PARSING
    // ============================================
    async function loadAwardData() {
        try {
            const response = await fetch('/data/biography.csv');
            const data = await response.text();
            const rows = data.split('\n');

            if (rows.length < 2) return;

            // Parse header
            const header = parseCSVRow(rows[0]);

            // Parse all rows with awards
            const awardsRaw = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                const cols = parseCSVRow(row);
                if (cols.length < header.length) continue;

                const eventData = {};
                for (let j = 0; j < header.length && j < cols.length; j++) {
                    eventData[header[j]] = cols[j] ? cols[j].trim() : '';
                }

                const awardStr = eventData['Award'] || '';
                if (!awardStr) continue;

                // Filter by Note column: exclude rows containing 'memo' or 'uwasa'
                const note = eventData['Note'] || '';
                const noteWords = note.toLowerCase().split(',').map(w => w.trim());
                if (noteWords.includes('memo') || noteWords.includes('uwasa')) continue;

                // Parse date for year
                const dateStartStr = eventData['DateStart'];
                let year = 0;
                if (dateStartStr && dateStartStr.trim() !== '') {
                    const d = parseJSTDate(dateStartStr);
                    if (d) year = d.getUTCFullYear();
                }

                // Split compound awards
                const individualAwards = awardStr.split(',').map(a => a.trim()).filter(a => a);

                individualAwards.forEach(award => {
                    awardsRaw.push({
                        awardString: award,
                        title: eventData['Title'] || '',
                        name: eventData['Name'] || '',
                        worksType: eventData['WorksType'] || '',
                        url: eventData['URL'] || '',
                        year: year
                    });
                });
            }

            // Parse and group awards
            const groupedAwards = groupAwards(awardsRaw);

            // Render
            renderAwards(groupedAwards, awardsRaw);

        } catch (error) {
            console.error('Error loading award data:', error);
        }
    }

    // ============================================
    // CSV ROW PARSER
    // ============================================
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
            } else if (char !== '\r') {
                current += char;
            }
        }
        cols.push(current.trim());
        return cols;
    }

    // ============================================
    // AWARD PARSING & GROUPING
    // ============================================
    function parseAwardString(awardStr) {
        let kai = '';
        let rest = awardStr;

        // Extract 回 prefix (第XX回)
        const kaiMatch = awardStr.match(/^(第\d+回)/);
        if (kaiMatch) {
            kai = kaiMatch[1];
            rest = awardStr.substring(kai.length);
        }

        // Known prize suffixes to extract
        const prizeSuffixes = [
            '主演男優賞',
            '助演男優賞',
            '個人賞',
            '特別賞',
            '年間大賞'
        ];

        let baseName = rest;
        let prize = '';

        for (const suffix of prizeSuffixes) {
            if (rest.endsWith(suffix)) {
                baseName = rest.substring(0, rest.length - suffix.length);
                prize = suffix;
                break;
            }
        }

        baseName = baseName.trim();

        return { kai, baseName, prize, fullString: awardStr };
    }

    function groupAwards(awardsRaw) {
        const groupMap = {};

        awardsRaw.forEach(item => {
            const parsed = parseAwardString(item.awardString);
            const key = parsed.baseName;

            if (!groupMap[key]) {
                groupMap[key] = {
                    baseName: parsed.baseName,
                    entries: [],
                    prizeTypes: new Set(),
                    worksTypes: new Set(),
                    firstYear: Infinity
                };
            }

            // Track first appearance year (earliest year across all works)
            if (item.year > 0 && item.year < groupMap[key].firstYear) {
                groupMap[key].firstYear = item.year;
            }

            // Collect unique prize types for the card display
            if (parsed.prize) {
                groupMap[key].prizeTypes.add(parsed.prize);
            }

            // Find or create entry for this kai+prize combination
            const entryKey = parsed.kai + '|' + parsed.prize;
            let entry = groupMap[key].entries.find(e => (e.kai + '|' + e.prize) === entryKey);
            if (!entry) {
                entry = {
                    kai: parsed.kai,
                    prize: parsed.prize,
                    fullString: item.awardString,
                    works: []
                };
                groupMap[key].entries.push(entry);
            }

            entry.works.push({
                title: item.title,
                name: item.name,
                year: item.year,
                url: item.url,
                worksType: item.worksType,
                awardFullString: item.awardString
            });

            groupMap[key].worksTypes.add(item.worksType);
        });

        // Sort entries within each group by kai number ascending
        Object.values(groupMap).forEach(group => {
            group.entries.sort((a, b) => {
                const aNum = parseInt((a.kai.match(/\d+/) || [0])[0]);
                const bNum = parseInt((b.kai.match(/\d+/) || [0])[0]);
                return aNum - bNum;
            });
        });

        return groupMap;
    }

    // ============================================
    // CATEGORIZE BY WORKS TYPE
    // ============================================
    function categorizeByType(groupMap) {
        const movieAwards = {};
        const tvAwards = {};

        Object.keys(groupMap).forEach(key => {
            const group = groupMap[key];
            const types = Array.from(group.worksTypes);

            const hasMovie = types.includes('映画');
            const hasTV = types.includes('TV');

            if (hasMovie) {
                movieAwards[key] = group;
            }
            if (hasTV) {
                tvAwards[key] = group;
            }
            if (!hasMovie && !hasTV) {
                movieAwards[key] = group;
            }
        });

        return { movieAwards, tvAwards };
    }

    // ============================================
    // STATS COUNTING
    // ============================================
    function countUniqueWorks(awardsRaw) {
        const worksSet = new Set();
        awardsRaw.forEach(item => {
            const workKey = item.title + '|' + item.year;
            worksSet.add(workKey);
        });
        return worksSet.size;
    }

    function countUniqueTimes(awardsRaw) {
        // Times = number of unique award strings (unique ceremonies)
        const awardSet = new Set();
        awardsRaw.forEach(item => {
            awardSet.add(item.awardString);
        });
        return awardSet.size;
    }

    // ============================================
    // RENDERING
    // ============================================
    function renderAwards(groupMap, awardsRaw) {
        const container = document.getElementById('award-container');
        container.innerHTML = '';

        // Stats: X awards (unique award names), Y times (unique ceremonies), Z works (unique works)
        const totalAwardTypes = Object.keys(groupMap).length;
        const totalTimes = countUniqueTimes(awardsRaw);
        const totalWorks = countUniqueWorks(awardsRaw);

        const statsSummary = document.getElementById('stats-summary');
        statsSummary.innerHTML = `
            <div class="stat-item">
                <span class="stat-number">${totalAwardTypes}</span>
                <span>Awards</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${totalTimes}</span>
                <span>Times</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${totalWorks}</span>
                <span>Works</span>
            </div>
        `;

        const { movieAwards, tvAwards } = categorizeByType(groupMap);

        // Render 映画 section
        if (Object.keys(movieAwards).length > 0) {
            const movieSection = renderCategorySection('映画', movieAwards);
            container.appendChild(movieSection);
        }

        // Render TV section
        if (Object.keys(tvAwards).length > 0) {
            const tvSection = renderCategorySection('TV', tvAwards);
            container.appendChild(tvSection);
        }
    }

    function renderCategorySection(categoryName, awards) {
        const section = document.createElement('div');
        section.className = 'award-category-section';

        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = categoryName;
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'awards-grid';

        // Sort award groups by first appearance date ascending (earliest first)
        const sortedKeys = Object.keys(awards).sort((a, b) => {
            const aFirst = awards[a].firstYear || 0;
            const bFirst = awards[b].firstYear || 0;
            return aFirst - bFirst;
        });

        sortedKeys.forEach((key, index) => {
            const group = awards[key];
            const wrapper = renderAwardCard(group, index);
            grid.appendChild(wrapper);
        });

        section.appendChild(grid);
        return section;
    }

    function renderAwardCard(group, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'award-card-wrapper';
        wrapper.style.animationDelay = `${index * 0.08}s`;

        // Award card — only name centered + prize types in one row below
        const card = document.createElement('div');
        card.className = 'award-card';

        const nameEl = document.createElement('div');
        nameEl.className = 'award-card-name';
        nameEl.textContent = group.baseName;
        card.appendChild(nameEl);

        // Prize types row
        const prizeTypes = Array.from(group.prizeTypes);
        if (prizeTypes.length > 0) {
            const prizesRow = document.createElement('div');
            prizesRow.className = 'award-card-prizes';

            prizeTypes.forEach(prize => {
                const tag = document.createElement('span');
                tag.className = 'award-prize-tag';
                tag.textContent = prize;
                prizesRow.appendChild(tag);
            });

            card.appendChild(prizesRow);
        }

        wrapper.appendChild(card);

        // Works panel (hidden by default)
        const worksPanel = document.createElement('div');
        worksPanel.className = 'works-panel';

        const worksPanelInner = document.createElement('div');
        worksPanelInner.className = 'works-panel-inner';

        // Group works by specific award entry
        group.entries.forEach(entry => {
            const entrySection = document.createElement('div');
            entrySection.className = 'award-entry-section';
            
            const entryHeader = document.createElement('div');
            entryHeader.className = 'award-entry-header';
            
            const kaiSpan = document.createElement('span');
            kaiSpan.className = 'award-entry-header-kai';
            kaiSpan.textContent = entry.kai;
            entryHeader.appendChild(kaiSpan);
            
            const prizeSpan = document.createElement('span');
            prizeSpan.textContent = entry.prize;
            entryHeader.appendChild(prizeSpan);
            
            entrySection.appendChild(entryHeader);
            
            const entryWorksContainer = document.createElement('div');
            entryWorksContainer.className = 'award-entry-works';
            
            // Sort works within this entry by year ascending
            const works = [...entry.works].sort((a, b) => a.year - b.year);
            const uniqueWorks = [];
            works.forEach(w => {
                if (!uniqueWorks.find(uw => uw.title === w.title && uw.year === w.year)) {
                    uniqueWorks.push(w);
                }
            });
            
            uniqueWorks.forEach(work => {
                const workCard = document.createElement('a');
                workCard.className = 'work-card';
                workCard.href = work.url;
                workCard.target = '_blank';
                workCard.rel = 'noopener noreferrer';

                const row1 = document.createElement('div');
                row1.className = 'work-card-row1';

                const titleEl = document.createElement('span');
                titleEl.className = 'work-card-title';
                titleEl.textContent = work.title || work.name;
                row1.appendChild(titleEl);

                const yearEl = document.createElement('span');
                yearEl.className = 'work-card-year';
                yearEl.textContent = work.year;
                row1.appendChild(yearEl);

                workCard.appendChild(row1);
                entryWorksContainer.appendChild(workCard);
            });
            
            entrySection.appendChild(entryWorksContainer);
            worksPanelInner.appendChild(entrySection);
        });

        worksPanel.appendChild(worksPanelInner);
        wrapper.appendChild(worksPanel);

        // Click to toggle works panel
        card.addEventListener('click', () => {
            const isExpanded = card.classList.contains('expanded');

            // Close all other expanded cards
            document.querySelectorAll('.award-card.expanded').forEach(c => {
                c.classList.remove('expanded');
            });
            document.querySelectorAll('.works-panel.open').forEach(p => {
                p.classList.remove('open');
            });

            // Toggle this card
            if (!isExpanded) {
                card.classList.add('expanded');
                worksPanel.classList.add('open');
            }
        });

        return wrapper;
    }
});
