# 욕바지 (yokbaji-toss)

Apps in Toss WebView 기반 감정 쓰레기통 미니 게임의 프론트엔드 SPA 입니다. 사용자가 사진과 성격을 등록해 "욕바지" 캐릭터를 만들고, 메시지에 대한 반응 대사와 영상을 받아봅니다.

- 런타임: Apps in Toss WebView (Toss 미니앱)
- 프레임워크: React 19 + TypeScript + Vite 8
- SDK: `@apps-in-toss/web-framework`
- 백엔드: `yokbaji-engine` (별도 저장소, `VITE_API_URL` 로 주입)
- 배포: Vercel (`https://yokbaji-toss.vercel.app`)

## 빠른 시작

```bash
npm install
cp .env.example .env     # VITE_API_URL 확인
npm run dev              # 로컬 브라우저 개발 (http://localhost:5173)
npm run build            # 정적 번들 빌드
npm run build:ait        # Apps in Toss 빌드 (ait build)
```

## 환경 변수

| 키 | 기본값 | 설명 |
|---|---|---|
| `VITE_API_URL` | `https://yokbaji-engine.vercel.app` | 백엔드 API 베이스 URL |
| `VITE_SEED_DEFAULTS` | `false` | `true` 일 때 프로덕션 빌드에서도 기본 캐릭터 2명을 첫 로드에 시드 (DEV 빌드는 항상 시드) |

## 프로젝트 구조

```
.
├─ granite.config.ts          # Apps in Toss WebView 설정 (appName, brand, permissions, webViewProps)
├─ vite.config.ts             # Vite + React 플러그인
├─ index.html                 # 엔트리 HTML (viewport, theme-color)
├─ public/                    # 정적 자산 (favicon.svg, icons.svg, 기본 캐릭터 이미지)
└─ src/
   ├─ main.tsx                # React root + 전역 CSS + Pretendard import
   ├─ App.tsx                 # 화면 state machine (home / create / character / token)
   ├─ index.css               # 전역 스타일 토큰 + safe-area
   ├─ api.ts                  # yokbaji-engine REST 클라이언트 + localStorage persistence
   ├─ toss.ts                 # Toss SDK 브리지 (익명 키 / closeView / haptic / share / screen awake)
   ├─ types.ts                # 도메인 타입 (Character, Personality, ReactionResult)
   └─ components/             # 화면 및 모달
```

## Apps in Toss SDK 사용 요약

| 기능 | SDK | 사용 위치 |
|---|---|---|
| 익명 사용자 키 | `getAnonymousKey` | `src/toss.ts::getTossUserKey` |
| 화면 닫기 | `closeView` | `src/toss.ts::closeTossView` → `ExitModal` |
| 화면 항상 켜짐 | `setScreenAwakeMode` | `src/App.tsx` 진입/이탈 시 토글 |
| 햅틱 | `generateHapticFeedback` | `src/toss.ts::haptic` |
| 공유 | `share` | `src/toss.ts::shareMessage` |
| 종료 감지 | `window.__GRANITE_NATIVE_EMITTER` | `src/App.tsx` closeView 이벤트 → 확인 모달 |

## 배포

- Preview: `vercel`
- Production: `vercel --prod`
- Vercel `yokbaji-toss` 프로젝트에 `VITE_API_URL` 환경변수 설정 필요.
