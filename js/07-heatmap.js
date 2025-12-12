class HeatmapManager {
    constructor(container, activityData = []) {
        this.container = container;
        this.activityData = activityData;
        this.state = {
            isExpanded: false,
            currentYear: null,
            expandedElement: null,
            targetYearItem: null,
            isAnimating: false
        };

        this.renderer = new HeatmapRenderer();
        this.animationController = new AnimationController();
        this.responsiveController = new ResponsiveController(this);

        this.isEnabled = false;
        this.clickHandler = null;
        this.outsideClickHandler = null;

        // Performance optimization: Cache processed year data
        this.yearDataCache = new Map();
        this.maxCacheSize = 10; // Limit cache size to prevent memory leaks

        // Performance optimization: Debounced handlers
        this.debouncedHandlers = new Map();

        // Memory management: Track created elements for cleanup
        this.createdElements = new WeakSet();
        this.eventListeners = new Map();

        // Performance monitoring
        this.performanceMetrics = {
            heatmapCreations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageRenderTime: 0,
            lastRenderTime: 0
        };

        this.init();
    }

    init() {
        // Set up responsive monitoring
        this.responsiveController.setupBreakpointMonitoring();

        // Enable/disable based on initial viewport
        if (this.responsiveController.isDesktopOrTablet()) {
            this.enableHeatmapInteraction();
        }
    }

    /**
     * Enable heatmap click interactions for desktop/tablet
     */
    enableHeatmapInteraction() {
        if (this.isEnabled) return;

        this.isEnabled = true;

        // Set up click handler for year items
        this.clickHandler = (event) => {
            const yearItem = event.target.closest('.year-item');
            if (yearItem) {
                console.log('Year item clicked:', yearItem.getAttribute('data-year'));
                this.handleYearItemClick(yearItem, event);
            }
        };

        // Set up outside click handler for collapse
        this.outsideClickHandler = (event) => {
            if (this.state.isExpanded && !this.state.isAnimating) {
                const clickedElement = event.target;
                const isYearItem = clickedElement.closest('.year-item');
                const isHeatmap = clickedElement.closest('.heatmap-container');

                if (!isYearItem && !isHeatmap) {
                    this.collapseHeatmap();
                }
            }
        };

        this.container.addEventListener('click', this.clickHandler);
        document.addEventListener('click', this.outsideClickHandler);
        console.log('Heatmap interaction enabled, click handler attached to:', this.container);
    }

    /**
     * Disable heatmap click interactions for mobile
     */
    disableHeatmapInteraction() {
        if (!this.isEnabled) return;

        this.isEnabled = false;

        // Remove event listeners
        if (this.clickHandler) {
            this.container.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }

        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }

        // Collapse any open heatmap
        if (this.state.isExpanded) {
            this.collapseHeatmap();
        }
    }

    /**
     * Handle click on year item
     */
    handleYearItemClick(yearItem, event) {
        if (!this.isEnabled || this.state.isAnimating) return;

        event.preventDefault();
        event.stopPropagation();

        const year = parseInt(yearItem.getAttribute('data-year'));
        if (!year) return;

        // If clicking the same year item, toggle collapse
        if (this.state.isExpanded && this.state.currentYear === year) {
            this.collapseHeatmap();
            return;
        }

        // If another heatmap is open, collapse it first
        if (this.state.isExpanded) {
            this.collapseHeatmap();
        }

        // Expand new heatmap
        this.expandHeatmap(yearItem, year);
    }

    /**
     * Expand heatmap below the clicked year item
     * Enhanced with performance optimizations and error handling
     */
    async expandHeatmap(yearItem, year) {
        if (this.state.isAnimating || this.animationController.isAnimating) return;

        this.state.isAnimating = true;

        try {
            // Performance optimization: Use requestAnimationFrame for smooth rendering
            await new Promise(resolve => requestAnimationFrame(resolve));

            // Process activity data for the year (with caching)
            const yearData = this.processYearData(year);

            // Performance optimization: Create heatmap element with optimized rendering
            const heatmapElement = await this.renderer.createHeatmapElementOptimized(year, yearData);

            // Track created element for cleanup
            this.createdElements.add(heatmapElement);

            // Update state
            this.state.isExpanded = true;
            this.state.currentYear = year;
            this.state.expandedElement = heatmapElement;
            this.state.targetYearItem = yearItem;

            // Performance optimization: Use document fragment for DOM insertion
            const fragment = document.createDocumentFragment();
            fragment.appendChild(heatmapElement);
            yearItem.parentNode.insertBefore(fragment, yearItem.nextSibling);

            // Update performance metrics
            this.performanceMetrics.heatmapCreations++;

            // Animate expansion
            await this.animationController.expandAnimation(heatmapElement, yearItem);

        } catch (error) {
            console.error('Error expanding heatmap:', error);
            this.collapseHeatmap();
        } finally {
            this.state.isAnimating = false;
        }
    }

    /**
     * Collapse the currently expanded heatmap
     * Enhanced with proper cleanup and memory management
     */
    async collapseHeatmap() {
        if (!this.state.isExpanded || this.state.isAnimating || this.animationController.isAnimating) return;

        this.state.isAnimating = true;

        try {
            // Animate collapse
            if (this.state.expandedElement) {
                await this.animationController.collapseAnimation(this.state.expandedElement);

                // Performance optimization: Clean up event listeners before removal
                this.cleanupElementEventListeners(this.state.expandedElement);

                // Remove heatmap element
                if (this.state.expandedElement.parentNode) {
                    this.state.expandedElement.parentNode.removeChild(this.state.expandedElement);
                }

                // Memory management: Remove from tracking
                this.createdElements.delete(this.state.expandedElement);
            }

            // Reset state
            this.state.isExpanded = false;
            this.state.currentYear = null;
            this.state.expandedElement = null;
            this.state.targetYearItem = null;

            // Performance optimization: Trigger garbage collection hint
            if (window.gc && typeof window.gc === 'function') {
                setTimeout(() => window.gc(), 100);
            }

        } catch (error) {
            console.error('Error collapsing heatmap:', error);
        } finally {
            this.state.isAnimating = false;
        }
    }

    /**
     * Process activity data for a specific year
     * Enhanced with comprehensive data processing, calendar logic, and caching
     */
    processYearData(year) {
        const startTime = performance.now();

        // Performance optimization: Check cache first
        const cacheKey = `${year}-${this.getActivityDataHash()}`;
        if (this.yearDataCache.has(cacheKey)) {
            this.performanceMetrics.cacheHits++;
            const cachedData = this.yearDataCache.get(cacheKey);
            this.performanceMetrics.lastRenderTime = performance.now() - startTime;
            return cachedData;
        }

        this.performanceMetrics.cacheMisses++;

        if (!Array.isArray(this.activityData)) {
            const emptyData = this.createEmptyYearData(year);
            this.cacheYearData(cacheKey, emptyData);
            this.performanceMetrics.lastRenderTime = performance.now() - startTime;
            return emptyData;
        }

        let yearData;

        // Use existing processYearlyActivity function if available
        if (typeof processYearlyActivity === 'function') {
            const processedData = processYearlyActivity(this.activityData, year);
            yearData = this.enhanceYearDataWithCalendarLogic(year, processedData.activityDays);
        } else {
            // Process activity data manually if processYearlyActivity is not available
            const activityDays = this.processActivityEventsForYear(this.activityData, year);
            yearData = this.enhanceYearDataWithCalendarLogic(year, activityDays);
        }

        // Cache the processed data
        this.cacheYearData(cacheKey, yearData);

        const renderTime = performance.now() - startTime;
        this.performanceMetrics.lastRenderTime = renderTime;
        this.updateAverageRenderTime(renderTime);

        return yearData;
    }

    /**
     * Create empty year data structure
     */
    createEmptyYearData(year) {
        return {
            year: year,
            activityDays: new Set(),
            totalDays: this.isLeapYear(year) ? 366 : 365,
            firstDayOffset: this.getYearStartOffset(year),
            totalWeeks: this.calculateTotalWeeks(year),
            monthColumns: this.calculateMonthColumns(year)
        };
    }

    /**
     * Enhance year data with comprehensive calendar logic
     */
    enhanceYearDataWithCalendarLogic(year, activityDays) {
        const totalDays = this.isLeapYear(year) ? 366 : 365;
        const firstDayOffset = this.getYearStartOffset(year);
        const totalWeeks = this.calculateTotalWeeks(year);
        const monthColumns = this.calculateMonthColumns(year);

        return {
            year: year,
            activityDays: activityDays instanceof Set ? activityDays : new Set(activityDays),
            totalDays: totalDays,
            firstDayOffset: firstDayOffset,
            totalWeeks: totalWeeks,
            monthColumns: monthColumns
        };
    }

    /**
     * Process activity events for a specific year
     * Handles date ranges, exclusions, and additional dates from CSV files
     */
    processActivityEventsForYear(events, year) {
        const activityDays = new Set();
        const yearStart = this.createJSTDate(year, 0, 1);
        const yearEnd = this.createJSTDate(year, 11, 31);

        events.forEach((event, eventIndex) => {
            try {
                if (!event || !event.startDate || !event.endDate) {
                    return;
                }

                const startDate = event.startDate;
                const endDate = event.endDate;

                // Validate dates
                if (!(startDate instanceof Date) || !(endDate instanceof Date) ||
                    isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return;
                }

                // Skip events that don't overlap with the target year
                if (endDate < yearStart || startDate > yearEnd) {
                    return;
                }

                // Calculate the overlap period within the year
                const displayStart = new Date(Math.max(startDate.getTime(), yearStart.getTime()));
                const displayEnd = new Date(Math.min(endDate.getTime(), yearEnd.getTime()));

                // Process date range with weekday filtering
                this.processDateRangeWithFiltering(displayStart, displayEnd, event, activityDays);

                // Handle additional dates from DateAdd column
                this.processAdditionalDates(event, year, activityDays);

            } catch (error) {
                console.warn(`Error processing event ${eventIndex}:`, error);
            }
        });

        return activityDays;
    }

    /**
     * Process date range with weekday filtering and exclusions
     */
    processDateRangeWithFiltering(startDate, endDate, event, activityDays) {
        const weekdayValue = parseInt(event.weekday);
        const isNumericWeekday = event.weekday && !isNaN(weekdayValue) && event.weekday.trim() !== '';

        if (isNumericWeekday) {
            // Weekday filtering logic
            const isExcludeMode = weekdayValue < 0;
            const absWeekday = Math.abs(weekdayValue);

            for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setUTCDate(currentDate.getUTCDate() + 1)) {
                const dayOfWeek = currentDate.getUTCDay();
                const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday from 0 to 7

                let shouldDisplay = false;
                if (isExcludeMode) {
                    shouldDisplay = adjustedDayOfWeek !== absWeekday;
                } else {
                    shouldDisplay = event.weekday.includes(String(adjustedDayOfWeek)) ||
                        event.weekday === String(adjustedDayOfWeek);
                }

                if (shouldDisplay && !this.isDateExcluded(currentDate, event)) {
                    const dayOfYear = this.getDayOfYear(currentDate);
                    activityDays.add(dayOfYear);
                }
            }
        } else {
            // No weekday filtering
            for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setUTCDate(currentDate.getUTCDate() + 1)) {
                if (!this.isDateExcluded(currentDate, event)) {
                    const dayOfYear = this.getDayOfYear(currentDate);
                    activityDays.add(dayOfYear);
                }
            }
        }
    }

    /**
     * Process additional dates from DateAdd column
     */
    processAdditionalDates(event, year, activityDays) {
        if (event.additionalDates && Array.isArray(event.additionalDates) && event.additionalDates.length > 0) {
            event.additionalDates.forEach((formattedDateStr) => {
                try {
                    const additionalDate = this.parseJSTDate(formattedDateStr);
                    if (additionalDate && additionalDate.getUTCFullYear() === year) {
                        const dayOfYear = this.getDayOfYear(additionalDate);
                        const maxDays = this.isLeapYear(year) ? 366 : 365;
                        if (dayOfYear >= 1 && dayOfYear <= maxDays) {
                            activityDays.add(dayOfYear);
                        }
                    }
                } catch (error) {
                    console.warn(`Error processing additional date:`, error);
                }
            });
        }
    }

    /**
     * Check if a date is in the exclusion list
     */
    isDateExcluded(date, event) {
        if (!event.excludeDates || !Array.isArray(event.excludeDates) || event.excludeDates.length === 0) {
            return false;
        }

        const dateString = this.formatDate(date);
        return event.excludeDates.includes(dateString);
    }

    /**
     * Create JST date (wrapper for compatibility)
     */
    createJSTDate(year, month, day) {
        if (typeof createJSTDate === 'function') {
            return createJSTDate(year, month, day);
        }
        return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }

    /**
     * Parse JST date string (wrapper for compatibility)
     */
    parseJSTDate(dateString) {
        if (typeof parseJSTDate === 'function') {
            return parseJSTDate(dateString);
        }

        // Fallback parsing
        if (!dateString || dateString.trim() === '') return null;

        const normalized = dateString.trim().replace(/\//g, '-');
        const parts = normalized.split('-');

        if (parts.length !== 3) return null;

        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);

        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
        if (month < 0 || month > 11) return null;
        if (day < 1 || day > 31) return null;

        return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }

    /**
     * Format date (wrapper for compatibility)
     */
    formatDate(date) {
        if (typeof formatDate === 'function') {
            return formatDate(date);
        }

        // Fallback formatting
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return null;
        }

        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    /**
     * Check if heatmap functionality is enabled
     */
    isHeatmapEnabled() {
        return this.isEnabled;
    }

    /**
     * Update activity data
     */
    updateActivityData(activityData) {
        this.activityData = activityData;
    }

    /**
     * Enhanced calendar calculation utility methods
     */
    isLeapYear(year) {
        if (!Number.isInteger(year)) {
            console.warn('Invalid year provided to isLeapYear:', year);
            return false;
        }
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    /**
     * Get the weekday offset for the first day of the year
     * Returns 0-6 where 0 = Monday, 1 = Tuesday, etc. (Monday-based week)
     */
    getYearStartOffset(year) {
        if (!Number.isInteger(year)) {
            console.warn('Invalid year provided to getYearStartOffset:', year);
            return 0;
        }

        // Use UTC to avoid timezone issues
        const jan1 = new Date(Date.UTC(year, 0, 1));
        const dayOfWeek = jan1.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Convert to Monday-based week: Monday = 0, Tuesday = 1, ..., Sunday = 6
        // If Sunday (0), it should be 6 (last day of week)
        // If Monday (1), it should be 0 (first day of week)
        // If Saturday (6), it should be 5
        const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        console.debug(`Year ${year} starts on day ${dayOfWeek} (0=Sun), offset: ${offset} (0=Mon)`);
        return offset;
    }

    /**
     * Calculate total weeks needed for the year grid
     * Accounts for year start offset and total days
     */
    calculateTotalWeeks(year) {
        if (!Number.isInteger(year)) {
            console.warn('Invalid year provided to calculateTotalWeeks:', year);
            return 53; // Default fallback
        }

        const totalDays = this.isLeapYear(year) ? 366 : 365;
        const firstDayOffset = this.getYearStartOffset(year);

        // Calculate minimum weeks needed to fit all days
        const totalCells = totalDays + firstDayOffset;
        const weeks = Math.ceil(totalCells / 7);

        // Ensure we have at least 52 weeks and at most 54 weeks
        return Math.max(52, Math.min(54, weeks));
    }

    /**
     * Calculate month label positions in the calendar grid
     * Returns array of {month, col} objects for positioning month labels
     */
    calculateMonthColumns(year) {
        if (!Number.isInteger(year)) {
            console.warn('Invalid year provided to calculateMonthColumns:', year);
            return [];
        }

        const monthColumns = [];
        const firstDayOffset = this.getYearStartOffset(year);

        for (let month = 0; month < 12; month++) {
            try {
                // Get first day of the month
                const firstDay = new Date(Date.UTC(year, month, 1));
                const dayOfYear = this.getDayOfYear(firstDay);

                // Calculate which week column this month starts in
                // dayOfYear - 1 because getDayOfYear returns 1-based index
                // + firstDayOffset to account for padding at start of year
                const weekColumn = Math.floor((dayOfYear - 1 + firstDayOffset) / 7);

                monthColumns.push({
                    month: month + 1, // 1-based month number for display
                    col: weekColumn
                });
            } catch (error) {
                console.warn(`Error calculating month column for month ${month + 1}:`, error);
                // Add fallback position
                monthColumns.push({
                    month: month + 1,
                    col: Math.floor(month * 4.33) // Approximate position
                });
            }
        }

        return monthColumns;
    }

    /**
     * Calculate day of year (1-366) for a given date
     * Enhanced with better error handling and UTC consistency
     */
    getDayOfYear(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            console.warn('Invalid date provided to getDayOfYear:', date);
            return 1;
        }

        try {
            // Use UTC methods for consistency
            const year = date.getUTCFullYear();
            const start = new Date(Date.UTC(year, 0, 1));
            const diff = date.getTime() - start.getTime();
            const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

            // Validate result
            const maxDays = this.isLeapYear(year) ? 366 : 365;
            if (dayOfYear < 1 || dayOfYear > maxDays) {
                console.warn(`Calculated day of year ${dayOfYear} is out of range for year ${year}`);
                return Math.max(1, Math.min(dayOfYear, maxDays));
            }

            return dayOfYear;
        } catch (error) {
            console.error('Error calculating day of year:', error);
            return 1;
        }
    }

    /**
     * Calculate calendar grid dimensions for a given year
     * Returns comprehensive grid layout information
     */
    calculateCalendarGridDimensions(year) {
        const totalDays = this.isLeapYear(year) ? 366 : 365;
        const firstDayOffset = this.getYearStartOffset(year);
        const totalWeeks = this.calculateTotalWeeks(year);
        const monthColumns = this.calculateMonthColumns(year);

        return {
            totalDays: totalDays,
            firstDayOffset: firstDayOffset,
            totalWeeks: totalWeeks,
            totalRows: 8, // 1 header row + 7 weekday rows
            totalColumns: totalWeeks + 1, // +1 for weekday labels column
            monthColumns: monthColumns,
            paddingCellsStart: firstDayOffset,
            paddingCellsEnd: (totalWeeks * 7) - totalDays - firstDayOffset
        };
    }

    /**
     * Map day number to grid position (row, col)
     * Returns the grid coordinates for a specific day of year
     */
    mapDayToGridPosition(dayNumber, year) {
        if (!Number.isInteger(dayNumber) || dayNumber < 1) {
            console.warn('Invalid day number provided to mapDayToGridPosition:', dayNumber);
            return { row: 2, col: 2 }; // Default to first data cell
        }

        const maxDays = this.isLeapYear(year) ? 366 : 365;
        if (dayNumber > maxDays) {
            console.warn(`Day number ${dayNumber} exceeds max days ${dayNumber} for year ${year}`);
            return { row: 2, col: 2 };
        }

        const firstDayOffset = this.getYearStartOffset(year);

        // Calculate total position including offset
        const totalPosition = dayNumber - 1 + firstDayOffset; // -1 because dayNumber is 1-based

        // Calculate grid position (Monday-based week)
        const weekColumn = Math.floor(totalPosition / 7);
        const weekdayRow = totalPosition % 7;

        return {
            row: weekdayRow + 2, // +2 because row 1 is month labels, rows 2-8 are weekdays (Mon-Sun)
            col: weekColumn + 2  // +2 because col 1 is weekday labels, cols 2+ are weeks
        };
    }

    /**
     * Get weekday name for a given row (Japanese format)
     */
    getWeekdayName(row) {
        const weekdays = ['月', '火', '水', '木', '金', '土', '日']; // Mon-Sun in Japanese
        const weekdayIndex = row - 2; // Convert from grid row to weekday index

        if (weekdayIndex >= 0 && weekdayIndex < weekdays.length) {
            return weekdays[weekdayIndex];
        }

        return '';
    }

    /**
     * Performance optimization: Generate hash for activity data to enable caching
     */
    getActivityDataHash() {
        if (!Array.isArray(this.activityData) || this.activityData.length === 0) {
            return 'empty';
        }

        // Simple hash based on data length and first/last items
        const length = this.activityData.length;
        const firstItem = this.activityData[0];
        const lastItem = this.activityData[length - 1];

        const firstHash = firstItem ? JSON.stringify(firstItem).length : 0;
        const lastHash = lastItem ? JSON.stringify(lastItem).length : 0;

        return `${length}-${firstHash}-${lastHash}`;
    }

    /**
     * Performance optimization: Cache year data with size limit
     */
    cacheYearData(key, data) {
        // Implement LRU cache behavior
        if (this.yearDataCache.size >= this.maxCacheSize) {
            const firstKey = this.yearDataCache.keys().next().value;
            this.yearDataCache.delete(firstKey);
        }

        this.yearDataCache.set(key, data);
    }

    /**
     * Performance optimization: Update average render time
     */
    updateAverageRenderTime(newTime) {
        const count = this.performanceMetrics.heatmapCreations;
        const currentAvg = this.performanceMetrics.averageRenderTime;
        this.performanceMetrics.averageRenderTime = (currentAvg * (count - 1) + newTime) / count;
    }

    /**
     * Performance optimization: Clean up event listeners for an element
     */
    cleanupElementEventListeners(element) {
        if (!element) return;

        // Remove all tracked event listeners for this element
        const elementListeners = this.eventListeners.get(element);
        if (elementListeners) {
            elementListeners.forEach(({ event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            this.eventListeners.delete(element);
        }

        // Clean up child element listeners
        const childElements = element.querySelectorAll('*');
        childElements.forEach(child => {
            const childListeners = this.eventListeners.get(child);
            if (childListeners) {
                childListeners.forEach(({ event, handler, options }) => {
                    child.removeEventListener(event, handler, options);
                });
                this.eventListeners.delete(child);
            }
        });
    }

    /**
     * Performance optimization: Add tracked event listener
     */
    addTrackedEventListener(element, event, handler, options = false) {
        element.addEventListener(event, handler, options);

        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
        }

        this.eventListeners.get(element).push({ event, handler, options });
    }

    /**
     * Performance optimization: Clear cache
     */
    clearCache() {
        this.yearDataCache.clear();
        this.performanceMetrics.cacheHits = 0;
        this.performanceMetrics.cacheMisses = 0;
    }

    /**
     * Performance monitoring: Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            cacheSize: this.yearDataCache.size,
            cacheHitRate: this.performanceMetrics.cacheHits /
                (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0
        };
    }

    /**
     * Memory management: Force cleanup of all resources
     */
    forceCleanup() {
        // Clear all caches
        this.clearCache();

        // Clean up all tracked elements
        this.createdElements = new WeakSet();

        // Clear all event listeners
        this.eventListeners.clear();

        // Clear debounced handlers
        this.debouncedHandlers.clear();

        // Reset performance metrics
        this.performanceMetrics = {
            heatmapCreations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageRenderTime: 0,
            lastRenderTime: 0
        };
    }

    /**
     * Enhanced cleanup method with comprehensive resource management
     */
    destroy() {
        // Disable interactions first
        this.disableHeatmapInteraction();

        // Clean up expanded heatmap
        if (this.state.expandedElement) {
            this.cleanupElementEventListeners(this.state.expandedElement);
            if (this.state.expandedElement.parentNode) {
                this.state.expandedElement.parentNode.removeChild(this.state.expandedElement);
            }
        }

        // Destroy sub-components
        if (this.responsiveController) {
            this.responsiveController.destroy();
        }

        if (this.animationController) {
            this.animationController.destroy();
        }

        if (this.renderer) {
            this.renderer.destroy();
        }

        // Force cleanup of all resources
        this.forceCleanup();

        // Clear references
        this.container = null;
        this.activityData = null;
        this.state = null;
        this.renderer = null;
        this.animationController = null;
        this.responsiveController = null;
    }
}

/**
 * HeatmapRenderer - Handles DOM creation and visual rendering
 * Creates heatmap HTML structure and manages visual elements
 * Enhanced with performance optimizations and memory management
 */
class HeatmapRenderer {
    constructor() {
        this.heatColors = {
            default: '#F5F1E8',      // Light beige for default days
            active: '#90EE90',       // Light green for activity days
            today: '#FFB6B6',        // Light red for today's date
            padding: '#D3D3D3',      // Light gray for padding cells
            gridLine: '#000000'      // Black for grid lines
        };

        // Performance optimization: Element pools for reuse
        this.elementPools = {
            cells: [],
            containers: []
        };

        // Performance optimization: CSS class cache
        this.cssClassCache = new Map();

        // Memory management: Track created elements
        this.createdElements = new WeakSet();

        // Performance optimization: Batch DOM operations
        this.batchOperations = [];
        this.batchTimeout = null;
    }

    /**
     * Create complete heatmap element with calendar grid
     */
    createHeatmapElement(year, yearData) {
        const heatmapContainer = document.createElement('div');
        heatmapContainer.className = 'heatmap-container';
        heatmapContainer.setAttribute('data-year', year);

        // Create calendar grid
        const calendarGrid = this.renderCalendarGrid(year, yearData);
        heatmapContainer.appendChild(calendarGrid);

        // Apply styling
        this.applyHeatmapStyling(heatmapContainer);

        // Track created element
        this.createdElements.add(heatmapContainer);

        return heatmapContainer;
    }

    /**
     * Performance optimized version of createHeatmapElement
     * Uses element pooling, batched DOM operations, and optimized rendering
     */
    async createHeatmapElementOptimized(year, yearData) {
        const startTime = performance.now();

        // Try to reuse container from pool
        let heatmapContainer = this.getPooledElement('containers');
        if (!heatmapContainer) {
            heatmapContainer = document.createElement('div');
        }

        heatmapContainer.className = 'heatmap-container';
        heatmapContainer.setAttribute('data-year', year);

        // Performance optimization: Use document fragment for batched operations
        const fragment = document.createDocumentFragment();

        // Create calendar grid with optimizations
        const calendarGrid = await this.renderCalendarGridOptimized(year, yearData);
        fragment.appendChild(calendarGrid);

        // Batch DOM operation
        heatmapContainer.appendChild(fragment);

        // Apply styling with optimizations
        this.applyHeatmapStylingOptimized(heatmapContainer);

        // Track created element
        this.createdElements.add(heatmapContainer);

        const renderTime = performance.now() - startTime;
        console.debug(`Heatmap rendered in ${renderTime.toFixed(2)}ms`);

        return heatmapContainer;
    }

    /**
     * Render the main calendar grid structure with enhanced layout
     */
    renderCalendarGrid(year, yearData) {
        const { activityDays, totalWeeks, monthColumns, firstDayOffset, totalDays } = yearData;

        // Create grid container with proper dimensions
        // 8 rows: 1 header + 7 weekdays
        // totalWeeks+1 columns: 1 weekday label + totalWeeks data columns
        const gridContainer = document.createElement('div');
        gridContainer.className = 'heatmap-grid';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = `40px repeat(${totalWeeks}, 1fr)`;
        gridContainer.style.gridTemplateRows = '30px repeat(7, 1fr)';
        gridContainer.style.gap = '1px';
        gridContainer.style.minHeight = '200px';
        gridContainer.style.backgroundColor = this.heatColors.gridLine;

        // Render month labels in first row
        this.renderMonthLabels(gridContainer, monthColumns, totalWeeks);

        // Render weekday labels in first column
        this.renderWeekdayLabels(gridContainer);

        // Render activity cells starting from row 2, col 2
        this.renderActivityCells(gridContainer, year, yearData);

        return gridContainer;
    }

    /**
     * Performance optimized version of renderCalendarGrid
     * Uses flex-based layout from test.html for proper border handling
     */
    async renderCalendarGridOptimized(year, yearData) {
        const { activityDays, totalWeeks, monthColumns, firstDayOffset, totalDays } = yearData;

        // Create wrapper container (flex layout)
        const wrapper = document.createElement('div');
        wrapper.className = 'heatmap-wrapper';

        // Performance optimization: Use requestAnimationFrame for smooth rendering
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Create week labels column (left side)
        const weekLabelsColumn = this.renderWeekLabelsColumn();

        // Create main grid area (right side)
        const mainGrid = await this.renderMainGridArea(year, yearData);

        // Append both sections to wrapper
        wrapper.appendChild(weekLabelsColumn);
        wrapper.appendChild(mainGrid);

        return wrapper;
    }

    /**
     * Render week labels column (left side of heatmap)
     */
    renderWeekLabelsColumn() {
        const container = document.createElement('div');
        container.className = 'heatmap-week-labels';

        // Empty cell at top
        const emptyCell = document.createElement('div');
        emptyCell.className = 'heatmap-cell label-cell default-cell';
        container.appendChild(emptyCell);

        // Week labels (Mon-Sun)
        const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
        weekdays.forEach(label => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell label-cell default-cell';
            cell.textContent = label;
            container.appendChild(cell);
        });

        return container;
    }

    /**
     * Render main grid area (right side of heatmap)
     */
    async renderMainGridArea(year, yearData) {
        const { activityDays, totalWeeks, monthColumns, firstDayOffset, totalDays } = yearData;

        const container = document.createElement('div');
        container.className = 'heatmap-main-grid';

        // First row: Month labels
        const monthRow = this.renderMonthRow(monthColumns, totalWeeks);
        container.appendChild(monthRow);

        // Get today's information for highlighting
        const todayDayOfYear = this.getTodayDayOfYear(year);

        // 7 rows for weekdays (Mon-Sun)
        for (let row = 0; row < 7; row++) {
            const gridRow = document.createElement('div');
            gridRow.className = 'heatmap-grid-row';

            for (let col = 0; col < totalWeeks; col++) {
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';

                // Calculate day number for this cell (matching test.html logic)
                const dayIndex = col * 7 + row - firstDayOffset;
                const dayNumber = dayIndex >= 0 && dayIndex < totalDays ? dayIndex + 1 : null;

                // Determine cell type and styling
                if (dayNumber === null) {
                    // Padding cells (before Jan 1 or after Dec 31)
                    this.applyCellStyling(cell, 'padding', null, year);
                } else {
                    // Actual day cells
                    cell.setAttribute('data-day', dayNumber);
                    cell.setAttribute('title', this.generateCellTooltip(dayNumber, year, activityDays.has(dayNumber)));

                    let cellType = 'default';
                    if (dayNumber === todayDayOfYear) {
                        cellType = 'today';
                    } else if (activityDays.has(dayNumber)) {
                        cellType = 'active';
                    }

                    this.applyCellStyling(cell, cellType, dayNumber, year);
                }

                gridRow.appendChild(cell);
            }

            container.appendChild(gridRow);
        }

        return container;
    }

    /**
     * Render month label row
     */
    renderMonthRow(monthColumns, totalWeeks) {
        const row = document.createElement('div');
        row.className = 'heatmap-grid-row';

        for (let col = 0; col < totalWeeks; col++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell default-bg';

            const monthInfo = monthColumns.find(m => m.col === col);
            if (monthInfo) {
                cell.textContent = monthInfo.month;
                cell.style.fontWeight = 'bold';
            }

            row.appendChild(cell);
        }

        return row;
    }

    /**
     * Render month labels in the first row
     */
    renderMonthLabels(gridContainer, monthColumns, totalWeeks) {
        // Empty cell at [0,0]
        const emptyCell = document.createElement('div');
        emptyCell.className = 'heatmap-cell empty-corner';
        emptyCell.style.gridRow = '1';
        emptyCell.style.gridColumn = '1';
        gridContainer.appendChild(emptyCell);

        // Month labels
        monthColumns.forEach(({ month, col }) => {
            const monthCell = document.createElement('div');
            monthCell.className = 'heatmap-cell month-label';
            monthCell.textContent = month.toString();
            monthCell.style.gridRow = '1';
            monthCell.style.gridColumn = `${col + 2}`; // +2 because col 1 is weekday labels
            monthCell.style.textAlign = 'center';
            monthCell.style.fontSize = '12px';
            monthCell.style.fontWeight = 'bold';
            gridContainer.appendChild(monthCell);
        });
    }

    /**
     * Render weekday labels in the first column
     */
    renderWeekdayLabels(gridContainer) {
        const weekdays = ['月', '火', '水', '木', '金', '土', '日']; // Mon-Sun in Japanese

        weekdays.forEach((weekday, index) => {
            const weekdayCell = document.createElement('div');
            weekdayCell.className = 'heatmap-cell weekday-label';
            weekdayCell.textContent = weekday;
            weekdayCell.style.gridRow = `${index + 2}`; // +2 because row 1 is month labels
            weekdayCell.style.gridColumn = '1';
            weekdayCell.style.textAlign = 'center';
            weekdayCell.style.fontSize = '12px';
            weekdayCell.style.fontWeight = 'bold';
            gridContainer.appendChild(weekdayCell);
        });
    }

    /**
     * Render activity cells in the calendar grid with enhanced logic
     */
    renderActivityCells(gridContainer, year, yearData) {
        const { activityDays, totalWeeks, firstDayOffset, totalDays } = yearData;

        // Get today's information for highlighting (using JST for timezone consistency)
        const todayDayOfYear = this.getTodayDayOfYear(year);

        // Track day number as we iterate through the grid
        let dayNumber = 1;

        // Iterate through each week column
        for (let week = 0; week < totalWeeks; week++) {
            // Iterate through each weekday row (0=Monday, 6=Sunday in our grid)
            for (let weekday = 0; weekday < 7; weekday++) {
                const gridRow = weekday + 2; // +2 because row 1 is month labels
                const gridCol = week + 2;    // +2 because col 1 is weekday labels

                // Create cell element
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell activity-cell';
                cell.style.gridRow = `${gridRow}`;
                cell.style.gridColumn = `${gridCol}`;
                cell.style.width = '14px';
                cell.style.height = '14px';
                cell.style.border = `1px solid ${this.heatColors.gridLine}`;
                cell.style.borderRadius = '2px';

                // Determine cell type and apply appropriate styling
                if (week === 0 && weekday < firstDayOffset) {
                    // Padding cells at the beginning of the year (before Jan 1)
                    this.applyCellStyling(cell, 'padding', null, year);
                } else if (dayNumber > totalDays) {
                    // Padding cells at the end of the year (after Dec 31)
                    this.applyCellStyling(cell, 'padding', null, year);
                } else {
                    // Actual day cells within the year
                    cell.setAttribute('data-day', dayNumber);
                    cell.setAttribute('title', this.generateCellTooltip(dayNumber, year, activityDays.has(dayNumber)));

                    // Determine cell type based on activity and date
                    let cellType = 'default';
                    if (dayNumber === todayDayOfYear) {
                        cellType = 'today';
                    } else if (activityDays.has(dayNumber)) {
                        cellType = 'active';
                    }

                    this.applyCellStyling(cell, cellType, dayNumber, year);
                    dayNumber++;
                }

                gridContainer.appendChild(cell);
            }
        }
    }

    /**
     * Apply styling to a calendar cell based on its type
     */
    applyCellStyling(cell, cellType, dayNumber, year) {
        switch (cellType) {
            case 'padding':
                cell.classList.add('padding-cell');
                cell.setAttribute('title', 'Padding');
                break;

            case 'today':
                cell.classList.add('today-cell');
                // NO inline styles - all styling controlled by CSS
                break;

            case 'active':
                cell.classList.add('activity-cell-active');
                // NO inline styles - all styling controlled by CSS
                break;

            case 'default':
            default:
                cell.classList.add('default-cell');
                // NO inline styles - all styling controlled by CSS
                break;
        }

        // NO hover effects - completely static display
        // All interactions disabled via CSS pointer-events: none
    }

    /**
     * Generate tooltip text for a calendar cell
     */
    generateCellTooltip(dayNumber, year, hasActivity) {
        try {
            // Calculate the actual date for this day of year
            const yearStart = new Date(Date.UTC(year, 0, 1));
            const targetDate = new Date(yearStart.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000);

            const month = targetDate.getUTCMonth() + 1;
            const day = targetDate.getUTCDate();

            // Check if this is today's date
            const today = typeof getJSTNow === 'function' ? getJSTNow() : new Date();
            const isToday = year === today.getUTCFullYear() &&
                targetDate.getUTCMonth() === today.getUTCMonth() &&
                targetDate.getUTCDate() === today.getUTCDate();

            let activityText = hasActivity ? 'Activity' : 'No activity';
            if (isToday) {
                activityText += ' (Today)';
            }

            return `${year}/${month}/${day} - ${activityText}`;
        } catch (error) {
            return `Day ${dayNumber} of ${year}`;
        }
    }

    /**
     * Apply styling to the heatmap container
     */
    applyHeatmapStyling(heatmapContainer) {
        heatmapContainer.style.width = '100%';
        heatmapContainer.style.maxWidth = '800px';
        heatmapContainer.style.margin = '20px auto';
        heatmapContainer.style.padding = '20px';
        heatmapContainer.style.backgroundColor = 'var(--year-grid-bg, #ffffff)';
        heatmapContainer.style.borderRadius = '12px';
        heatmapContainer.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
        heatmapContainer.style.border = '1px solid var(--grid-border-color, #e5e7eb)';

        // Ensure it spans full container width
        heatmapContainer.style.gridColumn = '1 / -1';
    }

    /**
     * Utility method to get day of year (using UTC methods for JST consistency)
     */
    getDayOfYear(date) {
        const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.floor((date - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    /**
     * Get today's day of year for a specific year (handles cross-year scenarios)
     * Returns -1 if today is not in the specified year
     */
    getTodayDayOfYear(year) {
        const today = typeof getJSTNow === 'function' ? getJSTNow() : new Date();

        if (year !== today.getUTCFullYear()) {
            return -1; // Today is not in this year
        }

        return this.getDayOfYear(today);
    }

    /**
     * Update colors for dark mode
     */
    updateColorsForDarkMode(isDarkMode) {
        if (isDarkMode) {
            this.heatColors = {
                default: '#2d3748',      // Dark gray for default days
                active: '#68d391',       // Brighter green for activity days
                today: '#fc8181',        // Brighter red for today's date
                padding: '#4a5568',      // Darker gray for padding cells
                gridLine: '#718096'      // Lighter gray for grid lines
            };
        } else {
            this.heatColors = {
                default: '#F5F1E8',      // Light beige for default days
                active: '#90EE90',       // Light green for activity days
                today: '#FFB6B6',        // Light red for today's date (as specified in requirements)
                padding: '#D3D3D3',      // Light gray for padding cells
                gridLine: '#000000'      // Black for grid lines
            };
        }

        // Update any existing today cells with new colors
        this.updateExistingTodayCells(isDarkMode);
    }

    /**
     * Update existing today cells when dark mode changes
     */
    updateExistingTodayCells(isDarkMode) {
        const todayCells = document.querySelectorAll('.heatmap-cell.today-cell');
        todayCells.forEach(cell => {
            cell.style.backgroundColor = this.heatColors.today;
            if (isDarkMode) {
                cell.style.boxShadow = '0 0 6px rgba(252, 129, 129, 0.8)';
                cell.style.border = '2px solid rgba(252, 129, 129, 0.9)';
            } else {
                cell.style.boxShadow = '0 0 4px rgba(255, 182, 182, 0.6)';
                cell.style.border = '2px solid rgba(255, 182, 182, 0.8)';
            }
        });
    }

    /**
     * Performance optimization: Get element from pool or create new one
     */
    getPooledElement(poolName) {
        const pool = this.elementPools[poolName];
        if (pool && pool.length > 0) {
            return pool.pop();
        }
        return null;
    }

    /**
     * Performance optimization: Return element to pool for reuse
     */
    returnToPool(element, poolName) {
        if (!element) return;

        // Clean up element before returning to pool
        element.innerHTML = '';
        element.className = '';
        element.removeAttribute('style');
        element.removeAttribute('data-year');
        element.removeAttribute('data-day');
        element.removeAttribute('title');

        const pool = this.elementPools[poolName];
        if (pool && pool.length < 50) { // Limit pool size
            pool.push(element);
        }
    }

    /**
     * Performance optimization: Get cached CSS class or create new one
     */
    getCachedCSSClass(baseName, styles) {
        const styleKey = JSON.stringify(styles);
        const cacheKey = `${baseName}-${styleKey}`;

        if (this.cssClassCache.has(cacheKey)) {
            return this.cssClassCache.get(cacheKey);
        }

        // For now, just return the base class name
        // In a real implementation, you might create dynamic CSS classes
        this.cssClassCache.set(cacheKey, baseName);
        return baseName;
    }

    /**
     * Performance optimization: Optimized month labels rendering
     */
    renderMonthLabelsOptimized(monthColumns, totalWeeks) {
        const labels = [];

        // Empty cell at [0,0]
        const emptyCell = this.getPooledElement('cells') || document.createElement('div');
        emptyCell.className = 'heatmap-cell empty-corner';
        emptyCell.style.gridRow = '1';
        emptyCell.style.gridColumn = '1';
        labels.push(emptyCell);

        // Month labels - batch create
        monthColumns.forEach(({ month, col }) => {
            const monthCell = this.getPooledElement('cells') || document.createElement('div');
            monthCell.className = 'heatmap-cell month-label';
            monthCell.textContent = month.toString();
            monthCell.style.gridRow = '1';
            monthCell.style.gridColumn = `${col + 2}`;
            monthCell.style.textAlign = 'center';
            monthCell.style.fontSize = '12px';
            monthCell.style.fontWeight = 'bold';
            labels.push(monthCell);
        });

        return labels;
    }

    /**
     * Performance optimization: Optimized weekday labels rendering
     */
    renderWeekdayLabelsOptimized() {
        const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
        const labels = [];

        weekdays.forEach((weekday, index) => {
            const weekdayCell = this.getPooledElement('cells') || document.createElement('div');
            weekdayCell.className = 'heatmap-cell weekday-label';
            weekdayCell.textContent = weekday;
            weekdayCell.style.gridRow = `${index + 2}`;
            weekdayCell.style.gridColumn = '1';
            weekdayCell.style.textAlign = 'center';
            weekdayCell.style.fontSize = '12px';
            weekdayCell.style.fontWeight = 'bold';
            labels.push(weekdayCell);
        });

        return labels;
    }

    /**
     * Performance optimization: Optimized activity cells rendering
     */
    async renderActivityCellsOptimized(year, yearData) {
        const { activityDays, totalWeeks, firstDayOffset, totalDays } = yearData;
        const cells = [];

        // Get today's information for highlighting
        const todayDayOfYear = this.getTodayDayOfYear(year);

        // Track day number as we iterate through the grid
        let dayNumber = 1;

        // Performance optimization: Process in chunks to avoid blocking
        const chunkSize = 50;
        let processedCells = 0;

        for (let week = 0; week < totalWeeks; week++) {
            for (let weekday = 0; weekday < 7; weekday++) {
                const gridRow = weekday + 2;
                const gridCol = week + 2;

                // Create cell element from pool
                const cell = this.getPooledElement('cells') || document.createElement('div');
                cell.className = 'heatmap-cell activity-cell';
                cell.style.gridRow = `${gridRow}`;
                cell.style.gridColumn = `${gridCol}`;
                cell.style.width = '14px';
                cell.style.height = '14px';
                cell.style.border = `1px solid ${this.heatColors.gridLine}`;
                cell.style.borderRadius = '2px';

                // Determine cell type and apply appropriate styling
                if (week === 0 && weekday < firstDayOffset) {
                    this.applyCellStyling(cell, 'padding', null, year);
                } else if (dayNumber > totalDays) {
                    this.applyCellStyling(cell, 'padding', null, year);
                } else {
                    cell.setAttribute('data-day', dayNumber);
                    cell.setAttribute('title', this.generateCellTooltip(dayNumber, year, activityDays.has(dayNumber)));

                    let cellType = 'default';
                    if (dayNumber === todayDayOfYear) {
                        cellType = 'today';
                    } else if (activityDays.has(dayNumber)) {
                        cellType = 'active';
                    }

                    this.applyCellStyling(cell, cellType, dayNumber, year);
                    dayNumber++;
                }

                cells.push(cell);
                processedCells++;

                // Yield control periodically for smooth rendering
                if (processedCells % chunkSize === 0) {
                    await new Promise(resolve => requestAnimationFrame(resolve));
                }
            }
        }

        return cells;
    }

    /**
     * Performance optimization: Optimized styling application
     */
    applyHeatmapStylingOptimized(heatmapContainer) {
        // Use CSS classes instead of inline styles
        // All styling is now handled by .heatmap-container in heatmap.css
        // This ensures consistent behavior and allows full width display
        // We do NOT set max-width here anymore.
    }

    /**
     * Performance optimization: Batch DOM operations
     */
    batchDOMOperation(operation) {
        this.batchOperations.push(operation);

        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }

        this.batchTimeout = setTimeout(() => {
            requestAnimationFrame(() => {
                this.batchOperations.forEach(op => op());
                this.batchOperations = [];
                this.batchTimeout = null;
            });
        }, 16); // ~60fps
    }

    /**
     * Memory management: Clean up renderer resources
     */
    destroy() {
        // Clear batch operations
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
        this.batchOperations = [];

        // Clear caches
        this.cssClassCache.clear();

        // Clear element pools
        Object.keys(this.elementPools).forEach(poolName => {
            this.elementPools[poolName] = [];
        });

        // Clear created elements tracking
        this.createdElements = new WeakSet();
    }
}
/**
 * ResponsiveController - Manages responsive behavior and breakpoint handling
 * Enables/disables heatmap functionality based on screen size
 */
class ResponsiveController {
    constructor(heatmapManager) {
        this.heatmapManager = heatmapManager;
        this.breakpoints = {
            mobile: 600,      // Below this is mobile
            tablet: 900,      // Between mobile and tablet
            desktop: 1200     // Above tablet is desktop
        };

        this.resizeHandler = null;
        this.mediaQueryList = null;
    }

    /**
     * Set up breakpoint monitoring
     */
    setupBreakpointMonitoring() {
        // Use matchMedia for efficient breakpoint detection
        this.mediaQueryList = window.matchMedia(`(min-width: ${this.breakpoints.mobile}px)`);

        // Handle initial state
        this.handleBreakpointChange();

        // Set up listener for breakpoint changes
        this.resizeHandler = () => this.handleBreakpointChange();

        // Use matchMedia listener for better performance
        if (this.mediaQueryList.addEventListener) {
            this.mediaQueryList.addEventListener('change', this.resizeHandler);
        } else {
            // Fallback for older browsers
            this.mediaQueryList.addListener(this.resizeHandler);
        }

        // Also listen to window resize as fallback
        window.addEventListener('resize', this.debounce(this.resizeHandler, 250));
    }

    /**
     * Handle breakpoint changes
     */
    handleBreakpointChange() {
        const wasEnabled = this.heatmapManager.isHeatmapEnabled();
        const shouldBeEnabled = this.isDesktopOrTablet();

        if (shouldBeEnabled && !wasEnabled) {
            // Transitioning from mobile to desktop/tablet
            this.heatmapManager.enableHeatmapInteraction();
        } else if (!shouldBeEnabled && wasEnabled) {
            // Transitioning from desktop/tablet to mobile
            this.heatmapManager.disableHeatmapInteraction();
        }
    }

    /**
     * Check if current viewport is desktop or tablet
     */
    isDesktopOrTablet() {
        return window.innerWidth >= this.breakpoints.mobile;
    }

    /**
     * Check if current viewport is mobile
     */
    isMobileDevice() {
        return window.innerWidth < this.breakpoints.mobile;
    }

    /**
     * Get current breakpoint category
     */
    getCurrentBreakpoint() {
        const width = window.innerWidth;

        if (width < this.breakpoints.mobile) {
            return 'mobile';
        } else if (width < this.breakpoints.tablet) {
            return 'tablet';
        } else if (width < this.breakpoints.desktop) {
            return 'desktop';
        } else {
            return 'large-desktop';
        }
    }

    /**
     * Debounce utility for resize events
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Cleanup method
     */
    destroy() {
        if (this.mediaQueryList && this.resizeHandler) {
            if (this.mediaQueryList.removeEventListener) {
                this.mediaQueryList.removeEventListener('change', this.resizeHandler);
            } else {
                // Fallback for older browsers
                this.mediaQueryList.removeListener(this.resizeHandler);
            }
        }

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        this.resizeHandler = null;
        this.mediaQueryList = null;
    }
}
/**
 * AnimationController - Simple and effective animation system
 * Handles smooth expand/collapse animations and layout management
 * Enhanced with performance optimizations and resource management
 */
class AnimationController {
    constructor() {
        this.duration = 300;
        this.easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)';
        this.isAnimating = false;

        // Performance optimization: Animation frame management
        this.activeAnimations = new Set();
        this.animationFrameId = null;

        // Performance optimization: Throttled animation updates
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;

        // Memory management: Track animated elements
        this.animatedElements = new WeakSet();

        // Performance optimization: Reusable animation objects
        this.animationPool = [];
    }

    /**
     * Animate heatmap expansion with performance optimizations
     */
    async expandAnimation(heatmapElement, targetYearItem) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // Track animated element
        this.animatedElements.add(heatmapElement);

        return new Promise((resolve) => {
            // Performance optimization: Use will-change for GPU acceleration
            heatmapElement.style.willChange = 'opacity, transform';

            // Initial state
            heatmapElement.style.opacity = '0';
            heatmapElement.style.transform = 'translateY(-10px) scaleY(0.95)';
            heatmapElement.style.transition = `all ${this.duration}ms ${this.easing}`;

            // Performance optimization: Use double requestAnimationFrame for smooth start
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    heatmapElement.style.opacity = '1';
                    heatmapElement.style.transform = 'translateY(0) scaleY(1)';

                    // Move year items below with optimization
                    this.pushDownYearItemsOptimized(targetYearItem, heatmapElement);

                    // Clean up after animation
                    setTimeout(() => {
                        heatmapElement.style.willChange = 'auto';
                        this.animatedElements.delete(heatmapElement);
                        this.isAnimating = false;
                        resolve();
                    }, this.duration);
                });
            });
        });
    }

    /**
     * Animate heatmap collapse with performance optimizations
     */
    async collapseAnimation(heatmapElement) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // Track animated element
        this.animatedElements.add(heatmapElement);

        return new Promise((resolve) => {
            // Performance optimization: Use will-change for GPU acceleration
            heatmapElement.style.willChange = 'opacity, transform';

            heatmapElement.style.transition = `all ${this.duration}ms ${this.easing}`;
            heatmapElement.style.opacity = '0';
            heatmapElement.style.transform = 'translateY(-10px) scaleY(0.95)';

            // Restore year items with optimization
            this.restoreYearItemsOptimized();

            setTimeout(() => {
                heatmapElement.style.willChange = 'auto';
                this.animatedElements.delete(heatmapElement);
                this.isAnimating = false;
                resolve();
            }, this.duration);
        });
    }

    /**
     * Push down year items below the target
     */
    pushDownYearItems(targetYearItem, heatmapElement) {
        const container = targetYearItem.parentElement;
        if (!container) return;

        const yearItems = Array.from(container.querySelectorAll('.year-item'));
        const targetIndex = yearItems.indexOf(targetYearItem);

        if (targetIndex === -1) return;

        // Calculate offset
        const heatmapHeight = heatmapElement.offsetHeight;
        const spacing = window.innerWidth < 600 ? 15 : 20;
        const offset = heatmapHeight + spacing;

        // Move items below
        for (let i = targetIndex + 1; i < yearItems.length; i++) {
            const item = yearItems[i];
            item.style.transition = `transform ${this.duration}ms ${this.easing}`;
            item.style.transform = `translateY(${offset}px)`;
        }
    }

    /**
     * Performance optimized version of pushDownYearItems
     */
    pushDownYearItemsOptimized(targetYearItem, heatmapElement) {
        const container = targetYearItem.parentElement;
        if (!container) return;

        const yearItems = Array.from(container.querySelectorAll('.year-item'));
        const targetIndex = yearItems.indexOf(targetYearItem);

        if (targetIndex === -1) return;

        // Performance optimization: Batch DOM reads and writes
        const heatmapHeight = heatmapElement.offsetHeight;
        const spacing = window.innerWidth < 600 ? 15 : 20;
        const offset = heatmapHeight + spacing;

        // Performance optimization: Use transform3d for GPU acceleration
        const itemsToMove = yearItems.slice(targetIndex + 1);

        // Batch all style changes
        requestAnimationFrame(() => {
            itemsToMove.forEach(item => {
                item.style.willChange = 'transform';
                item.style.transition = `transform ${this.duration}ms ${this.easing}`;
                item.style.transform = `translate3d(0, ${offset}px, 0)`;
                this.animatedElements.add(item);
            });

            // Clean up will-change after animation
            setTimeout(() => {
                itemsToMove.forEach(item => {
                    item.style.willChange = 'auto';
                    this.animatedElements.delete(item);
                });
            }, this.duration);
        });
    }

    /**
     * Restore year items to original positions
     */
    restoreYearItems() {
        const yearItems = document.querySelectorAll('.year-item');
        yearItems.forEach(item => {
            item.style.transition = `transform ${this.duration}ms ${this.easing}`;
            item.style.transform = 'translateY(0)';

            // Clean up after animation
            setTimeout(() => {
                item.style.transform = '';
                item.style.transition = '';
            }, this.duration);
        });
    }

    /**
     * Performance optimized version of restoreYearItems
     */
    restoreYearItemsOptimized() {
        const yearItems = document.querySelectorAll('.year-item');

        // Performance optimization: Batch all style changes
        requestAnimationFrame(() => {
            yearItems.forEach(item => {
                item.style.willChange = 'transform';
                item.style.transition = `transform ${this.duration}ms ${this.easing}`;
                item.style.transform = 'translate3d(0, 0, 0)';
                this.animatedElements.add(item);
            });

            // Clean up after animation
            setTimeout(() => {
                yearItems.forEach(item => {
                    item.style.transform = '';
                    item.style.transition = '';
                    item.style.willChange = 'auto';
                    this.animatedElements.delete(item);
                });
            }, this.duration);
        });
    }

    /**
     * Check if animations are enabled (respects user preferences)
     */
    areAnimationsEnabled() {
        return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Get effective duration (0 if animations disabled)
     */
    getEffectiveDuration() {
        return this.areAnimationsEnabled() ? this.duration : 0;
    }

    /**
     * Performance optimization: Cancel all active animations
     */
    cancelAllAnimations() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clean up all animated elements
        this.animatedElements.forEach(element => {
            if (element && element.style) {
                element.style.transition = 'none';
                element.style.willChange = 'auto';
            }
        });

        this.animatedElements.clear();
        this.activeAnimations.clear();
        this.isAnimating = false;
    }

    /**
     * Performance optimization: Throttled animation frame
     */
    requestThrottledFrame(callback) {
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;

        if (elapsed >= this.frameInterval) {
            this.lastFrameTime = now;
            return requestAnimationFrame(callback);
        } else {
            return setTimeout(() => {
                this.requestThrottledFrame(callback);
            }, this.frameInterval - elapsed);
        }
    }

    /**
     * Performance optimization: Get animation object from pool
     */
    getPooledAnimation() {
        return this.animationPool.pop() || {};
    }

    /**
     * Performance optimization: Return animation object to pool
     */
    returnAnimationToPool(animation) {
        // Clean up animation object
        Object.keys(animation).forEach(key => delete animation[key]);

        if (this.animationPool.length < 20) { // Limit pool size
            this.animationPool.push(animation);
        }
    }

    /**
     * Enhanced cleanup method with comprehensive resource management
     */
    destroy() {
        // Cancel all active animations
        this.cancelAllAnimations();

        // Restore year items
        this.restoreYearItemsOptimized();

        // Clear animation pool
        this.animationPool = [];

        // Reset state
        this.isAnimating = false;
        this.lastFrameTime = 0;
    }
}
/**
 * Module exports and initialization
 */

