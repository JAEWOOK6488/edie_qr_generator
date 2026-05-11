# Edie QR 생성기

색상, 모양, 로고를 자유롭게 커스터마이징할 수 있는 QR 코드 생성기입니다. **Edie BLE 페어링 모드**가 내장되어 있어, 로봇 ID만 입력하면 Unity 앱이 바로 인식해서 BLE 자동 연결할 수 있는 스티커용 QR을 만들 수 있습니다.

🔗 **데모**: https://jaewook6488.github.io/edie_qr_generator/

## 기능
- **일반 모드**: URL/텍스트 → QR 코드 변환
- **🤖 Edie BLE 페어링 모드**: 로봇 ID 입력 → Edie 스펙(BLE_SPEC.md v0.1)에 맞는 JSON 페이로드 QR 자동 생성
- 점/코너 모양 선택 (사각형, 원형, 클래시, 라운드 등)
- 단색 또는 선형/방사형 그라데이션
- 배경색 또는 투명 배경
- 중앙 로고 삽입 (기본: Edie 로고, 업로드로 교체 가능)
- 오류 보정 레벨 조절 (L/M/Q/H)
- PNG / SVG 다운로드
- 모든 처리는 브라우저에서 실행 (서버 전송 없음)

## Edie BLE 페어링 QR

상단 탭에서 **🤖 Edie BLE 페어링**을 선택하면 다음 페이로드가 자동 생성됩니다:

```json
{
  "v": 1,
  "type": "edie_ble",
  "name": "EDIE_001",
  "svc": "13ED935D-24D0-473C-A129-6659BD3CB1D8",
  "tx":  "BA087F5F-E068-4FA1-AA11-A8AAD60AE31F",
  "rx":  "35D7B2A9-36AB-4003-BB15-9A03178AF5B9",
  "mtu": 247
}
```

UUID는 `edie_ble/BLE_SPEC.md`와 동일합니다. 로봇 ID(`EDIE_XXX`)만 바꾸면 각 기체별 스티커를 찍어낼 수 있습니다.

### QR 출력 형식 (스캐너에 노출되는 내용)

일반 카메라 앱으로 QR을 스캔하면 안에 든 텍스트가 그대로 보입니다. UUID 같은 내용을 숨기려면 세 가지 형식 중 선택할 수 있습니다.

| 형식 | QR 내용 | 카메라 앱 표시 |
|---|---|---|
| **URI 딥링크** (기본) | `edie://pair?d=<base64url(JSON)>` | "Edie 앱에서 열기" |
| **URL 링크** | `https://jaewook6488.github.io/edie_qr_generator/p.html#<base64url>` | 링크 → `p.html`이 `edie://`로 자동 리다이렉트 |
| **JSON 평문** | `{"v":1,"name":"EDIE_001",...}` | UUID 등이 그대로 노출 (디버깅용) |

- URI/URL 형식은 base64url로 인코딩되어 UUID가 사람 눈에 보이지 않습니다.
- Unity 앱은 OS에 `edie://` URL Scheme(Android: intent filter, iOS: Info.plist `CFBundleURLSchemes`)을 등록해야 자동 실행됩니다.
- URL 형식의 `p.html`은 모바일 접속 시 자동으로 `edie://` 딥링크를 시도. 앱 없으면 안내 페이지 표시.

### Unity (Central) 측 처리 흐름

```csharp
using System;
using System.Text;
using System.Web;  // System.Web.dll 참조

string DecodeQrPayload(string qrText) {
    string b64;
    if (qrText.StartsWith("edie://pair?d=")) {
        b64 = qrText.Substring("edie://pair?d=".Length);
    } else if (qrText.Contains("/p.html#")) {
        b64 = qrText.Substring(qrText.IndexOf('#') + 1);
    } else {
        return qrText;  // JSON 평문 형식
    }
    // base64url → base64
    b64 = b64.Replace('-', '+').Replace('_', '/');
    int pad = (4 - b64.Length % 4) % 4;
    b64 += new string('=', pad);
    return Encoding.UTF8.GetString(Convert.FromBase64String(b64));
}

// 1. QR 디코드 + JSON 파싱
var json = DecodeQrPayload(qrText);
var payload = JsonUtility.FromJson<EdiePayload>(json);
if (payload.type != "edie_ble" || payload.v != 1) throw new Exception("not an edie QR");

// 2. BLE 스캔 — Service UUID로 필터, Name으로 매칭
BluetoothLEHardwareInterface.ScanForPeripheralsWithServices(
    new[] { payload.svc },
    (address, name) => {
        if (name == payload.name) {
            BluetoothLEHardwareInterface.StopScan();
            BluetoothLEHardwareInterface.ConnectToPeripheral(address,
                onConnect, onService, onChar, onDisconnect);
        }
    });

// 3. 연결 후: MTU 요청 → Notify CCCD enable → request_status (BLE_SPEC §11)
// 4. 수신 버퍼는 \n 단위로 잘라 JSON 파싱
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
