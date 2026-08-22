const DEPARTMENTS = {
  'شمال': [
    'مدرسة الفنية الكهربية الصناعية بنات',
    'مدرسة المهندس ابراهيم احمد عثمان الصناعية بنين'
  ],
  'فايد': [
    'مدرسة فايد الصناعية العسكرية بنين'
  ],
  'القنطرة شرق': [
    'مدرسة الشهيد المقدم محمد عبدالاله صالح الصناعية بالقنطرة شرق'
  ],
  'القنطرة غرب': [
    'مدرسة القنطرة غرب الصناعية بنين',
    'مدرسة القنطرة غرب الصناعية بنات'
  ],
  'ابوصوير': [
    'مدرسة الشهيد مجند محمد محمد علي ابراهيم العسكريه المشتركه ( ابو صوير الصناعيه المشتركة )'
  ],
  'التل الكبير': [
    'مدرسة الشهيد احمد عادل وصفي العسكريه المشتركه بالتل الكبير'
  ],
  'القصاصين': [
    'مدرسة القصاصين الصناعيه العسكريه المشتركه'
  ]
};

const ALL_SCHOOLS = Object.values(DEPARTMENTS).flat();

const ROLES = {
  SUPERADMIN: 'superadmin',
  SUPERVISOR: 'supervisor',
  TEACHER: 'teacher'
};

const ROLE_LABELS = {
  superadmin: 'موجه (Super Admin)',
  admin: 'موجه (Super Admin)',
  supervisor: 'مشرف تخصص',
  teacher: 'معلم',
  معلم: 'معلم',
  'مشرف تخصص': 'مشرف تخصص'
};

/** توحيد قيمة الدور من Firestore */
function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).trim().toLowerCase();
  if (['superadmin', 'admin', 'super admin', 'super_admin', 'موجه', 'ادمن', 'أدمن'].includes(r)) {
    return 'superadmin';
  }
  if (['supervisor', 'مشرف', 'مشرف تخصص', 'mushrif'].includes(r)) {
    return 'supervisor';
  }
  if (['teacher', 'معلم', 'muallim'].includes(r)) {
    return 'teacher';
  }
  return r;
}

const EVALUATION_OPTIONS = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'];

const SPECIALIZATIONS = [
  'كهرباء',
  'إلكترونيات',
  'تحكم آلي',
  'قوى كهربائية',
  'أخرى'
];

const GRADES = [
  'أولى صناعي',
  'ثانية صناعي',
  'ثالثة صناعي',
  'أولى فني',
  'ثانية فني',
  'ثالثة فني'
];
