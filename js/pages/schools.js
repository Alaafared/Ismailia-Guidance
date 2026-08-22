async function renderSchoolsPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'schools')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>بيانات المدارس</h2>
        <button class="btn btn-primary" id="btn-add-school">+ إضافة مدرسة</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>اسم المدرسة</th>
              <th>الإدارة</th>
              <th>العنوان</th>
              <th>التخصص</th>
              <th>رقم التليفون</th>
              <th>مشرف التخصص</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="schools-tbody">
            <tr><td colspan="7" style="text-align:center">جاري التحميل...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-add-school').onclick = () => openSchoolModal();

  let query = db.collection('schools').orderBy('name');
  const snap = await query.get();
  const tbody = document.getElementById('schools-tbody');
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد مدارس مسجلة. أضف المدارس يدوياً أو استخدم البيانات الافتراضية.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  snap.forEach(doc => {
    const s = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.name || '—'}</td>
      <td>${s.department || '—'}</td>
      <td>${s.address || '—'}</td>
      <td>${s.specialization || '—'}</td>
      <td>${s.phone || '—'}</td>
      <td>${s.supervisorName || '—'}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-outline btn-edit-school" data-id="${doc.id}">تعديل</button>
        <button class="btn btn-sm btn-danger btn-del-school" data-id="${doc.id}">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit-school').forEach(btn => {
    btn.onclick = () => openSchoolModal(btn.dataset.id);
  });
  tbody.querySelectorAll('.btn-del-school').forEach(btn => {
    btn.onclick = async () => {
      if (!confirmDelete()) return;
      await db.collection('schools').doc(btn.dataset.id).delete();
      toast('تم الحذف');
      renderSchoolsPage();
    };
  });
}

async function openSchoolModal(id = null) {
  let data = {
    name: '', address: '', department: '', specialization: '',
    phone: '', fax: '', whatsapp: '', supervisorName: '', notes: ''
  };
  if (id) {
    const doc = await db.collection('schools').doc(id).get();
    data = { ...data, ...doc.data() };
  }

  const body = `
    <div class="form-grid">
      <div class="form-group">
        <label>اسم المدرسة</label>
        <input type="text" id="s-name" value="${data.name || ''}" placeholder="اسم المدرسة" required />
      </div>
      <div class="form-group">
        <label>العنوان</label>
        <input type="text" id="s-address" value="${data.address || ''}" placeholder="العنوان الكامل" />
      </div>
      <div class="form-group">
        <label>الإدارة</label>
        <select id="s-department">${getDeptOptions(data.department)}</select>
      </div>
      <div class="form-group">
        <label>التخصص</label>
        <input type="text" id="s-specialization" value="${data.specialization || ''}" placeholder="مثل: رياضيات / علوم / لغة عربية" />
      </div>
      <div class="form-group">
        <label>رقم التليفون والفاكس</label>
        <input type="text" id="s-phone" value="${data.phone || ''}" placeholder="تليفون / فاكس" />
      </div>
      <div class="form-group">
        <label>رقم تليفون الواتس</label>
        <input type="text" id="s-whatsapp" value="${data.whatsapp || ''}" placeholder="رقم واتس آب" />
      </div>
      <div class="form-group full-width">
        <label>اسم مشرف التخصص</label>
        <input type="text" id="s-supervisor" value="${data.supervisorName || ''}" placeholder="اسم مشرف التخصص في المدرسة" />
      </div>
      <div class="form-group full-width">
        <label>ملاحظات</label>
        <textarea id="s-notes" placeholder="ملاحظات إضافية..">${data.notes || ''}</textarea>
      </div>
    </div>
  `;

  showModal(id ? 'تعديل بيانات مدرسة' : 'بيانات مدرسة', body);

  document.getElementById('modal-save').onclick = async () => {
    const payload = {
      name: document.getElementById('s-name').value.trim(),
      address: document.getElementById('s-address').value.trim(),
      department: document.getElementById('s-department').value,
      specialization: document.getElementById('s-specialization').value.trim(),
      phone: document.getElementById('s-phone').value.trim(),
      whatsapp: document.getElementById('s-whatsapp').value.trim(),
      supervisorName: document.getElementById('s-supervisor').value.trim(),
      notes: document.getElementById('s-notes').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!payload.name) { toast('اسم المدرسة مطلوب', 'error'); return; }
    try {
      if (id) {
        await db.collection('schools').doc(id).update(payload);
      } else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('schools').add(payload);
      }
      toast('تم الحفظ بنجاح');
      closeModal();
      renderSchoolsPage();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