// Global heatmap manager instance
let globalHeatmapManager = null;

/**
 * Initialize heatmap functionality for the year page
 * Enhanced with performance monitoring and optimization
 * @param {HTMLElement} container - The year grid container
 * @param {Array} activityData - Activity events data
 * @param {Object} options - Configuration options
 * @returns {HeatmapManager} - The heatmap manager instance
 */
function initializeHeatmapFeature(container, activityData = [], options = {}) {
    const startTime = performance.now();

    // Clean up existing instance
    if (globalHeatmapManager) {
        globalHeatmapManager.destroy();
    }

    // Performance optimization: Validate large datasets
    if (Array.isArray(activityData) && activityData.length > 10000) {
        console.warn(`Large activity dataset detected (${activityData.length} items). Consider data pagination or filtering.`);
    }

    // Create new heatmap manager with options
    globalHeatmapManager = new HeatmapManager(container, activityData);

    // Apply configuration options
    if (options.maxCacheSize) {
        globalHeatmapManager.maxCacheSize = options.maxCacheSize;
    }

    const initTime = performance.now() - startTime;
    console.debug(`Heatmap initialized in ${initTime.toFixed(2)}ms`);

    return globalHeatmapManager;
}

/**
 * Update activity data for existing heatmap
 * Enhanced with performance optimizations for large datasets
 * @param {Array} activityData - New activity events data
 * @param {boolean} clearCache - Whether to clear the cache (default: true)
 */
