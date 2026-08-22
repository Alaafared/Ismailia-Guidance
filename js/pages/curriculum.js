async function renderCurriculumPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'curriculum')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }

  const canEdit = can('create', 'curriculum');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>توزيع المناهج</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-curr">+ إضافة</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>مسلسل</th>
              <th>الصف</th>
              <th>الوحدة</th>
              <th>المخرج</th>
              <th>من تاريخ</th>
              <th>إلى تاريخ</th>
              <th>ملاحظات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="curr-tbody"><tr><td colspan="8" style="text-align:center">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) document.getElementById('btn-add-curr').onclick = () => openCurrModal();
  await loadCurrData();
}

async function loadCurrData() {
  const snap = await db.collection('curriculum').orderBy('serial').get();
  const tbody = document.getElementById('curr-tbody');
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">لا توجد بيانات</td></tr>';
    return;
  }
  const canEdit = can('edit', 'curriculum');
  const canDel = can('delete', 'curriculum');
  tbody.innerHTML = '';
  snap.forEach(doc => {
    const c = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.serial ?? '—'}</td>
      <td>${c.grade || '—'}</td>
      <td>${c.unit || '—'}</td>
      <td>${c.outcome || '—'}</td>
      <td>${c.dateFrom || '—'}</td>
      <td>${c.dateTo || '—'}</td>
      <td>${c.notes || '—'}</td>
      <td class="actions-cell">
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-curr" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-curr" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.btn-edit-curr').forEach(b => b.onclick = () => openCurrModal(b.dataset.id));
  tbody.querySelectorAll('.btn-del-curr').forEach(b => b.onclick = async () => {
    if (!confirmDelete()) return;
    await db.collection('curriculum').doc(b.dataset.id).delete();
    toast('تم الحذف'); loadCurrData();
  });
}

async function openCurrModal(id = null) {
  let data = { serial: '', grade: '', unit: '', outcome: '', dateFrom: '', dateTo: '', notes: '' };
  if (id) {
    const doc = await db.collection('curriculum').doc(id).get();
    data = { ...data, ...doc.data() };
  }
  const body = `
    <div class="form-grid">
      <div class="form-group"><label>مسلسل</label><input type="number" id="c-serial" value="${data.serial ?? ''}" /></div>
      <div class="form-group"><label>الصف</label><input id="c-grade" value="${data.grade || ''}" /></div>
      <div class="form-group"><label>الوحدة</label><input id="c-unit" value="${data.unit || ''}" /></div>
      <div class="form-group"><label>المخرج</label><input id="c-outcome" value="${data.outcome || ''}" /></div>
      <div class="form-group"><label>من تاريخ</label><input type="date" id="c-from" value="${data.dateFrom || ''}" /></div>
      <div class="form-group"><label>إلى تاريخ</label><input type="date" id="c-to" value="${data.dateTo || ''}" /></div>
      <div class="form-group full-width"><label>ملاحظات</label><textarea id="c-notes">${data.notes || ''}</textarea></div>
    </div>
  `;
  showModal(id ? 'تعديل توزيع منهج' : 'إضافة توزيع منهج', body);
  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      serial: Number(document.getElementById('c-serial').value) || 0,
      grade: document.getElementById('c-grade').value.trim(),
      unit: document.getElementById('c-unit').value.trim(),
      outcome: document.getElementById('c-outcome').value.trim(),
      dateFrom: document.getElementById('c-from').value,
      dateTo: document.getElementById('c-to').value,
      notes: document.getElementById('c-notes').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (id) await db.collection('curriculum').doc(id).update(payload);
      else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('curriculum').add(payload);
      }
      toast('تم الحفظ'); closeModal(); loadCurrData();
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
