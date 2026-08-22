let currentUser = null; // { uid, email, name, role, school, department }

function mapAuthError(err) {
  const code = err && err.code ? err.code : '';
  const map = {
    'auth/invalid-email': 'البريد الإلكتروني غير صالح',
    'auth/user-disabled': 'هذا الحساب معطل',
    'auth/user-not-found': 'البريد أو كلمة المرور غير صحيحة',
    'auth/wrong-password': 'البريد أو كلمة المرور غير صحيحة',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
    'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً',
    'auth/network-request-failed': 'مشكلة في الاتصال بالإنترنت أو Firebase',
    'auth/email-already-in-use': 'البريد مستخدم من قبل',
    'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)',
    'auth/operation-not-allowed': 'طريقة تسجيل الدخول غير مفعّلة في Firebase (فعّل Email/Password)',
    'permission-denied': 'لا توجد صلاحية في قواعد Firestore — انشر ملف firestore.rules'
  };
  if (map[code]) return map[code];
  if (err && err.message) return err.message;
  return 'حدث خطأ غير متوقع';
}

async function login(email, password) {
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const userDoc = await db.collection('users').doc(cred.user.uid).get();
    if (!userDoc.exists) {
      await auth.signOut();
      throw new Error(
        'تم تسجيل الدخول في Authentication لكن لا توجد وثيقة في Firestore/users.\n' +
        'افتح Firebase Console → Firestore → users وأنشئ وثيقة Document ID = UID المستخدم مع الحقول: name, email, role=superadmin'
      );
    }
    const data = userDoc.data();
    currentUser = {
      uid: cred.user.uid,
      email: cred.user.email,
      ...data,
      role: normalizeRole(data.role)
    };
    return currentUser;
  } catch (e) {
    throw new Error(mapAuthError(e));
  }
}

async function logout() {
  await auth.signOut();
  currentUser = null;
}

function onAuthStateChanged(callback) {
  auth.onAuthStateChanged(async (user) => {
    try {
      if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          currentUser = {
            uid: user.uid,
            email: user.email,
            ...data,
            role: normalizeRole(data.role)
          };
          callback(currentUser);
        } else {
          await auth.signOut();
          callback(null);
        }
      } else {
        currentUser = null;
        callback(null);
      }
    } catch (e) {
      console.error('Auth state error:', e);
      currentUser = null;
      callback(null);
    }
  });
}

/**
 * إنشاء مستخدم جديد (من لوحة الـ Super Admin)
 * ينشئ حساب Auth + وثيقة في users بدون تسجيل خروج الأدمن
 */
async function createUserAccount({ email, password, name, role, school, department, teacherCode }) {
  const appName = 'Secondary_' + Date.now();
  let secondaryApp;
  try {
    secondaryApp = firebase.initializeApp(firebaseConfig, appName);
    const secondaryAuth = secondaryApp.auth();
    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
      name,
      email,
      role,
      school: school || '',
      department: department || '',
      teacherCode: teacherCode || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: currentUser ? currentUser.uid : null
    });
    await secondaryAuth.signOut();
    return cred.user.uid;
  } catch (e) {
    throw new Error(mapAuthError(e));
  } finally {
    if (secondaryApp) {
      try { await secondaryApp.delete(); } catch (_) {}
    }
  }
}

async function updateUserDoc(uid, data) {
  await db.collection('users').doc(uid).update({
    ...data,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function deleteUserAccount(uid) {
  await db.collection('users').doc(uid).delete();
}
