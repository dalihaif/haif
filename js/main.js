/**
 * 全局脚本 - 导航、动画、工具函数
 */

document.addEventListener('DOMContentLoaded', function() {

  // === 移动端菜单切换 ===
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function() {
      navLinks.classList.toggle('active');
    });

    // 点击导航链接后关闭菜单
    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        navLinks.classList.remove('active');
      });
    });

    // 点击页面其他地方关闭菜单
    document.addEventListener('click', function(e) {
      if (!menuBtn.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
  }

  // === 当前页面高亮 ===
  var currentPath = window.location.pathname;
  var pageName = currentPath.split('/').pop() || 'index.html';

  navLinks.querySelectorAll('a').forEach(function(link) {
    var href = link.getAttribute('href');
    if (href === pageName || (pageName === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // === 滚动时导航栏阴影 ===
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 10) {
        navbar.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      } else {
        navbar.style.boxShadow = 'none';
      }
    });
  }

  // === 平滑出现动画 ===
  var observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-in').forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
});
