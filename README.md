# StudyWatch

인프런 작심삼일 챌린지 인증용 스톱워치.

인증 스크린샷 한 장에 **누가 · 무슨 강의를 · 언제 · 얼마나** 가 모두 담기게 하는 것이 목적이다.

요구사항은 [`docs/PRD.md`](docs/PRD.md), 개발 규칙과 커맨드 표는 [`AGENTS.md`](AGENTS.md) 에 있다.

---

## 1. 무엇을 하는가

닉네임 · 강의명 · 강사명 · 오늘 날짜 · 경과 시간을 캔버스 한 장에 그린다. 그대로 찍어서 인증에 쓴다.

| 상태 | 기능 |
|---|---|
| 됨 | 스톱워치(시/분/초/밀리초), 날짜, 닉네임, 강의 정보, 버리기, 스크린샷, 알림, 잔디 달력 |
| 예정 | PIP, 배경 이미지 |

### 설계에서 중요한 두 가지

**경과 시간의 소유자는 서버다.** 클라이언트는 그리기만 한다. 그래서 PC 에서 시작한 세션을 폰에서 이어 볼 수 있고, 탭이 갑자기 닫혀도 기록이 남는다.

**학습일은 세션을 시작한 날이다.** 자정을 넘겨도 세션을 쪼개지 않는다. 23:50 에 시작해 01:00 에 끝냈으면 전부 시작한 날에 붙고, 00:30 에 시작했다면 그때는 이미 새 날이므로 그날에 붙는다.

---

## 2. 홈서버에서 돌리기

`docker-compose.yaml` 파일 하나만 있으면 된다. 소스를 받을 필요도, 빌드할 필요도 없다.

```bash
docker compose up -d
```

`ghcr.io/junbeom-cho/studywatch:latest` 를 받아서 띄운다. 갱신도 같은 명령이다 — `pull_policy: always` 라 매번 새 이미지를 확인한다.

- 브라우저는 **Chrome 또는 Edge** 로 연다. PIP 가 Document Picture-in-Picture API 를 쓴다.
- 폰에서 쓰려면 Tailscale 같은 사설망으로 붙는다. **알림과 클립보드 복사는 HTTPS 를 요구**하므로 `http://192.168.x.x` 로 접속하면 그 두 기능이 동작하지 않는다.
- 데이터는 `./data/studywatch.db` 하나뿐이다. 백업은 이 파일 복사로 끝난다.
- 학습일이 로컬 시간 기준이므로 compose 의 `TZ` 를 지역에 맞춘다 (기본 `Asia/Seoul`).

`main` 에 push 하면 [`.github/workflows/publish.yaml`](.github/workflows/publish.yaml) 이 이미지를 다시 올린다. 올리기 전에 `npm run check` 를 돌려 깨진 `latest` 가 홈서버로 내려가지 않게 막는다.

---

## 3. 개발

```bash
npm install
npm run dev
```

**브라우저는 5173 으로 연다.** API 는 3000 에서 돌고 Vite 가 `/api` 를 그쪽으로 넘긴다.

| 목적 | 커맨드 |
|---|---|
| 포맷 + 타입 + 테스트 | `npm run check` |
| 테스트만 | `npm test` |
| 컨테이너로 띄워 확인 | `docker compose -f docker-compose.yaml -f docker-compose.build.yaml up -d --build` |

전체 커맨드 표는 [`AGENTS.md`](AGENTS.md) §3 에 있다.

### 구조

```
studywatch/
├─ docs/PRD.md    # 요구사항
├─ shared/        # 서버·클라이언트가 함께 쓰는 타입과 시간 계산
├─ server/        # Hono API + SQLite
├─ client/        # React + Vite. face.ts 가 캔버스 그리기
└─ data/          # SQLite 파일 (커밋하지 않는다)
```

`shared/time.ts` 는 서버와 클라이언트가 **같은 함수**를 쓴다. 여기가 어긋나면 화면에 보이는 시간과 기록된 시간이 달라진다.

표시면을 `<canvas>` 하나로 그리는 것도 의도된 선택이다. 스크린샷과 PIP 가 같은 `drawFace()` 를 재사용하므로 별도 캡처 라이브러리가 필요 없다.

### 최초 1회 셋업

커밋 훅은 `.git/` 안에 설치되어 커밋에 따라오지 않는다. **클론한 레포마다 한 번씩** 필요하다.

```bash
uv tool install pre-commit
pre-commit install
```

`gitleaks` 는 Go 훅이라 첫 실행에서 툴체인을 내려받는다. 몇 분 걸려도 멈춘 것이 아니다.

---

## 4. 막히면

**커밋할 때 훅이 `WinError 4551` 로 죽는다**

Windows 앱 제어 정책이 pre-commit 캐시의 실행 파일을 막은 것이다. `--no-verify` 로 우회하지 않는다 — 한 번 우회하면 `gitleaks` 까지 함께 꺼진다. 캐시를 다시 만들면 경로가 바뀌면서 풀린다.

```bash
pre-commit clean && pre-commit install-hooks
```

훅 환경을 처음부터 다시 받으므로 네트워크가 필요하다. `shellcheck` 는 GitHub 릴리스에서 바이너리를 내려받는데 그 경로가 막히면 설치가 실패하고, 그러면 셸 스크립트가 없어도 모든 커밋이 막힌다. PyPI 에는 바이너리가 포함된 빌드본이 있으므로, 해당 훅의 가상환경(`~/.cache/pre-commit/repo*/py_env-python3`)에 그것을 직접 넣어 되살릴 수 있다.

**폰에서 알림이 안 온다**

`http://` 로 접속했을 가능성이 크다. Notification API 는 secure context 를 요구한다. `localhost` 는 예외지만 사설 IP 는 아니다. Tailscale 로 붙으면 HTTPS 가 함께 온다.

**이미지 빌드가 `npm ci` 에서 죽는다**

`better-sqlite3` 는 네이티브 모듈이다. 프리빌드 내려받기가 막히면 소스 컴파일로 넘어가므로 빌드 단계에 `python3 make g++` 가 있어야 한다. `Dockerfile` 의 의존성 단계가 이 역할을 한다.
