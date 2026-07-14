# TODO

## Local-first MVP

사용자가 로컬에서 Diagram JSON을 만들고 다시 수정한 뒤, 정적 호스팅을 통해 자신의
블로그나 홈페이지에 임베드할 수 있는 상태를 첫 번째 사용 가능 버전의 기준으로 삼는다.

### 1. Run the editor locally

- [ ] 저장소를 처음 받은 사용자를 위한 `README.md` 작성
- [ ] Node.js 버전, `npm install`, `npm run dev` 실행 절차 문서화
- [x] 샘플 없이 빈 다이어그램으로 시작하는 `New diagram` 기능 추가
- [ ] 로컬 에디터와 샘플 데모의 진입 경로 분리
- [ ] 최초 실행부터 에디터 진입까지의 smoke test 추가

완료 조건: 새 사용자가 README만 보고 로컬 에디터를 실행하고 빈 다이어그램을 만들 수 있다.

### 2. Open, save, and edit Diagram JSON files

- [x] `.diagram.json` 파일을 선택해 여는 `Open` 기능 추가
- [x] 파일을 열 때 Diagram JSON Schema 검증 및 읽을 수 있는 오류 메시지 제공
- [x] 현재 문서를 새 `.diagram.json` 파일로 저장하는 `Save as` 기능 추가
- [ ] File System Access API를 지원하는 브라우저에서 원본 파일에 저장하는 `Save` 기능 추가
- [x] File System Access API를 지원하지 않는 브라우저를 위한 업로드/다운로드 fallback 추가
- [x] 새 문서, 열린 파일명, 수정 여부(dirty state)를 에디터 상단에 표시
- [x] 앱 내 이동 중 dirty 문서를 유지하고 페이지 종료 경고 추가
- [ ] `schemaVersion`이 다른 파일을 위한 호환성 오류와 향후 migration 진입점 정의
- [x] 생성 -> 저장 -> 다시 열기 -> 수정 -> 재저장 round-trip 테스트 추가

완료 조건: 사용자가 로컬 파일을 유일한 원본으로 사용하면서 브라우저를 닫은 뒤에도 같은
파일을 다시 열어 편집을 계속할 수 있다.

### 3. Embed a diagram in a website

- [ ] 읽기 전용 iframe viewer의 입력 계약 정의 (`src` Diagram JSON URL, scene, theme 등)
- [ ] iframe viewer를 독립적인 정적 빌드 결과물로 생성
- [ ] 호스팅된 `.diagram.json` 파일을 iframe viewer에서 불러오는 기능 추가
- [ ] iframe 크기 변경에 대응하는 responsive rendering 검증
- [ ] 잘못된 URL, Schema 오류, CORS 오류에 대한 viewer 오류 화면 추가
- [ ] 버전을 고정할 수 있는 embed runtime 배포 및 버저닝 방식 결정
- [ ] `examples/embed/`에 복사해서 실행할 수 있는 HTML 예제 추가
- [ ] `docs/embedding.md`에 iframe snippet과 적용 절차 작성
- [ ] GitHub Pages, 정적 호스팅, 기존 블로그에서 JSON과 viewer를 배포하는 방법 문서화
- [ ] CORS, CSP, 접근성, runtime 버전 고정에 대한 주의사항 문서화
- [ ] 별도 페이지에 삽입된 iframe을 검증하는 integration test 추가

완료 조건: 사용자가 Diagram JSON과 정적 viewer를 호스팅하고, 문서의 iframe snippet만으로
자신의 블로그나 홈페이지에 읽기 전용 다이어그램을 표시할 수 있다.

### 4. Provide an LLM skill

Diagram JSON을 생성하고 수정하는 공개 LLM 스킬은 Schema와 함께 변경하고 검증할 수 있도록
이 저장소의 `skills/diaflow/`에서 관리한다. 스킬은 특정 AI 서비스나 인증 정보에
의존하지 않고, 로컬 파일과 공개된 Schema만으로 사용할 수 있어야 한다.

- [ ] 스킬의 책임을 Diagram JSON 생성, 수정, 설명, 검증으로 제한
- [ ] `skills/diaflow/SKILL.md`에 실행 절차와 출력 규칙 작성
- [ ] LLM이 SVG, HTML, Canvas 대신 Diagram JSON만 생성하도록 명시
- [ ] 현재 `schemaVersion`과 지원하는 node, edge, marker, animation, scene 목록 문서화
- [ ] 작은 시스템 구성도와 scene 기반 구성도를 위한 예제 요청 및 기대 결과 추가
- [ ] 기존 Diagram JSON을 부분 수정할 때 ID와 참조 관계를 보존하는 규칙 작성
- [ ] 생성 결과를 `@interactive-diagram/schema`로 검증하는 로컬 validation script 추가
- [ ] Schema 변경 시 스킬 문서와 예제를 함께 갱신하도록 체크리스트 추가
- [ ] 스킬 예제 출력에 대한 Schema validation test 추가
- [ ] 저장소에서 스킬을 설치하거나 참조하는 방법을 `README.md`에 문서화
- [ ] 스킬 버전과 호환되는 Diagram `schemaVersion`을 명시하는 정책 정의
- [ ] Codex 외 LLM에서도 재사용할 수 있도록 핵심 지침과 도구별 설치 지침 분리

완료 조건: LLM이 자연어 요청과 기존 Diagram JSON을 입력받아, 현재 Schema를 통과하고 로컬
에디터에서 바로 열 수 있는 `.diagram.json` 파일을 일관되게 생성하거나 수정할 수 있다.

## Editor backlog

- [x] viewport 이동 및 node drag 중 node edit popup 숨기기
- [x] edge 수정하기
- [x] edge 타입 여러개 만들기
- [ ] dataflow 만들기
- [ ] group 지정하기
- [x] Shift로 node 다중 선택 및 선택 그룹 이동
- [ ] scene 생성하기
