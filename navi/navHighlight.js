function highlightCurrentPage() {
    const currentPath = window.location.pathname;

    const navLinks = document.querySelectorAll('.sidebar nav a, .logo-text a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');

        const normalizePageName = (path) => {
            if (!path) return '';
            const fileName = path.split('/').pop().split('?')[0].split('#')[0];
            // 移除 .html 后缀
            return fileName.replace(/\.html$/, '');
        };

        const currentPageName = normalizePageName(currentPath);
        const linkPageName = normalizePageName(href);

        // 处理首页情况
        if ((currentPath === '/' || currentPath.endsWith('/') || currentPageName === 'index' || currentPageName === 'skmst') &&
            (href === './' || href === '../' || href === '/' || linkPageName === 'index' || linkPageName === 'skmst')) {
            link.classList.add('active');
        }
        // 处理其他页面 - 使用标准化后的页面名称进行匹配
        else if (currentPageName && linkPageName && currentPageName === linkPageName) {
            link.classList.add('active');
        }
        // 特殊处理 about 和 contact 页面
        else if ((currentPageName === 'about' || currentPageName === 'contact') && linkPageName === 'about') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

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
