# StudyWatch

> 더 이상 관리하지 않는 저장소입니다.

인프런 작심삼일 챌린지 인증용 스톱워치. 인증 스크린샷 한 장에 **누가 · 무슨 강의를 · 언제 · 얼마나** 가 담기게 한다.

요구사항은 [`docs/PRD.md`](docs/PRD.md) 에 있다.

## 기능

닉네임 · 강의명 · 강사명 · 오늘 날짜 · 경과 시간 · 이번 달 달력 · 연속 일수를 캔버스 한 장에 그린다.

- **스톱워치** — 시작 · 일시정지 · 기록 · 버리기, 스크린샷, PIP, 알림
- **달력** — 날짜별 기록 목록과 그날 찍은 스크린샷
- **설정** — 닉네임 · 강의 · 알림 · 배경 이미지 · 다크/라이트

설계에서 중요한 두 가지:

- **경과 시간의 소유자는 서버다.** PC 에서 시작한 세션을 폰에서 이어 볼 수 있고, 탭이 닫혀도 기록이 남는다.
- **학습일은 세션을 시작한 날이다.** 자정을 넘겨도 세션을 쪼개지 않는다.

## 실행

Node 22 이상이 필요하다.

```bash
npm install
npm run dev     # API 3000 + Vite 5173. 브라우저는 5173 으로 연다
npm run check   # 포맷 + 타입 + 테스트
```

컨테이너로 띄우려면:

```bash
docker build -t studywatch .
docker run -d -p 3000:3000 -e TZ=Asia/Seoul -v "$PWD/data:/data" studywatch
```

- 데이터는 `data/studywatch.db` 하나뿐이다.
- PIP 는 Document Picture-in-Picture API 를 쓰므로 Chrome 또는 Edge 가 필요하다.
- 알림과 클립보드 복사는 HTTPS(또는 localhost)에서만 동작한다.

## 구조

```
studywatch/
├─ docs/PRD.md    # 요구사항
├─ shared/        # 서버·클라이언트가 함께 쓰는 타입과 시간 계산 (time.ts)
├─ server/        # Hono API + SQLite
└─ client/        # React + Vite. face.ts 가 캔버스 그리기
```

## 라이선스

[MIT](LICENSE)
