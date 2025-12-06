/**
 * 导航栏高亮功能
 * 根据当前页面路径自动高亮对应的导航项
 */
function highlightCurrentPage() {
    // 获取当前页面路径
    const currentPath = window.location.pathname;

    // 获取所有导航链接
    const navLinks = document.querySelectorAll('.sidebar nav a, .logo-text a');

    navLinks.forEach(link => {
        // 获取链接的href属性
        const href = link.getAttribute('href');

        // 检查链接是否匹配当前页面
        // 处理首页情况
        if ((currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/') || currentPath.includes('skmst.html')) &&
            (href === 'index.html' || href === './' || href === '../index.html' || href === '/' || href.includes('skmst.html'))) {
            link.classList.add('active');
        }
        // 处理其他页面
        else if (
            (currentPath.includes('works.html') && href.includes('works.html')) ||
            (currentPath.includes('today.html') && href.includes('today.html')) ||
            (currentPath.includes('activity.html') && href.includes('activity.html')) ||
            (currentPath.includes('sakaical.html') && href.includes('sakaical.html')) ||
            (currentPath.includes('news.html') && href.includes('news.html')) ||
            ((currentPath.includes('about.html') || currentPath.includes('contact.html')) && href.includes('about.html'))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 调试信息
    console.log('当前路径:', currentPath);
    navLinks.forEach(link => {
        console.log('链接:', link.getAttribute('href'), '高亮状态:', link.classList.contains('active'));
    });
}

/**
 * 初始化汉堡菜单功能
 */
function initializeHamburger() {
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('nav');

    if (hamburger && nav) {
        hamburger.addEventListener('click', function () {
            nav.classList.toggle('active');
            this.classList.toggle('is-active');

            if (this.classList.contains('is-active')) {
                this.innerHTML = `<span style="transform: rotate(45deg); position: absolute; top: 50%; left: 0; width: 100%; margin-top: -1px;"></span><span style="transform: rotate(-45deg); position: absolute; top: 50%; left: 0; width: 100%; margin-top: -1px;"></span>`;
            } else {
                this.innerHTML = `<span></span><span></span><span></span>`;
            }
        });
    } else {
        console.warn('Hamburger or nav element not found in navbar.html');
    }
}

/**
 * 加载导航栏内容
 */
async function loadNavbar() {
    try {
        const response = await fetch('../Navi/navbar.html');
        const navbarContent = await response.text();
        document.querySelector('.sidebar').innerHTML = navbarContent;
        initializeHamburger();
        highlightCurrentPage();
    } catch (error) {
        console.error('Error loading navbar:', error);
        document.querySelector('.sidebar').innerHTML = '<p>Failed to load navigation.</p>';
    }
}

// 当DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    loadNavbar();
});
