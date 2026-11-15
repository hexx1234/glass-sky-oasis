# GLASS SKY OASIS — 공식 홈페이지

창작 세계관 **글래스 스카이 오아시스**의 국가·기업 공식 홈페이지입니다. 확정한 메인 와이어프레임을 기반으로 구현했습니다.

## 현재 구현된 기능

- HOME: 메인 히어로, 바로가기 4개, 국가·기업 소개, 사업 소개, BUBBLE ZONE, 참가자, 뉴스·미디어
- OUR WORLD: 국가 개요, 시스템 탄생 배경, 버블·클래스 구조, 세 종족
- BUSINESS: Bubble Energy, Citizen Service, Media & Broadcast (Infrastructure 없음)
- BUBBLE ZONE: 참가 규칙, 참가자 연결
- PARTICIPANTS: 검색, 종족 필터, 각 참가자 상세 프로필/스킬/관계/작품
- ARCHIVE: 커미션·직접 그린 그림·팬아트, 이미지 확대, 작가 크레딧, 보도자료
- `/admin.html`: 비밀번호 로그인, 텍스트 편집, 캐릭터·작품·뉴스 추가/수정/삭제, 이미지 파일 업로드
- GitHub JSON 저장 + GitHub Contents API로 이미지 저장. **토큰은 브라우저에 노출하지 않습니다.**

> **중요:** 새 사이트입니다. 기존 Solar_Archive 저장소는 변경하지 않았습니다. 새 저장소를 추천합니다.

## 사이트 파일 확인 (로그인 없이)

`public` 폴더를 로컬 정적 서버로 열어 화면을 확인할 수 있습니다.

```bash
cd public
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 열면 기본 데이터가 표시됩니다. 이 모드에서는 관리자 저장이 동작하지 않습니다.

## 실제 배포: GitHub + Cloudflare Workers

### 1. GitHub 저장소 만들기

1. GitHub에서 새로운 **Public** 저장소를 만듭니다. 예: `Glass_Sky_Oasis`.
2. 이 프로젝트의 **안쪽 파일과 폴더 전체** (`public`, `src`, `wrangler.jsonc`, `package.json` 등)를 새 저장소 최상위에 업로드합니다.
3. 기본 브랜치를 `main`으로 설정합니다.

이미지와 텍스트가 GitHub에 저장되므로, 캐릭터/세계관/이미지 공개 범위를 고려하세요. **공개하면 안 되는 비밀 설정은 올리지 않는 게 안전합니다.**

### 2. Cloudflare Workers 연결

1. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **GitHub**.
2. 방금 만든 저장소를 선택합니다.
3. Worker 이름을 `glass-sky-oasis`로 설정합니다. (`wrangler.jsonc`의 `name`과 일치해야 합니다.)
4. 빌드 명령 `npm run deploy` 및 필요하다면 의존성 설치 `npm install`을 사용합니다. (Cloudflare UI의 Workers Builds 기본 배포 설정은 계정/연동 방식마다 표시가 다를 수 있습니다.)
5. **Save and Deploy**로 첫 배포를 완료합니다.

Cloudflare의 공식 Git 연동은 `main`에 새 커밋이 올라오면 배포를 자동으로 실행할 수 있습니다.

### 3. Worker 변수와 비밀 값 설정

Cloudflare Dashboard → 배포한 Worker → **Settings → Variables and Secrets**에서 아래 항목을 등록합니다.

**일반 변수(Variables)**

| 이름 | 값 예시 |
| --- | --- |
| `GITHUB_OWNER` | GitHub 사용자명 (예: `hexx1234`) |
| `GITHUB_REPO` | 새 저장소 이름 (예: `Glass_Sky_Oasis`) |
| `GITHUB_BRANCH` | `main` |

> GitHub 관련 설정은 저장소 코드가 아니라 Worker 환경 변수에서 관리합니다. 저장소 파일에 토큰을 저장하지 마세요.

**Secrets — 비공개 값**

| 이름 | 내용 |
| --- | --- |
| `GITHUB_TOKEN` | 해당 저장소에만 접근 가능한 fine-grained GitHub PAT |
| `ADMIN_PASSWORD` | 관리자 로그인에 사용할 충분히 긴 비밀번호(권장: 무작위 24자 이상) |
| `SESSION_SECRET` | 세션 인증 서명용 무작위 문자열(권장: 32자 이상) |

#### GitHub 토큰 생성

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.

- Resource owner: 본인 계정
- Repository access: **Only select repositories** → 이 새 저장소만 선택
- Repository permissions: **Contents → Read and write**
- 만료일 설정, 발급 후 토큰 복사

**토큰을 HTML/JS/JSON, 코드 저장소, 채팅에 절대 붙여넣지 마세요.** Cloudflare의 `Secret` 입력란에만 등록하세요. 기존에 만든 토큰을 재사용하더라도 이 새 저장소에 권한이 포함돼 있는지 확인해야 합니다.

### 4. 관리자 페이지 사용

배포된 주소 뒤에 `/admin.html`을 붙여 열어주세요. 예: `https://glass-sky-oasis.<계정>.workers.dev/admin.html`.

1. 관리자 비밀번호로 로그인.
2. 메인 내용 / 세계관 / 캐릭터 / 일러스트·커미션 / 뉴스 메뉴에서 편집.
3. 이미지는 파일을 선택하면 GitHub의 `public/uploads/` 폴더에 바로 커밋됩니다. (JPG/PNG/WEBP/GIF, 파일당 최대 8MB)
4. 글과 이미지 연결을 확정하려면 **변경사항 저장** 클릭.
5. 공개 사이트에서 새로고침하면 GitHub의 최신 JSON 데이터를 읽습니다.

GitHub 커밋이 발생할 때마다 Cloudflare 자동 배포도 실행될 수 있습니다. 배포가 진행 중이어도 공개 데이터 API는 GitHub의 최신 내용을 직접 읽도록 만들었습니다.

## 비용과 한계

- 이 코드는 추가 유료 저장 서비스를 요구하지 않습니다. GitHub와 Cloudflare의 **무료 플랜 한도 내에서** 운영할 수 있게 작성했습니다.
- 무료 사용량 제한, GitHub 저장소 용량/트래픽 제한, GitHub API 호출 제한이 있을 수 있습니다. 사용량이 커지면 별도 저장소를 검토해야 합니다.
- 이미지가 많아지면 GitHub Git 기록까지 저장 공간이 누적됩니다. 큰 커미션 파일은 웹용 이미지로 최적화하는 것을 권장합니다.
- 개인/취미용 초기 버전입니다. 방문자가 많거나 관리자 계정이 여러 명인 운영에는 추가 보안·요청 제한이 필요합니다.
- 실시간 경기 결과, 순위, 계급 등은 설정 문서에 확정값이 없어서 **임의의 데이터로 생성하지 않았습니다**.

## 기술 구조

```text
public/
  index.html       공개 사이트
  admin.html       관리자 페이지
  app.js           공개 사이트 화면/검색/갤러리
  admin.js         편집·이미지 업로드 화면
  styles.css       공통 스타일 / 반응형
  admin.css        관리자 스타일
  data/site.json   세계관, 캐릭터, 커미션, 뉴스 데이터
  uploads/         관리자 업로드 후 GitHub에 생성
src/worker.js      비공개 서버 API, GitHub 저장, 관리자 인증
wrangler.jsonc     Cloudflare Workers 배포 설정
```

프로젝트에는 토큰, 로그인 비밀번호, 실제 커미션 그림을 포함하지 않았습니다. 메인 이미지와 캐릭터 이미지 영역은 업로드를 기다리는 플레이스홀더입니다.
