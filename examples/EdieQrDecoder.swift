// Edie QR 페어링 페이로드 디코더 (iOS / Swift)
// QR 스키마 v1 — {v, t, id, sn?}

import Foundation

struct EdiePayload: Decodable {
    let v: Int          // 스키마 버전 (현재 1)
    let t: String       // 제품 세대 ("edie_9" 등)
    let id: String      // BLE advertising name ("EDIE_001" 등)
    let sn: String?     // 제조 시리얼 (optional)
}

enum EdieQrError: Error, LocalizedError {
    case empty
    case unrecognizedFormat(String)
    case base64DecodeFailed
    case jsonParseFailed(Error)
    case missingField(String)
    case unsupportedVersion(Int)
    case unsupportedType(String)
    case invalidIdFormat(String)

    var errorDescription: String? {
        switch self {
        case .empty: return "QR text is empty"
        case .unrecognizedFormat(let s): return "unrecognized QR format: \(s)"
        case .base64DecodeFailed: return "base64 decode failed"
        case .jsonParseFailed(let e): return "invalid JSON in QR payload: \(e.localizedDescription)"
        case .missingField(let f): return "missing '\(f)' field"
        case .unsupportedVersion(let v): return "unsupported QR schema v\(v). Please update the app."
        case .unsupportedType(let t): return "unsupported product type '\(t)'. Please update the app."
        case .invalidIdFormat(let id): return "invalid id format: \(id) (expected EDIE_XXX)"
        }
    }
}

enum EdieQrDecoder {
    static let supportedVersion = 1
    static let supportedTypes: Set<String> = ["edie_9"]
    private static let idPattern = "^EDIE_\\d{3}$"

    /// QR 텍스트를 받아 EdiePayload 로 디코딩한다.
    ///
    /// 지원 입력:
    ///   1) "https://jaewook6488.github.io/edie_qr_generator/p.html#<base64url>"
    ///   2) "edie://pair?d=<base64url>"
    ///   3) "{\"v\":1,...}"  (JSON 평문, 디버깅용)
    static func decode(_ qrText: String) throws -> EdiePayload {
        let trimmed = qrText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw EdieQrError.empty }

        let jsonData: Data
        if trimmed.hasPrefix("{") {
            jsonData = Data(trimmed.utf8)
        } else if trimmed.hasPrefix("edie://pair?d=") {
            let b64 = String(trimmed.dropFirst("edie://pair?d=".count))
            jsonData = try base64UrlDecode(b64)
        } else if trimmed.contains("/p.html#"), let hashIdx = trimmed.firstIndex(of: "#") {
            let b64 = String(trimmed[trimmed.index(after: hashIdx)...])
            jsonData = try base64UrlDecode(b64)
        } else {
            throw EdieQrError.unrecognizedFormat(trimmed)
        }

        let payload: EdiePayload
        do {
            payload = try JSONDecoder().decode(EdiePayload.self, from: jsonData)
        } catch {
            throw EdieQrError.jsonParseFailed(error)
        }

        try validate(payload)
        return payload
    }

    private static func base64UrlDecode(_ b64url: String) throws -> Data {
        var b64 = b64url.replacingOccurrences(of: "-", with: "+")
                        .replacingOccurrences(of: "_", with: "/")
        let pad = (4 - b64.count % 4) % 4
        if pad > 0 { b64 += String(repeating: "=", count: pad) }
        guard let data = Data(base64Encoded: b64) else {
            throw EdieQrError.base64DecodeFailed
        }
        return data
    }

    private static func validate(_ p: EdiePayload) throws {
        if p.v != supportedVersion { throw EdieQrError.unsupportedVersion(p.v) }
        if p.t.isEmpty { throw EdieQrError.missingField("t") }
        if !supportedTypes.contains(p.t) { throw EdieQrError.unsupportedType(p.t) }
        if p.id.isEmpty { throw EdieQrError.missingField("id") }
        if p.id.range(of: idPattern, options: .regularExpression) == nil {
            throw EdieQrError.invalidIdFormat(p.id)
        }
    }
}

// ───────────────────────── 사용 예 ─────────────────────────
//
// let qrText = "https://jaewook6488.github.io/edie_qr_generator/p.html#eyJ2IjoxLCJ0IjoiZWRpZV85IiwiaWQiOiJFRElFXzAwMSIsInNuIjoiMjAyNkEwMDEifQ"
//
// do {
//     let payload = try EdieQrDecoder.decode(qrText)
//     print("세대=\(payload.t), ID=\(payload.id), SN=\(payload.sn ?? "-")")
//
//     // 이후 CoreBluetooth로 진입
//     let edieServiceUuid = CBUUID(string: "13ED935D-24D0-473C-A129-6659BD3CB1D8")
//     centralManager.scanForPeripherals(withServices: [edieServiceUuid], options: nil)
//     // didDiscoverPeripheral 콜백에서 peripheral.name == payload.id 매칭 후 connect
// } catch EdieQrError.unsupportedVersion, EdieQrError.unsupportedType {
//     // 앱 업데이트 안내
// } catch {
//     // QR 손상/잘못된 QR
//     print(error.localizedDescription)
// }
