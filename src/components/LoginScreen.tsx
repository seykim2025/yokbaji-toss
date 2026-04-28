import { useState } from "react";
import { tossAppLogin } from "../toss";
import { loginWithToss } from "../auth";
import type { AuthErrorCode } from "../auth";
import styles from "./LoginScreen.module.css";

const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_APP: "앱 인증에 실패했어요.",
  INVALID_REQUEST: "요청이 올바르지 않아요.",
  TOKEN_EXCHANGE_FAILED: "토큰 교환에 실패했어요. 다시 시도해 주세요.",
  USER_FETCH_FAILED: "사용자 정보를 가져올 수 없어요.",
  DECRYPT_FAILED: "인증 처리 중 오류가 발생했어요.",
  SESSION_INVALID: "세션이 만료됐어요. 다시 로그인해 주세요.",
  INTERNAL_ERROR: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
  LOGIN_UNAVAILABLE: "토스 로그인을 사용할 수 없는 환경이에요.",
};

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const loginResult = await tossAppLogin();
      if (!loginResult) {
        setErrorCode("LOGIN_UNAVAILABLE");
        return;
      }
      const { authorizationCode, referrer } = loginResult;
      const result = await loginWithToss(authorizationCode, referrer);
      if (result.ok) {
        onLoginSuccess();
      } else {
        setErrorCode(result.errorCode);
      }
    } catch {
      setErrorCode("INTERNAL_ERROR");
    } finally {
      setLoading(false);
    }
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
          <div className={styles.errorBox}>{ERROR_MESSAGES[errorCode]}</div>
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
