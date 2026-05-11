const JAPAN_TILE_PREFS = [
    // hokkaido
    { name: '北海道', col: 15, row: 1, colspan: 2, rowspan: 2, region: 'hokkaido' },
    // tohoku
    { name: '青森', col: 15, row: 4, colspan: 2, rowspan: 1, region: 'tohoku' },
    { name: '秋田', col: 15, row: 5, colspan: 1, rowspan: 1, region: 'tohoku' },
    { name: '岩手', col: 16, row: 5, colspan: 1, rowspan: 1, region: 'tohoku' },
    { name: '山形', col: 15, row: 6, colspan: 1, rowspan: 1, region: 'tohoku' },
    { name: '宮城', col: 16, row: 6, colspan: 1, rowspan: 1, region: 'tohoku' },
    { name: '福島', col: 15, row: 7, colspan: 2, rowspan: 1, region: 'tohoku' },
    // kanto
    { name: '群馬', col: 14, row: 8, colspan: 1, rowspan: 1, region: 'kanto' },
    { name: '栃木', col: 15, row: 8, colspan: 1, rowspan: 1, region: 'kanto' },
    { name: '茨城', col: 16, row: 8, colspan: 1, rowspan: 2, region: 'kanto' },
    { name: '山梨', col: 14, row: 9, colspan: 1, rowspan: 1, region: 'kanto' },
    { name: '埼玉', col: 15, row: 9, colspan: 1, rowspan: 1, region: 'kanto' },
    { name: '東京都', col: 15, row: 10, colspan: 1, rowspan: 1, region: 'kanto' },
    { name: '千葉', col: 16, row: 10, colspan: 1, rowspan: 2, region: 'kanto' },
    { name: '神奈川', col: 15, row: 11, colspan: 1, rowspan: 1, region: 'kanto' },
    // chubu
    { name: '新潟', col: 13, row: 7, colspan: 2, rowspan: 1, region: 'chubu' },
    { name: '石川', col: 11, row: 8, colspan: 1, rowspan: 1, region: 'chubu' },
    { name: '富山', col: 12, row: 8, colspan: 1, rowspan: 1, region: 'chubu' },
    { name: '長野', col: 13, row: 8, colspan: 1, rowspan: 2, region: 'chubu' },
    { name: '福井', col: 10, row: 9, colspan: 2, rowspan: 1, region: 'chubu' },
    { name: '岐阜', col: 12, row: 9, colspan: 1, rowspan: 2, region: 'chubu' },
    { name: '静岡', col: 13, row: 10, colspan: 2, rowspan: 1, region: 'chubu' },
    { name: '愛知', col: 12, row: 11, colspan: 1, rowspan: 1, region: 'chubu' },
    // kinki
    { name: '三重', col: 11, row: 11, colspan: 1, rowspan: 1, region: 'kinki' },
    { name: '京都', col: 9, row: 9, colspan: 1, rowspan: 1, region: 'kinki' },
    { name: '滋賀', col: 10, row: 10, colspan: 2, rowspan: 1, region: 'kinki' },
    { name: '大阪', col: 9, row: 10, colspan: 1, rowspan: 1, region: 'kinki' },
    { name: '兵庫', col: 8, row: 9, colspan: 1, rowspan: 2, region: 'kinki' },
    { name: '奈良', col: 10, row: 11, colspan: 1, rowspan: 1, region: 'kinki' },
    { name: '和歌山', col: 9, row: 11, colspan: 1, rowspan: 1, region: 'kinki' },
    // chugoku
    { name: '島根', col: 6, row: 9, colspan: 1, rowspan: 1, region: 'chugoku' },
    { name: '鳥取', col: 7, row: 9, colspan: 1, rowspan: 1, region: 'chugoku' },
    { name: '山口', col: 5, row: 9, colspan: 1, rowspan: 2, region: 'chugoku' },
    { name: '広島', col: 6, row: 10, colspan: 1, rowspan: 1, region: 'chugoku' },
    { name: '岡山', col: 7, row: 10, colspan: 1, rowspan: 1, region: 'chugoku' },
    // shikoku
    { name: '愛媛', col: 6, row: 12, colspan: 1, rowspan: 1, region: 'shikoku' },
    { name: '香川', col: 7, row: 12, colspan: 1, rowspan: 1, region: 'shikoku' },
    { name: '高知', col: 6, row: 13, colspan: 1, rowspan: 1, region: 'shikoku' },
    { name: '徳島', col: 7, row: 13, colspan: 1, rowspan: 1, region: 'shikoku' },
    // kyushu
    { name: '長崎', col: 1, row: 9, colspan: 1, rowspan: 2, region: 'kyushu' },
    { name: '佐賀', col: 2, row: 9, colspan: 1, rowspan: 2, region: 'kyushu' },
    { name: '福岡', col: 3, row: 9, colspan: 2, rowspan: 1, region: 'kyushu' },
    { name: '熊本', col: 3, row: 10, colspan: 1, rowspan: 1, region: 'kyushu' },
    { name: '大分', col: 4, row: 10, colspan: 1, rowspan: 1, region: 'kyushu' },
    { name: '鹿児島', col: 3, row: 11, colspan: 1, rowspan: 2, region: 'kyushu' },
    { name: '宮崎', col: 4, row: 11, colspan: 1, rowspan: 2, region: 'kyushu' },
    { name: '沖縄', col: 1, row: 13, colspan: 1, rowspan: 1, region: 'kyushu' },
];