function updateHeatmapActivityData(activityData, clearCache = true) {
    if (globalHeatmapManager) {
        const startTime = performance.now();

        // Performance optimization: Clear cache if data changed significantly
        if (clearCache) {
            globalHeatmapManager.clearCache();
        }

        globalHeatmapManager.updateActivityData(activityData);

        const updateTime = performance.now() - startTime;
        console.debug(`Activity data updated in ${updateTime.toFixed(2)}ms`);
    }
}

/**
 * Get the current heatmap manager instance
 * @returns {HeatmapManager|null} - The current heatmap manager or null
 */
function getHeatmapManager() {
    return globalHeatmapManager;
}

/**
 * Cleanup heatmap functionality
 */
function destroyHeatmapFeature() {
    if (globalHeatmapManager) {
        globalHeatmapManager.destroy();
        globalHeatmapManager = null;
    }
}

/**
 * Check if heatmap feature is available and enabled
 * @returns {boolean} - True if heatmap is available and enabled
 */
function isHeatmapFeatureEnabled() {
    return globalHeatmapManager && globalHeatmapManager.isHeatmapEnabled();
}

/**
 * Performance monitoring: Get heatmap performance metrics
 * @returns {Object} - Performance metrics object
 */
function getHeatmapPerformanceMetrics() {
    if (!globalHeatmapManager) {
        return null;
    }

    return globalHeatmapManager.getPerformanceMetrics();
}

