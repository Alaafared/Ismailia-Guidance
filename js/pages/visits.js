async function renderVisitsPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'visits')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }
  const canEdit = can('create', 'visits');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>زيارات الفصول</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-visit">+ إضافة زيارة</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المدرسة</th>
              <th>كود المعلم</th>
              <th>المعلم</th>
              <th>التقييم</th>
              <th>الملاحظات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="visits-tbody"><tr><td colspan="7" style="text-align:center">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) document.getElementById('btn-add-visit').onclick = () => openVisitModal();
  await loadVisitsData();
}

async function loadVisitsData() {
  let query = db.collection('visits');
  const snap = await query.get();
  const tbody = document.getElementById('visits-tbody');
  tbody.innerHTML = '';
  let count = 0;

  snap.forEach(doc => {
    const v = doc.data();

    if (normalizeRole(currentUser.role) === 'teacher') {
      if (!belongsToCurrentTeacher(v)) return;
    }
    if (normalizeRole(currentUser.role) === 'supervisor' && v.school !== currentUser.school) return;

    count++;
    const canEdit = can('edit', 'visits');
    const canDel = can('delete', 'visits');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${v.date || '—'}</td>
      <td>${v.school || '—'}</td>
      <td><strong>${v.teacherCode || '—'}</strong></td>
      <td>${v.teacherName || '—'}</td>
      <td><span class="badge badge-info">${v.evaluation || '—'}</span></td>
      <td>${(v.notes || '').substring(0, 50)}</td>
      <td class="actions-cell">
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-visit" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-visit" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (count === 0) tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد زيارات</td></tr>';

  tbody.querySelectorAll('.btn-edit-visit').forEach(b => b.onclick = () => openVisitModal(b.dataset.id));
  tbody.querySelectorAll('.btn-del-visit').forEach(b => b.onclick = async () => {
    if (!confirmDelete()) return;
    await db.collection('visits').doc(b.dataset.id).delete();
    toast('تم الحذف'); loadVisitsData();
  });
}

async function openVisitModal(id = null) {
  // المشرف لا يمكنه التعديل — التعديل للموجه فقط
  if (id && !can('edit', 'visits')) {
    toast('ليس لديك صلاحية تعديل الزيارات', 'error');
    return;
  }
  let data = { date: '', school: currentUser.school || '', teacherCode: '', teacherName: '', evaluation: 'ممتاز', notes: '' };
  if (id) {
    const doc = await db.collection('visits').doc(id).get();
    data = { ...data, ...doc.data() };
  }

  const isSupervisor = normalizeRole(currentUser.role) === 'supervisor';
  const schoolField = isSupervisor
    ? `<input id="v-school" value="${currentUser.school}" disabled />`
    : `<select id="v-school">${getSchoolOptions(data.school)}</select>`;

  const evalOpts = EVALUATION_OPTIONS.map(e =>
    `<option value="${e}" ${data.evaluation === e ? 'selected' : ''}>${e}</option>`
  ).join('');

  const body = `
    <div class="form-grid">
      <div class="form-group"><label>التاريخ</label><input type="date" id="v-date" value="${data.date || ''}" /></div>
      <div class="form-group"><label>كود المعلم</label><input id="v-code" value="${data.teacherCode || ''}" placeholder="كود المعلم" /></div>
      <div class="form-group"><label>المعلم</label><input id="v-teacher" value="${data.teacherName || ''}" placeholder="اسم المعلم" /></div>
      <div class="form-group"><label>المدرسة</label>${schoolField}</div>
      <div class="form-group"><label>التقييم</label><select id="v-eval">${evalOpts}</select></div>
      <div class="form-group full-width"><label>الملاحظات</label><textarea id="v-notes">${data.notes || ''}</textarea></div>
    </div>
  `;
  showModal(id ? 'تعديل زيارة فصل' : 'زيارة فصل', body);

  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      date: document.getElementById('v-date').value,
      teacherCode: document.getElementById('v-code').value.trim(),
      teacherName: document.getElementById('v-teacher').value.trim(),
      school: isSupervisor ? currentUser.school : document.getElementById('v-school').value,
      evaluation: document.getElementById('v-eval').value,
      notes: document.getElementById('v-notes').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.name
    };
    try {
      if (id) await db.collection('visits').doc(id).update(payload);
      else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.createdBy = currentUser.name;
        await db.collection('visits').add(payload);
      }
      toast('تم الحفظ'); closeModal(); loadVisitsData();
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