const REGION_COLORS = {
    hokkaido: { base: '#388e3c', text: '#fff' },
    tohoku: { base: '#1976d2', text: '#fff' },
    kanto: { base: '#64b5f6', text: '#fff' },
    chubu: { base: '#43a047', text: '#fff' },
    kinki: { base: '#8e24aa', text: '#fff' },
    chugoku: { base: '#f57c00', text: '#fff' },
    shikoku: { base: '#e53935', text: '#fff' },
    kyushu: { base: '#f06292', text: '#fff' },
};

const VENUE_PREFECTURE_MAP = (() => {
    const lists = {
        '東京': [
            '東京新橋演舞場', '東京シアタークリエ', '新国立劇場', '銀座ヤマハホール',
            '世田谷パブリックシアター', 'PARCO劇場', '俳優座劇場', '下北沢駅前劇場',
            '下北沢OFFOFFシアター', "六本木Bar,isn't it", 'シアタートラム', 'シアターコクーン',
            '紀伊國屋サザンシアター', '東京グローブ座', '中野スタジオあくとれ', 'シアターVアカサカ',
            '六本木・キャラメル', '恵比寿EAST GALLERY', 'シアターサンモール', '新宿シアタートップス',
            '早大劇研アトリエ', '早大劇研大隈講堂裏特設テント'
        ],
        '大阪': ['大阪梅田芸術劇場', '近鉄小劇場'],
        '福岡': ['メルパルクホール福岡', '福岡サンパレス'],
        '新潟': ['新潟市民芸術文化会館', '苗場プリンスホテル'],
        '宮崎': ['宮崎県立芸術劇場'],
        '愛知': ['名古屋市民会館'],
        '宮城': ['仙台銀行ホール'],
        '長野': ['松本まつもと市民芸術館'],
        '山口': ['山口情報芸術センター'],
        '神奈川': ['相鉄本多劇場']
    };
    
    const map = {};
    for (const pref in lists) {
        lists[pref].forEach(venue => map[venue] = pref);
    }
    return map;
})();

const japanMapState = { initialized: false, prefWorks: {}, placeUrls: {}, dismissalBound: false };

function splitJapanVenueList(placeText) {
    if (!placeText) return [];
    const parts = placeText.split(',').map(v => v.trim()).filter(Boolean);
    const venues = [];

    for (let i = 0; i < parts.length; i++) {
        let matchedVenue = '';
        let matchedEnd = i;
        let candidate = '';

        for (let j = i; j < parts.length; j++) {
            candidate = candidate ? `${candidate},${parts[j]}` : parts[j];
            if (VENUE_PREFECTURE_MAP[candidate]) {
                matchedVenue = candidate;
                matchedEnd = j;
            }
        }

        if (matchedVenue) {
            venues.push(matchedVenue);
            i = matchedEnd;
        } else {
            venues.push(parts[i]);
        }
    }

    return venues;
}

function getJapanTileGridPosition(pref) {
    return {
        gridColumn: `${pref.col} / span ${pref.colspan || 1}`,
        gridRow: `${pref.row} / span ${pref.rowspan || 1}`
    };
}

function buildJapanPrefectureWorksMap(biographyData) {
    const prefWorks = {};
    biographyData.forEach(item => {
        if (!item.Place || !item.Place.trim()) return;
        const note = (item.Note || '').toLowerCase();
        if (note.includes('memo') || note.includes('uwasa')) return;
        splitJapanVenueList(item.Place).forEach(venue => {
            const prefName = VENUE_PREFECTURE_MAP[venue];
            if (!prefName) return;
            if (!prefWorks[prefName]) prefWorks[prefName] = [];
            if (!prefWorks[prefName].some(w => w.title === item.Title && w.place === venue)) {
                prefWorks[prefName].push({
                    title: item.Title, role: item.Role || '',
                    worksType: item.WorksType || '', dateStart: item.DateStart || '',
                    dateEnd: item.DateEnd || '', place: venue, url: item.URL || ''
                });
            }
        });
    });
    return prefWorks;
}

function initJapanPrefectureMap(biographyData) {
    const container = document.getElementById('japan-map-container');
    if (!container) return;

    if (Object.keys(japanMapState.placeUrls).length === 0) {
        fetch('data/place.csv')
            .then(res => res.text())
            .then(csvText => {
                const places = parseCSV(csvText);
                places.forEach(p => {
                    if (p.Name && p.URL) {
                        japanMapState.placeUrls[p.Name] = p.URL;
                    }
                });
            })
            .catch(err => console.error('Error loading place.csv:', err))
            .finally(() => {
                finalizeInitJapanMap(biographyData);
            });
    } else {
        finalizeInitJapanMap(biographyData);
    }
}

