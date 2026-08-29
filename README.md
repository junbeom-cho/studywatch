# 공통 프로젝트 템플릿

새 프로젝트를 시작할 때마다 반복되는 것들(문서 골격, AI 에이전트 규칙, 커밋 전 검사)을 미리 담아 둔 GitHub 템플릿 레포지토리다.

새 프로젝트 생성은 [2. 새 프로젝트 시작하기](#2-새-프로젝트-시작하기), pre-commit 설치는 [3. pre-commit 설치](#3-pre-commit-설치)를 보면 된다.

---

## 1. 이 레포지토리는 무엇인가

프로젝트를 새로 팔 때마다 같은 일을 반복하게 된다. 요구사항 정리할 문서를 다시 만들고, 에이전트에게 줄 규칙 파일을 다시 쓰고, API 키가 커밋되지 않도록 훅을 다시 붙인다. 이 레포지토리는 그 반복되는 부분만 모아 둔 껍데기다. 언어·프레임워크에 종속된 설정은 일부러 넣지 않았으므로 어떤 스택으로든 여기서 출발할 수 있다.

의도적으로 작게 유지한다. "있으면 좋을 것"이 아니라 "매번 실제로 쓰는 것"만 남긴다.

### 구성

| 파일 | 역할 | 왜 여기 있는가 |
|---|---|---|
| `.gitignore` | 공통 무시 항목 | 비밀정보·OS/에디터 부산물·로그 등 어떤 프로젝트에서도 커밋하지 않는 것만 담았다. 언어별 항목은 파일 하단 '프로젝트별 추가 구간'에 덧붙인다. |
| `.gitattributes` | 줄바꿈 정규화 | 커밋과 워크트리를 모두 LF로 고정한다. 없으면 워크트리가 머신의 `core.autocrlf`에 좌우되고, CRLF로 체크아웃된 `.sh`는 shellcheck 훅에 막히거나 리눅스/WSL에서 `bad interpreter: ^M`으로 죽는다. `.bat`/`.cmd`/`.ps1`만 CRLF로 예외 처리한다. |
| `.pre-commit-config.yaml` | 커밋 전 자동 검사 정의 | 키 유출·대용량 파일·깨진 YAML은 커밋된 뒤에 찾으면 늦다. 커밋 시점에 막는다. 상세는 [4. 설정된 훅](#4-설정된-훅). |
| `AGENTS.md` | AI 코딩 에이전트 규칙의 **단일 원본** | 사람과 에이전트가 같은 파일에서 규칙을 읽게 한다. 8개 절의 빈 골격이 들어 있다. 특히 §3 커맨드 표는 채워 두지 않으면 에이전트가 빌드·테스트 명령을 추측해서 실행한다. |
| `CLAUDE.md` | Claude Code용 진입점 | `@AGENTS.md` 한 줄. 세션 시작 시 `AGENTS.md` 본문이 이 자리에 삽입된다. |
| `GEMINI.md` | Gemini CLI용 진입점 | 위와 동일. Gemini CLI도 같은 `@` 임포트 문법을 쓴다. |
| `docs/PRD.md` | 요구사항 정리 양식 | 한 줄 요약 / 왜 만드는가 / **비목표** / 기능 요구사항 / 기술 / 미해결 질문, 6개 절. 주말에 끝날 스크립트면 세 절만 남기고 지워도 된다. |

### AGENTS.md 간접 참조 패턴

에이전트마다 읽는 파일 이름이 다르다(Claude Code는 `CLAUDE.md`, Gemini CLI는 `GEMINI.md`). 각 파일에 규칙을 복사해 두면 하나만 고쳐도 나머지가 그대로 남아 서로 어긋난다. 그래서 **규칙 본문은 `AGENTS.md` 한 곳에만 두고, 나머지 파일은 그것을 가리키는 한 줄만** 갖는다. 규칙 수정은 `AGENTS.md`에서만 하면 되고, 새 에이전트가 등장하면 한 줄짜리 파일을 하나 더 만들면 된다.

가리키기만 하지 않고 `@`로 본문을 끌어온다는 점이 중요하다. "읽어라"는 부탁은 건너뛸 수 있고, 특히 `/compact` 뒤에는 그 한 줄만 다시 주입되어 규칙 본문이 컨텍스트에서 사라진다. 하필 긴 세션 후반, 에이전트가 커밋하려는 시점이다. 심볼릭 링크로 합치는 방법은 쓰지 않는다 — Windows에서 `core.symlinks=false`면 파일 이름만 적힌 텍스트 파일로 체크아웃되어 지침이 통째로 없어진다.

---

## 2. 새 프로젝트 시작하기

### (A) GitHub 템플릿으로 생성

> **최초 1회 설정** — 이 레포지토리의 **Settings → General → Template repository** 를 체크해야 아래 두 방법이 동작한다. 체크하지 않으면 웹에 **Use this template** 버튼이 나타나지 않고 `gh repo create --template`도 실패한다.

GitHub 웹에서 **Use this template → Create a new repository**를 누르는 것이 가장 간단하다.

`gh`로 처리하려면 먼저 설치하고(`scoop install gh` 또는 `winget install --id GitHub.cli`) 인증한다.

```bash
gh auth login
```

인증이 끝나면 다음 한 줄로 생성과 클론이 함께 처리된다 (PowerShell / Git Bash 공통).

```bash
gh repo create my-new-project --template junbeom-cho/common-template --private --clone
```

템플릿으로 만든 레포지토리에는 이 템플릿의 커밋 이력이 승계되지 않으므로 별도 정리가 필요 없다.

### (B) 클론해서 이력 없이 시작하기

GitHub에 올리지 않거나 다른 곳에 둘 프로젝트는 `.git`을 지우고 새로 시작한다.

```bash
git clone --depth 1 https://github.com/junbeom-cho/common-template.git my-new-project
cd my-new-project
```

이력을 지우는 명령만 셸에 따라 다르다.

**PowerShell**

```powershell
Remove-Item -Recurse -Force .git
```

**Git Bash**

```bash
rm -rf .git
```

여기서부터는 셸과 관계없이 같다. `pre-commit install`은 [3. pre-commit 설치](#3-pre-commit-설치)의 도구 설치를 먼저 끝낸 뒤 실행한다.

```bash
git init -b main
pre-commit install
git add .
git commit -m "chore: initialize from common-template"
```

### 새 프로젝트 시작 체크리스트

- [ ] 레포지토리 생성 (Use this template 또는 클론 후 `.git` 제거)
- [ ] pre-commit 설치 및 훅 등록 — `.git/hooks/pre-commit` 파일이 생겼는지 확인
- [ ] `pre-commit run --all-files` 1회 실행 후 그 결과를 별도 커밋으로 정리
- [ ] `AGENTS.md` 채우기 — 스택, 디렉터리 구조, 빌드·테스트 명령
- [ ] `docs/PRD.md` 작성 — 안 쓸 절은 지운다. 빈 양식을 남겨 두지 않는다
- [ ] `.gitignore` 하단 '프로젝트별 추가 구간'에 스택별 항목 추가 (`dist/`, `build/`, `target/` 등)
- [ ] `README.md`를 프로젝트 내용으로 교체 (이 파일은 템플릿 설명이므로 남겨 두지 않는다)

---

## 3. pre-commit 설치

pre-commit은 커밋 직전에 검사를 자동 실행하는 도구다. 이 레포지토리에는 설정 파일만 들어 있고, 도구 자체와 훅 등록은 **각자의 로컬 환경에서 한 번씩** 해야 한다. 클론만 해서는 동작하지 않는다.

### 3.1 도구 설치

`uv`가 있다면 이 방법을 권장한다. 프로젝트 가상환경을 건드리지 않고 전역 CLI로 설치되어 모든 프로젝트에서 재사용된다.

```bash
uv tool install pre-commit
```

설치 후 PATH가 잡히지 않으면 다음을 한 번 실행하고 셸을 새로 연다.

```bash
uv tool update-shell
```

대안으로 `pipx install pre-commit`(격리 설치), `pip install pre-commit`(현재 파이썬 환경에 설치)도 가능하다. 여러 프로젝트에서 공용으로 쓰는 도구이므로 `pip`보다는 `uv tool` 또는 `pipx`가 낫다.

```bash
pre-commit --version
```

### 3.2 훅 등록

레포지토리 루트에서 실행한다. `.git/hooks/pre-commit`이 생성되며, 이후 `git commit`마다 검사가 자동으로 돌아간다.

```bash
pre-commit install
```

git 훅은 `.git/` 안에 설치되므로 **클론한 레포지토리마다 한 번씩** 필요하다. 커밋 이력에 따라오지 않는다는 뜻이다. 이 단계를 건너뛰면 설정 파일만 있고 아무것도 검사되지 않는 상태가 된다.

훅 환경은 첫 실행 시점에 만들어진다. 특히 `gitleaks`는 Go 훅이라 Go가 없으면 pre-commit이 Go 툴체인을 자동으로 내려받아 빌드한다. 따라서 첫 실행은 네트워크가 필요하고 수 분이 걸릴 수 있다(멈춘 것이 아니다). 캐시는 `~/.cache/pre-commit`에 남아 다음부터는 빠르다.

### 3.3 전체 파일 1회 검사

```bash
pre-commit run --all-files
```

훅은 기본적으로 **스테이징된 파일만** 검사한다. 갓 만든 레포지토리는 기존 파일이 한 번도 검사되지 않은 상태이고, 그 파일을 건드리기 전까지 문제가 드러나지 않는다. 초기에 한 번 전체를 돌려 두면 개행 누락과 후행 공백이 여기서 한 번에 정리되고, 이후 커밋의 diff에 무관한 포맷 변경이 섞이지 않는다.

자동 수정하는 훅은 파일을 고친 뒤 실패로 끝난다. 고쳐 놓은 내용을 확인하고 `git add`로 다시 스테이징한 다음 커밋하면 된다.

### 3.4 훅 버전 갱신

```bash
pre-commit autoupdate
```

`.pre-commit-config.yaml`의 각 `rev`를 최신 태그로 올린다. 커밋할 때마다 할 일은 아니고, 프로젝트 착수 시점과 이후 가끔 한 번이면 충분하다. 갱신 후에는 `pre-commit run --all-files`로 새 버전에서도 통과하는지 확인하고 커밋한다.

---

## 4. 설정된 훅

| 훅 | 하는 일 |
|---|---|
| `gitleaks` | API 키·토큰·비밀번호 등 시크릿 패턴을 탐지해 커밋을 막는다. 공개 레포에 키를 올리는 사고를 막는 1차 방어선이다. |
| `detect-private-key` | 스테이징된 파일의 *내용*에서 개인키 블록(`-----BEGIN ... PRIVATE KEY-----`)을 찾아 커밋을 막는다. 파일 이름이 아니라 내용을 본다. |
| `check-added-large-files` | 새로 추가되는 대용량 파일(기본 500KB 초과)을 막는다. 빌드 산출물이나 데이터 파일의 실수 커밋을 방지한다. |
| `end-of-file-fixer` | 파일이 개행 하나로 끝나도록 맞춘다 (자동 수정). |
| `trailing-whitespace` | 줄 끝 공백을 제거한다 (자동 수정). |
| `check-yaml` | YAML 문법을 파싱해 검증한다. |
| `check-toml` | TOML 문법을 검증한다 (`pyproject.toml` 등). |
| `shellcheck` | 셸 스크립트 정적 분석. 인용 누락, 미정의 변수 등 실행해 봐야 터지는 문제를 잡는다. |

훅을 추가·제거하려면 `.pre-commit-config.yaml`을 편집한다. 언어별 포매터·린터(`ruff`, `prettier` 등)는 스택이 정해진 뒤 프로젝트에서 추가한다.

### 검사 건너뛰기

```bash
git commit --no-verify -m "wip: 임시 커밋"
```

훅을 전부 건너뛴다. 급하게 WIP를 남겨야 하거나 훅 자체가 오작동할 때만 쓴다. 특히 `gitleaks`와 `detect-private-key`를 우회한 커밋은 이력에 남고 되돌리기 번거롭다. 이미 올렸다면 히스토리를 정리하는 것보다 **해당 키를 폐기하고 새로 발급받는 게 먼저다.**

오탐이라면 우회하지 말고 예외를 정의한다. gitleaks가 출력한 `Fingerprint:` 값을 그대로 레포지토리 루트의 `.gitleaksignore`에 한 줄씩 추가하면 그 위치만 무시된다.

```bash
echo "docs/PRD.md:generic-api-key:42" >> .gitleaksignore
```

특정 훅만 건너뛰려면 `SKIP` 환경변수를 쓴다.

**Git Bash** — 해당 명령에만 적용되어 뒷정리가 필요 없다.

```bash
SKIP=shellcheck git commit -m "fix: 경로 처리 수정"
```

**PowerShell** — `$env:SKIP`은 셸 세션에 계속 남으므로 커밋 직후 지운다.

```powershell
$env:SKIP = "shellcheck"; git commit -m "fix: 경로 처리 수정"; Remove-Item Env:SKIP
```
