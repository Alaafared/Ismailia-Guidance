// صفحة العجز والزيادة (نفس هيكل الميزانية تقريباً مع إمكانية إضافة ملاحظات)
async function renderShortagePage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'shortage')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }

  const canEdit = can('create', 'shortage');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>العجز والزيادة</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-shortage">+ إضافة سجل</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>المدرسة</th>
              <th>التخصص</th>
              <th>الصف</th>
              <th>عدد الفصول</th>
              <th>عدد الطلبة</th>
              <th>عدد الحصص</th>
              <th>عدد المدرسين</th>
              <th>نصاب المدرسين</th>
              <th>العجز / الزيادة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="shortage-tbody">
            <tr><td colspan="10" style="text-align:center">جاري التحميل...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) {
    document.getElementById('btn-add-shortage').onclick = () => openShortageModal();
  }
  await loadShortageData();
}

async function loadShortageData() {
  let query = db.collection('shortage');
  if (currentUser.role === 'supervisor' && currentUser.school) {
    query = query.where('school', '==', currentUser.school);
  }
  const snap = await query.get();
  const tbody = document.getElementById('shortage-tbody');
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state">لا توجد سجلات</td></tr>';
    return;
  }

  const canEdit = can('edit', 'shortage');
  const canDel = can('delete', 'shortage');
  tbody.innerHTML = '';
  snap.forEach(doc => {
    const b = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.school || '—'}</td>
      <td>${b.specialization || '—'}</td>
      <td>${b.grade || '—'}</td>
      <td>${b.classrooms ?? '—'}</td>
      <td>${b.students ?? '—'}</td>
      <td>${b.periods ?? '—'}</td>
      <td>${b.teachers ?? '—'}</td>
      <td>${b.teachingLoad ?? '—'}</td>
      <td>${b.shortageNote || '—'}</td>
      <td class="actions-cell">
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-sh" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-sh" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit-sh').forEach(btn => {
    btn.onclick = () => openShortageModal(btn.dataset.id);
  });
  tbody.querySelectorAll('.btn-del-sh').forEach(btn => {
    btn.onclick = async () => {
      if (!confirmDelete()) return;
      await db.collection('shortage').doc(btn.dataset.id).delete();
      toast('تم الحذف');
      loadShortageData();
    };
  });
}

async function openShortageModal(id = null) {
  let data = {
    specialization: '', grade: '', classrooms: '', students: '',
    periods: '', teachers: '', teachingLoad: '', shortageNote: '',
    school: currentUser.school || ''
  };
  if (id) {
    const doc = await db.collection('shortage').doc(id).get();
    data = { ...data, ...doc.data() };
  }

  const schoolField = currentUser.role === 'supervisor'
    ? `<input type="text" id="sh-school" value="${currentUser.school}" disabled />`
    : `<select id="sh-school">${getSchoolOptions(data.school)}</select>`;

  const body = `
    <div class="form-grid">
      <div class="form-group"><label>التخصص</label><input id="sh-spec" value="${data.specialization || ''}" /></div>
      <div class="form-group"><label>الصف</label><input id="sh-grade" value="${data.grade || ''}" /></div>
      <div class="form-group"><label>عدد الفصول</label><input type="number" id="sh-classrooms" value="${data.classrooms ?? ''}" min="0" /></div>
      <div class="form-group"><label>عدد الطلبة</label><input type="number" id="sh-students" value="${data.students ?? ''}" min="0" /></div>
      <div class="form-group"><label>عدد الحصص</label><input type="number" id="sh-periods" value="${data.periods ?? ''}" min="0" /></div>
      <div class="form-group"><label>عدد المدرسين</label><input type="number" id="sh-teachers" value="${data.teachers ?? ''}" min="0" /></div>
      <div class="form-group"><label>نصاب المدرسين</label><input id="sh-load" value="${data.teachingLoad || ''}" /></div>
      <div class="form-group"><label>المدرسة</label>${schoolField}</div>
      <div class="form-group full-width"><label>ملاحظة العجز / الزيادة</label>
        <textarea id="sh-note">${data.shortageNote || ''}</textarea>
      </div>
    </div>
  `;

  showModal(id ? 'تعديل العجز والزيادة' : 'إضافة العجز والزيادة', body);

  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      specialization: document.getElementById('sh-spec').value.trim(),
      grade: document.getElementById('sh-grade').value.trim(),
      classrooms: Number(document.getElementById('sh-classrooms').value) || 0,
      students: Number(document.getElementById('sh-students').value) || 0,
      periods: Number(document.getElementById('sh-periods').value) || 0,
      teachers: Number(document.getElementById('sh-teachers').value) || 0,
      teachingLoad: document.getElementById('sh-load').value.trim(),
      shortageNote: document.getElementById('sh-note').value.trim(),
      school: currentUser.role === 'supervisor' ? currentUser.school : document.getElementById('sh-school').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.name
    };
    try {
      if (id) await db.collection('shortage').doc(id).update(payload);
      else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.createdBy = currentUser.name;
        await db.collection('shortage').add(payload);
      }
      toast('تم الحفظ');
      closeModal();
      loadShortageData();
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
