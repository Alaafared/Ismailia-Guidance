const PAGES = {
  users: { title: 'إدارة المستخدمين', render: renderUsersPage, icon: '👥' },
  schools: { title: 'بيانات المدارس', render: renderSchoolsPage, icon: '🏫' },
  budget: { title: 'ميزانية العجز والزيادة', render: renderBudgetPage, icon: '📊' },
  status: { title: 'صحف أحوال المعلمين', render: renderStatusPage, icon: '📋' },
  shortage: { title: 'العجز والزيادة', render: renderShortagePage, icon: '📈' },
  schedules: { title: 'جداول المعلمين', render: renderSchedulesPage, icon: '🗓️' },
  websites: { title: 'المواقع الإلكترونية', render: renderWebsitesPage, icon: '🌐' },
  curriculum: { title: 'توزيع المناهج', render: renderCurriculumPage, icon: '📚' },
  books: { title: 'الكتب والمراجع', render: renderBooksPage, icon: '📖' },
  visits: { title: 'زيارات الفصول', render: renderVisitsPage, icon: '🔍' },
  movements: { title: 'حركات التعيين والندب والنقل', render: renderMovementsPage, icon: '🔄' },
  meetings: { title: 'اجتماعات المكتب الفني', render: renderMeetingsPage, icon: '📝' },
  decisions: { title: 'القرارات الوزارية', render: renderDecisionsPage, icon: '⚖️' }
};

function getNavItemsForRole(role) {
  const r = normalizeRole(role);
  const all = Object.keys(PAGES);
  if (r === 'superadmin') return all;
  if (r === 'supervisor') {
    // مشرف التخصص: يرى كل شيء ما عدا إدارة المستخدمين والمدارس واجتماعات المكتب الفني
    return all.filter(p => !['users', 'schools', 'meetings'].includes(p));
  }
  if (r === 'teacher') {
    return ['status', 'schedules', 'curriculum', 'books', 'visits', 'decisions', 'websites'];
  }
  // احتياطي: إن وُجد مستخدم بدون دور معروف نعطيه قائمة المعلم
  console.warn('دور غير معروف:', role, '→ تم التعامل معه كـ teacher');
  return ['status', 'schedules', 'curriculum', 'books', 'visits', 'decisions', 'websites'];
}

function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  const items = getNavItemsForRole(currentUser.role);
  nav.innerHTML = items.map(key => `
    <button class="nav-item" data-page="${key}">
      <span>${PAGES[key].icon}</span>
      <span>${PAGES[key].title}</span>
    </button>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => navigateTo(btn.dataset.page);
  });
}

function navigateTo(page) {
  if (!PAGES[page]) {
    toast('الصفحة غير موجودة', 'error');
    return;
  }
  if (!canAccessPage(page)) {
    console.warn('رفض صلاحية', page, 'role=', currentUser && currentUser.role);
    toast('ليس لديك صلاحية لهذه الصفحة', 'error');
    // لا نترك الصفحة فارغة إن أمكن
    return;
  }
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const active = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (active) active.classList.add('active');

  document.getElementById('page-title').textContent = PAGES[page].title;
  document.getElementById('export-btn').style.display = 'none';
  // زر الطباعة مفعّل لكل الصفحات
  enablePagePrint(PAGES[page].title);

  // إغلاق القائمة الجانبية بعد اختيار صفحة على الموبايل/التابلت
  if (typeof closeSidebar === 'function') closeSidebar();

  const result = PAGES[page].render();
  if (result && typeof result.then === 'function') {
    result.then(() => makeContentTablesSortable()).catch(() => {});
  } else {
    setTimeout(makeContentTablesSortable, 500);
  }
}

function showApp() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');

  document.getElementById('user-role-label').textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
  document.getElementById('user-name-display').textContent = currentUser.name || currentUser.email;
  document.getElementById('user-school-display').textContent = currentUser.school || '';

  buildSidebar();

  const role = normalizeRole(currentUser.role);
  const defaultPage = role === 'superadmin' ? 'users'
    : role === 'supervisor' ? 'budget'
    : 'status';
  // إن فشل الافتراضي افتح أول صفحة مسموحة
  if (canAccessPage(defaultPage)) {
    navigateTo(defaultPage);
  } else {
    const first = getNavItemsForRole(role)[0];
    if (first) navigateTo(first);
  }
}

function showLogin() {
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('login-error').textContent = '';
}

// ===== Event Listeners =====
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  errEl.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'جاري الدخول...'; }
  try {
    await login(email, password);
    showApp();
  } catch (err) {
    console.error(err);
    errEl.textContent = err.message || 'فشل تسجيل الدخول';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'تسجيل الدخول'; }
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  closeSidebar();
  await logout();
  showLogin();
});

function isMobileLayout() {
  return window.matchMedia('(max-width: 1024px)').matches;
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  sidebar.classList.add('open');
  if (overlay) {
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
  }
  document.body.style.overflow = isMobileLayout() ? 'hidden' : '';
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  sidebar.classList.remove('open');
  if (overlay) {
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
  }
  document.body.style.overflow = '';
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (sidebar.classList.contains('open')) closeSidebar();
  else openSidebar();
}

document.getElementById('menu-toggle')?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSidebar();
});

document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

// Auth state
onAuthStateChanged((user) => {
  if (user) showApp();
  else showLogin();
});

// عند تغيير حجم الشاشة: أغلق القائمة إذا رجعنا لوضع سطح المكتب
window.addEventListener('resize', () => {
  if (!isMobileLayout()) closeSidebar();
});

console.log('تطبيق إدارة توجيه تخصص الكهرباء - محافظة الإسماعيلية جاهز');
