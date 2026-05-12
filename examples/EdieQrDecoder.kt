// Edie QR 페어링 페이로드 디코더 (Android / Kotlin)
// QR 스키마 v1 — {v, t, id, sn?}

package com.edie.qr

import android.util.Base64
import org.json.JSONObject
import java.nio.charset.StandardCharsets

data class EdiePayload(
    val v: Int,        // 스키마 버전 (현재 1)
    val t: String,     // 제품 세대 ("edie_9" 등)
    val id: String,    // BLE advertising name ("EDIE_001" 등)
    val sn: String?,   // 제조 시리얼 (optional)
)

object EdieQrDecoder {
    private const val SUPPORTED_VERSION = 1
    private val SUPPORTED_TYPES = setOf("edie_9")
    private val ID_REGEX = Regex("""^EDIE_\d{3}$""")

    /**
     * QR 텍스트를 받아 EdiePayload 로 디코딩한다.
     *
     * 지원 입력:
     *   1) "https://jaewook6488.github.io/edie_qr_generator/p.html#<base64url>"
     *   2) "edie://pair?d=<base64url>"
     *   3) "{\"v\":1,...}"  (JSON 평문, 디버깅용)
     *
     * @throws IllegalArgumentException QR 형식이 잘못됨
     * @throws UnsupportedOperationException 앱이 지원하지 않는 버전/세대 (앱 업데이트 안내)
     */
    @Throws(IllegalArgumentException::class, UnsupportedOperationException::class)
    fun decode(qrText: String): EdiePayload {
        require(qrText.isNotBlank()) { "QR text is empty" }
        val trimmed = qrText.trim()

        val json = when {
            trimmed.startsWith("{") -> trimmed
            trimmed.startsWith("edie://pair?d=") ->
                base64UrlDecode(trimmed.removePrefix("edie://pair?d="))
            trimmed.contains("/p.html#") ->
                base64UrlDecode(trimmed.substringAfter('#'))
            else -> throw IllegalArgumentException("unrecognized QR format: $trimmed")
        }

        val obj = try { JSONObject(json) } catch (e: Exception) {
            throw IllegalArgumentException("invalid JSON in QR payload: ${e.message}")
        }

        val payload = EdiePayload(
            v = obj.optInt("v", -1),
            t = obj.optString("t"),
            id = obj.optString("id"),
            sn = obj.optString("sn").takeIf { it.isNotEmpty() },
        )

        validate(payload)
        return payload
    }

    private fun base64UrlDecode(b64url: String): String {
        val flags = Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP
        val bytes = try {
            Base64.decode(b64url, flags)
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("base64 decode failed: ${e.message}")
        }
        return String(bytes, StandardCharsets.UTF_8)
    }

    private fun validate(p: EdiePayload) {
        if (p.v != SUPPORTED_VERSION) {
            throw UnsupportedOperationException(
                "unsupported QR schema v${p.v} (app supports v$SUPPORTED_VERSION). Please update the app."
            )
        }
        if (p.t.isEmpty()) {
            throw IllegalArgumentException("missing 't' field")
        }
        if (p.t !in SUPPORTED_TYPES) {
            throw UnsupportedOperationException(
                "unsupported product type '${p.t}'. Please update the app."
            )
        }
        if (p.id.isEmpty()) {
            throw IllegalArgumentException("missing 'id' field")
        }
        if (!ID_REGEX.matches(p.id)) {
            throw IllegalArgumentException("invalid id format: ${p.id} (expected EDIE_XXX)")
        }
    }
}

// ───────────────────────── 사용 예 ─────────────────────────
//
// val qrText = "https://jaewook6488.github.io/edie_qr_generator/p.html#eyJ2IjoxLCJ0IjoiZWRpZV85IiwiaWQiOiJFRElFXzAwMSIsInNuIjoiMjAyNkEwMDEifQ"
//
// try {
//     val payload = EdieQrDecoder.decode(qrText)
//     Log.d("Edie", "세대=${payload.t}, ID=${payload.id}, SN=${payload.sn}")
//
//     // 이후 BLE 스캔으로 진입
//     val edieServiceUuid = ParcelUuid.fromString("13ED935D-24D0-473C-A129-6659BD3CB1D8")
//     val scanFilter = ScanFilter.Builder()
//         .setServiceUuid(edieServiceUuid)
//         .setDeviceName(payload.id)
//         .build()
//     // bleScanner.startScan(listOf(scanFilter), ScanSettings.Builder().build(), scanCallback)
// } catch (e: UnsupportedOperationException) {
//     // 앱 업데이트 안내
//     showUpdateDialog(e.message)
// } catch (e: IllegalArgumentException) {
//     // QR 손상/잘못된 QR
//     showError(e.message)
// }
