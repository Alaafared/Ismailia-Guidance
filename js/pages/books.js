async function renderBooksPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'books')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }
  const canEdit = can('create', 'books');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>الكتب والمراجع وتحليل المنهج</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-book">+ إضافة</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>المادة</th>
              <th>الكتاب</th>
              <th>المراجع</th>
              <th>تحليل المنهج</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="books-tbody"><tr><td colspan="5" style="text-align:center">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) document.getElementById('btn-add-book').onclick = () => openBookModal();
  await loadBooksData();
}

async function loadBooksData() {
  const snap = await db.collection('books').get();
  const tbody = document.getElementById('books-tbody');
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">لا توجد بيانات</td></tr>';
    return;
  }
  const canEdit = can('edit', 'books');
  const canDel = can('delete', 'books');
  tbody.innerHTML = '';
  snap.forEach(doc => {
    const b = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.subject || '—'}</td>
      <td>${b.book || '—'}</td>
      <td>${b.references || '—'}</td>
      <td>${(b.analysis || '').substring(0, 80)}${(b.analysis || '').length > 80 ? '...' : ''}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-outline btn-view-book" data-id="${doc.id}">عرض</button>
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-book" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-book" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.btn-view-book').forEach(b => b.onclick = async () => {
    const doc = await db.collection('books').doc(b.dataset.id).get();
    const d = doc.data();
    showModal('تفاصيل الكتاب والمرجع', `
      <p><strong>المادة:</strong> ${d.subject || '—'}</p>
      <p><strong>الكتاب:</strong> ${d.book || '—'}</p>
      <p><strong>المراجع:</strong> ${d.references || '—'}</p>
      <p><strong>تحليل المنهج:</strong><br>${d.analysis || '—'}</p>
    `, `<button class="btn btn-secondary" id="modal-cancel">إغلاق</button>`);
    document.getElementById('modal-cancel').onclick = closeModal;
  });
  tbody.querySelectorAll('.btn-edit-book').forEach(b => b.onclick = () => openBookModal(b.dataset.id));
  tbody.querySelectorAll('.btn-del-book').forEach(b => b.onclick = async () => {
    if (!confirmDelete()) return;
    await db.collection('books').doc(b.dataset.id).delete();
    toast('تم الحذف'); loadBooksData();
  });
}

async function openBookModal(id = null) {
  let data = { subject: '', book: '', references: '', analysis: '' };
  if (id) {
    const doc = await db.collection('books').doc(id).get();
    data = { ...data, ...doc.data() };
  }
  const body = `
    <div class="form-grid">
      <div class="form-group"><label>المادة</label><input id="bk-subject" value="${data.subject || ''}" /></div>
      <div class="form-group"><label>الكتاب</label><input id="bk-book" value="${data.book || ''}" /></div>
      <div class="form-group full-width"><label>المراجع</label><textarea id="bk-refs">${data.references || ''}</textarea></div>
      <div class="form-group full-width"><label>تحليل المنهج</label><textarea id="bk-analysis" rows="4">${data.analysis || ''}</textarea></div>
    </div>
  `;
  showModal(id ? 'تعديل كتاب ومرجع' : 'كتاب ومرجع', body);
  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      subject: document.getElementById('bk-subject').value.trim(),
      book: document.getElementById('bk-book').value.trim(),
      references: document.getElementById('bk-refs').value.trim(),
      analysis: document.getElementById('bk-analysis').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (id) await db.collection('books').doc(id).update(payload);
      else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('books').add(payload);
      }
      toast('تم الحفظ'); closeModal(); loadBooksData();
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
