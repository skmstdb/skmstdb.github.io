// JST (Japan Standard Time) Utility Functions - Refactored
// JST is UTC+9
// All functions ensure consistent Japan time display regardless of user's timezone
// 
// CRITICAL: This module uses a hybrid approach:
// - Internal calculations work with Date objects using ONLY UTC methods
// - Date objects are shifted by +9 hours so UTC methods return JST values
// - NEVER use local time methods (getFullYear, getDate, etc.) - they will be wrong!
// - Always use UTC methods (getUTCFullYear, getUTCDate, etc.)

const JST_OFFSET_MS = 9 * 3600000; // 9 hours in milliseconds

/**
 * Get current date and time in JST
 * Returns a Date object that has been shifted so that UTC methods return JST values
 * 
 * IMPORTANT: Only use UTC methods on the returned Date object
 * ✓ Correct: date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()
 * ✗ Wrong: date.getFullYear(), date.getMonth(), date.getDate()
 * 
 * @returns {Date} Date object representing JST time (use UTC methods only)
 */
function getJSTNow() {
    const now = new Date();
    // Create a new Date that is shifted by +9 hours
    // When we call UTC methods on this date, we get JST values
    return new Date(now.getTime() + JST_OFFSET_MS);
}

/**
 * Parse a date string as JST
 * Accepts formats: YYYY/MM/DD, YYYY-MM-DD
 * 
 * @param {string} dateString - Date string to parse (assumes JST date)
 * @returns {Date|null} Date object representing JST date (use UTC methods), or null if invalid
 * 
 * Example: parseJSTDate("2024-12-07") returns a Date where:
 * - getUTCFullYear() returns 2024
 * - getUTCMonth() returns 11 (December, 0-indexed)
 * - getUTCDate() returns 7
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

    // Create a UTC date at midnight
    // The UTC values will represent JST date
    const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    return date;
}

/**
 * Format a date as YYYY-MM-DD in JST
 * 
 * @param {Date} date - Date to format (expects a date from getJSTNow or parseJSTDate)
 * @returns {string|null} Formatted date string, or null if invalid
 */
function formatJSTDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
    }

    // Use UTC methods - our dates are stored so UTC methods return JST values
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Format a date for display in Japanese format (JST)
 * 
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string in Japanese (e.g., "2024年12月7日")
 */
function formatJSTDateJapanese(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }

    // Use UTC methods to get JST values
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    return `${year}年${month}月${day}日`;
}

/**
 * Format a date with time in Japanese format (JST)
 * 
 * @param {Date} date - Date to format
 * @returns {string} Formatted datetime string in Japanese (e.g., "2024年12月7日 15:30:45")
 */
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

/**
 * Get the next JST midnight (00:00:00)
 * 
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
 * Useful for countdown timers or scheduling tasks
 * 
 * @returns {number} Milliseconds until next JST midnight
 */
function getMillisecondsUntilJSTMidnight() {
    const now = getJSTNow();
    const midnight = getJSTMidnight();
    return midnight.getTime() - now.getTime();
}

/**
 * Get current year in JST
 * 
 * @returns {number} Current year in JST
 */
function getJSTYear() {
    return getJSTNow().getUTCFullYear();
}

/**
 * Get current month in JST (0-indexed)
 * 
 * @returns {number} Current month in JST (0-11, where 0=January, 11=December)
 */
function getJSTMonth() {
    return getJSTNow().getUTCMonth();
}

/**
 * Get current date (day of month) in JST
 * 
 * @returns {number} Current date in JST (1-31)
 */
function getJSTDate() {
    return getJSTNow().getUTCDate();
}

/**
 * Get current hour in JST (24-hour format)
 * 
 * @returns {number} Current hour in JST (0-23)
 */
function getJSTHours() {
    return getJSTNow().getUTCHours();
}

/**
 * Get current minutes in JST
 * 
 * @returns {number} Current minutes in JST (0-59)
 */
function getJSTMinutes() {
    return getJSTNow().getUTCMinutes();
}

/**
 * Get current seconds in JST
 * 
 * @returns {number} Current seconds in JST (0-59)
 */
function getJSTSeconds() {
    return getJSTNow().getUTCSeconds();
}

/**
 * Create a Date object representing a specific JST date/time
 * The returned Date object should only be used with UTC methods
 * 
 * @param {number} year - Year
 * @param {number} month - Month (0-indexed, 0=January)
 * @param {number} day - Day of month (1-31)
 * @param {number} hour - Hour (0-23, default: 0)
 * @param {number} minute - Minute (0-59, default: 0)
 * @param {number} second - Second (0-59, default: 0)
 * @returns {Date} Date object representing the JST date/time
 */
function createJSTDate(year, month, day, hour = 0, minute = 0, second = 0) {
    // Create UTC date representing JST time
    return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Check if two dates are the same day in JST
 * 
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same day in JST
 */
function isSameJSTDay(date1, date2) {
    if (!date1 || !date2) return false;

    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
}

/**
 * Check if a date is today in JST
 * 
 * @param {Date} date - Date to check
 * @returns {boolean} True if the date is today in JST
 */
function isJSTToday(date) {
    return isSameJSTDay(date, getJSTNow());
}

/**
 * Get the difference in days between two JST dates
 * 
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Number of days between dates (can be negative)
 */
function getJSTDaysDifference(date1, date2) {
    if (!date1 || !date2) return 0;
    
    const ms1 = date1.getTime();
    const ms2 = date2.getTime();
    const diffMs = ms1 - ms2;
    
    return Math.floor(diffMs / (24 * 3600000));
}

/**
 * Unified date formatting function (wrapper for formatJSTDate)
 * This provides a consistent interface across all files
 * 
 * @param {Date} date - Date to format
 * @returns {string|null} Formatted date string as YYYY-MM-DD, or null if invalid
 */
function formatDate(date) {
    return formatJSTDate(date);
}

/**
 * Convert any Date object to JST
 * Takes a regular Date object and returns a JST-adjusted Date
 * 
 * @param {Date} date - Any Date object
 * @returns {Date} JST-adjusted Date object (use UTC methods)
 */
function toJST(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
    }
    return new Date(date.getTime() + JST_OFFSET_MS);
}

/**
 * Get a human-readable string of current JST time
 * For debugging or display purposes
 * 
 * @returns {string} Current JST time as string (e.g., "2024-12-07 15:30:45 JST")
 */
function getJSTNowString() {
    const now = getJSTNow();
    const date = formatJSTDate(now);
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    return `${date} ${hours}:${minutes}:${seconds} JST`;
}

// Export all functions if using modules
// Uncomment if using ES6 modules:
/*
export {
    getJSTNow,
    parseJSTDate,
    formatJSTDate,
    formatJSTDateJapanese,
    formatJSTDateTimeJapanese,
    getJSTMidnight,
    getMillisecondsUntilJSTMidnight,
    getJSTYear,
    getJSTMonth,
    getJSTDate,
    getJSTHours,
    getJSTMinutes,
    getJSTSeconds,
    createJSTDate,
    isSameJSTDay,
    isJSTToday,
    getJSTDaysDifference,
    formatDate,
    toJST,
    getJSTNowString
};
*/
