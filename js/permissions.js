/**
 * صلاحيات حسب الدور
 * superadmin: كل شيء
 * supervisor: مدرسته فقط + صلاحيات محددة
 * teacher: بياناته فقط + قراءة محدودة
 */
const PERMISSIONS = {
  // إدارة المستخدمين
  users: {
    view: ['superadmin'],
    create: ['superadmin'],
    edit: ['superadmin'],
    delete: ['superadmin']
  },
  // بيانات المدارس
  schools: {
    view: ['superadmin'],
    create: ['superadmin'],
    edit: ['superadmin'],
    delete: ['superadmin']
  },
  // ميزانية العجز والزيادة
  budget: {
    view: ['superadmin', 'supervisor'],
    create: ['superadmin', 'supervisor'],
    edit: ['superadmin', 'supervisor'],
    delete: ['superadmin', 'supervisor'],
    print: ['superadmin', 'supervisor']
  },
  // صحيفة الأحوال
  status: {
    view: ['superadmin', 'supervisor', 'teacher'],
    create: ['superadmin', 'supervisor'],
    edit: ['superadmin', 'supervisor'],
    delete: ['superadmin', 'supervisor'],
    print: ['superadmin', 'supervisor']
  },
  // العجز والزيادة (صفحة منفصلة)
  shortage: {
    view: ['superadmin', 'supervisor'],
    create: ['superadmin', 'supervisor'],
    edit: ['superadmin', 'supervisor'],
    delete: ['superadmin', 'supervisor']
  },
  // جداول المعلمين
  schedules: {
    view: ['superadmin', 'supervisor', 'teacher'],
    create: ['superadmin', 'supervisor'],
    edit: ['superadmin', 'supervisor'],
    delete: ['superadmin', 'supervisor']
  },
  // المواقع الإلكترونية
  websites: {
    view: ['superadmin', 'supervisor', 'teacher'],
    create: ['superadmin', 'supervisor', 'teacher'],
    edit: ['superadmin', 'supervisor'],
    delete: ['superadmin', 'supervisor']
  },
  // توزيع المناهج
  curriculum: {
    view: ['superadmin', 'supervisor', 'teacher'],
    create: ['superadmin'],
    edit: ['superadmin'],
    delete: ['superadmin']
  },
  // الكتب والمراجع
  books: {
    view: ['superadmin', 'supervisor', 'teacher'],
    create: ['superadmin'],
    edit: ['superadmin'],
    delete: ['superadmin']
  },
  // زيارات الفصول — المشرف يضيف ويشاهد فقط، التعديل والحذف للموجه فقط
  visits: {
    view: ['superadmin', 'supervisor', 'teacher'],
    create: ['superadmin', 'supervisor'],
    edit: ['superadmin'],
    delete: ['superadmin']
  },
  // حركات التعيين والندب والنقل والإجازات
  movements: {
    view: ['superadmin', 'supervisor'],
    create: ['superadmin'],
    edit: ['superadmin'],
    delete: ['superadmin']
  },
  // اجتماعات المكتب الفني
  meetings: {
    view: ['superadmin'],
    create: ['superadmin'],
    edit: ['superadmin'],
    delete: ['superadmin']
  },
  // القرارات والقوانين الوزارية
  decisions: {
    view: ['superadmin', 'supervisor', 'teacher'],
    create: ['superadmin'],
    edit: ['superadmin'],
    delete: ['superadmin']
  }
};

function can(action, resource) {
  if (!currentUser) return false;
  const perms = PERMISSIONS[resource];
  if (!perms || !perms[action]) return false;
  const role = normalizeRole(currentUser.role);
  return perms[action].includes(role);
}

function canAccessPage(page) {
  return can('view', page);
}
