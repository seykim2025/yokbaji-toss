import { useState } from "react";
import { tossAppLogin } from "../toss";
import { loginWithToss } from "../auth";
import type { AuthErrorCode, TossUser } from "../auth";
import styles from "./LoginScreen.module.css";

const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_APP: "앱 인증에 실패했어요.",
  INVALID_REQUEST: "요청이 올바르지 않아요.",
  TOKEN_EXCHANGE_FAILED: "토큰 교환에 실패했어요. 다시 시도해 주세요.",
  USER_FETCH_FAILED: "사용자 정보를 가져올 수 없어요.",
  SESSION_SAVE_FAILED: "로그인 정보를 저장할 수 없어요.",
  USER_STATE_FAILED: "사용자 상태를 불러올 수 없어요.",
  NETWORK_ERROR: "네트워크 연결을 확인해주세요.",
  DECRYPT_FAILED: "인증 처리 중 오류가 발생했어요.",
  SESSION_INVALID: "세션이 만료됐어요. 다시 로그인해 주세요.",
  INTERNAL_ERROR: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
  LOGIN_UNAVAILABLE: "토스 로그인을 사용할 수 없는 환경이에요.",
};

interface LoginScreenProps {
  onLoginSuccess: (user: TossUser, logs: string[]) => void | Promise<void>;
  onLoginError?: (errorCode: AuthErrorCode, logs: string[]) => void;
}

export default function LoginScreen({ onLoginSuccess, onLoginError }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [lastLogs, setLastLogs] = useState<string[]>([]);

  const handleLogin = async () => {
    setLoading(true);
    setErrorCode(null);
    setLastLogs([]);
    try {
      const loginResult = await tossAppLogin();
      if (!loginResult) {
        setErrorCode("LOGIN_UNAVAILABLE");
        onLoginError?.("LOGIN_UNAVAILABLE", ["tossAppLogin returned null"]);
        return;
      }
      const { authorizationCode, referrer } = loginResult;
      const result = await loginWithToss(authorizationCode, referrer);
      if (result.ok) {
        try {
          await onLoginSuccess(result.user, result.logs || []);
        } catch (err: any) {
          const isAuth = err?.message === "Not logged in" || err?.status === 401 || err?.status === 403;
          if (isAuth) {
            const { clearTossSession } = await import("../auth");
            clearTossSession();
          }
          const logs = result.logs || [];
          logs.push(`stateCalled: true`);
          logs.push(`stateStatus: ${err?.status || 'unknown'}`);
          logs.push(`stateErrorCode: ${err?.message || 'unknown'}`);
          logs.push(`stateErrorBodySnippet: ${err?.bodySnippet || 'none'}`);
          
          setLastLogs(logs);
          setErrorCode("USER_STATE_FAILED");
          onLoginError?.("USER_STATE_FAILED", logs);
        }
      } else {
        const logs = result.logs || [];
        logs.push(`stateCalled: false`);
        setLastLogs(logs);
        setErrorCode(result.errorCode);
        onLoginError?.(result.errorCode, logs);
      }
    } catch (e) {
      setErrorCode("INTERNAL_ERROR");
      onLoginError?.("INTERNAL_ERROR", [`Exception in LoginScreen: ${String(e)}`]);
    } finally {
      setLoading(false);
    }
  };

  const getLogValue = (prefix: string) => {
    const line = lastLogs.find(l => l.startsWith(prefix));
    return line ? line.replace(prefix, "").trim() : "N/A";
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.title}>yokbaji</div>
        <div className={styles.description}>
          토스 계정으로 로그인하고 바로 시작하세요
        </div>
      </div>
      <div className={styles.footer}>
        {errorCode && (
          <div className={styles.errorBox}>
            {ERROR_MESSAGES[errorCode]}
            <div style={{ fontSize: 10, marginTop: 8, textAlign: 'left', wordBreak: 'break-all', opacity: 0.8 }}>
              <div>authStatus: {getLogValue('authStatus:')}</div>
              <div>authResponseKeys: {getLogValue('authResponseKeys:')}</div>
              <div>selectedUserKeyPath: {getLogValue('selectedUserKeyPath:')}</div>
              <div>selectedUserKeyExists: {getLogValue('selectedUserKeyExists:')}</div>
              <div>sessionSaved: {getLogValue('sessionSaved:')}</div>
              <div>sessionReadback: {getLogValue('sessionReadback:')}</div>
              <div>stateCalled: {getLogValue('stateCalled:')}</div>
              <div>stateStatus: {getLogValue('stateStatus:')}</div>
              <div>stateErrorCode: {getLogValue('stateErrorCode:')}</div>
              <div>stateErrorBodySnippet: {getLogValue('stateErrorBodySnippet:')}</div>
              <div>finalErrorCode: {errorCode}</div>
            </div>
          </div>
        )}
        <button
          className={styles.loginButton}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "로그인 중..." : "토스 로그인"}
        </button>
      </div>
    </div>
  );
}
