(function() {
    'use strict';
    
    // Function to set CSS custom property for viewport height
    function setViewportHeight() {
        // Get the actual viewport height
        const vh = window.innerHeight * 0.01;
        // Set the CSS custom property
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    // Function to handle iOS Safari viewport issues
    function handleIOSViewport() {
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            // iOS Safari specific fixes
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute('content', 
                    'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no'
                );
            }
        }
    }
    
    // Function to handle Samsung Internet specific issues
    function handleSamsungInternet() {
        if (navigator.userAgent.includes('SamsungBrowser')) {
            // Samsung Internet specific viewport fixes
            document.documentElement.style.setProperty('--samsung-fix', '1');
        }
    }
    
    // Function to handle Chrome Mobile specific issues
    function handleChromeMobile() {
        if (navigator.userAgent.includes('Chrome') && 
            navigator.userAgent.includes('Mobile')) {
            // Chrome Mobile specific fixes
            document.documentElement.style.setProperty('--chrome-mobile-fix', '1');
        }
    }
    
    // Initialize viewport fixes
    function initMobileViewportFixes() {
        setViewportHeight();
        handleIOSViewport();
        handleSamsungInternet();
        handleChromeMobile();
    }
    
    // Run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileViewportFixes);
    } else {
        initMobileViewportFixes();
    }
    
    // Update on resize and orientation change
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', function() {
        // Delay to ensure orientation change is complete
        setTimeout(setViewportHeight, 100);
    });
    
    // Handle visibility change (for mobile browser address bar show/hide)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            setTimeout(setViewportHeight, 100);
        }
    });
    
})();