// Edie QR 페어링 페이로드 디코더 (Unity / C#)
// QR 스키마 v1 — {v, t, id, sn?}
// 입력: 카메라가 읽은 QR 텍스트 (URL / URI / JSON 평문 중 어느 것이든 OK)
// 출력: EdiePairingPayload 구조체

using System;
using System.Text;
using System.Text.RegularExpressions;
using UnityEngine;

[Serializable]
public class EdiePairingPayload
{
    public int v;        // 스키마 버전 (현재 1)
    public string t;     // 제품 세대 ("edie_9" 등)
    public string id;    // BLE advertising name ("EDIE_001" 등)
    public string sn;    // 제조 시리얼 (optional, 없으면 빈 문자열)
}

public static class EdieQrDecoder
{
    private const int SUPPORTED_VERSION = 1;
    private static readonly string[] SUPPORTED_TYPES = { "edie_9" };
    private static readonly Regex ID_PATTERN = new Regex(@"^EDIE_\d{3}$");

    /// <summary>
    /// QR 텍스트를 받아 EdiePairingPayload 로 디코딩한다.
    /// 지원 입력:
    ///   1) "https://jaewook6488.github.io/edie_qr_generator/p.html#<base64url>"
    ///   2) "edie://pair?d=<base64url>"
    ///   3) "{\"v\":1,...}" (JSON 평문, 디버깅용)
    /// 검증 실패 시 FormatException 또는 NotSupportedException 발생.
    /// </summary>
    public static EdiePairingPayload Decode(string qrText)
    {
        if (string.IsNullOrWhiteSpace(qrText))
            throw new ArgumentException("QR text is empty");

        string json = ExtractJson(qrText.Trim());

        EdiePairingPayload payload;
        try
        {
            payload = JsonUtility.FromJson<EdiePairingPayload>(json);
        }
        catch (Exception e)
        {
            throw new FormatException("invalid JSON in QR payload: " + e.Message);
        }

        Validate(payload);
        return payload;
    }

    private static string ExtractJson(string qrText)
    {
        if (qrText.StartsWith("{"))
            return qrText;

        string b64;
        if (qrText.StartsWith("edie://pair?d="))
        {
            b64 = qrText.Substring("edie://pair?d=".Length);
        }
        else if (qrText.Contains("/p.html#"))
        {
            int idx = qrText.IndexOf('#');
            b64 = qrText.Substring(idx + 1);
        }
        else
        {
            throw new FormatException("unrecognized QR format: " + qrText);
        }

        return Base64UrlDecode(b64);
    }

    private static string Base64UrlDecode(string b64url)
    {
        string b64 = b64url.Replace('-', '+').Replace('_', '/');
        int pad = (4 - b64.Length % 4) % 4;
        b64 += new string('=', pad);

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(b64);
        }
        catch (FormatException e)
        {
            throw new FormatException("base64 decode failed: " + e.Message);
        }
        return Encoding.UTF8.GetString(bytes);
    }

    private static void Validate(EdiePairingPayload p)
    {
        if (p == null)
            throw new FormatException("payload parsed as null");

        if (p.v != SUPPORTED_VERSION)
            throw new NotSupportedException(
                $"unsupported QR schema v{p.v} (app supports v{SUPPORTED_VERSION}). Please update the app.");

        if (string.IsNullOrEmpty(p.t))
            throw new FormatException("missing 't' field");
        if (Array.IndexOf(SUPPORTED_TYPES, p.t) < 0)
            throw new NotSupportedException(
                $"unsupported product type '{p.t}'. Please update the app.");

        if (string.IsNullOrEmpty(p.id))
            throw new FormatException("missing 'id' field");
        if (!ID_PATTERN.IsMatch(p.id))
            throw new FormatException($"invalid id format: {p.id} (expected EDIE_XXX)");
    }
}

// ───────────────────────── 사용 예 ─────────────────────────
//
// string qrText = "https://jaewook6488.github.io/edie_qr_generator/p.html#eyJ2IjoxLCJ0IjoiZWRpZV85IiwiaWQiOiJFRElFXzAwMSIsInNuIjoiMjAyNkEwMDEifQ";
//
// try
// {
//     EdiePairingPayload p = EdieQrDecoder.Decode(qrText);
//     Debug.Log($"세대: {p.t}, ID: {p.id}, 시리얼: {p.sn}");
//
//     // 이후 BLE 스캔으로 진입
//     const string EDIE_SVC = "13ED935D-24D0-473C-A129-6659BD3CB1D8";
//     // BluetoothLEHardwareInterface.ScanForPeripheralsWithServices(
//     //     new[] { EDIE_SVC },
//     //     (address, name) => { if (name == p.id) { ... } });
// }
// catch (NotSupportedException e)
// {
//     // 앱 업데이트 안내
//     Debug.LogWarning(e.Message);
// }
// catch (FormatException e)
// {
//     // QR 손상/잘못된 QR
//     Debug.LogError(e.Message);
// }
