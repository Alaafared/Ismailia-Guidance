async function renderMovementsPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'movements')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }
  const canEdit = can('create', 'movements');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>حركات التعيين والندب والنقل والإجازات</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-mov">+ إضافة حركة</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>نوع الحركة</th>
              <th>كود المعلم</th><th>اسم المعلم</th>
              <th>المدرسة</th>
              <th>من تاريخ</th>
              <th>إلى تاريخ</th>
              <th>القرار / الملاحظات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="mov-tbody"><tr><td colspan="8" style="text-align:center">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) document.getElementById('btn-add-mov').onclick = () => openMovModal();
  await loadMovData();
}

async function loadMovData() {
  const snap = await db.collection('movements').get();
  const tbody = document.getElementById('mov-tbody');
  tbody.innerHTML = '';
  let count = 0;
  snap.forEach(doc => {
    const m = doc.data();
    if (normalizeRole(currentUser.role) === 'supervisor' && m.school !== currentUser.school) return;
    count++;
    const canEdit = can('edit', 'movements');
    const canDel = can('delete', 'movements');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge badge-info">${m.type || '—'}</span></td>
      <td><strong>${m.teacherCode || '—'}</strong></td><td>${m.teacherName || '—'}</td>
      <td>${m.school || '—'}</td>
      <td>${m.dateFrom || '—'}</td>
      <td>${m.dateTo || '—'}</td>
      <td>${m.notes || '—'}</td>
      <td class="actions-cell">
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-mov" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-mov" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (count === 0) tbody.innerHTML = '<tr><td colspan="8" class="empty-state">لا توجد حركات</td></tr>';
  tbody.querySelectorAll('.btn-edit-mov').forEach(b => b.onclick = () => openMovModal(b.dataset.id));
  tbody.querySelectorAll('.btn-del-mov').forEach(b => b.onclick = async () => {
    if (!confirmDelete()) return;
    await db.collection('movements').doc(b.dataset.id).delete();
    toast('تم الحذف'); loadMovData();
  });
}

async function openMovModal(id = null) {
  let data = { type: 'تعيين', teacherCode: '', teacherName: '', school: '', dateFrom: '', dateTo: '', notes: '' };
  if (id) {
    const doc = await db.collection('movements').doc(id).get();
    data = { ...data, ...doc.data() };
  }
  const body = `
    <div class="form-grid">
      <div class="form-group"><label>نوع الحركة</label>
        <select id="m-type">
          <option ${data.type==='تعيين'?'selected':''}>تعيين</option>
          <option ${data.type==='ندب'?'selected':''}>ندب</option>
          <option ${data.type==='نقل'?'selected':''}>نقل</option>
          <option ${data.type==='إجازة'?'selected':''}>إجازة</option>
        </select>
      </div>
      <div class="form-group"><label>كود المعلم</label><input id="m-code" value="${data.teacherCode || ''}" /></div>
      <div class="form-group"><label>اسم المعلم</label><input id="m-teacher" value="${data.teacherName || ''}" /></div>
      <div class="form-group"><label>المدرسة</label><select id="m-school">${getSchoolOptions(data.school)}</select></div>
      <div class="form-group"><label>من تاريخ</label><input type="date" id="m-from" value="${data.dateFrom || ''}" /></div>
      <div class="form-group"><label>إلى تاريخ</label><input type="date" id="m-to" value="${data.dateTo || ''}" /></div>
      <div class="form-group full-width"><label>القرار / الملاحظات</label><textarea id="m-notes">${data.notes || ''}</textarea></div>
    </div>
  `;
  showModal(id ? 'تعديل حركة' : 'إضافة حركة', body);
  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      type: document.getElementById('m-type').value,
      teacherCode: document.getElementById('m-code').value.trim(),
      teacherName: document.getElementById('m-teacher').value.trim(),
      school: document.getElementById('m-school').value,
      dateFrom: document.getElementById('m-from').value,
      dateTo: document.getElementById('m-to').value,
      notes: document.getElementById('m-notes').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (id) await db.collection('movements').doc(id).update(payload);
      else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('movements').add(payload);
      }
      toast('تم الحفظ'); closeModal(); loadMovData();
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
