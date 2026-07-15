# TODO

## Local-first MVP

사용자가 로컬에서 Diagram JSON을 만들고 다시 수정한 뒤, 정적 호스팅을 통해 자신의
블로그나 홈페이지에 임베드할 수 있는 상태를 첫 번째 사용 가능 버전의 기준으로 삼는다.

### Current priorities

High priority

1. LLM 스킬의 생성·수정 예제와 Schema validation 회귀 테스트를 추가한다.
2. 지원하지 않는 `schemaVersion` 오류와 향후 migration 진입점을 정의한다.
3. 에디터에서 edge를 생성하고 삭제할 수 있게 한다.

Medium priority

4. 생략 가능한 기본값과 저장 형태를 통일하는 canonical Diagram JSON 규칙을 정의한다.
5. collection 내부 중복과 scene override 중복을 포함해 무결성 검증을 강화한다.
6. AI와 사용자가 선택할 수 있는 icon과 color vocabulary를 명확히 한다.
7. File System Access API를 지원하는 브라우저에 직접 `Save` 기능을 제공한다.

Product expansion

8. 로컬 에디터와 샘플 gallery의 진입점을 분리한다.
9. scene 생성·수정 UI를 추가한다.
10. group 생성·수정 UI를 추가한다.
11. 독립적인 iframe viewer와 embed 입력 계약을 구현한다.
12. embed integration test와 runtime 배포 버저닝을 마련한다.

### 1. Run the editor locally

- [x] 저장소를 처음 받은 사용자를 위한 `README.md` 작성
- [x] Node.js 버전, `npm install`, `npm run dev` 실행 절차 문서화
- [x] 공개 기여와 재사용을 위한 MIT `LICENSE` 선택 및 추가
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

### 3. Harden the Diagram JSON contract

- [x] Diagram JSON `schemaVersion: "0.2"` 정의
- [x] group membership을 `Group.nodeIds`에서만 관리
- [x] animation membership을 `Animation.edgeIds`에서만 관리
- [x] 구조 객체에 strict 검증을 적용하고 `data`, `payload`만 확장 지점으로 허용
- [x] entity ID 중복과 node, port, edge, animation, group, scene 참조 무결성 검증
- [ ] 지원하지 않는 `schemaVersion`을 일반 Schema 오류와 구분해 표시
- [ ] 향후 버전 변경을 위한 migration 함수의 입력·출력 계약과 진입점 정의
- [ ] `direction`, `routing`, `line`, `loop` 등 생략 가능한 기본값의 저장 정책 결정
- [ ] AI와 에디터가 동일한 형태로 저장할 수 있는 canonical normalizer 제공
- [ ] `Group.nodeIds`, `Animation.edgeIds`, scene override 내부 중복 검증
- [ ] 하나의 node가 여러 group에 포함될 수 있는지 정책 결정 및 검증
- [ ] runtime icon preset과 임의 icon 문자열의 허용 범위 정의
- [ ] edge color, theme accent와 CSS color의 허용 범위 및 preset 계약 정의

완료 조건: 사람이 작성하거나 AI가 생성한 동일한 의미의 Diagram JSON이 일관된 형태로
저장되고, 버전과 참조 오류를 수정 가능한 메시지로 구분해 제공한다.

### 4. Embed a diagram in a website

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

### 5. Provide an LLM skill

Diagram JSON을 생성하고 수정하는 공개 LLM 스킬은 Schema와 함께 변경하고 검증할 수 있도록
이 저장소의 `skills/create-diagram/`과 `skills/update-diagram/`에서 관리한다. 스킬은 특정 AI 서비스나 인증 정보에
의존하지 않고, 로컬 파일과 공개된 Schema만으로 사용할 수 있어야 한다.

- [x] 스킬의 책임을 Diagram JSON 생성, 수정, 설명, 검증으로 제한
- [x] `create-diagram`, `update-diagram` 스킬에 실행 절차와 출력 규칙 작성
- [x] LLM이 SVG, HTML, Canvas 대신 Diagram JSON만 생성하도록 명시
- [x] 현재 `schemaVersion`과 지원하는 node, edge, marker, animation, scene 계약 참조
- [ ] 작은 시스템 구성도를 생성하는 예제 요청과 기대 `.diagram.json` 결과 추가
- [ ] Circuit Breaker와 같은 scene 기반 구성도의 예제 요청과 기대 결과 추가
- [ ] 기존 Diagram JSON의 label, node, edge, scene을 부분 수정하는 예제 추가
- [x] 기존 Diagram JSON을 부분 수정할 때 ID와 참조 관계를 보존하는 규칙 작성
- [x] 생성 및 수정 결과를 `@interactive-diagram/schema`로 검증하는 로컬 명령 연결
- [x] path, filename, title, 자연어 요청으로 수정 대상 파일을 찾는 resolver 추가
- [ ] Schema 변경 시 스킬 문서와 예제를 함께 갱신하도록 체크리스트 추가
- [ ] create skill 예제 출력에 대한 Schema validation test 추가
- [ ] update skill 예제의 ID 보존과 참조 무결성 회귀 테스트 추가
- [x] 저장소에서 스킬을 설치하거나 참조하는 방법을 `README.md`에 문서화
- [x] 스킬 버전과 호환되는 Diagram `schemaVersion`을 명시하는 정책 정의
- [ ] Codex 외 LLM에서도 재사용할 수 있도록 핵심 지침과 도구별 설치 지침 분리

완료 조건: LLM이 자연어 요청과 기존 Diagram JSON을 입력받아, 현재 Schema를 통과하고 로컬
에디터에서 바로 열 수 있는 `.diagram.json` 파일을 일관되게 생성하거나 수정할 수 있다.

## Editor backlog

- [x] node 생성 및 삭제, 연결된 edge 연쇄 삭제
- [ ] edge 생성 및 삭제
- [ ] node에서 연결을 시작하고 target node 또는 port를 선택하는 edge 생성 UI 정의
- [ ] edge 삭제 시 animation과 scene edge override의 참조를 함께 정리
- [x] viewport 이동 및 node drag 중 node edit popup 숨기기
- [x] edge 수정하기
- [x] edge 타입 여러개 만들기
- [ ] dataflow 만들기
- [ ] group 생성, node membership 지정, 수정 및 삭제
- [x] Shift로 node 다중 선택 및 선택 그룹 이동
- [ ] scene 생성, 순서 변경, 수정 및 삭제
