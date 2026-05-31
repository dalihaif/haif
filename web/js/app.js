/* ============================================
   家族谱牒 - 主应用逻辑
   页面路由、UI交互、事件处理
   ============================================ */

const App = (() => {
  let currentPage = 'dashboard';
  let currentMember = null;
  let selectedFatherId = null;
  let selectedMotherId = null;
  let selectedSpouseId = null;

  // ========== 初始化 ==========

  function init() {
    document.querySelectorAll('.navbar-nav a').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const page = this.dataset.page;
        navigateTo(page);
      });
    });

    document.getElementById('btnAddMember').addEventListener('click', () => showMemberForm());
    document.getElementById('btnAddMemberTop').addEventListener('click', () => showMemberForm());

    // 成员表单事件
    document.getElementById('formMember').addEventListener('submit', handleMemberSubmit);
    document.getElementById('btnCancelForm').addEventListener('click', closeModal);
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });

    // 详情弹窗
    document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);
    document.getElementById('btnEditDetail').addEventListener('click', () => {
      if (currentMember) {
        closeDetailModal();
        showMemberForm(currentMember);
      }
    });
    document.getElementById('btnDeleteDetail').addEventListener('click', handleDeleteMember);
    document.getElementById('detailModalOverlay').addEventListener('click', function(e) {
      if (e.target === this) closeDetailModal();
    });

    // Excel上传
    document.getElementById('btnUploadExcel').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', handleImportFile);

    // 刷新
    refreshAll();
    navigateTo('dashboard');
  }

  // ========== 页面导航 ==========

  function navigateTo(page) {
    currentPage = page;

    // 更新导航
    document.querySelectorAll('.navbar-nav a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === page);
    });

    // 切换页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) targetPage.classList.add('active');

    // 加载页面内容
    switch (page) {
      case 'dashboard': loadDashboard(); break;
      case 'members': loadMembers(); break;
      case 'tree': loadTree(); break;
      case 'stats': loadStats(); break;
    }
  }

  function refreshAll() {
    if (currentPage === 'dashboard') loadDashboard();
    else if (currentPage === 'members') loadMembers();
    else if (currentPage === 'tree') loadTree();
    else if (currentPage === 'stats') loadStats();
  }

  // ========== 仪表盘 ==========

  function loadDashboard() {
    const stats = FamilyDB.getStats();
    const meta = FamilyDB.getMeta();
    const recentMembers = FamilyDB.getAllMembers().slice(-6).reverse();

    document.getElementById('familyNameDisplay').textContent = meta.familyName;
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statMale').textContent = stats.males;
    document.getElementById('statFemale').textContent = stats.females;
    document.getElementById('statAlive').textContent = stats.alive;
    document.getElementById('statDeceased').textContent = stats.deceased;

    // 最近加入
    const recentContainer = document.getElementById('recentMembers');
    if (recentMembers.length === 0) {
      recentContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <h4>族谱尚未记录</h4>
          <p>您的家族族谱还是空白，点击下方按钮开始记录第一位成员</p>
          <button class="btn btn-primary btn-lg" onclick="document.getElementById('btnAddMember').click()">
            ✨ 添加第一位成员
          </button>
        </div>`;
    } else {
      recentContainer.innerHTML = recentMembers.map(m => `
        <div class="member-card" onclick="App.showMemberDetail(${m.id})">
          <div class="member-avatar ${m.gender}">
            ${m.avatar ? `<img src="${m.avatar}" alt="${m.name}">` : getAvatarInitial(m.name)}
          </div>
          <div class="member-info">
            <div class="member-name">${m.name || '未命名'}</div>
            <div class="member-meta">
              第${m.generation || '?'}代 · ${m.birth_order || '未设排行'} · ${calculateAge(m.birth_date, m.death_date)}岁
            </div>
            <div class="member-tags">
              <span class="tag ${m.gender === 'male' ? 'tag-male' : 'tag-female'}">${getGenderLabel(m.gender)}</span>
              ${m.birth_date ? `<span class="tag tag-primary">${m.birth_date}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // ========== 成员列表 ==========

  function loadMembers(keyword, filters) {
    const members = FamilyDB.searchMembers(keyword, filters || {});
    const container = document.getElementById('memberList');

    if (members.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h4>${keyword ? '未找到匹配的成员' : '暂无成员记录'}</h4>
          <p>${keyword ? '请尝试其他搜索条件' : '点击下方按钮添加第一位家族成员'}</p>
          ${!keyword ? `<button class="btn btn-primary btn-lg" onclick="document.getElementById('btnAddMember').click()">➕ 添加成员</button>` : ''}
        </div>`;
      return;
    }

    container.innerHTML = members.map(m => `
      <div class="member-card" onclick="App.showMemberDetail(${m.id})">
        <div class="member-avatar ${m.gender}">
          ${m.avatar ? `<img src="${m.avatar}" alt="${m.name}">` : getAvatarInitial(m.name)}
        </div>
        <div class="member-info">
          <div class="member-name">${m.name || '未命名'}</div>
          <div class="member-meta">
            第${m.generation || '?'}代 · ${m.birth_order || '未设排行'} · ${calculateAge(m.birth_date, m.death_date)}岁
          </div>
          <div class="member-tags">
            <span class="tag ${m.gender === 'male' ? 'tag-male' : 'tag-female'}">${getGenderLabel(m.gender)}</span>
            ${m.death_date ? '<span class="tag tag-warning">已故</span>' : '<span class="tag tag-success">在世</span>'}
            ${m.birth_date ? `<span class="tag tag-primary">${m.birth_date}</span>` : ''}
          </div>
        </div>
        <div class="member-actions">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.showMemberForm(App.getMember(${m.id}))" title="编辑">✏️</button>
        </div>
      </div>
    `).join('');
  }

  function getMember(id) {
    return FamilyDB.getMemberById(id);
  }

  // 搜索和筛选事件绑定
  function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const filterButtons = document.querySelectorAll('#memberFilters .filter-btn');

    let currentFilters = { gender: 'all', alive: 'all' };

    function doSearch() {
      const keyword = searchInput.value.trim();
      loadMembers(keyword, currentFilters);
    }

    searchInput.addEventListener('input', function() {
      clearTimeout(this._timer);
      this._timer = setTimeout(doSearch, 300);
    });

    filterButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const group = this.dataset.group;
        const value = this.dataset.value;

        // 同一组互斥
        document.querySelectorAll(`#memberFilters .filter-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        currentFilters[group] = value;
        doSearch();
      });
    });
  }

  // ========== 成员表单 ==========

  function showMemberForm(member = null) {
    const form = document.getElementById('formMember');
    form.reset();
    document.getElementById('formId').value = '';

    if (member) {
      document.getElementById('modalTitle').textContent = '编辑成员';
      document.getElementById('formId').value = member.id;
      document.getElementById('formName').value = member.name || '';
      document.getElementById('formGender').value = member.gender || 'male';
      document.getElementById('formBirthDate').value = member.birth_date || '';
      document.getElementById('formDeathDate').value = member.death_date || '';
      document.getElementById('formGeneration').value = member.generation || '';
      document.getElementById('formBirthOrder').value = member.birth_order || '';
      document.getElementById('formEthnicity').value = member.ethnicity || '';
      document.getElementById('formEducation').value = member.education || '';
      document.getElementById('formCareer').value = member.career || '';
      document.getElementById('formPhone').value = member.phone || '';
      document.getElementById('formAddress').value = member.address || '';
      document.getElementById('formBio').value = member.bio || '';

      selectedFatherId = member.father_id;
      selectedMotherId = member.mother_id;
      selectedSpouseId = member.spouse_id;

      // 更新头像预览
      const avatarPreview = document.getElementById('avatarPreview');
      if (member.avatar) {
        avatarPreview.innerHTML = `<img src="${member.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        avatarPreview.dataset.avatarData = member.avatar;
      } else {
        delete avatarPreview.dataset.avatarData;
        updateAvatarPreview();
      }
    } else {
      document.getElementById('modalTitle').textContent = '添加成员';
      selectedFatherId = null;
      selectedMotherId = null;
      selectedSpouseId = null;
      updateAvatarPreview();
    }

    updateRelationDisplay('father');
    updateRelationDisplay('mother');
    updateRelationDisplay('spouse');

    document.getElementById('modalOverlay').style.display = 'flex';
  }

  function updateAvatarPreview() {
    const name = document.getElementById('formName').value || '?';
    const gender = document.getElementById('formGender').value;
    const preview = document.getElementById('avatarPreview');
    preview.className = `member-avatar ${gender}`;
    preview.innerHTML = getAvatarInitial(name);
  }

  function handleMemberSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('formId').value;
    const memberData = {
      name: document.getElementById('formName').value.trim(),
      gender: document.getElementById('formGender').value,
      birth_date: document.getElementById('formBirthDate').value,
      death_date: document.getElementById('formDeathDate').value,
      generation: document.getElementById('formGeneration').value,
      birth_order: document.getElementById('formBirthOrder').value,
      ethnicity: document.getElementById('formEthnicity').value,
      education: document.getElementById('formEducation').value,
      career: document.getElementById('formCareer').value,
      phone: document.getElementById('formPhone').value,
      address: document.getElementById('formAddress').value,
      bio: document.getElementById('formBio').value,
      father_id: selectedFatherId,
      mother_id: selectedMotherId,
      spouse_id: selectedSpouseId
    };

    if (!memberData.name) {
      showToast('请输入姓名', 'error');
      return;
    }

    // 保存头像（Data URL）
    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarPreview.dataset.avatarData) {
      memberData.avatar = avatarPreview.dataset.avatarData;
    } else if (id) {
      // 编辑模式保持原有头像
      const existingMember = FamilyDB.getMemberById(parseInt(id));
      if (existingMember) memberData.avatar = existingMember.avatar;
    }

    let result;
    if (id) {
      result = FamilyDB.updateMember(parseInt(id), memberData);
    } else {
      result = FamilyDB.addMember(memberData);
    }

    if (result) {
      // 处理配偶关系双向绑定
      if (memberData.spouse_id && !id) {
        const spouse = FamilyDB.getMemberById(memberData.spouse_id);
        if (spouse && spouse.spouse_id !== result.id) {
          FamilyDB.updateMember(memberData.spouse_id, { spouse_id: result.id });
        }
      }
      showToast(id ? '成员信息已更新' : '成员添加成功', 'success');
      closeModal();
      refreshAll();
    } else {
      showToast('操作失败，请重试', 'error');
    }
  }

  function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  }

  // 关系选择器
  function setupRelationPickers() {
    document.getElementById('btnSelectFather').addEventListener('click', () => showRelationPicker('father'));
    document.getElementById('btnSelectMother').addEventListener('click', () => showRelationPicker('mother'));
    document.getElementById('btnSelectSpouse').addEventListener('click', () => showRelationPicker('spouse'));
    document.getElementById('btnClearFather').addEventListener('click', () => { selectedFatherId = null; updateRelationDisplay('father'); });
    document.getElementById('btnClearMother').addEventListener('click', () => { selectedMotherId = null; updateRelationDisplay('mother'); });
    document.getElementById('btnClearSpouse').addEventListener('click', () => { selectedSpouseId = null; updateRelationDisplay('spouse'); });

    // 头像预览
    document.getElementById('formName').addEventListener('input', updateAvatarPreview);
    document.getElementById('formGender').addEventListener('change', updateAvatarPreview);

    // 头像上传
    document.getElementById('avatarUpload').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        const preview = document.getElementById('avatarPreview');
        preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        preview.dataset.avatarData = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function showRelationPicker(type) {
    const allMembers = FamilyDB.getAllMembers();
    const formId = document.getElementById('formId').value;
    const filtered = allMembers.filter(m => m.id !== parseInt(formId || 0));

    let html = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">';
    filtered.forEach(m => {
      html += `
        <div class="relation-chip" data-id="${m.id}" onclick="App.selectRelation('${type}', ${m.id})">
          ${m.name || '未命名'} · 第${m.generation || '?'}代
        </div>`;
    });
    if (filtered.length === 0) {
      html += '<div style="color:#8D6E63;font-size:13px;">暂无可选成员</div>';
    }
    html += '</div>';

    const container = document.getElementById(`relationPicker_${type}`);
    container.innerHTML = html;
    container.style.display = container.style.display === 'block' ? 'none' : 'block';
  }

  function selectRelation(type, memberId) {
    switch (type) {
      case 'father': selectedFatherId = memberId; break;
      case 'mother': selectedMotherId = memberId; break;
      case 'spouse': selectedSpouseId = memberId; break;
    }
    updateRelationDisplay(type);
    document.getElementById(`relationPicker_${type}`).style.display = 'none';
  }

  function updateRelationDisplay(type) {
    let memberId, labelEl, pickerEl;
    switch (type) {
      case 'father': memberId = selectedFatherId; labelEl = 'fatherLabel'; pickerEl = 'relationPicker_father'; break;
      case 'mother': memberId = selectedMotherId; labelEl = 'motherLabel'; pickerEl = 'relationPicker_mother'; break;
      case 'spouse': memberId = selectedSpouseId; labelEl = 'spouseLabel'; pickerEl = 'relationPicker_spouse'; break;
    }

    const labelContainer = document.getElementById(labelEl);
    if (memberId) {
      const member = FamilyDB.getMemberById(memberId);
      labelContainer.innerHTML = member
        ? `<span class="relation-chip selected">${member.name} <span class="chip-remove" onclick="event.stopPropagation();App.clearRelation('${type}')">×</span></span>`
        : '<span style="color:#8D6E63;font-size:13px;">未选择</span>';
    } else {
      labelContainer.innerHTML = '<span style="color:#8D6E63;font-size:13px;">未选择</span>';
    }
    if (pickerEl) document.getElementById(pickerEl).style.display = 'none';
  }

  function clearRelation(type) {
    switch (type) {
      case 'father': selectedFatherId = null; break;
      case 'mother': selectedMotherId = null; break;
      case 'spouse': selectedSpouseId = null; break;
    }
    updateRelationDisplay(type);
  }

  // ========== 成员详情 ==========

  function showMemberDetail(memberId) {
    const member = FamilyDB.getMemberById(memberId);
    if (!member) return;
    currentMember = member;

    const father = FamilyDB.getFather(member);
    const mother = FamilyDB.getMother(member);
    const spouse = FamilyDB.getSpouse(member);
    const children = FamilyDB.getChildren(member);
    const siblings = FamilyDB.getSiblings(member);

    // 头像
    const avatarEl = document.getElementById('detailAvatar');
    avatarEl.className = `detail-avatar ${member.gender}`;
    avatarEl.innerHTML = member.avatar
      ? `<img src="${member.avatar}" alt="${member.name}">`
      : getAvatarInitial(member.name);

    // 基本信息
    document.getElementById('detailName').textContent = member.name || '未命名';
    document.getElementById('detailGender').textContent = getGenderLabel(member.gender);
    document.getElementById('detailGender').className = `tag ${member.gender === 'male' ? 'tag-male' : 'tag-female'}`;
    document.getElementById('detailGeneration').textContent = `第${member.generation || '?'}代`;
    document.getElementById('detailAge').textContent = `${calculateAge(member.birth_date, member.death_date)}岁`;

    // 详情网格
    document.getElementById('detailBirthDate').textContent = member.birth_date || '未记录';
    document.getElementById('detailDeathDate').textContent = member.death_date || (member.death_date ? '' : '—');
    document.getElementById('detailBirthOrder').textContent = member.birth_order || '未设';
    document.getElementById('detailEthnicity').textContent = member.ethnicity || '未记录';
    document.getElementById('detailEducation').textContent = member.education || '未记录';
    document.getElementById('detailCareer').textContent = member.career || '未记录';
    document.getElementById('detailPhone').textContent = member.phone || '未记录';
    document.getElementById('detailAddress').textContent = member.address || '未记录';
    document.getElementById('detailBio').textContent = member.bio || '暂无简介';

    // 关系
    const relationContainer = document.getElementById('detailRelations');
    let relationHtml = '';

    if (father) {
      relationHtml += `<div class="relation-link" onclick="App.showMemberDetail(${father.id});event.stopPropagation();">👤 父亲：${father.name}</div>`;
    }
    if (mother) {
      relationHtml += `<div class="relation-link" onclick="App.showMemberDetail(${mother.id});event.stopPropagation();">👤 母亲：${mother.name}</div>`;
    }
    if (spouse) {
      relationHtml += `<div class="relation-link" onclick="App.showMemberDetail(${spouse.id});event.stopPropagation();">💑 配偶：${spouse.name}</div>`;
    }

    children.forEach(child => {
      relationHtml += `<div class="relation-link" onclick="App.showMemberDetail(${child.id});event.stopPropagation();">👶 子女：${child.name}</div>`;
    });

    siblings.forEach(sib => {
      relationHtml += `<div class="relation-link" onclick="App.showMemberDetail(${sib.id});event.stopPropagation();">👫 ${sib.gender === 'male' ? '兄弟' : '姐妹'}：${sib.name}</div>`;
    });

    if (!father && !mother && !spouse && children.length === 0 && siblings.length === 0) {
      relationHtml = '<div style="color:#8D6E63;font-size:13px;">暂未关联家族关系</div>';
    }

    relationContainer.innerHTML = relationHtml;
    document.getElementById('detailModalOverlay').style.display = 'flex';
  }

  function closeDetailModal() {
    document.getElementById('detailModalOverlay').style.display = 'none';
    currentMember = null;
  }

  function handleDeleteMember() {
    if (!currentMember) return;
    if (!confirm(`确认删除成员「${currentMember.name}」吗？\n\n此操作将同时清理所有引用此成员的关系，且不可撤销。`)) return;

    const success = FamilyDB.deleteMember(currentMember.id);
    if (success) {
      showToast('成员已删除', 'success');
      closeDetailModal();
      refreshAll();
    } else {
      showToast('删除失败', 'error');
    }
  }

  // ========== 家族树 ==========

  function loadTree() {
    const treeData = FamilyDB.buildFamilyTree();
    FamilyTreeRenderer.init('treeCanvas', (member) => {
      showMemberDetail(member.id);
    });
    // 延迟渲染确保DOM已显示
    setTimeout(() => {
      FamilyTreeRenderer.update(treeData);
      FamilyTreeRenderer.fitToScreen();
    }, 100);

    // 控件事件
    document.getElementById('treeZoomIn').onclick = () => FamilyTreeRenderer.zoomIn();
    document.getElementById('treeZoomOut').onclick = () => FamilyTreeRenderer.zoomOut();
    document.getElementById('treeReset').onclick = () => FamilyTreeRenderer.fitToScreen();
  }

  // ========== 统计分析 ==========

  function loadStats() {
    const stats = FamilyDB.getStats();

    document.getElementById('statTotal2').textContent = stats.total;
    document.getElementById('statMale2').textContent = stats.males;
    document.getElementById('statFemale2').textContent = stats.females;
    document.getElementById('statAlive2').textContent = stats.alive;
    document.getElementById('statDeceased2').textContent = stats.deceased;

    // 性别比例
    const genderBar = document.getElementById('genderBar');
    genderBar.innerHTML = `
      <div class="bar-row">
        <div class="bar-label">男性</div>
        <div class="bar-track"><div class="bar-fill male" style="width:${stats.genderRatio.male}%">${stats.genderRatio.male}%</div></div>
        <div class="bar-value">${stats.males}人</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">女性</div>
        <div class="bar-track"><div class="bar-fill female" style="width:${stats.genderRatio.female}%">${stats.genderRatio.female}%</div></div>
        <div class="bar-value">${stats.females}人</div>
      </div>
    `;

    // 年龄分布
    const ageBar = document.getElementById('ageBar');
    const maxAge = Math.max(...Object.values(stats.ageGroups), 1);
    ageBar.innerHTML = Object.entries(stats.ageGroups).map(([range, count]) => `
      <div class="bar-row">
        <div class="bar-label">${range}岁</div>
        <div class="bar-track"><div class="bar-fill red" style="width:${(count/maxAge*100)}%">${count > 0 ? count : ''}</div></div>
        <div class="bar-value">${count}人</div>
      </div>
    `).join('');

    // 世代分布
    const genBar = document.getElementById('genBar');
    const maxGen = Math.max(...Object.values(stats.genDist), 1);
    const sortedGens = Object.keys(stats.genDist).sort((a, b) => a - b);
    genBar.innerHTML = sortedGens.map(g => `
      <div class="bar-row">
        <div class="bar-label">第${g}代</div>
        <div class="bar-track"><div class="bar-fill gold" style="width:${(stats.genDist[g]/maxGen*100)}%">${stats.genDist[g] > 0 ? stats.genDist[g] : ''}</div></div>
        <div class="bar-value">${stats.genDist[g]}人</div>
      </div>
    `).join('');
  }

  // ========== 数据导入导出 ==========

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
      const result = FamilyDB.importJSON(ev.target.result);
      if (result.success) {
        showToast(`成功导入 ${result.count} 条成员记录`, 'success');
        refreshAll();
      } else {
        showToast(`导入失败：${result.error}`, 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  function exportJSON() {
    const json = FamilyDB.exportJSON();
    downloadFile('族谱数据.json', json, 'application/json');
    showToast('JSON数据导出成功', 'success');
  }

  function exportText() {
    const text = FamilyDB.exportText();
    downloadFile('族谱文本.txt', text, 'text/plain');
    showToast('文本族谱导出成功', 'success');
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ========== Toast ==========

  function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => { toast.remove(); }, 2500);
  }

  // ========== 启动 ==========

  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupSearch();
    setupRelationPickers();

    // 导航栏添加按钮
    document.getElementById('btnAddMember').addEventListener('click', () => showMemberForm());
    document.getElementById('btnAddMemberTop').addEventListener('click', () => showMemberForm());

    // 导出按钮
    document.getElementById('btnExportJSON').addEventListener('click', exportJSON);
    document.getElementById('btnExportText').addEventListener('click', exportText);

    // 重置按钮
    document.getElementById('btnResetData').addEventListener('click', () => {
      if (confirm('⚠️ 确认重置所有数据吗？\n\n此操作不可撤销，所有家族成员数据将被清空！')) {
        FamilyDB.resetData();
        showToast('数据已重置', 'success');
        refreshAll();
      }
    });
  });

  // 公开API
  return {
    navigateTo,
    showMemberForm,
    showMemberDetail,
    closeDetailModal,
    selectRelation,
    clearRelation,
    getMember,
    refreshAll
  };
})();