/**
 * Performance optimization: Force cleanup of heatmap resources
 */
function forceHeatmapCleanup() {
    if (globalHeatmapManager) {
        globalHeatmapManager.forceCleanup();
    }
}

/**
 * Performance testing: Test heatmap performance with multiple operations
 * @param {number} iterations - Number of test iterations (default: 10)
 * @param {Array} testYears - Years to test (default: [2020, 2021, 2022, 2023, 2024, 2025])
 * @returns {Object} - Performance test results
 */
async function testHeatmapPerformance(iterations = 10, testYears = [2020, 2021, 2022, 2023, 2024, 2025]) {
    if (!globalHeatmapManager) {
        throw new Error('Heatmap manager not initialized');
    }

    const results = {
        iterations: iterations,
        testYears: testYears,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        operations: [],
        memoryUsage: {
            before: 0,
            after: 0,
            peak: 0
        }
    };

    // Record initial memory usage
    if (performance.memory) {
        results.memoryUsage.before = performance.memory.usedJSHeapSize;
    }

    console.log(`Starting heatmap performance test: ${iterations} iterations across ${testYears.length} years`);

    for (let i = 0; i < iterations; i++) {
        const iterationStart = performance.now();

        for (const year of testYears) {
            const operationStart = performance.now();

            // Simulate heatmap operations
            const yearData = globalHeatmapManager.processYearData(year);

            // Create and destroy heatmap element (without DOM insertion)
            const heatmapElement = await globalHeatmapManager.renderer.createHeatmapElementOptimized(year, yearData);

            // Clean up
            globalHeatmapManager.renderer.returnToPool(heatmapElement, 'containers');

            const operationTime = performance.now() - operationStart;
            results.operations.push({
                iteration: i + 1,
                year: year,
                time: operationTime
            });

            // Track memory usage
            if (performance.memory) {
                const currentMemory = performance.memory.usedJSHeapSize;
                results.memoryUsage.peak = Math.max(results.memoryUsage.peak, currentMemory);
            }
        }

        const iterationTime = performance.now() - iterationStart;
        results.totalTime += iterationTime;
        results.minTime = Math.min(results.minTime, iterationTime);
        results.maxTime = Math.max(results.maxTime, iterationTime);

        // Yield control periodically
        if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    results.averageTime = results.totalTime / iterations;

    // Record final memory usage
    if (performance.memory) {
        results.memoryUsage.after = performance.memory.usedJSHeapSize;
    }

    console.log('Heatmap performance test completed:', {
        totalTime: `${results.totalTime.toFixed(2)}ms`,
        averageTime: `${results.averageTime.toFixed(2)}ms`,
        minTime: `${results.minTime.toFixed(2)}ms`,
        maxTime: `${results.maxTime.toFixed(2)}ms`,
        memoryIncrease: results.memoryUsage.after - results.memoryUsage.before
    });

    return results;
}

/**
 * Performance optimization: Optimize heatmap for large datasets
 * @param {number} datasetSize - Size of the dataset
 * @returns {Object} - Optimization settings
 */
function optimizeHeatmapForDataset(datasetSize) {
    if (!globalHeatmapManager) {
        return null;
    }

    const optimizations = {
        cacheSize: 10,
        batchSize: 50,
        throttleDelay: 16
    };

    // Adjust optimizations based on dataset size
    if (datasetSize > 50000) {
        optimizations.cacheSize = 5; // Reduce cache size for very large datasets
        optimizations.batchSize = 25; // Smaller batches
        optimizations.throttleDelay = 32; // More throttling
    } else if (datasetSize > 10000) {
        optimizations.cacheSize = 8;
        optimizations.batchSize = 35;
        optimizations.throttleDelay = 24;
    } else if (datasetSize < 1000) {
        optimizations.cacheSize = 15; // Larger cache for small datasets
        optimizations.batchSize = 100; // Larger batches
        optimizations.throttleDelay = 8; // Less throttling
    }

    // Apply optimizations
    globalHeatmapManager.maxCacheSize = optimizations.cacheSize;

    console.log(`Heatmap optimized for dataset size: ${datasetSize}`, optimizations);

    return optimizations;
}

// Export classes and functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        HeatmapManager,
        HeatmapRenderer,
        ResponsiveController,
        AnimationController,
        initializeHeatmapFeature,
        updateHeatmapActivityData,
        getHeatmapManager,
        destroyHeatmapFeature,
        isHeatmapFeatureEnabled,
        getHeatmapPerformanceMetrics,
        forceHeatmapCleanup,
        testHeatmapPerformance,
        optimizeHeatmapForDataset
    };
} else {
    // Browser environment - attach to window object
    window.HeatmapCore = {
        HeatmapManager,
        HeatmapRenderer,
        ResponsiveController,
        AnimationController,
        initializeHeatmapFeature,
        updateHeatmapActivityData,
        getHeatmapManager,
        destroyHeatmapFeature,
        isHeatmapFeatureEnabled,
        getHeatmapPerformanceMetrics,
        forceHeatmapCleanup,
        testHeatmapPerformance,
        optimizeHeatmapForDataset
    };
}

// Auto-initialization disabled - heatmap is initialized explicitly in 07-year.js
/*
if (typeof document !== 'undefined') {
    function autoInitialize() {
        const container = document.getElementById('year-grid');
        if (container && !globalHeatmapManager) {
            // Initialize with empty data - will be updated when activity data loads
            initializeHeatmapFeature(container, []);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitialize);
    } else {
        // DOM already loaded
        autoInitialize();
    }
}
*/