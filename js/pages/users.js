async function renderUsersPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'users')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>إدارة المستخدمين</h2>
        <button class="btn btn-primary" id="btn-add-user">+ إضافة مستخدم</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>كود المعلم</th>
              <th>البريد</th>
              <th>الدور</th>
              <th>المدرسة</th>
              <th>الإدارة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            <tr><td colspan="7" style="text-align:center">جاري التحميل...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-add-user').onclick = () => openUserModal();

  const snap = await db.collection('users').orderBy('name').get();
  const tbody = document.getElementById('users-tbody');
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا يوجد مستخدمون</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  snap.forEach(doc => {
    const u = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.name || '—'}</td>
      <td><strong>${u.teacherCode || '—'}</strong></td>
      <td>${u.email || '—'}</td>
      <td><span class="badge badge-info">${ROLE_LABELS[normalizeRole(u.role)] || u.role}</span></td>
      <td>${u.school || '—'}</td>
      <td>${u.department || '—'}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-outline btn-edit-user" data-id="${doc.id}">تعديل</button>
        ${doc.id !== currentUser.uid ? `<button class="btn btn-sm btn-danger btn-del-user" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.onclick = () => openUserModal(btn.dataset.id);
  });
  tbody.querySelectorAll('.btn-del-user').forEach(btn => {
    btn.onclick = async () => {
      if (!confirmDelete('هل أنت متأكد من حذف هذا المستخدم؟')) return;
      await deleteUserAccount(btn.dataset.id);
      toast('تم الحذف');
      renderUsersPage();
    };
  });
}

async function openUserModal(uid = null) {
  let data = { name: '', email: '', role: 'teacher', school: '', department: '', password: '', teacherCode: '' };
  if (uid) {
    const doc = await db.collection('users').doc(uid).get();
    data = { ...data, ...doc.data() };
  }

  const body = `
    <div class="form-grid">
      <div class="form-group">
        <label>الاسم الكامل</label>
        <input type="text" id="u-name" value="${data.name || ''}" required />
      </div>
      <div class="form-group">
        <label>كود المعلم</label>
        <input type="text" id="u-teacher-code" value="${data.teacherCode || ''}" placeholder="مطلوب للمعلمين — يمكن لمشرف التخصص نفس الكود إن كان معلماً أيضاً" />
      </div>
      <div class="form-group">
        <label>البريد الإلكتروني</label>
        <input type="email" id="u-email" value="${data.email || ''}" ${uid ? 'disabled' : 'required'} />
      </div>
      ${!uid ? `
      <div class="form-group">
        <label>كلمة المرور</label>
        <input type="password" id="u-password" required minlength="6" />
      </div>` : ''}
      <div class="form-group">
        <label>الدور</label>
        <select id="u-role">
          <option value="superadmin" ${normalizeRole(data.role) === 'superadmin' ? 'selected' : ''}>موجه (Super Admin)</option>
          <option value="supervisor" ${normalizeRole(data.role) === 'supervisor' ? 'selected' : ''}>مشرف تخصص</option>
          <option value="teacher" ${normalizeRole(data.role) === 'teacher' ? 'selected' : ''}>معلم</option>
        </select>
      </div>
      <div class="form-group">
        <label>الإدارة</label>
        <select id="u-department">${getDeptOptions(data.department)}</select>
      </div>
      <div class="form-group full-width">
        <label>المدرسة</label>
        <select id="u-school">${getSchoolOptions(data.school)}</select>
      </div>
    </div>
    <p style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">
      كود المعلم يُستخدم لربط صحيفة الأحوال والجدول والزيارات بحساب المعلم عند تسجيل دخوله.
      مشرف التخصص مرتبط بمدرسته فقط، ويمكن أن يكون له نفس كود المعلم إذا كان معلماً في المدرسة أيضاً.
    </p>
  `;

  showModal(uid ? 'تعديل مستخدم' : 'إضافة مستخدم جديد', body);

  document.getElementById('u-department').onchange = function () {
    const dept = this.value;
    const schools = DEPARTMENTS[dept] || [];
    let opts = '<option value="">— اختر المدرسة —</option>';
    schools.forEach(s => opts += `<option value="${s}">${s}</option>`);
    document.getElementById('u-school').innerHTML = opts;
  };

  document.getElementById('modal-save').onclick = async () => {
    const name = document.getElementById('u-name').value.trim();
    const role = document.getElementById('u-role').value;
    const department = document.getElementById('u-department').value;
    const school = document.getElementById('u-school').value;
    const teacherCode = document.getElementById('u-teacher-code').value.trim();

    if (!name) { toast('الاسم مطلوب', 'error'); return; }
    if (role === 'teacher' && !teacherCode) {
      toast('كود المعلم مطلوب عند إنشاء حساب معلم', 'error');
      return;
    }
    if ((role === 'supervisor' || role === 'teacher') && !school) {
      toast('المدرسة مطلوبة لمشرف التخصص والمعلم', 'error');
      return;
    }

    try {
      if (uid) {
        await updateUserDoc(uid, { name, role, department, school, teacherCode });
        toast('تم التحديث بنجاح');
      } else {
        const email = document.getElementById('u-email').value.trim();
        const password = document.getElementById('u-password').value;
        if (!email || !password) { toast('البريد وكلمة المرور مطلوبان', 'error'); return; }
        await createUserAccount({ email, password, name, role, school, department, teacherCode });
        toast('تم إنشاء المستخدم بنجاح');
      }
      closeModal();
      renderUsersPage();
    } catch (e) {
      toast(e.message || 'حدث خطأ', 'error');
    }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
