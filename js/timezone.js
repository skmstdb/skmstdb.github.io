const JST_OFFSET_MS = 9 * 3600000;

function getJSTNow() {
    const now = new Date();
    return new Date(now.getTime() + JST_OFFSET_MS);
}

function parseJSTDate(dateString) {
    if (!dateString || dateString.trim() === '') return null;

    const normalized = dateString.trim().replace(/\//g, '-');
    const parts = normalized.split('-');

    if (parts.length !== 3) return null;

    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    
    // Validate date ranges
    if (month < 0 || month > 11) return null;
    if (day < 1 || day > 31) return null;

    const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    
    // Verify the date is valid (e.g., not Feb 31)
    if (date.getUTCFullYear() !== year || 
        date.getUTCMonth() !== month || 
        date.getUTCDate() !== day) {
        return null;
    }

    return date;
}

function formatJSTDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
    }

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatJSTDateJapanese(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    return `${year}年${month}月${day}日`;
}

function formatJSTDateTimeJapanese(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}

function getJSTMidnight() {
    const now = getJSTNow();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();

    const midnight = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
    return midnight;
}

function getMillisecondsUntilJSTMidnight() {
    const now = getJSTNow();
    const midnight = getJSTMidnight();
    return midnight.getTime() - now.getTime();
}

function getJSTYear() {
    return getJSTNow().getUTCFullYear();
}

function getJSTMonth() {
    return getJSTNow().getUTCMonth();
}

function getJSTDate() {
    return getJSTNow().getUTCDate();
}

function getJSTHours() {
    return getJSTNow().getUTCHours();
}

function getJSTMinutes() {
    return getJSTNow().getUTCMinutes();
}

function getJSTSeconds() {
    return getJSTNow().getUTCSeconds();
}

function createJSTDate(year, month, day, hour = 0, minute = 0, second = 0) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function isSameJSTDay(date1, date2) {
    if (!date1 || !date2) return false;

    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
}

function isJSTToday(date) {
    return isSameJSTDay(date, getJSTNow());
}

function getJSTDaysDifference(date1, date2) {
    if (!date1 || !date2) return 0;
    
    const ms1 = date1.getTime();
    const ms2 = date2.getTime();
    const diffMs = ms1 - ms2;
    
    return Math.floor(diffMs / (24 * 3600000));
}

function formatDate(date) {
    return formatJSTDate(date);
}

function toJST(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
    }
    return new Date(date.getTime() + JST_OFFSET_MS);
}

function getJSTNowString() {
    const now = getJSTNow();
    const date = formatJSTDate(now);
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    return `${date} ${hours}:${minutes}:${seconds} JST`;
}
