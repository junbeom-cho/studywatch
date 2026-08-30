# Repository Guidelines

<!--
- 이 파일은 이 저장소를 만지는 AI 코딩 에이전트가 가장 먼저 읽는 문서다.
- 커맨드는 "복사해서 그대로 실행되는 것"만 적는다. 에이전트는 여기 적힌 걸 그대로 믿고 실행한다.
- 해당 없는 절은 지우지 말고 "해당 없음"으로 남긴다. 빈 칸보다 "없다는 사실"이 정보다.
-->

| 항목 | 내용 |
|---|---|
| 프로젝트명 | StudyWatch |
| 한 줄 소개 | 인프런 작심삼일 챌린지 인증용 스톱워치 |
| 주 언어·스택 | TypeScript / React + Vite (프론트) · Hono + SQLite (서버) |
| 최종 수정일 | 2026-08-30 |

---

## 1. 개요

- 목적: 공부 시간을 재고, 인증 스크린샷 한 장에 "누가 · 무슨 강의를 · 언제 · 얼마나"가 담기게 한다.
- 경과 시간의 소유자는 **서버**다. 클라이언트는 그리기만 한다. PC에서 시작한 세션을 폰에서 이어 볼 수 있어야 하기 때문이다.
- 표시면은 `<canvas>` 하나로 그린다. 스크린샷(FR-2)과 PIP(FR-3)가 같은 그리기 코드를 쓴다.
- 요구사항이 정리된 곳: `docs/PRD.md` — 여기에 복붙하지 않는다.

## 2. 구조

<!-- 실제 존재하는 디렉터리만 적는다. 없는 경로를 적으면 에이전트가 엉뚱한 곳에 파일을 만든다. -->

```
studywatch/
├─ docs/          # PRD
├─ shared/        # 서버·클라이언트가 함께 쓰는 타입과 시간 계산 (time.ts 가 핵심)
├─ server/        # Hono API + SQLite. db.ts(스키마) · store.ts(도메인) · index.ts(라우트)
├─ client/        # React + Vite. face.ts 가 캔버스 그리기, 나머지는 얇다
└─ data/          # SQLite 파일. 커밋하지 않는다
```

시간 계산(`shared/time.ts`)은 서버와 클라이언트가 **같은 함수**를 쓴다. 여기를 고치면 양쪽 동작이 함께 바뀐다.

## 3. 빌드 · 테스트 · 실행 커맨드

<!-- 가장 중요한 절. 한 번 실행해 보고 확인 칸을 ✅로 바꾼다. 미검증은 ⬜로 둔다. -->

| 목적 | 커맨드 | 확인 |
|---|---|---|
| 의존성 설치 | `npm install` | ✅ |
| 로컬 실행 (개발) | `npm run dev` | ✅ |
| 로컬 실행 (컨테이너) | `docker compose -f docker-compose.yaml -f docker-compose.build.yaml up -d --build` | ✅ |
| 홈서버 실행 | `docker compose up -d` | ✅ |
| 전체 테스트 | `npm test` | ✅ |
| 단일 테스트 | `npx tsx --test shared/time.test.ts` | ✅ |
| 포맷 적용 | `npm run format` | ✅ |
| 포맷 검사 | `npm run format:check` | ✅ |
| 타입 검사 | `npm run typecheck` | ✅ |
| 포맷 + 타입 + 테스트 | `npm run check` | ✅ |
| 프로덕션 빌드 | `npm run build` | ✅ |
| 커밋 전 검사 | `pre-commit run --all-files` | ✅ |

`npm run dev` 는 API(3000)와 Vite(5173)를 함께 띄운다. **브라우저는 5173 으로 연다** — Vite 가 `/api` 를 3000 으로 넘긴다.
`concurrently` 의 `--raw` 를 빼면 안 된다. 기본 출력 모드에서는 `tsx watch` 가 포트를 열지 못한다(Windows).
빌드된 프론트가 있으면 서버가 3000 한 포트에서 API 와 정적 파일을 함께 서빙한다. 컨테이너가 하나인 이유다.

