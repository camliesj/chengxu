import assert from 'node:assert/strict';
import test from 'node:test';
import { initialPrototypeState, prototypeReducer } from '../src/prototype-state.js';

test('login fields, company and password visibility update without mutation', () => {
  const companyState = prototypeReducer(initialPrototypeState, {
    type: 'SELECT_COMPANY',
    companyId: 'xinqiheng',
  });
  const usernameState = prototypeReducer(companyState, { type: 'SET_USERNAME', value: ' worker ' });
  const passwordState = prototypeReducer(usernameState, { type: 'SET_PASSWORD', value: 'secret12' });
  const visibleState = prototypeReducer(passwordState, { type: 'TOGGLE_PASSWORD' });

  assert.equal(initialPrototypeState.companyId, 'tongda');
  assert.equal(companyState.companyId, 'xinqiheng');
  assert.equal(usernameState.username, ' worker ');
  assert.equal(passwordState.password, 'secret12');
  assert.equal(visibleState.passwordVisible, true);
});

test('submit validates required credentials before entering submitting state', () => {
  const empty = { ...initialPrototypeState, companyId: '', username: '', password: '' };
  const invalid = prototypeReducer(empty, { type: 'SUBMIT_LOGIN' });

  assert.equal(invalid.submitting, false);
  assert.deepEqual(invalid.errors, {
    companyId: '请选择所属企业',
    username: '请输入账号',
    password: '请输入密码',
  });

  const valid = prototypeReducer(
    { ...initialPrototypeState, username: ' worker ', password: 'secret12' },
    { type: 'SUBMIT_LOGIN' },
  );
  assert.equal(valid.submitting, true);
  assert.deepEqual(valid.errors, {});
});

test('login result clears secrets on success and exposes a form error on failure', () => {
  const submitting = {
    ...initialPrototypeState,
    username: 'worker',
    password: 'secret12',
    submitting: true,
  };
  const failed = prototypeReducer(submitting, { type: 'LOGIN_FAILED', message: '账号或密码错误' });
  const succeeded = prototypeReducer(submitting, { type: 'LOGIN_SUCCEEDED' });

  assert.equal(failed.authenticated, false);
  assert.equal(failed.submitting, false);
  assert.equal(failed.errors.form, '账号或密码错误');
  assert.equal(succeeded.authenticated, true);
  assert.equal(succeeded.password, '');
  assert.equal(succeeded.passwordVisible, false);
  assert.equal(succeeded.submitting, false);
});

test('authenticated navigation, overlays, roles and logout use explicit events', () => {
  let state = { ...initialPrototypeState, authenticated: true, username: 'worker' };
  state = prototypeReducer(state, { type: 'SWITCH_ROLE', role: 'admin' });
  state = prototypeReducer(state, { type: 'SELECT_TAB', tab: 'profile' });
  state = prototypeReducer(state, { type: 'OPEN_OVERLAY', overlay: 'logout' });

  assert.equal(state.role, 'admin');
  assert.equal(state.activeTab, 'profile');
  assert.equal(state.overlay, 'logout');

  state = prototypeReducer(state, { type: 'CLOSE_OVERLAY' });
  assert.equal(state.overlay, null);

  state = prototypeReducer(state, { type: 'LOGOUT' });
  assert.deepEqual(state, initialPrototypeState);
});
