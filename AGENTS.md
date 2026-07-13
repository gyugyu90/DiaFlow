# AGENTS.md

# AI Interactive Diagram Platform

> Generate with AI. Refine visually. Animate the flow. Embed anywhere.

---

# 1. 프로젝트 개요

이 프로젝트는 AI를 활용하여 다양한 다이어그램을 생성하고,
사용자가 이를 시각적으로 수정한 뒤,
인터랙티브한 형태로 웹에 배포할 수 있는 플랫폼을 만드는 것을 목표로 한다.

이 저장소는 누구나 로컬에서 실행하고 수정하며 직접 호스팅할 수 있는
오픈소스 프로젝트로 개발한다.

우리의 목표는 단순히 다이어그램을 그리는 것이 아니다.

우리는

"웹에서 살아 움직이는 다이어그램 플랫폼"

을 만든다.

---

# 2. 제품 비전

기존의 다이어그램은 대부분 다음과 같다.

- PNG
- SVG
- PDF
- Mermaid
- draw.io Export

즉, 정적인 결과물이다.

우리가 만드는 다이어그램은

- Interactive
- Animated
- Embeddable
- AI Native

이어야 한다.

---

# 3. 제품 철학

## AI는 초안을 만든다.

AI는 완벽한 결과물을 만드는 것이 아니라

사용자가 수정하기 좋은 초안을 만든다.

사용자는 언제든

- 위치를 바꾸고
- 연결을 수정하고
- 애니메이션을 바꾸고
- 설명을 수정할 수 있어야 한다.

---

## 모든 것은 수정 가능해야 한다.

절대로

AI가 생성한 결과를

이미지로 고정하지 않는다.

항상

Diagram JSON

형태로 관리한다.

---

## Embed First

우리는 Export보다 Embed를 중요하게 생각한다.

다이어그램은

문서

블로그

API 문서

웹사이트

Wiki

에서 살아 움직여야 한다.

---

## Animation is Meaning

애니메이션은 장식이 아니다.

애니메이션은

데이터의 흐름을 이해시키기 위한 도구이다.

예)

Client → Server Request

Kafka Event Flow

Cache Hit / Miss

Request / Response

---

## 개발자는 코드보다 Diagram을 이해한다.

좋은 Diagram은

100줄의 설명보다 낫다.

좋은 Interactive Diagram은

10장의 PNG보다 낫다.

---

# 4. MVP 목표

첫 번째 버전은

"시스템 구성도"

만 집중한다.

지원 기능

- LLM Skill → Diagram JSON
- Visual Editing
- Node Drag
- Edge Editing
- Local File Open / Save
- Packet Animation
- Self-hosted iframe Embed

지원하지 않는 기능

- 실시간 협업
- 화이트보드
- 발표 기능
- ERD
- Workflow
- MindMap
- Sequence Diagram

이 기능들은 이후 Vertical로 확장한다.

---

# 5. 핵심 사용자

Primary

- Backend Developer
- Software Architect
- DevRel
- Technical Writer

Secondary

- PM
- CTO
- Engineering Manager

---

# 6. 시스템 구성

LLM Skill (Optional)

↓

Diagram JSON File

↓

Local Editor

↓

Renderer / Self-hosted Embed Runtime

---

# 7. 핵심 데이터 모델

Diagram

Node

Edge

Animation

Viewport

Theme

Metadata

Version

---

Diagram은

JSON

으로만 저장한다.

SVG는 출력 결과일 뿐이다.

---

# 8. AI 원칙

AI는

Diagram JSON

만 생성한다.

AI는

SVG

HTML

Canvas

를 직접 생성하지 않는다.

AI의 역할은

- Node 생성
- Edge 생성
- Layout 추천
- Animation 추천
- Icon 추천
- 설명 생성

이다.

---

# 9. Renderer 원칙

Renderer는

Diagram JSON

만 입력받는다.

Renderer는

AI를 호출하지 않는다.

Renderer는

Stateless해야 한다.

Renderer는

동일한 JSON에 대해

항상 동일한 결과를 만들어야 한다.

---

# 10. Editor 원칙

Editor는

Canvas를 제공한다.

Canvas는

Drag

Resize

Connection

Animation

Theme

을 수정할 수 있어야 한다.

Diagram JSON과 Canvas는 항상 동기화된다.

---

# 11. Embed 원칙

Embed는

제품의 핵심 기능이다.

지원 방식

- iframe
- Script
- React SDK

MVP는 iframe만 지원한다.

사용자는 Diagram JSON과 Embed Runtime을 직접 호스팅할 수 있어야 한다.

Embed Runtime은 특정 서버나 계정 시스템에 의존하지 않아야 한다.

---

# 12. 데이터 저장

Diagram은

로컬 `.diagram.json` 파일

으로 저장한다.

같은 파일을 다시 열어 편집을 계속할 수 있어야 한다.

Export 결과는

Cache일 뿐

Source가 아니다.

---

# 13. 애니메이션 원칙

애니메이션은

"예쁜 효과"

가 아니라

"흐름"

을 보여주는 것이다.

지원 예시

- Packet Flow
- Kafka Event
- Request
- Response
- Cache Hit
- Cache Miss
- Retry
- Broadcast
- Step Reveal

---

# 14. 확장 전략

첫 번째 Vertical

Architecture

↓

두 번째

ERD

↓

세 번째

Workflow

↓

네 번째

Sequence Diagram

↓

다섯 번째

AI Agent Flow

↓

여섯 번째

Game Flow

↓

일곱 번째

Education Diagram

---

핵심 엔진은

항상 동일하다.

Node

+

Edge

+

Animation

+

Interaction

---

# 15. 하지 말아야 할 것

우리는

draw.io

를 만들지 않는다.

우리는

Figma

를 만들지 않는다.

우리는

Excalidraw

를 만들지 않는다.

우리는

AI Image Generator

를 만들지 않는다.

우리는

화이트보드

를 만들지 않는다.

---

# 16. 장기 목표

Interactive Diagram Platform

↓

Diagram SDK

↓

Diagram Runtime

↓

Diagram API

↓

Diagram Infrastructure

궁극적으로는

웹의 모든 기술 문서에서

움직이는 Diagram을 사용할 수 있도록 한다.

---

# 17. 성공 기준

사용자는

3분 안에

Architecture Diagram을 만든다.

30초 안에

문서에 Embed한다.

Diagram을 수정하면

모든 Embed가 자동으로 업데이트된다.

사용자는

PNG보다

Interactive Diagram을 선호하게 된다.

---

# 18. 개발 원칙

항상

단순한 구조를 유지한다.

기능보다

사용자 경험을 우선한다.

AI보다

Visual Editing을 우선한다.

Export보다

Embed를 우선한다.

애니메이션보다

가독성을 우선한다.

---

# 19. 제품 한 줄 정의

AI가 생성하고

사람이 다듬으며

웹에서 살아 움직이는 다이어그램 플랫폼.

---

# 20. 오픈소스 원칙

Schema, Runtime, Editor, Embed, 예제와 LLM Skill은 공개 저장소에서 함께 관리한다.

핵심 기능은 로컬 실행과 self-hosting만으로 사용할 수 있어야 한다.

공개 문서와 TODO는 사용자 기능, 기술적 품질, 호환성, 기여 방법에 집중한다.

내부 작업 기록이 꼭 필요한 경우에만 git에서 제외된 `.codex/` 아래에 둔다.

`.codex/`의 내용은 공개 문서나 제품 동작의 근거로 사용하지 않는다.
