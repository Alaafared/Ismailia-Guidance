async function renderSchedulesPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'schedules')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }
  const canEdit = can('create', 'schedules');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>جداول المعلمين</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-sched">+ إضافة / تحديث جدول</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>كود المعلم</th>
              <th>اسم المعلم</th>
              <th>المدرسة</th>
              <th>المادة</th>
              <th>اليوم</th>
              <th>الحصة</th>
              <th>الفصل</th>
              <th>ملاحظات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="sched-tbody"><tr><td colspan="9" style="text-align:center">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) document.getElementById('btn-add-sched').onclick = () => openSchedModal();
  await loadSchedData();
}

async function loadSchedData() {
  const snap = await db.collection('schedules').get();
  const tbody = document.getElementById('sched-tbody');
  tbody.innerHTML = '';
  let count = 0;
  snap.forEach(doc => {
    const s = doc.data();
    if (normalizeRole(currentUser.role) === 'teacher') {
      if (!belongsToCurrentTeacher(s)) return;
    }
    if (normalizeRole(currentUser.role) === 'supervisor' && s.school !== currentUser.school) return;
    count++;
    const canEdit = can('edit', 'schedules');
    const canDel = can('delete', 'schedules');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.teacherCode || '—'}</strong></td>
      <td>${s.teacherName || '—'}</td>
      <td>${s.school || '—'}</td>
      <td>${s.subject || '—'}</td>
      <td>${s.day || '—'}</td>
      <td>${s.period || '—'}</td>
      <td>${s.classroom || '—'}</td>
      <td>${s.notes || '—'}</td>
      <td class="actions-cell">
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-sched" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-sched" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (count === 0) tbody.innerHTML = '<tr><td colspan="9" class="empty-state">لا توجد جداول</td></tr>';
  tbody.querySelectorAll('.btn-edit-sched').forEach(b => b.onclick = () => openSchedModal(b.dataset.id));
  tbody.querySelectorAll('.btn-del-sched').forEach(b => b.onclick = async () => {
    if (!confirmDelete()) return;
    await db.collection('schedules').doc(b.dataset.id).delete();
    toast('تم الحذف'); loadSchedData();
  });
}

async function openSchedModal(id = null) {
  let data = { teacherCode: '', teacherName: '', school: currentUser.school || '', subject: '', day: '', period: '', classroom: '', notes: '' };
  if (id) {
    const doc = await db.collection('schedules').doc(id).get();
    data = { ...data, ...doc.data() };
  }
  const schoolField = currentUser.role === 'supervisor'
    ? `<input id="sc-school" value="${currentUser.school}" disabled />`
    : `<select id="sc-school">${getSchoolOptions(data.school)}</select>`;

  const body = `
    <div class="form-grid">
      <div class="form-group"><label>كود المعلم</label><input id="sc-code" value="${data.teacherCode || ''}" placeholder="كود المعلم" /></div>
      <div class="form-group"><label>اسم المعلم</label><input id="sc-teacher" value="${data.teacherName || ''}" /></div>
      <div class="form-group"><label>المدرسة</label>${schoolField}</div>
      <div class="form-group"><label>المادة</label><input id="sc-subject" value="${data.subject || ''}" /></div>
      <div class="form-group"><label>اليوم</label>
        <select id="sc-day">
          ${['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'].map(d =>
            `<option ${data.day===d?'selected':''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>الحصة</label><input id="sc-period" value="${data.period || ''}" placeholder="مثل: الأولى" /></div>
      <div class="form-group"><label>الفصل</label><input id="sc-class" value="${data.classroom || ''}" /></div>
      <div class="form-group full-width"><label>ملاحظات</label><textarea id="sc-notes">${data.notes || ''}</textarea></div>
    </div>
  `;
  showModal(id ? 'تعديل جدول' : 'إضافة جدول معلم', body);
  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      teacherCode: document.getElementById('sc-code').value.trim(),
      teacherName: document.getElementById('sc-teacher').value.trim(),
      school: currentUser.role === 'supervisor' ? currentUser.school : document.getElementById('sc-school').value,
      subject: document.getElementById('sc-subject').value.trim(),
      day: document.getElementById('sc-day').value,
      period: document.getElementById('sc-period').value.trim(),
      classroom: document.getElementById('sc-class').value.trim(),
      notes: document.getElementById('sc-notes').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.name
    };
    try {
      if (id) await db.collection('schedules').doc(id).update(payload);
      else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.createdBy = currentUser.name;
        await db.collection('schedules').add(payload);
      }
      toast('تم الحفظ'); closeModal(); loadSchedData();
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