function finalizeInitJapanMap(biographyData) {
    japanMapState.prefWorks = buildJapanPrefectureWorksMap(biographyData);
    japanMapState.initialized = true;
    renderJapanTileMap(japanMapState.prefWorks);
}

function renderJapanTileMap(prefWorks) {
    const container = document.getElementById('japan-map-container');
    if (!container) return;
    container.innerHTML = '';

    const mapDiv = document.createElement('div');
    mapDiv.id = 'japan-tile-map';

    JAPAN_TILE_PREFS.forEach((pref) => {
        const {
            name,
            region
        } = pref;
        const key = name.replace(/[都道府県]$/, '');
        const works = prefWorks[key] || prefWorks[name] || [];
        const hasWorks = works.length > 0;
        const colors = REGION_COLORS[region];
        const position = getJapanTileGridPosition(pref);

        const tile = document.createElement('div');
        tile.className = 'japan-tile' + (hasWorks ? ' has-works' : '');
        tile.style.gridColumn = position.gridColumn;
        tile.style.gridRow = position.gridRow;
        tile.style.setProperty('--tile-bg', colors.base);
        tile.style.setProperty('--tile-color', colors.text);
        tile.title = name + (hasWorks ? ` (${works.length}件)` : '');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        tile.appendChild(nameSpan);

        if (hasWorks) {
            tile.addEventListener('click', e => {
                e.stopPropagation();
                document.querySelectorAll('.japan-tile').forEach(t => t.classList.remove('active'));
                tile.classList.add('active');
                showJapanPrefectureDetail({ name }, works);
            });
        }
        mapDiv.appendChild(tile);
    });

    container.appendChild(mapDiv);

    const detailPanel = document.createElement('div');
    detailPanel.id = 'japan-pref-detail';
    detailPanel.style.display = 'none';
    container.appendChild(detailPanel);

    if (!japanMapState.dismissalBound) {
        document.addEventListener('click', e => {
            const panel = document.getElementById('japan-pref-detail');
            const map = document.getElementById('japan-tile-map');
            if (panel && panel.style.display === 'block'
                && map
                && !panel.contains(e.target) && !map.contains(e.target)) {
                panel.style.display = 'none';
                document.querySelectorAll('.japan-tile').forEach(t => t.classList.remove('active'));
            }
        });
        japanMapState.dismissalBound = true;
    }
}

function showJapanPrefectureDetail(pref, works) {
    const panel = document.getElementById('japan-pref-detail');
    if (!panel) return;

    const worksByVenue = {};
    works.forEach(w => {
        if (!worksByVenue[w.place]) worksByVenue[w.place] = [];
        worksByVenue[w.place].push(w);
    });

    const sortedVenues = Object.keys(worksByVenue).sort((a, b) => {
        const latestA = worksByVenue[a].reduce((max, w) => (w.dateStart || '') > max ? (w.dateStart || '') : max, '');
        const latestB = worksByVenue[b].reduce((max, w) => (w.dateStart || '') > max ? (w.dateStart || '') : max, '');
        return latestB.localeCompare(latestA);
    });

    const venueGroupsHTML = sortedVenues.map(venue => {
        const venueWorks = worksByVenue[venue].sort((a, b) => (a.dateStart || '').localeCompare(b.dateStart || ''));
        const venueUrl = japanMapState.placeUrls[venue] || '';
        const tagHtml = venueUrl
            ? `<span class="japan-pref-venue-tag" onclick="window.open('${venueUrl}','_blank','noopener')" style="cursor:pointer" title="${venue}">${venue}</span>`
            : `<span class="japan-pref-venue-tag">${venue}</span>`;

        return `
            <div class="japan-pref-venue-left">
                ${tagHtml}
            </div>
            <div class="japan-pref-venue-right">
                ${venueWorks.map(w => `
                    <div class="japan-pref-work-card activity-stage"
                        ${w.url ? `onclick="window.open('${w.url}','_blank','noopener')" style="cursor:pointer"` : ''}>
                        <div class="jpw-title">${w.title}</div>
                        <div class="jpw-meta">${w.dateStart}${w.dateEnd && w.dateEnd !== w.dateStart ? ' ~ ' + w.dateEnd : ''}</div>
                        ${w.role ? `<div class="jpw-role">${w.role}</div>` : ''}
                    </div>
                `).join('')}
            </div>`;
    }).join('');

    panel.innerHTML = `
        <div class="japan-pref-detail-header">
            <h3>${pref.name} <span class="pref-count">${works.length}件</span></h3>
            <button class="japan-pref-close" onclick="
                document.getElementById('japan-pref-detail').style.display='none';
                document.querySelectorAll('.japan-tile').forEach(t=>t.classList.remove('active'))
            ">×</button>
        </div>
        <div class="japan-pref-detail-content">
            ${venueGroupsHTML}
        </div>`;
    panel.style.display = 'block';
}
