async function renderDecisionsPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'decisions')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }
  const canEdit = can('create', 'decisions');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>القرارات والقوانين الوزارية</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-dec">+ إضافة قرار</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>رقم القرار</th>
              <th>التاريخ</th>
              <th>الموضوع</th>
              <th>الملخص</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="dec-tbody"><tr><td colspan="5" style="text-align:center">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) document.getElementById('btn-add-dec').onclick = () => openDecModal();
  await loadDecData();
}

async function loadDecData() {
  const snap = await db.collection('decisions').orderBy('date', 'desc').get();
  const tbody = document.getElementById('dec-tbody');
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">لا توجد قرارات</td></tr>';
    return;
  }
  const canEdit = can('edit', 'decisions');
  const canDel = can('delete', 'decisions');
  tbody.innerHTML = '';
  snap.forEach(doc => {
    const d = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.number || '—'}</td>
      <td>${d.date || '—'}</td>
      <td>${d.subject || '—'}</td>
      <td>${(d.summary || '').substring(0, 60)}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-outline btn-view-dec" data-id="${doc.id}">عرض</button>
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-dec" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-dec" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.btn-view-dec').forEach(b => b.onclick = async () => {
    const doc = await db.collection('decisions').doc(b.dataset.id).get();
    const d = doc.data();
    showModal('تفاصيل القرار', `
      <p><strong>رقم القرار:</strong> ${d.number || '—'}</p>
      <p><strong>التاريخ:</strong> ${d.date || '—'}</p>
      <p><strong>الموضوع:</strong> ${d.subject || '—'}</p>
      <p><strong>الملخص / النص:</strong><br>${d.summary || '—'}</p>
    `, `<button class="btn btn-secondary" id="modal-cancel">إغلاق</button>`);
    document.getElementById('modal-cancel').onclick = closeModal;
  });
  tbody.querySelectorAll('.btn-edit-dec').forEach(b => b.onclick = () => openDecModal(b.dataset.id));
  tbody.querySelectorAll('.btn-del-dec').forEach(b => b.onclick = async () => {
    if (!confirmDelete()) return;
    await db.collection('decisions').doc(b.dataset.id).delete();
    toast('تم الحذف'); loadDecData();
  });
}

async function openDecModal(id = null) {
  let data = { number: '', date: '', subject: '', summary: '' };
  if (id) {
    const doc = await db.collection('decisions').doc(id).get();
    data = { ...data, ...doc.data() };
  }
  const body = `
    <div class="form-grid">
      <div class="form-group"><label>رقم القرار</label><input id="d-number" value="${data.number || ''}" /></div>
      <div class="form-group"><label>التاريخ</label><input type="date" id="d-date" value="${data.date || ''}" /></div>
      <div class="form-group full-width"><label>الموضوع</label><input id="d-subject" value="${data.subject || ''}" /></div>
      <div class="form-group full-width"><label>الملخص / النص</label><textarea id="d-summary" rows="4">${data.summary || ''}</textarea></div>
    </div>
  `;
  showModal(id ? 'تعديل قرار' : 'إضافة قرار وزاري', body);
  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      number: document.getElementById('d-number').value.trim(),
      date: document.getElementById('d-date').value,
      subject: document.getElementById('d-subject').value.trim(),
      summary: document.getElementById('d-summary').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (id) await db.collection('decisions').doc(id).update(payload);
      else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('decisions').add(payload);
      }
      toast('تم الحفظ'); closeModal(); loadDecData();
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
