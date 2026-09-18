async function renderBudgetPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'budget')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }

  const canEdit = can('create', 'budget');
  // فلتر المدرسة يظهر للموجه فقط — مشرف البرنامج والمعلم لا يرونه
  const isSuperAdmin = normalizeRole(currentUser.role) === 'superadmin';

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>ميزانية العجز والزيادة</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-budget">+ إضافة سجل</button>' : ''}
      </div>
      ${isSuperAdmin ? `
      <div class="filter-bar">
        <div class="form-group">
          <label>تصفية حسب المدرسة</label>
          <select id="budget-filter-school">${getSchoolOptions()}</select>
        </div>
      </div>` : ''}
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>المدرسة</th>
              <th>البرنامج</th>
              <th>الصف</th>
              <th>عدد الفصول</th>
              <th>عدد الطلبة</th>
              <th>عدد الحصص</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="budget-tbody">
            <tr><td colspan="9" style="text-align:center">جاري التحميل...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) {
    document.getElementById('btn-add-budget').onclick = () => openBudgetModal();
  }

  const filterEl = document.getElementById('budget-filter-school');
  if (filterEl) filterEl.onchange = loadBudgetData;
  await loadBudgetData();
}

async function loadBudgetData() {
  const filterSchool = document.getElementById('budget-filter-school')?.value || '';
  let query = db.collection('budget');

  // تقييد المشرف بمدرسته فقط — الفلتر اليدوي للموجه فقط
  if (normalizeRole(currentUser.role) === 'supervisor' && currentUser.school) {
    query = query.where('school', '==', currentUser.school);
  } else if (filterSchool) {
    query = query.where('school', '==', filterSchool);
  }

  const snap = await query.get();
  const tbody = document.getElementById('budget-tbody');
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">لا توجد سجلات</td></tr>';
    return;
  }

  const canEdit = can('edit', 'budget');
  const canDel = can('delete', 'budget');
  const canPrint = can('print', 'budget');

  tbody.innerHTML = '';
  snap.forEach(doc => {
    const b = doc.data();
    // فلترة إضافية للمشرف
    if (normalizeRole(currentUser.role) === 'supervisor' && b.school !== currentUser.school) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.school || '—'}</td>
      <td>${b.specialization || '—'}</td>
      <td>${b.grade || '—'}</td>
      <td>${b.classrooms ?? '—'}</td>
      <td>${b.students ?? '—'}</td>
      <td>${b.periods ?? '—'}</td>
      <td class="actions-cell">
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-budget" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-budget" data-id="${doc.id}">حذف</button>` : ''}
        ${canPrint ? `<button class="btn btn-sm btn-outline btn-print-budget" data-id="${doc.id}">طباعة</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit-budget').forEach(btn => {
    btn.onclick = () => openBudgetModal(btn.dataset.id);
  });
  tbody.querySelectorAll('.btn-del-budget').forEach(btn => {
    btn.onclick = async () => {
      if (!confirmDelete()) return;
      await db.collection('budget').doc(btn.dataset.id).delete();
      toast('تم الحذف');
      loadBudgetData();
    };
  });
  tbody.querySelectorAll('.btn-print-budget').forEach(btn => {
    btn.onclick = async () => {
      const doc = await db.collection('budget').doc(btn.dataset.id).get();
      const b = doc.data();
      printElement(`
        <h2 style="text-align:center">ميزانية العجز والزيادة</h2>
        <table border="1" cellpadding="8" style="width:100%;border-collapse:collapse;direction:rtl">
          <tr><th>المدرسة</th><td>${b.school}</td></tr>
          <tr><th>البرنامج</th><td>${b.specialization}</td></tr>
          <tr><th>الصف</th><td>${b.grade}</td></tr>
          <tr><th>عدد الفصول</th><td>${b.classrooms}</td></tr>
          <tr><th>عدد الطلبة</th><td>${b.students}</td></tr>
          <tr><th>عدد الحصص</th><td>${b.periods}</td></tr>
        </table>
      `);
    };
  });
}

async function openBudgetModal(id = null) {
  let data = {
    specialization: '', grade: '', classrooms: '', students: '',
    periods: '', school: currentUser.school || ''
  };
  if (id) {
    const doc = await db.collection('budget').doc(id).get();
    data = { ...data, ...doc.data() };
  }

  // المشرف مربوط بمدرسته
  const isSupervisor = normalizeRole(currentUser.role) === 'supervisor';
  const schoolField = isSupervisor
    ? `<input type="text" id="b-school" value="${currentUser.school}" disabled />`
    : `<select id="b-school">${getSchoolOptions(data.school)}</select>`;

  const body = `
    <div class="form-grid">
          <div class="form-group">
        <label>المدرسة</label>
        ${schoolField}
      </div>
      <div class="form-group">
        <label>البرنامج</label>
        <input type="text" id="b-specialization" value="${data.specialization || ''}" />
      </div>
      <div class="form-group">
        <label>الصف</label>
        <input type="text" id="b-grade" value="${data.grade || ''}" />
      </div>
      <div class="form-group">
        <label>عدد الفصول</label>
        <input type="number" id="b-classrooms" value="${data.classrooms ?? ''}" min="0" />
      </div>
      <div class="form-group">
        <label>عدد الطلبة</label>
        <input type="number" id="b-students" value="${data.students ?? ''}" min="0" />
      </div>
      <div class="form-group">
        <label>عدد الحصص</label>
        <input type="number" id="b-periods" value="${data.periods ?? ''}" min="0" />
      </div>

    </div>
  `;

  showModal(id ? 'تعديل ميزانية العجز والزيادة' : 'ميزانية العجز والزيادة', body);

  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      specialization: document.getElementById('b-specialization').value.trim(),
      grade: document.getElementById('b-grade').value.trim(),
      classrooms: Number(document.getElementById('b-classrooms').value) || 0,
      students: Number(document.getElementById('b-students').value) || 0,
      periods: Number(document.getElementById('b-periods').value) || 0,
      school: isSupervisor ? currentUser.school : document.getElementById('b-school').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.name
    };
    try {
      if (id) {
        await db.collection('budget').doc(id).update(payload);
      } else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.createdBy = currentUser.name;
        await db.collection('budget').add(payload);
      }
      toast('تم الحفظ بنجاح');
      closeModal();
      loadBudgetData();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
