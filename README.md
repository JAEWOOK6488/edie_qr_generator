# Edie QR 생성기

색상, 모양, 로고를 자유롭게 커스터마이징할 수 있는 QR 코드 생성기입니다. **Edie BLE 페어링 모드**가 내장되어 있어, 로봇 ID만 입력하면 앱이 바로 인식해서 BLE 자동 연결 + WiFi 프로비저닝을 진행할 수 있는 스티커용 QR을 만들 수 있습니다.

🔗 **데모**: https://jaewook6488.github.io/edie_qr_generator/

## 기능
- **일반 모드**: URL/텍스트 → QR 코드 변환
- **🤖 Edie BLE 페어링 모드**: 로봇 ID/세대/시리얼 입력 → 식별 정보만 담은 미니멀 페이로드 QR 자동 생성 (BLE UUID는 앱이 하드코딩)
- 점/코너 모양 선택 (사각형, 원형, 클래시, 라운드 등)
- 단색 또는 선형/방사형 그라데이션
- 배경색 또는 투명 배경
- 중앙 로고 삽입 (기본: Edie 로고, 업로드로 교체 가능)
- 오류 보정 레벨 조절 (L/M/Q/H)
- PNG / SVG 다운로드
- 모든 처리는 브라우저에서 실행 (서버 전송 없음)

## Edie BLE 페어링 QR

상단 탭에서 **🤖 Edie BLE 페어링**을 선택하면 다음 페이로드가 자동 생성됩니다 (QR 스키마 v1):

```json
{
  "v": 1,
  "t": "edie_9",
  "id": "EDIE_001",
  "sn": "2026A001"
}
```

| 필드 | 의미 | 비고 |
|---|---|---|
| `v`  | QR 페이로드 스키마 버전 | 앱이 호환성 체크 |
| `t`  | 제품 세대 | `edie_9`, `edie_10`, ... 미래 세대마다 BLE 사양/명령이 갈라질 수 있어 분기에 사용 |
| `id` | Advertising name | `BLE_SPEC.md §2`의 `^EDIE_\d{3}$` 와 일치. BLE scan filter 키 |
| `sn` | 제조 시리얼 (optional) | A/S·보증·서버 등록용 |

**BLE Service/TX/RX UUID는 QR에 들어가지 않습니다.** 모든 EDIE 로봇이 동일한 UUID(`BLE_SPEC.md §3`)를 쓰므로 앱에 하드코딩하는 것이 정답입니다. 페이로드를 짧게 유지해 QR 모듈 수 감소 → 스캔 거리/가독성 향상.

**WiFi 자격증명도 QR에 들어가지 않습니다.** SSID/PW는 BLE 연결 후 `send_wifi_info` 명령(`BLE_SPEC.md §7.2`)으로 앱이 로봇에 전달합니다.

### QR 출력 형식 (스캐너에 노출되는 내용)

| 형식 | QR 내용 | 일반 카메라 앱 동작 |
|---|---|---|
| **URL 링크** (기본, 권장) | `https://jaewook6488.github.io/edie_qr_generator/p.html#<base64url>` | 안내 페이지 열림 → 모바일이면 자동으로 `edie://` 딥링크 시도 (앱 미설치 시 페이지 유지) |
| **URI 딥링크** | `edie://pair?d=<base64url(JSON)>` | 앱이 OS에 핸들러 등록되어 있으면 자동 실행, 아니면 "사용할 수 없는 QR" 표시 |
| **JSON 평문** | `{"v":1,"t":"edie_9","id":"EDIE_001","sn":"2026A001"}` | 텍스트 그대로 노출 (디버깅용) |

URL/URI 형식은 페이로드가 base64url로 인코딩되어 사람 눈에는 무작위 문자열로 보입니다. base64url 규칙: 표준 base64 결과에서 `+` → `-`, `/` → `_`, 패딩 `=` 제거.

### 앱 측 처리 흐름

```csharp
using System;
using System.Text;

string DecodeQrPayload(string qrText) {
    string b64;
    if (qrText.StartsWith("edie://pair?d=")) {
        b64 = qrText.Substring("edie://pair?d=".Length);
    } else if (qrText.Contains("/p.html#")) {
        b64 = qrText.Substring(qrText.IndexOf('#') + 1);
    } else {
        return qrText;  // JSON 평문
    }
    b64 = b64.Replace('-', '+').Replace('_', '/');
    int pad = (4 - b64.Length % 4) % 4;
    b64 += new string('=', pad);
    return Encoding.UTF8.GetString(Convert.FromBase64String(b64));
}

// 1. QR 디코드 + JSON 파싱
var json = DecodeQrPayload(qrText);
var payload = JsonUtility.FromJson<EdiePayload>(json);
if (payload.v != 1)         throw new Exception("unsupported QR schema");
if (payload.t != "edie_9")  throw new Exception("unsupported product gen");

// 2. BLE 스캔 — 앱에 하드코딩된 Service UUID로 필터, payload.id(name)로 매칭
const string EDIE_SVC = "13ED935D-24D0-473C-A129-6659BD3CB1D8";
BluetoothLEHardwareInterface.ScanForPeripheralsWithServices(
    new[] { EDIE_SVC },
    (address, name) => {
        if (name == payload.id) {
            BluetoothLEHardwareInterface.StopScan();
            BluetoothLEHardwareInterface.ConnectToPeripheral(address,
                onConnect, onService, onChar, onDisconnect);
        }
    });

// 3. 연결 후: MTU 요청 → Notify CCCD enable → request_status (BLE_SPEC §11)
// 4. status notify의 edie_id가 payload.id와 일치하는지 검증
// 5. 사용자에게 WiFi SSID/PW 입력받아 send_wifi_info 명령 전송 (BLE_SPEC §7.2)
```

### 권장 스티커 사양
- **크기**: 3 × 3 cm (10:1 규칙, 20–30cm 거리 스캔)
- **인쇄**: 흑백 단색, **무광** 라미네이트 (광택은 플래시 반사로 인식 실패)
- **여백**: QR 사방 최소 3mm quiet zone

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
