async function renderWebsitesPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'websites')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }
  // المعلم يمكنه الإضافة
  const canAdd = can('create', 'websites');
  const canEdit = can('edit', 'websites');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>المواقع الإلكترونية التي تخدم المنهج</h2>
        ${canAdd ? '<button class="btn btn-primary" id="btn-add-web">+ إضافة موقع</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>اسم الموقع</th>
              <th>الرابط</th>
              <th>الوصف</th>
              <th>صاحب الإضافة</th>
              <th>تاريخ الإضافة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="web-tbody"><tr><td colspan="6" style="text-align:center">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  if (canAdd) document.getElementById('btn-add-web').onclick = () => openWebModal();
  await loadWebData();
}

async function loadWebData() {
  const snap = await db.collection('websites').orderBy('createdAt', 'desc').get();
  const tbody = document.getElementById('web-tbody');
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">لا توجد مواقع</td></tr>';
    return;
  }
  const canEdit = can('edit', 'websites');
  const canDel = can('delete', 'websites');
  tbody.innerHTML = '';
  snap.forEach(doc => {
    const w = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${w.name || '—'}</td>
      <td><a href="${w.url || '#'}" target="_blank" rel="noopener">${w.url || '—'}</a></td>
      <td>${(w.description || '').substring(0, 50)}</td>
      <td>${w.addedBy || '—'}</td>
      <td>${formatDate(w.createdAt)}</td>
      <td class="actions-cell">
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-web" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-web" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.btn-edit-web').forEach(b => b.onclick = () => openWebModal(b.dataset.id));
  tbody.querySelectorAll('.btn-del-web').forEach(b => b.onclick = async () => {
    if (!confirmDelete()) return;
    await db.collection('websites').doc(b.dataset.id).delete();
    toast('تم الحذف'); loadWebData();
  });
}

async function openWebModal(id = null) {
  let data = { name: '', url: '', description: '' };
  if (id) {
    const doc = await db.collection('websites').doc(id).get();
    data = { ...data, ...doc.data() };
  }
  const body = `
    <div class="form-grid">
      <div class="form-group"><label>اسم الموقع</label><input id="w-name" value="${data.name || ''}" required /></div>
      <div class="form-group"><label>الرابط</label><input type="url" id="w-url" value="${data.url || ''}" placeholder="https://..." /></div>
      <div class="form-group full-width"><label>الوصف</label><textarea id="w-desc">${data.description || ''}</textarea></div>
    </div>
  `;
  showModal(id ? 'تعديل موقع' : 'إضافة موقع إلكتروني', body);
  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      name: document.getElementById('w-name').value.trim(),
      url: document.getElementById('w-url').value.trim(),
      description: document.getElementById('w-desc').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!payload.name) { toast('اسم الموقع مطلوب', 'error'); return; }
    try {
      if (id) {
        await db.collection('websites').doc(id).update(payload);
      } else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.addedBy = currentUser.name;
        payload.addedByUid = currentUser.uid;
        await db.collection('websites').add(payload);
      }
      toast('تم الحفظ'); closeModal(); loadWebData();
    } catch (e) { toast(e.message, 'error'); }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
