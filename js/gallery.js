/**
 * 图片画廊功能 - 过滤和灯箱
 */

document.addEventListener('DOMContentLoaded', function() {

  var filterBtns = document.querySelectorAll('.filter-btn');
  var galleryItems = document.querySelectorAll('.gallery-item');
  var lightbox = document.querySelector('.lightbox');
  var lightboxImg = document.querySelector('.lightbox-img');
  var lightboxClose = document.querySelector('.lightbox-close');
  var lightboxPrev = document.querySelector('.lightbox-prev');
  var lightboxNext = document.querySelector('.lightbox-next');

  var currentIndex = 0;
  var visibleItems = [];

  // === 分类过滤 ===
  if (filterBtns.length > 0) {
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var filter = this.getAttribute('data-filter');

        // 更新按钮状态
        filterBtns.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');

        // 过滤图片
        galleryItems.forEach(function(item) {
          if (filter === 'all' || item.getAttribute('data-category') === filter) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });

        // 更新可见项列表
        updateVisibleItems();
      });
    });
  }

  // === 更新当前可见的图片列表 ===
  function updateVisibleItems() {
    visibleItems = [];
    galleryItems.forEach(function(item) {
      if (item.style.display !== 'none') {
        visibleItems.push(item);
      }
    });
  }

  updateVisibleItems();

  // === 打开灯箱 ===
  galleryItems.forEach(function(item, index) {
    item.addEventListener('click', function() {
      updateVisibleItems();
      var realIndex = visibleItems.indexOf(item);
      if (realIndex >= 0) {
        currentIndex = realIndex;
        openLightbox();
      }
    });
  });

  function openLightbox() {
    var img = visibleItems[currentIndex].querySelector('img');
    if (img) {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || '';
    }
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function prevImage() {
    if (visibleItems.length === 0) return;
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    openLightbox();
  }

  function nextImage() {
    if (visibleItems.length === 0) return;
    currentIndex = (currentIndex + 1) % visibleItems.length;
    openLightbox();
  }

  // === 灯箱事件 ===
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', prevImage);
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', nextImage);
  }

  // 点击背景关闭
  if (lightbox) {
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // 键盘导航
  document.addEventListener('keydown', function(e) {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  });
});
