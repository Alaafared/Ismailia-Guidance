async function renderMeetingsPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'meetings')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول لهذه الصفحة</p></div>';
    return;
  }
  const canEdit = can('create', 'meetings');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>اجتماعات المكتب الفني</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-meet">+ إضافة اجتماع</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الموضوع</th>
              <th>الحضور</th>
              <th>القرارات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="meet-tbody"><tr><td colspan="5" style="text-align:center">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) document.getElementById('btn-add-meet').onclick = () => openMeetModal();
  await loadMeetData();
}

async function loadMeetData() {
  const snap = await db.collection('meetings').orderBy('date', 'desc').get();
  const tbody = document.getElementById('meet-tbody');
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">لا توجد اجتماعات</td></tr>';
    return;
  }
  const canEdit = can('edit', 'meetings');
  const canDel = can('delete', 'meetings');
  tbody.innerHTML = '';
  snap.forEach(doc => {
    const m = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.date || '—'}</td>
      <td>${m.subject || '—'}</td>
      <td>${m.attendees || '—'}</td>
      <td>${(m.decisions || '').substring(0, 60)}</td>
      <td class="actions-cell">
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-meet" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-meet" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.btn-edit-meet').forEach(b => b.onclick = () => openMeetModal(b.dataset.id));
  tbody.querySelectorAll('.btn-del-meet').forEach(b => b.onclick = async () => {
    if (!confirmDelete()) return;
    await db.collection('meetings').doc(b.dataset.id).delete();
    toast('تم الحذف'); loadMeetData();
  });
}

async function openMeetModal(id = null) {
  let data = { date: '', subject: '', attendees: '', decisions: '' };
  if (id) {
    const doc = await db.collection('meetings').doc(id).get();
    data = { ...data, ...doc.data() };
  }
  const body = `
    <div class="form-grid">
      <div class="form-group"><label>التاريخ</label><input type="date" id="mt-date" value="${data.date || ''}" /></div>
      <div class="form-group"><label>الموضوع</label><input id="mt-subject" value="${data.subject || ''}" /></div>
      <div class="form-group full-width"><label>الحضور</label><textarea id="mt-attendees">${data.attendees || ''}</textarea></div>
      <div class="form-group full-width"><label>القرارات</label><textarea id="mt-decisions" rows="3">${data.decisions || ''}</textarea></div>
    </div>
  `;
  showModal(id ? 'تعديل اجتماع' : 'إضافة اجتماع', body);
  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      date: document.getElementById('mt-date').value,
      subject: document.getElementById('mt-subject').value.trim(),
      attendees: document.getElementById('mt-attendees').value.trim(),
      decisions: document.getElementById('mt-decisions').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (id) await db.collection('meetings').doc(id).update(payload);
      else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('meetings').add(payload);
      }
      toast('تم الحفظ'); closeModal(); loadMeetData();
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
