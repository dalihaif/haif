/* ============================================
   家族谱牒 - 家族树Canvas可视化
   交互式家族关系树图谱
   ============================================ */

const FamilyTreeRenderer = (() => {
  let canvas, ctx;
  let nodes = [];
  let scale = 1;
  let offsetX = 0, offsetY = 0;
  let isDragging = false;
  let dragStartX, dragStartY;
  let dragOffsetStartX, dragOffsetStartY;
  let onNodeClick = null;

  const CONFIG = {
    nodeWidth: 140,
    nodeHeight: 70,
    hGap: 40,        // 水平间距
    vGap: 100,       // 垂直间距（代际间距）
    spouseGap: 20,   // 配偶间距
    borderRadius: 8,
    maleColor: '#3498DB',
    femaleColor: '#E91E63',
    lineColor: '#D4AF37',
    lineWidth: 2,
    fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
    fontSize: 13,
    smallFontSize: 11
  };

  function init(containerId, clickCallback) {
    canvas = document.getElementById(containerId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    onNodeClick = clickCallback;
    setupEvents();
    resizeCanvas();
    window.addEventListener('resize', () => {
      resizeCanvas();
      render();
    });
  }

  function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setupEvents() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('click', onClick);
    // 触摸事件
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
  }

  function onMouseDown(e) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOffsetStartX = offsetX;
    dragOffsetStartY = offsetY;
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    offsetX = dragOffsetStartX + dx;
    offsetY = dragOffsetStartY + dy;
    render();
  }

  function onMouseUp() { isDragging = false; }

  function onWheel(e) {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const newScale = scale - e.deltaY * zoomSpeed;
    if (newScale >= 0.3 && newScale <= 2.5) {
      // 以鼠标位置为中心缩放
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - offsetX) / scale;
      const worldY = (mouseY - offsetY) / scale;
      scale = newScale;
      offsetX = mouseX - worldX * scale;
      offsetY = mouseY - worldY * scale;
      render();
    }
  }

  function onClick(e) {
    if (isDragging) return;
    if (!onNodeClick) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 反向查找点击的节点
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const nx = node.x * scale + offsetX;
      const ny = node.y * scale + offsetY;
      const nw = CONFIG.nodeWidth * scale;
      const nh = CONFIG.nodeHeight * scale;
      if (mouseX >= nx && mouseX <= nx + nw && mouseY >= ny && mouseY <= ny + nh) {
        onNodeClick(node.member);
        return;
      }
    }
  }

  // 触摸事件
  let touchDistance = 0;
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragOffsetStartX = offsetX;
      dragOffsetStartY = offsetY;
      e.preventDefault();
    } else if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartX;
      const dy = e.touches[0].clientY - dragStartY;
      offsetX = dragOffsetStartX + dx;
      offsetY = dragOffsetStartY + dy;
      render();
      e.preventDefault();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      if (touchDistance > 0) {
        const newScale = scale * (newDist / touchDistance);
        if (newScale >= 0.3 && newScale <= 2.5) scale = newScale;
      }
      touchDistance = newDist;
      render();
    }
  }

  function onTouchEnd() { isDragging = false; }

  // ========== 布局计算 ==========

  function layoutTree(treeData) {
    nodes = [];
    const { roots } = treeData;
    if (roots.length === 0) return;

    // 递归计算子树宽度
    function calcSubtreeWidth(node, level) {
      if (!node.children || node.children.length === 0) {
        node._treeWidth = 1;
        return 1;
      }
      let total = 0;
      node.children.forEach(child => { total += calcSubtreeWidth(child, level + 1); });
      // 配偶也占位置
      if (node.spouses && node.spouses.length > 0) total += node.spouses.length;
      node._treeWidth = total;
      return total;
    }

    roots.forEach(root => calcSubtreeWidth(root, 0));

    const nodeW = CONFIG.nodeWidth + CONFIG.hGap;

    // 递归布局
    function layout(node, level, startX) {
      if (!node.children || node.children.length === 0) {
        node._x = startX;
        node._y = level;
        return startX + 1;
      }

      let currentX = startX;
      const childrenX = [];

      node.children.forEach(child => {
        currentX = layout(child, level + 1, currentX);
        childrenX.push(child._x);
      });

      // 配偶布局在右侧
      if (node.spouses && node.spouses.length > 0) {
        node.spouses.forEach(spouse => {
          spouse._x = currentX;
          spouse._y = level;
          currentX++;
        });
      }

      node._x = childrenX.length > 0
        ? (childrenX[0] + childrenX[childrenX.length - 1]) / 2
        : startX;
      node._y = level;

      return Math.max(currentX, startX + (node._treeWidth || 1));
    }

    let totalX = 0;
    roots.forEach(root => { totalX = layout(root, 0, totalX); });

    // 转换为画布坐标
    const allNodes = [];
    function collectNodes(node) {
      allNodes.push(node);
      if (node.spouses) node.spouses.forEach(s => allNodes.push(s));
      if (node.children) node.children.forEach(c => collectNodes(c));
    }
    roots.forEach(root => collectNodes(root));

    const canvasW = canvas ? canvas.width / (window.devicePixelRatio || 1) : 1000;

    allNodes.forEach(node => {
      node.x = node._x * nodeW + 60;
      node.y = node._y * CONFIG.vGap + 40;
      nodes.push(node);
    });

    // 居中
    if (nodes.length > 0) {
      const minX = Math.min(...nodes.map(n => n.x));
      const maxX = Math.max(...nodes.map(n => n.x));
      const treeCenter = (minX + maxX) / 2 + CONFIG.nodeWidth / 2;
      offsetX = canvasW / 2 - treeCenter;
      offsetY = 30;
      scale = 1;
    }
  }

  // ========== 渲染 ==========

  function render() {
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    // 背景
    ctx.fillStyle = '#FAFAF5';
    ctx.fillRect(0, 0, w, h);

    if (nodes.length === 0) {
      ctx.fillStyle = '#8D6E63';
      ctx.font = '16px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无家族成员，请先添加成员', w / 2, h / 2);
      return;
    }

    ctx.save();

    // 应用变换
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 绘制连线
    nodes.forEach(node => {
      if (node.children) {
        node.children.forEach(child => {
          drawConnection(node, child);
        });
      }
      if (node.spouses) {
        node.spouses.forEach(spouse => {
          drawSpouseConnection(node, spouse);
        });
      }
    });

    // 绘制节点
    nodes.forEach(node => {
      drawNode(node);
    });

    ctx.restore();
  }

  function drawConnection(parent, child) {
    const px = parent.x + CONFIG.nodeWidth / 2;
    const py = parent.y + CONFIG.nodeHeight;
    const cx = child.x + CONFIG.nodeWidth / 2;
    const cy = child.y;

    ctx.beginPath();
    ctx.strokeStyle = CONFIG.lineColor;
    ctx.lineWidth = CONFIG.lineWidth;
    ctx.setLineDash([]);

    // 贝塞尔曲线连接
    const midY = (py + cy) / 2;
    ctx.moveTo(px, py);
    ctx.lineTo(px, midY);
    ctx.lineTo(cx, midY);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // 小圆点
    ctx.beginPath();
    ctx.fillStyle = CONFIG.lineColor;
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSpouseConnection(m1, m2) {
    const x1 = m1.x + CONFIG.nodeWidth;
    const y1 = m1.y + CONFIG.nodeHeight / 2;
    const x2 = m2.x;
    const y2 = m2.y + CONFIG.nodeHeight / 2;

    ctx.beginPath();
    ctx.strokeStyle = '#E0D5C5';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawNode(node) {
    const x = node.x;
    const y = node.y;
    const w = CONFIG.nodeWidth;
    const h = CONFIG.nodeHeight;
    const r = CONFIG.borderRadius;

    const member = node;
    const isMale = member.gender === 'male';
    const color = isMale ? CONFIG.maleColor : CONFIG.femaleColor;
    const alive = !member.death_date;

    // 阴影
    ctx.shadowColor = 'rgba(62,39,35,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // 主体
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 顶部色条
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + 28);
    ctx.lineTo(x, y + 28);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // 姓名
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${CONFIG.fontSize}px ${CONFIG.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const name = member.name || '未命名';
    ctx.fillText(name.length > 5 ? name.substring(0, 4) + '…' : name, x + w / 2, y + 14);

    // 世代和生卒
    ctx.fillStyle = '#5D4037';
    ctx.font = `${CONFIG.smallFontSize}px ${CONFIG.fontFamily}`;
    let info = `${member.generation || '?'}代`;
    if (member.birth_date) {
      const birthYear = member.birth_date.split('-')[0];
      info += ` · ${birthYear}`;
      if (member.death_date) {
        const deathYear = member.death_date.split('-')[0];
        info += `-${deathYear}`;
      }
    }
    ctx.fillText(info, x + w / 2, y + 44);

    // 性别图标
    ctx.fillStyle = alive ? color : '#999';
    ctx.font = '14px sans-serif';
    const genderIcon = isMale ? '♂' : '♀';
    ctx.fillText(genderIcon, x + w / 2, y + 62);

    // 已故标记
    if (!alive) {
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x + 10, y + h / 2);
      ctx.lineTo(x + w - 10, y + h / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ========== 公共API ==========

  function update(treeData) {
    layoutTree(treeData);
    render();
  }

  function zoomIn() {
    scale = Math.min(2.5, scale + 0.2);
    render();
  }

  function zoomOut() {
    scale = Math.max(0.3, scale - 0.2);
    render();
  }

  function resetView() {
    scale = 1;
    offsetX = 0;
    offsetY = 30;
    // 重新计算居中
    if (nodes.length > 0) {
      const dpr = window.devicePixelRatio || 1;
      const canvasW = canvas ? canvas.width / dpr : 1000;
      const minX = Math.min(...nodes.map(n => n.x));
      const maxX = Math.max(...nodes.map(n => n.x));
      const treeCenter = (minX + maxX) / 2 + CONFIG.nodeWidth / 2;
      offsetX = canvasW / 2 - treeCenter;
    }
    render();
  }

  function fitToScreen() {
    if (nodes.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const canvasW = canvas ? canvas.width / dpr : 1000;
    const canvasH = canvas ? canvas.height / dpr : 600;

    const minX = Math.min(...nodes.map(n => n.x)) - 40;
    const maxX = Math.max(...nodes.map(n => n.x)) + CONFIG.nodeWidth + 40;
    const minY = Math.min(...nodes.map(n => n.y)) - 40;
    const maxY = Math.max(...nodes.map(n => n.y)) + CONFIG.nodeHeight + 40;

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    const scaleX = canvasW / contentW;
    const scaleY = canvasH / contentH;
    scale = Math.min(scaleX, scaleY, 1.5);

    offsetX = (canvasW - contentW * scale) / 2 - minX * scale;
    offsetY = (canvasH - contentH * scale) / 2 - minY * scale + 30;

    render();
  }

  return { init, update, render, zoomIn, zoomOut, resetView, fitToScreen };
})();
