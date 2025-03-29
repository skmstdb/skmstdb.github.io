// 初始化主题和可见性
(function() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
        document.write('<style>html{background-color:#121212!important;}body{visibility:hidden;}</style>');
    } else {
        document.write('<style>html{background-color:#f8f4ed!important;}body{visibility:hidden;}</style>');
    }
})();

// 页面加载完成后恢复可见性
document.addEventListener('DOMContentLoaded', function () {
    document.body.style.visibility = 'visible';
});