/* ============================================
   家族谱牒 - 数据管理层
   基于 localStorage 的本地数据存储
   数据结构与微信小程序云数据库一致
   ============================================ */

const FamilyDB = (() => {
  const STORAGE_KEY = 'family_tree_data';

  // 默认示例数据（便于初次使用时理解结构）
  const DEFAULT_DATA = {
    members: [],
    nextId: 1,
    meta: {
      familyName: '李氏家族',
      origin: '大理',
      created: new Date().toISOString(),
      version: '1.0'
    }
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
      return JSON.parse(raw);
    } catch (e) {
      console.error('数据加载失败:', e);
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('数据保存失败（可能超出存储限制）:', e);
      return false;
    }
  }

  // ========== 成员 CRUD ==========

  function getAllMembers() {
    const data = load();
    // 按世代排序，同世代按排行排序
    return data.members.sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation;
      return (a.birth_order || '').localeCompare(b.birth_order || '');
    });
  }

  function getMemberById(id) {
    const data = load();
    return data.members.find(m => m.id === id) || null;
  }

  function addMember(memberData) {
    const data = load();
    const now = new Date().toISOString();
    const newMember = {
      id: data.nextId++,
      name: memberData.name || '',
      gender: memberData.gender || 'male',
      birth_date: memberData.birth_date || '',
      death_date: memberData.death_date || '',
      generation: parseInt(memberData.generation) || 1,
      birth_order: memberData.birth_order || '',
      ethnicity: memberData.ethnicity || '汉族',
      education: memberData.education || '',
      career: memberData.career || '',
      phone: memberData.phone || '',
      address: memberData.address || '',
      bio: memberData.bio || '',
      father_id: memberData.father_id || null,
      mother_id: memberData.mother_id || null,
      spouse_id: memberData.spouse_id || null,
      children_ids: memberData.children_ids || [],
      sibling_ids: memberData.sibling_ids || [],
      avatar: memberData.avatar || null,
      create_time: now,
      update_time: now
    };

    data.members.push(newMember);
    save(data);
    return newMember;
  }

  function updateMember(id, updates) {
    const data = load();
    const idx = data.members.findIndex(m => m.id === id);
    if (idx === -1) return null;

    // 不允许修改 id 和 create_time
    const allowed = { ...updates };
    delete allowed.id;
    delete allowed.create_time;
    allowed.update_time = new Date().toISOString();

    data.members[idx] = { ...data.members[idx], ...allowed };
    save(data);
    return data.members[idx];
  }

  function deleteMember(id) {
    const data = load();
    const idx = data.members.findIndex(m => m.id === id);
    if (idx === -1) return false;

    const member = data.members[idx];

    // 清理所有引用此成员的关系
    data.members.forEach(m => {
      if (m.father_id === id) m.father_id = null;
      if (m.mother_id === id) m.mother_id = null;
      if (m.spouse_id === id) m.spouse_id = null;
      m.children_ids = m.children_ids.filter(cid => cid !== id);
      m.sibling_ids = m.sibling_ids.filter(sid => sid !== id);
    });

    data.members.splice(idx, 1);
    save(data);
    return true;
  }

  // ========== 关系查询 ==========

  function getFather(member) {
    if (!member || !member.father_id) return null;
    return getMemberById(member.father_id);
  }

  function getMother(member) {
    if (!member || !member.mother_id) return null;
    return getMemberById(member.mother_id);
  }

  function getSpouse(member) {
    if (!member || !member.spouse_id) return null;
    return getMemberById(member.spouse_id);
  }

  function getChildren(member) {
    if (!member) return [];
    const all = getAllMembers();
    // 通过 children_ids 获取
    const children = (member.children_ids || [])
      .map(id => all.find(m => m.id === id))
      .filter(Boolean);
    return children;
  }

  function getSiblings(member) {
    if (!member) return [];
    const all = getAllMembers();
    const siblings = (member.sibling_ids || [])
      .map(id => all.find(m => m.id === id))
      .filter(Boolean);
    return siblings;
  }

  // 反向查找：谁将此成员设为子女
  function getChildrenOf(memberId) {
    const all = getAllMembers();
    return all.filter(m => m.father_id === memberId || m.mother_id === memberId);
  }

  // ========== 统计 ==========

  function getStats() {
    const all = getAllMembers();
    const males = all.filter(m => m.gender === 'male');
    const females = all.filter(m => m.gender === 'female');
    const alive = all.filter(m => !m.death_date);
    const deceased = all.filter(m => m.death_date);

    // 性别比例
    const genderRatio = all.length > 0 ? {
      male: Math.round((males.length / all.length) * 100),
      female: Math.round((females.length / all.length) * 100)
    } : { male: 0, female: 0 };

    // 年龄分布
    const ageGroups = { '0-17': 0, '18-35': 0, '36-55': 0, '56-70': 0, '70+': 0 };
    alive.forEach(m => {
      if (!m.birth_date) return;
      const age = calculateAge(m.birth_date);
      if (age < 18) ageGroups['0-17']++;
      else if (age < 36) ageGroups['18-35']++;
      else if (age < 56) ageGroups['36-55']++;
      else if (age < 71) ageGroups['56-70']++;
      else ageGroups['70+']++;
    });

    // 世代分布
    const genDist = {};
    all.forEach(m => {
      const g = m.generation || '未知';
      genDist[g] = (genDist[g] || 0) + 1;
    });

    return {
      total: all.length,
      males: males.length,
      females: females.length,
      alive: alive.length,
      deceased: deceased.length,
      genderRatio,
      ageGroups,
      genDist
    };
  }

  // ========== 搜索 ==========

  function searchMembers(keyword = '', filters = {}) {
    let all = getAllMembers();

    if (keyword) {
      const kw = keyword.toLowerCase();
      all = all.filter(m =>
        m.name.toLowerCase().includes(kw) ||
        (m.bio && m.bio.toLowerCase().includes(kw)) ||
        (m.address && m.address.toLowerCase().includes(kw))
      );
    }

    if (filters.gender && filters.gender !== 'all') {
      all = all.filter(m => m.gender === filters.gender);
    }

    if (filters.generation) {
      all = all.filter(m => m.generation === parseInt(filters.generation));
    }

    if (filters.alive === 'alive') {
      all = all.filter(m => !m.death_date);
    } else if (filters.alive === 'deceased') {
      all = all.filter(m => m.death_date);
    }

    return all;
  }

  // ========== 家族树构建 ==========

  function buildFamilyTree() {
    const all = getAllMembers();
    const memberMap = {};
    all.forEach(m => {
      memberMap[m.id] = { ...m, children: [], spouses: [] };
    });

    // 填充 children（通过 father_id 反向查找）
    all.forEach(m => {
      if (m.father_id && memberMap[m.father_id]) {
        memberMap[m.father_id].children.push(memberMap[m.id]);
      }
    });

    // 填充配偶信息
    all.forEach(m => {
      if (m.spouse_id && memberMap[m.spouse_id]) {
        memberMap[m.id].spouses.push(memberMap[m.spouse_id]);
      }
    });

    // 找出根节点（没有 father_id 的成员，或 father_id 指向不存在的成员）
    let roots = all.filter(m => !m.father_id || !memberMap[m.father_id])
      .map(m => memberMap[m.id]);

    // 按世代排序根节点
    roots.sort((a, b) => a.generation - b.generation);

    // 如果全都有父节点（理论上不应该），找最小世代
    if (roots.length === 0 && all.length > 0) {
      const minGen = Math.min(...all.map(m => m.generation || 1));
      roots = all.filter(m => m.generation === minGen).map(m => memberMap[m.id]);
    }

    return { roots, memberMap };
  }

  // ========== 导出 ==========

  function exportJSON() {
    const data = load();
    const exportData = {
      familyName: data.meta.familyName,
      origin: data.meta.origin,
      exportTime: new Date().toISOString(),
      members: data.members,
      totalMembers: data.members.length
    };
    return JSON.stringify(exportData, null, 2);
  }

  function exportText() {
    const all = getAllMembers();
    const generations = {};
    all.forEach(m => {
      const g = m.generation || 0;
      if (!generations[g]) generations[g] = [];
      generations[g].push(m);
    });

    let text = `族谱 - ${load().meta.familyName}\n`;
    text += `导出时间：${new Date().toLocaleString()}\n`;
    text += `总人数：${all.length}\n`;
    text += '='.repeat(60) + '\n\n';

    const sortedGens = Object.keys(generations).sort((a, b) => a - b);
    sortedGens.forEach(g => {
      text += `【第${g}代】\n`;
      text += '-'.repeat(40) + '\n';
      generations[g].forEach(m => {
        const gender = m.gender === 'male' ? '男' : '女';
        const birth = m.birth_date || '不详';
        const death = m.death_date ? ` - ${m.death_date}` : '';
        const age = calculateAge(m.birth_date, m.death_date);
        text += `  ${m.name}  ${gender}  生卒：${birth}${death}  享年：${age}岁\n`;
        if (m.birth_order) text += `    排行：${m.birth_order}\n`;
        if (m.education) text += `    学历：${m.education}\n`;
        if (m.career) text += `    职业：${m.career}\n`;
        if (m.bio) text += `    简介：${m.bio}\n`;
        text += '\n';
      });
    });

    return text;
  }

  function importJSON(jsonStr) {
    try {
      const imported = JSON.parse(jsonStr);
      if (!imported.members || !Array.isArray(imported.members)) {
        throw new Error('无效的数据格式');
      }

      const data = load();
      const existingIds = new Set(data.members.map(m => m.id));

      let importedCount = 0;
      imported.members.forEach(m => {
        // 确保ID唯一
        if (m.id && existingIds.has(m.id)) {
          m.id = data.nextId++;
        } else if (!m.id) {
          m.id = data.nextId++;
        }
        existingIds.add(m.id);
        // 确保关系字段存在
        m.father_id = m.father_id || null;
        m.mother_id = m.mother_id || null;
        m.spouse_id = m.spouse_id || null;
        m.children_ids = m.children_ids || [];
        m.sibling_ids = m.sibling_ids || [];
        m.create_time = m.create_time || new Date().toISOString();
        m.update_time = new Date().toISOString();
        data.members.push(m);
        importedCount++;
      });

      data.nextId = Math.max(data.nextId, ...data.members.map(m => m.id)) + 1;
      save(data);
      return { success: true, count: importedCount };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function resetData() {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  }

  // ========== 家族元信息 ==========

  function getMeta() {
    return load().meta;
  }

  function updateMeta(updates) {
    const data = load();
    data.meta = { ...data.meta, ...updates };
    save(data);
    return data.meta;
  }

  return {
    getAllMembers,
    getMemberById,
    addMember,
    updateMember,
    deleteMember,
    getFather,
    getMother,
    getSpouse,
    getChildren,
    getSiblings,
    getChildrenOf,
    getStats,
    searchMembers,
    buildFamilyTree,
    exportJSON,
    exportText,
    importJSON,
    resetData,
    getMeta,
    updateMeta
  };
})();

// ========== 工具函数 ==========

function calculateAge(birthDate, deathDate) {
  if (!birthDate) return '?';
  const end = deathDate ? new Date(deathDate) : new Date();
  const birth = new Date(birthDate);
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getGenderLabel(gender) {
  return gender === 'male' ? '男' : gender === 'female' ? '女' : '未知';
}

function getAvatarInitial(name) {
  if (!name) return '?';
  return name.charAt(0);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
