# Edie QR 디코더 (앱 개발자용)

박스/매뉴얼의 QR을 앱 카메라(또는 OS 카메라) 로 스캔했을 때 얻는 텍스트를
`{v, t, id, sn?}` 객체로 디코딩 + 검증하는 함수들입니다.

| 파일 | 플랫폼 | 의존성 |
|---|---|---|
| [`EdieQrDecoder.cs`](./EdieQrDecoder.cs) | Unity / C# | `UnityEngine` (내장 `JsonUtility`) |
| [`EdieQrDecoder.kt`](./EdieQrDecoder.kt) | Android / Kotlin | `android.util.Base64`, `org.json.JSONObject` (내장) |
| [`EdieQrDecoder.swift`](./EdieQrDecoder.swift) | iOS / Swift | `Foundation` (내장) |

---

## 디코딩 대상 입력 (세 가지 모두 지원)

| 형식 | 예 |
|---|---|
| URL 링크 (기본) | `https://jaewook6488.github.io/edie_qr_generator/p.html#eyJ2IjoxLCJ0IjoiZWRpZV85Ii...` |
| URI 딥링크 | `edie://pair?d=eyJ2IjoxLCJ0IjoiZWRpZV85Ii...` |
| JSON 평문 | `{"v":1,"t":"edie_9","id":"EDIE_001","sn":"2026A001"}` |

세 경우 모두 디코더는 동일한 객체를 반환합니다:

```json
{
  "v": 1,
  "t": "edie_9",
  "id": "EDIE_001",
  "sn": "2026A001"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `v`  | int    | ✓ | QR 페이로드 스키마 버전. 현재 `1` |
| `t`  | string | ✓ | 제품 세대. 현재 `edie_9`. 미래에 `edie_10` 등 추가될 수 있음 |
| `id` | string | ✓ | BLE advertising name. 정규식 `^EDIE_\d{3}$` |
| `sn` | string |   | 제조 시리얼. A/S·보증·서버 등록용 |

---

## 디코더 동작

1. **입력 형식 자동 판별** — URL/URI/JSON 평문 어느 것이든 OK
2. **base64url → UTF-8 → JSON 파싱**
3. **검증**
   - `v == 1` 인가 (아니면 "앱 업데이트 필요")
   - `t` 가 앱이 지원하는 세대인가 (현재 `edie_9` 만)
   - `id` 가 `^EDIE_\d{3}$` 정규식과 일치하는가

검증 실패 시 각 언어의 적절한 예외를 던집니다 (`NotSupportedException` / `UnsupportedOperationException` / `EdieQrError.unsupportedVersion` 등). 앱은 catch 해서 사용자 안내 UI를 띄우면 됩니다.

---

## 디코딩 후 흐름 (참고)

```
디코더 통과
   │
   ▼
BLE 스캔 시작 (Service UUID 필터: 앱에 하드코딩된 13ED935D-...,
              Local Name 매칭: payload.id 와 일치)
   │
   ▼ 광고 발견 → 연결
   │
MTU 교환 → service discovery → Notify CCCD enable (BLE_SPEC §11)
   │
   ▼
"command: request_status" write
   │
   ▼ status notify 수신 → edie_id 가 payload.id 와 일치하는지 검증
   │
   ▼ 일치하면 페어링 성공으로 간주
   │
사용자에게 WiFi SSID/PW 입력 받기
   │
   ▼
"command: send_wifi_info" write (BLE_SPEC §7.2)
   │
   ▼ command_result.success 확인
   │
WiFi 프로비저닝 완료
```

상세 BLE 사양은 [`edie_ble/BLE_SPEC.md`](https://github.com/JAEWOOK6488/edie_qr_generator) 참고.

---

## 앱 측 OS 등록 (선택)

QR을 일반 카메라 앱으로 스캔했을 때 OS가 자동으로 앱을 띄워주려면 `edie://` URL Scheme 핸들러를 등록해야 합니다.

### Android — `AndroidManifest.xml`
```xml
<activity android:name=".PairingActivity" android:exported="true">
    <intent-filter android:autoVerify="false">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="edie" android:host="pair" />
    </intent-filter>
</activity>
```

`PairingActivity.onCreate` 에서 `intent.data` 의 `getQueryParameter("d")` 가 base64url 페이로드입니다 — 그대로 `EdieQrDecoder.decode("edie://pair?d=$d")` 호출.

### iOS — `Info.plist`
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.edie.pair</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>edie</string>
        </array>
    </dict>
</array>
```

`SceneDelegate.scene(_:openURLContexts:)` 또는 `AppDelegate.application(_:open:)` 에서 URL 받아 `EdieQrDecoder.decode(url.absoluteString)` 호출.

### Unity (모바일 빌드)
- Android: `Plugins/Android/AndroidManifest.xml` 에 위 intent-filter 추가
- iOS: `Plugins/iOS/Info.plist` 패치 또는 `PostProcessBuild` 스크립트로 추가
- `Application.deepLinkActivated` 이벤트로 URL 수신
