# Edie QR 생성기

색상, 모양, 로고를 자유롭게 커스터마이징할 수 있는 QR 코드 생성기입니다.

🔗 **데모**: https://jaewook6488.github.io/edie_qr_generator/

## 기능
- URL/텍스트 → QR 코드 변환
- 점/코너 모양 선택 (사각형, 원형 점, 클래시, 라운드 등)
- 단색 또는 선형/방사형 그라데이션
- 배경색 또는 투명 배경
- 중앙 로고 삽입 (기본: Edie 로고, 업로드로 교체 가능)
- 오류 보정 레벨 조절 (L/M/Q/H)
- PNG / SVG 다운로드
- 모든 처리는 브라우저에서 실행 (서버 전송 없음)

## 로컬 실행
정적 파일이라 그대로 열어도 동작하지만, 로고 로드를 위해 간단한 서버 사용을 권장합니다.

```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## 사용 라이브러리
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) (CDN)

## 배포
GitHub Pages 사용 — `main` 브랜치 루트가 그대로 서빙됩니다.
