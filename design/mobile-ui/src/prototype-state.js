export const initialPrototypeState = Object.freeze({
  authenticated: false,
  companyId: 'tongda',
  username: '',
  password: '',
  passwordVisible: false,
  submitting: false,
  errors: Object.freeze({}),
  role: 'employee',
  activeTab: 'workbench',
  overlay: null,
});

function withoutErrors(errors, ...keys) {
  const nextErrors = { ...errors };
  for (const key of keys) delete nextErrors[key];
  return nextErrors;
}

function loginErrors(state) {
  const errors = {};
  if (!state.companyId) errors.companyId = '请选择所属企业';
  if (!state.username.trim()) errors.username = '请输入账号';
  if (!state.password) errors.password = '请输入密码';
  return errors;
}

export function prototypeReducer(state, event) {
  switch (event.type) {
    case 'SELECT_COMPANY':
      return {
        ...state,
        companyId: event.companyId,
        errors: withoutErrors(state.errors, 'companyId', 'form'),
      };
    case 'SET_USERNAME':
      return {
        ...state,
        username: event.value,
        errors: withoutErrors(state.errors, 'username', 'form'),
      };
    case 'SET_PASSWORD':
      return {
        ...state,
        password: event.value,
        errors: withoutErrors(state.errors, 'password', 'form'),
      };
    case 'TOGGLE_PASSWORD':
      return { ...state, passwordVisible: !state.passwordVisible };
    case 'SUBMIT_LOGIN': {
      const errors = loginErrors(state);
      return {
        ...state,
        username: state.username.trim(),
        submitting: Object.keys(errors).length === 0,
        errors,
      };
    }
    case 'LOGIN_FAILED':
      return {
        ...state,
        authenticated: false,
        submitting: false,
        password: '',
        passwordVisible: false,
        errors: { form: event.message ?? '登录失败，请重试' },
      };
    case 'LOGIN_SUCCEEDED':
      return {
        ...state,
        authenticated: true,
        submitting: false,
        password: '',
        passwordVisible: false,
        errors: {},
        activeTab: 'workbench',
        overlay: null,
      };
    case 'SWITCH_ROLE':
      return { ...state, role: event.role };
    case 'SELECT_TAB':
      return { ...state, activeTab: event.tab };
    case 'OPEN_OVERLAY':
      return { ...state, overlay: event.overlay };
    case 'CLOSE_OVERLAY':
      return { ...state, overlay: null };
    case 'LOGOUT':
      return initialPrototypeState;
    default:
      return state;
  }
}