`docker-compose.yaml` 은 **레지스트리 이미지를 받아 쓴다**. 홈서버는 이 파일 하나만 두고 `docker compose up -d` 로 끝난다.
소스에서 직접 빌드해 보려면 `docker-compose.build.yaml` 을 겹쳐 쓴다(위 표의 컨테이너 행).
main 에 push 하면 `.github/workflows/publish.yaml` 이 `ghcr.io/junbeom-cho/studywatch:latest` 를 갱신한다.
이미지 이름은 레포 이름과 분리해 두었으므로 레포를 rename 해도 홈서버 설정을 고칠 필요가 없다.

최초 1회 셋업. 훅은 `.git/` 안에 설치되어 커밋에 따라오지 않으므로 **클론한 레포마다 한 번씩** 필요하다.

```
uv tool install pre-commit   # 이미 있으면 생략
uv tool update-shell         # PATH가 안 잡힐 때만, 실행 후 셸을 새로 연다
pre-commit install           # .git/hooks/pre-commit 생성
```

런타임 버전은 그 언어의 도구로 고정한다 (`uv python pin`, `.nvmrc` 등).

## 4. 스타일

| 항목 | 규칙 |
|---|---|
| 들여쓰기 / 줄 길이 | 스페이스 2 / 100 |
| 문자열 · 세미콜론 | 홑따옴표 / 세미콜론 없음 |
| 컴포넌트 · 함수·변수 · 상수 | PascalCase / camelCase / UPPER_SNAKE |
| DB 컬럼 | snake_case. 경계에서 camelCase 로 바꿔 내보낸다 (`store.ts`) |
| 주석·커밋·문서 언어 | 한국어 |

포맷터가 규칙이다. 손으로 맞추지 않는다: `npm run format`

표를 손으로 다듬은 마크다운은 `.prettierignore` 로 빼 두었다. 포맷터가 정렬을 흐트러뜨리기 때문이다.

## 5. 테스트

- 새 기능에는 테스트를 같이 넣는다. 버그를 고칠 때는 그 버그를 재현하는 테스트부터 쓴다.
- 외부 API는 목/스텁으로 대체한다. 테스트가 네트워크에 의존하지 않게 한다.

## 6. 커밋

- Conventional Commits: `<type>(<scope>): <제목>`
  예) `feat(auth): 로그인 세션 만료 처리 추가`
- 한 커밋은 한 가지만. 포맷팅 변경과 기능 변경을 섞지 않는다.
- **에이전트 주의**: 요청받지 않으면 `commit`·`push` 하지 않는다.
- **커밋할 때 스테이징하지 않은 변경을 남기지 않는다.** pre-commit 이 그것들을 stash 했다가
  되돌리는데, 그 과정에서 파일이 통째로 사라지는 일이 실제로 두 번 있었다(AGENTS.md, README.md).
  한 번에 여러 커밋을 만들 때 특히 위험하다. 커밋 뒤에는 `git show --stat` 으로
  의도하지 않은 삭제가 없는지 확인한다.

## 7. 비밀정보

- API 키·토큰·비밀번호·인증서는 커밋하지 않는다. `.env`에 두고 `.env.example`에는 키 이름만 남긴다.
- `gitleaks`가 pre-commit에서 차단한다. **`--no-verify`로 우회하지 않는다** — 한 번 우회하면 다른 훅도 함께 꺼진다.
- 실수로 커밋했다면 히스토리를 지우는 것보다 **해당 키를 폐기하고 새로 발급받는 게 먼저다.**

## 8. 에이전트 행동 규칙

- 요구사항이 불명확하면 추측해서 구현하지 말고 먼저 묻는다.
- 대량 리팩터링, 의존성 버전 업, 파일 대량 삭제는 사전 확인.
- 새 의존성을 추가하기 전에 표준 라이브러리나 이미 있는 의존성으로 되는지 먼저 본다.
- 혼자 쓰는 개인 프로젝트다. CI 파이프라인, 이슈·PR 템플릿, CODEOWNERS, 기여 가이드,
  '나중에 팀이 커지면' 류의 추상화 계층은 요청받지 않으면 만들지 않는다.
