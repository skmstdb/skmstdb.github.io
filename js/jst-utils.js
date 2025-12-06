// JST (Japan Standard Time) Utility Functions
// JST is UTC+9
// All functions ensure consistent Japan time display regardless of user's timezone

/**
 * Get current date and time in JST
 * @returns {Date} Current date/time representing JST (stored as UTC+9)
 */
function getJSTNow() {
    const now = new Date();
    // Get current UTC time in milliseconds
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    // Add 9 hours for JST (UTC+9)
    const jstTime = new Date(utcTime + (9 * 3600000));
    return jstTime;
}

/**
 * Parse a date string as JST
 * Accepts formats: YYYY/MM/DD, YYYY-MM-DD
 * @param {string} dateString - Date string to parse (dates in CSV are in JST)
 * @returns {Date|null} Date object representing JST date, or null if invalid
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

    // Create a UTC date representing JST midnight
    // We store the date as UTC, but it represents the JST date
    // This way, when we use getUTCFullYear(), getUTCMonth(), getUTCDate()
    // we get the JST values consistently across all timezones
    const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

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

    // Use UTC methods since our dates are stored as UTC representing JST
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

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

    // Use UTC methods to get JST values
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    // Format in Japanese style
    return `${year}年${month}月${day}日`;
}

/**
 * Get the next JST midnight (00:00:00)
 * @returns {Date} Next JST midnight
 */
function getJSTMidnight() {
    const now = getJSTNow();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();

    // Create midnight of next day in JST
    const midnight = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
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
    return getJSTNow().getUTCFullYear();
}

/**
 * Get current month in JST (0-indexed)
 * @returns {number} Current month in JST (0-11)
 */
function getJSTMonth() {
    return getJSTNow().getUTCMonth();
}

/**
 * Get current date (day of month) in JST
 * @returns {number} Current date in JST (1-31)
 */
function getJSTDate() {
    return getJSTNow().getUTCDate();
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
    // Create UTC date representing JST time
    return new Date(Date.UTC(year, month, day, hour, minute, second));
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

/**
 * Unified date formatting function (wrapper for formatJSTDate)
 * This provides a consistent interface across all files
 * @param {Date} date - Date to format
 * @returns {string|null} Formatted date string as YYYY-MM-DD, or null if invalid
 */
function formatDate(date) {
    return formatJSTDate(date);
}
