import React, { useEffect, useReducer } from 'react';
import { initialPrototypeState, prototypeReducer } from './prototype-state.js';
import { LoginCompanyScreen } from './screens/AuthScreens.jsx';
import { AdminWorkbenchScreen, EmployeeWorkbenchScreen } from './screens/WorkbenchScreens.jsx';

export function BrandPrototypeApp() {
  const [state, dispatch] = useReducer(prototypeReducer, initialPrototypeState);

  useEffect(() => {
    if (!state.submitting) return undefined;

    const timeout = window.setTimeout(() => {
      if (state.username.toLowerCase() === 'error') {
        dispatch({ type: 'LOGIN_FAILED', message: '账号或密码错误，请检查后重试' });
      } else {
        dispatch({ type: 'LOGIN_SUCCEEDED' });
      }
    }, 480);

    return () => window.clearTimeout(timeout);
  }, [state.submitting, state.username]);

  if (!state.authenticated) {
    return <LoginCompanyScreen state={state} dispatch={dispatch} />;
  }

  return state.role === 'admin' ? <AdminWorkbenchScreen /> : <EmployeeWorkbenchScreen />;
}
