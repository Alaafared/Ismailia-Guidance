function showModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml || `
    <button class="btn btn-primary" id="modal-save">حفظ</button>
    <button class="btn btn-secondary" id="modal-cancel">إلغاء</button>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;top:20px;left:50%;transform:translateX(-50%);
    background:${type === 'success' ? '#0e9f6e' : '#e02424'};
    color:white;padding:12px 24px;border-radius:8px;z-index:9999;
    font-family:Cairo,sans-serif;font-size:0.95rem;box-shadow:0 4px 12px rgba(0,0,0,0.15);
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function formatDate(d) {
  if (!d) return '—';
  if (d.toDate) d = d.toDate();
  if (typeof d === 'string') d = new Date(d);
  return d.toLocaleDateString('ar-EG');
}

function exportToExcel(data, filename) {
  if (!data || !data.length) {
    toast('لا توجد بيانات للتصدير', 'error');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename + '.xlsx');
}

function printElement(html) {
  const area = document.getElementById('print-area');
  area.innerHTML = html;
  area.style.display = 'block';
  window.print();
  setTimeout(() => {
    area.style.display = 'none';
    area.innerHTML = '';
  }, 500);
}

function getSchoolOptions(selected = '') {
  let html = '<option value="">— اختر المدرسة —</option>';
  for (const [dept, schools] of Object.entries(DEPARTMENTS)) {
    html += `<optgroup label="${dept}">`;
    schools.forEach(s => {
      html += `<option value="${s}" ${s === selected ? 'selected' : ''}>${s}</option>`;
    });
    html += '</optgroup>';
  }
  return html;
}

function getDeptOptions(selected = '') {
  let html = '<option value="">— اختر الإدارة —</option>';
  Object.keys(DEPARTMENTS).forEach(d => {
    html += `<option value="${d}" ${d === selected ? 'selected' : ''}>${d}</option>`;
  });
  return html;
}

function confirmDelete(msg = 'هل أنت متأكد من الحذف؟') {
  return window.confirm(msg);
}

/** هل السجل يخص المعلم الحالي؟ (بالكود أولاً ثم الاسم/البريد/uid) */
function belongsToCurrentTeacher(record) {
  if (!currentUser || normalizeRole(currentUser.role) !== 'teacher') return true;
  const code = (currentUser.teacherCode || '').toString().trim();
  if (code) {
    const recCode = (record.teacherCode || record.code || '').toString().trim();
    if (recCode && recCode === code) return true;
    if (recCode && recCode !== code) return false;
  }
  if (record.teacherId && record.teacherId === currentUser.uid) return true;
  if (record.userId && record.userId === currentUser.uid) return true;
  if (record.email && record.email === currentUser.email) return true;
  if (record.teacherName && record.teacherName === currentUser.name) return true;
  if (record.name && record.name === currentUser.name) return true;
  return false;
}

function teacherCodeField(value = '', id = 'teacher-code') {
  return `
    <div class="form-group">
      <label>كود المعلم <span style="color:#e02424">*</span></label>
      <input type="text" id="${id}" value="${value || ''}" placeholder="مثال: 2245784" />
    </div>
  `;
}

document.getElementById('modal-close')?.addEventListener('click', closeModal);
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});

/**
 * تفعيل الترتيب بالنقر على رؤوس أعمدة الجدول (تصاعدي / تنازلي)
 * يتجاهل عمود «إجراءات» وأي th يحمل class="no-sort"
 */
function makeTableSortable(tableOrSelector) {
  const table = typeof tableOrSelector === 'string'
    ? document.querySelector(tableOrSelector)
    : tableOrSelector;
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  thead.querySelectorAll('th').forEach((th, colIndex) => {
    const label = (th.textContent || '').trim();
    if (th.classList.contains('no-sort') || label === 'إجراءات') return;
    th.classList.add('sortable');
    th.setAttribute('title', 'انقر للترتيب تصاعدي / تنازلي');
    th.onclick = () => {
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(r =>
        !r.querySelector('.empty-state') && r.cells.length > 1
      );
      if (rows.length === 0) return;

      const asc = th.dataset.sortDir !== 'asc';
      thead.querySelectorAll('th').forEach(h => {
        h.dataset.sortDir = '';
        h.classList.remove('sort-asc', 'sort-desc');
      });
      th.dataset.sortDir = asc ? 'asc' : 'desc';
      th.classList.add(asc ? 'sort-asc' : 'sort-desc');

      rows.sort((a, b) => {
        const av = (a.cells[colIndex]?.textContent || '').trim().replace(/\s+/g, ' ');
        const bv = (b.cells[colIndex]?.textContent || '').trim().replace(/\s+/g, ' ');
        const an = parseFloat(av.replace(/,/g, ''));
        const bn = parseFloat(bv.replace(/,/g, ''));
        let cmp;
        if (!isNaN(an) && !isNaN(bn) && av !== '' && bv !== '' && av !== '—' && bv !== '—') {
          cmp = an - bn;
        } else {
          cmp = av.localeCompare(bv, 'ar', { numeric: true, sensitivity: 'base' });
        }
        return asc ? cmp : -cmp;
      });
      rows.forEach(r => tbody.appendChild(r));
    };
  });
}

/** تفعيل الترتيب على كل الجداول داخل منطقة المحتوى */
function makeContentTablesSortable() {
  document.querySelectorAll('#content-area table').forEach(makeTableSortable);
}

/**
 * طباعة الجدول الظاهر في الصفحة (بدون عمود الإجراءات)
 */
function printCurrentTable(title) {
  const table = document.querySelector('#content-area table');
  if (!table) {
    toast('لا توجد بيانات للطباعة', 'error');
    return;
  }
  const clone = table.cloneNode(true);
  // إزالة مؤشرات الترتيب من النسخة
  clone.querySelectorAll('th').forEach(th => {
    th.classList.remove('sortable', 'sort-asc', 'sort-desc');
    th.removeAttribute('title');
  });
  // حذف عمود الإجراءات
  let actionsIdx = -1;
  clone.querySelectorAll('thead th').forEach((th, i) => {
    if ((th.textContent || '').trim() === 'إجراءات') actionsIdx = i;
  });
  if (actionsIdx >= 0) {
    clone.querySelectorAll('tr').forEach(tr => {
      if (tr.cells.length > actionsIdx) tr.deleteCell(actionsIdx);
    });
  }
  const pageTitle = title || document.getElementById('page-title')?.textContent || 'تقرير';
  const userName = currentUser?.name || '';
  const school = currentUser?.school || '';
  printElement(`
    <div style="direction:rtl;font-family:Cairo,sans-serif">
      <h2 style="text-align:center;margin-bottom:0.25rem">${pageTitle}</h2>
      <p style="text-align:center;font-size:0.9rem;color:#555;margin-bottom:1rem">
        إدارة توجيه تخصص الكهرباء — محافظة الإسماعيلية
        ${school ? ' | ' + school : ''}
        ${userName ? ' | طُبع بواسطة: ' + userName : ''}
        <br/>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
      </p>
      ${clone.outerHTML}
    </div>
  `);
}

/** إظهار زر الطباعة في الشريط العلوي وربطه */
function enablePagePrint(title) {
  const btn = document.getElementById('print-btn');
  if (!btn) return;
  btn.style.display = '';
  btn.onclick = () => printCurrentTable(title);
}

/** مراقبة منطقة المحتوى لتفعيل الترتيب تلقائياً بعد تحميل الجداول */
(function watchTablesForSort() {
  const start = () => {
    const area = document.getElementById('content-area');
    if (!area) {
      setTimeout(start, 300);
      return;
    }
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(makeContentTablesSortable, 80);
    });
    observer.observe(area, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
