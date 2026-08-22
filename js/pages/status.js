async function renderStatusPage() {
  const area = document.getElementById('content-area');
  if (!can('view', 'status')) {
    area.innerHTML = '<div class="empty-state"><p>ليس لديك صلاحية الوصول</p></div>';
    return;
  }

  const canEdit = can('create', 'status');

  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>صحف أحوال المعلمين (بيان حالة إلكتروني)</h2>
        ${canEdit ? '<button class="btn btn-primary" id="btn-add-status">+ إضافة صحيفة</button>' : ''}
      </div>
      <div class="filter-bar">
        <div class="form-group">
          <label>بحث بالاسم</label>
          <input type="text" id="status-search" placeholder="اسم المعلم..." />
        </div>
        ${currentUser.role === 'superadmin' ? `
        <div class="form-group">
          <label>المدرسة</label>
          <select id="status-filter-school">${getSchoolOptions()}</select>
        </div>` : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>الاسم</th>
              <th>الرقم القومي</th>
              <th>المدرسة / جهة العمل</th>
              <th>الوظيفة</th>
              <th>التخصص على الكادر</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="status-tbody">
            <tr><td colspan="7" style="text-align:center">جاري التحميل...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (canEdit) {
    document.getElementById('btn-add-status').onclick = () => openStatusModal();
  }
  document.getElementById('status-search')?.addEventListener('input', loadStatusData);
  document.getElementById('status-filter-school')?.addEventListener('change', loadStatusData);

  await loadStatusData();
}

async function loadStatusData() {
  const search = (document.getElementById('status-search')?.value || '').toLowerCase();
  const filterSchool = document.getElementById('status-filter-school')?.value || '';

  let query = db.collection('statusSheets');
  const snap = await query.get();
  const tbody = document.getElementById('status-tbody');
  tbody.innerHTML = '';

  let count = 0;
  snap.forEach(doc => {
    const s = doc.data();

    // صلاحيات الرؤية — المعلم يرى صحيفته فقط عبر كود المعلم
    if (normalizeRole(currentUser.role) === 'teacher') {
      if (!belongsToCurrentTeacher(s)) return;
    } else if (normalizeRole(currentUser.role) === 'supervisor') {
      if (s.school !== currentUser.school && s.workPlace !== currentUser.school) return;
    } else if (filterSchool && s.school !== filterSchool && s.workPlace !== filterSchool) {
      return;
    }

    if (search && !(s.name || '').toLowerCase().includes(search)) return;

    count++;
    const canEdit = can('edit', 'status');
    const canDel = can('delete', 'status');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.code || '—'}</td>
      <td>${s.name || '—'}</td>
      <td>${s.nationalId || '—'}</td>
      <td>${s.workPlace || s.school || '—'}</td>
      <td>${s.jobTitle || '—'}</td>
      <td>${s.cadreSpecialization || '—'}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-outline btn-view-status" data-id="${doc.id}">عرض</button>
        ${canEdit ? `<button class="btn btn-sm btn-outline btn-edit-status" data-id="${doc.id}">تعديل</button>` : ''}
        ${canDel ? `<button class="btn btn-sm btn-danger btn-del-status" data-id="${doc.id}">حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (count === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد صحف أحوال</td></tr>';
  }

  tbody.querySelectorAll('.btn-view-status').forEach(btn => {
    btn.onclick = () => viewStatusSheet(btn.dataset.id);
  });
  tbody.querySelectorAll('.btn-edit-status').forEach(btn => {
    btn.onclick = () => openStatusModal(btn.dataset.id);
  });
  tbody.querySelectorAll('.btn-del-status').forEach(btn => {
    btn.onclick = async () => {
      if (!confirmDelete()) return;
      await db.collection('statusSheets').doc(btn.dataset.id).delete();
      toast('تم الحذف');
      loadStatusData();
    };
  });
}

async function viewStatusSheet(id) {
  const doc = await db.collection('statusSheets').doc(id).get();
  const s = doc.data();
  const html = buildStatusSheetHTML(s);
  showModal('بيان حالة إلكتروني', html, `
    <button class="btn btn-primary" onclick="printElement(document.getElementById('modal-body').innerHTML)">طباعة</button>
    <button class="btn btn-secondary" id="modal-cancel">إغلاق</button>
  `);
  document.getElementById('modal-cancel').onclick = closeModal;
}

function buildStatusSheetHTML(s) {
  return `
    <div class="status-sheet">
      <h2>بيان حالة إلكتروني للسادة أعضاء هيئة التعليم</h2>
      
      <div class="status-section">
        <div class="status-section-title">البيانات الشخصية</div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">الكود:</span> ${s.code || '—'}</div>
          <div class="status-cell"><span class="status-label">الاسم رباعي:</span> ${s.name || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">الرقم القومي:</span> ${s.nationalId || '—'}</div>
          <div class="status-cell"><span class="status-label">تاريخ الميلاد:</span> ${s.birthDate || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">محافظة الميلاد:</span> ${s.birthGov || '—'}</div>
          <div class="status-cell"><span class="status-label">النوع:</span> ${s.gender || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">الديانة:</span> ${s.religion || '—'}</div>
          <div class="status-cell"><span class="status-label">الحالة الاجتماعية:</span> ${s.maritalStatus || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">الجنسية:</span> ${s.nationality || '—'}</div>
          <div class="status-cell"><span class="status-label">العنوان:</span> ${s.address || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">التليفون:</span> ${s.phone || '—'}</div>
          <div class="status-cell"></div>
        </div>
      </div>

      <div class="status-section">
        <div class="status-section-title">بيانات جهة العمل</div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">الجهة الأصلية:</span> ${s.originalEntity || '—'}</div>
          <div class="status-cell"><span class="status-label">المديرية:</span> ${s.directorate || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">الإدارة:</span> ${s.department || '—'}</div>
          <div class="status-cell"><span class="status-label">جهة العمل:</span> ${s.workPlace || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">المرحلة:</span> ${s.stage || '—'}</div>
          <div class="status-cell"></div>
        </div>
      </div>

      <div class="status-section">
        <div class="status-section-title">البيانات الوظيفية</div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">المجموعة النوعية:</span> ${s.jobGroup || '—'}</div>
          <div class="status-cell"><span class="status-label">الموقف من العمل:</span> ${s.workStatus || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">تاريخ التعيين:</span> ${s.appointmentDate || '—'}</div>
          <div class="status-cell"><span class="status-label">تاريخ استلام العمل:</span> ${s.startDate || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">التاريخ الاعتباري:</span> ${s.considerationDate || '—'}</div>
          <div class="status-cell"><span class="status-label">الوظيفة الحالية:</span> ${s.jobTitle || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">رقم القرار:</span> ${s.decisionNo || '—'}</div>
          <div class="status-cell"><span class="status-label">تاريخ القرار:</span> ${s.decisionDate || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">اعتباراً من:</span> ${s.effectiveFrom || '—'}</div>
          <div class="status-cell"><span class="status-label">مادة التدريس:</span> ${s.teachingSubject || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">التخصص على الكادر:</span> ${s.cadreSpecialization || '—'}</div>
          <div class="status-cell"></div>
        </div>
      </div>

      <div class="status-section">
        <div class="status-section-title">بيانات مؤهل التعيين أول مرة</div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">نوع المؤهل:</span> ${s.qualificationType || '—'}</div>
          <div class="status-cell"><span class="status-label">اسم المؤهل:</span> ${s.qualificationName || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">تقدير المؤهل:</span> ${s.qualificationGrade || '—'}</div>
          <div class="status-cell"><span class="status-label">جهة الحصول عليه:</span> ${s.qualificationFrom || '—'}</div>
        </div>
        <div class="status-row">
          <div class="status-cell"><span class="status-label">تاريخ الحصول عليه:</span> ${s.qualificationDate || '—'}</div>
          <div class="status-cell"></div>
        </div>
      </div>

      <div class="status-section">
        <div class="status-section-title">الجزاءات</div>
        <div class="status-row">
          <div class="status-cell" style="grid-column:1/-1">${s.penalties || 'لا يوجد'}</div>
        </div>
      </div>
    </div>
  `;
}

async function openStatusModal(id = null) {
  let data = {
    code: '', name: '', nationalId: '', birthDate: '', birthGov: '', gender: 'ذكر',
    religion: 'مسلم', maritalStatus: '', nationality: 'مصري', address: '', phone: '',
    originalEntity: '', directorate: 'الإسماعيلية', department: '', workPlace: '', stage: '',
    jobGroup: 'المجموعة النوعية لوظائف أعضاء هيئة التعليم', workStatus: 'على رأس عمله',
    appointmentDate: '', startDate: '', considerationDate: '', jobTitle: '', decisionNo: '',
    decisionDate: '', effectiveFrom: '', teachingSubject: '', cadreSpecialization: '',
    qualificationType: 'عليا', qualificationName: '', qualificationGrade: '', qualificationFrom: '',
    qualificationDate: '', penalties: '', school: currentUser.school || '', userId: '', email: ''
  };
  if (id) {
    const doc = await db.collection('statusSheets').doc(id).get();
    data = { ...data, ...doc.data() };
  }

  const body = `
    <div style="max-height:60vh;overflow-y:auto">
      <h4 style="margin-bottom:0.75rem;color:var(--primary)">البيانات الشخصية</h4>
      <div class="form-grid">
        <div class="form-group"><label>كود المعلم</label><input id="st-code" value="${data.code || ''}" /></div>
        <div class="form-group"><label>الاسم رباعي</label><input id="st-name" value="${data.name || ''}" required /></div>
        <div class="form-group"><label>الرقم القومي</label><input id="st-nationalId" value="${data.nationalId || ''}" /></div>
        <div class="form-group"><label>تاريخ الميلاد</label><input type="date" id="st-birthDate" value="${data.birthDate || ''}" /></div>
        <div class="form-group"><label>محافظة الميلاد</label><input id="st-birthGov" value="${data.birthGov || ''}" /></div>
        <div class="form-group"><label>النوع</label>
          <select id="st-gender"><option ${data.gender==='ذكر'?'selected':''}>ذكر</option><option ${data.gender==='أنثى'?'selected':''}>أنثى</option></select>
        </div>
        <div class="form-group"><label>الديانة</label><input id="st-religion" value="${data.religion || ''}" /></div>
        <div class="form-group"><label>الحالة الاجتماعية</label><input id="st-marital" value="${data.maritalStatus || ''}" /></div>
        <div class="form-group"><label>الجنسية</label><input id="st-nationality" value="${data.nationality || ''}" /></div>
        <div class="form-group"><label>التليفون</label><input id="st-phone" value="${data.phone || ''}" /></div>
        <div class="form-group full-width"><label>العنوان</label><input id="st-address" value="${data.address || ''}" /></div>
      </div>

      <h4 style="margin:1rem 0 0.75rem;color:var(--primary)">بيانات جهة العمل</h4>
      <div class="form-grid">
        <div class="form-group"><label>الجهة الأصلية</label><input id="st-original" value="${data.originalEntity || ''}" /></div>
        <div class="form-group"><label>المديرية</label><input id="st-directorate" value="${data.directorate || 'الإسماعيلية'}" /></div>
        <div class="form-group"><label>الإدارة</label><select id="st-department">${getDeptOptions(data.department)}</select></div>
        <div class="form-group"><label>جهة العمل / المدرسة</label>
          ${currentUser.role === 'supervisor'
            ? `<input id="st-workplace" value="${currentUser.school}" disabled />`
            : `<select id="st-workplace">${getSchoolOptions(data.workPlace || data.school)}</select>`}
        </div>
        <div class="form-group full-width"><label>المرحلة</label><input id="st-stage" value="${data.stage || ''}" /></div>
      </div>

      <h4 style="margin:1rem 0 0.75rem;color:var(--primary)">البيانات الوظيفية</h4>
      <div class="form-grid">
        <div class="form-group"><label>المجموعة النوعية</label><input id="st-jobGroup" value="${data.jobGroup || ''}" /></div>
        <div class="form-group"><label>الموقف من العمل</label><input id="st-workStatus" value="${data.workStatus || ''}" /></div>
        <div class="form-group"><label>تاريخ التعيين</label><input type="date" id="st-appointment" value="${data.appointmentDate || ''}" /></div>
        <div class="form-group"><label>تاريخ استلام العمل</label><input type="date" id="st-start" value="${data.startDate || ''}" /></div>
        <div class="form-group"><label>التاريخ الاعتباري</label><input type="date" id="st-consideration" value="${data.considerationDate || ''}" /></div>
        <div class="form-group"><label>الوظيفة الحالية</label><input id="st-jobTitle" value="${data.jobTitle || ''}" /></div>
        <div class="form-group"><label>رقم القرار</label><input id="st-decisionNo" value="${data.decisionNo || ''}" /></div>
        <div class="form-group"><label>تاريخ القرار</label><input type="date" id="st-decisionDate" value="${data.decisionDate || ''}" /></div>
        <div class="form-group"><label>اعتباراً من</label><input type="date" id="st-effective" value="${data.effectiveFrom || ''}" /></div>
        <div class="form-group"><label>مادة التدريس</label><input id="st-subject" value="${data.teachingSubject || ''}" /></div>
        <div class="form-group full-width"><label>التخصص على الكادر</label><input id="st-cadre" value="${data.cadreSpecialization || ''}" /></div>
      </div>

      <h4 style="margin:1rem 0 0.75rem;color:var(--primary)">مؤهل التعيين أول مرة</h4>
      <div class="form-grid">
        <div class="form-group"><label>نوع المؤهل</label><input id="st-qualType" value="${data.qualificationType || ''}" /></div>
        <div class="form-group"><label>اسم المؤهل</label><input id="st-qualName" value="${data.qualificationName || ''}" /></div>
        <div class="form-group"><label>تقدير المؤهل</label><input id="st-qualGrade" value="${data.qualificationGrade || ''}" /></div>
        <div class="form-group"><label>جهة الحصول عليه</label><input id="st-qualFrom" value="${data.qualificationFrom || ''}" /></div>
        <div class="form-group"><label>تاريخ الحصول عليه</label><input type="date" id="st-qualDate" value="${data.qualificationDate || ''}" /></div>
      </div>

      <h4 style="margin:1rem 0 0.75rem;color:var(--primary)">الجزاءات</h4>
      <div class="form-group">
        <textarea id="st-penalties" rows="2">${data.penalties || ''}</textarea>
      </div>
    </div>
  `;

  showModal(id ? 'تعديل صحيفة أحوال' : 'إضافة صحيفة أحوال إلكترونية', body);

  document.getElementById('modal-save').onclick = async () => {
    const workplace = currentUser.role === 'supervisor'
      ? currentUser.school
      : document.getElementById('st-workplace').value;

    const payload = {
      code: document.getElementById('st-code').value.trim(),
      teacherCode: document.getElementById('st-code').value.trim(),
      name: document.getElementById('st-name').value.trim(),
      nationalId: document.getElementById('st-nationalId').value.trim(),
      birthDate: document.getElementById('st-birthDate').value,
      birthGov: document.getElementById('st-birthGov').value.trim(),
      gender: document.getElementById('st-gender').value,
      religion: document.getElementById('st-religion').value.trim(),
      maritalStatus: document.getElementById('st-marital').value.trim(),
      nationality: document.getElementById('st-nationality').value.trim(),
      phone: document.getElementById('st-phone').value.trim(),
      address: document.getElementById('st-address').value.trim(),
      originalEntity: document.getElementById('st-original').value.trim(),
      directorate: document.getElementById('st-directorate').value.trim(),
      department: document.getElementById('st-department').value,
      workPlace: workplace,
      school: workplace,
      stage: document.getElementById('st-stage').value.trim(),
      jobGroup: document.getElementById('st-jobGroup').value.trim(),
      workStatus: document.getElementById('st-workStatus').value.trim(),
      appointmentDate: document.getElementById('st-appointment').value,
      startDate: document.getElementById('st-start').value,
      considerationDate: document.getElementById('st-consideration').value,
      jobTitle: document.getElementById('st-jobTitle').value.trim(),
      decisionNo: document.getElementById('st-decisionNo').value.trim(),
      decisionDate: document.getElementById('st-decisionDate').value,
      effectiveFrom: document.getElementById('st-effective').value,
      teachingSubject: document.getElementById('st-subject').value.trim(),
      cadreSpecialization: document.getElementById('st-cadre').value.trim(),
      qualificationType: document.getElementById('st-qualType').value.trim(),
      qualificationName: document.getElementById('st-qualName').value.trim(),
      qualificationGrade: document.getElementById('st-qualGrade').value.trim(),
      qualificationFrom: document.getElementById('st-qualFrom').value.trim(),
      qualificationDate: document.getElementById('st-qualDate').value,
      penalties: document.getElementById('st-penalties').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.name
    };

    if (!payload.name) { toast('الاسم مطلوب', 'error'); return; }

    try {
      if (id) {
        await db.collection('statusSheets').doc(id).update(payload);
      } else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.createdBy = currentUser.name;
        await db.collection('statusSheets').add(payload);
      }
      toast('تم الحفظ بنجاح');
      closeModal();
      loadStatusData();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  document.getElementById('modal-cancel').onclick = closeModal;
}
