// JST (Japan Standard Time) Utility Functions
// JST is UTC+9

/**
 * Get current date and time in JST
 * @returns {Date} Current date/time in JST
 */
function getJSTNow() {
    const now = new Date();
    // Convert to JST by getting UTC time and adding 9 hours
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jstTime = new Date(utc + (9 * 3600000));
    return jstTime;
}

/**
 * Parse a date string as JST
 * Accepts formats: YYYY/MM/DD, YYYY-MM-DD
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Date object in JST, or null if invalid
 */
function parseJSTDate(dateString) {
    if (!dateString || dateString.trim() === '') return null;

    // Handle both YYYY/MM/DD and YYYY-MM-DD formats
    const normalized = dateString.trim().replace(/\//g, '-');
    const parts = normalized.split('-');

    if (parts.length !== 3) return null;

    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Month is 0-indexed
    const day = parseInt(parts[2]);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    // Create date in JST (UTC+9)
    // We create a UTC date and then adjust it to represent JST
    const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    // Subtract 9 hours to get the UTC time that represents JST midnight
    date.setUTCHours(date.getUTCHours() - 9);

    return date;
}

/**
 * Format a date as YYYY-MM-DD in JST
 * @param {Date} date - Date to format
 * @returns {string|null} Formatted date string, or null if invalid
 */
function formatJSTDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
    }

    // Convert to JST
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const jstDate = new Date(utc + (9 * 3600000));

    const year = jstDate.getFullYear();
    const month = String(jstDate.getMonth() + 1).padStart(2, '0');
    const day = String(jstDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Format a date for display in Japanese format (JST)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string in Japanese
 */
function formatJSTDateJapanese(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }

    // Convert to JST
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const jstDate = new Date(utc + (9 * 3600000));

    return jstDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Tokyo'
    });
}

/**
 * Get the next JST midnight (00:00:00)
 * @returns {Date} Next JST midnight
 */
function getJSTMidnight() {
    const now = getJSTNow();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Set to next midnight
    return midnight;
}

/**
 * Get milliseconds until next JST midnight
 * @returns {number} Milliseconds until next JST midnight
 */
function getMillisecondsUntilJSTMidnight() {
    const now = getJSTNow();
    const midnight = getJSTMidnight();
    return midnight.getTime() - now.getTime();
}

/**
 * Get current year in JST
 * @returns {number} Current year in JST
 */
function getJSTYear() {
    return getJSTNow().getFullYear();
}

/**
 * Get current month in JST (0-indexed)
 * @returns {number} Current month in JST (0-11)
 */
function getJSTMonth() {
    return getJSTNow().getMonth();
}

/**
 * Get current date (day of month) in JST
 * @returns {number} Current date in JST (1-31)
 */
function getJSTDate() {
    return getJSTNow().getDate();
}

/**
 * Create a Date object representing a specific JST date/time
 * @param {number} year - Year
 * @param {number} month - Month (0-indexed)
 * @param {number} day - Day of month
 * @param {number} hour - Hour (default: 0)
 * @param {number} minute - Minute (default: 0)
 * @param {number} second - Second (default: 0)
 * @returns {Date} Date object representing the JST date/time
 */
function createJSTDate(year, month, day, hour = 0, minute = 0, second = 0) {
    // Create UTC date and subtract 9 hours to represent JST
    const date = new Date(Date.UTC(year, month, day, hour, minute, second));
    date.setUTCHours(date.getUTCHours() - 9);
    return date;
}

/**
 * Check if two dates are the same day in JST
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same day in JST
 */
function isSameJSTDay(date1, date2) {
    if (!date1 || !date2) return false;

    const jst1 = formatJSTDate(date1);
    const jst2 = formatJSTDate(date2);

    return jst1 === jst2;
}
