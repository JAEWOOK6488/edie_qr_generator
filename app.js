(function () {
  console.log('[Edie QR] v5 loaded');

  const URL_BASE = 'https://jaewook6488.github.io/edie_qr_generator/p.html';

  function b64url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  const DEFAULT_LOGO = 'assets/edie.png';

  const $ = (id) => document.getElementById(id);
  const container = $('qrContainer');

  let currentLogo = DEFAULT_LOGO;
  let qr = null;
  let mode = 'generic';

  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === next);
    });
    $('genericFields').hidden = (next !== 'generic');
    $('edieFields').hidden = (next !== 'edie');
    if (next === 'edie') {
      ensureScanSafeMinimums();
      syncEdiePayload();
    }
    generate();
  }

  function ensureScanSafeMinimums() {
    if ($('ecLevel').value === 'L') $('ecLevel').value = 'H';
    if (parseInt($('margin').value, 10) < 4) $('margin').value = '8';
  }

  function syncEdiePayload() {
    const payload = {
      v: 1,
      t: ($('edieType').value || '').trim() || 'edie_9',
      id: ($('edieId').value || '').trim() || 'EDIE_001',
      sn: ($('edieSn').value || '').trim(),
    };
    if (!payload.sn) delete payload.sn;

    const json = JSON.stringify(payload);
    const fmt = $('edieFormat').value;
    let qrText;
    if (fmt === 'json') {
      qrText = json;
    } else {
      const encoded = b64url(json);
      qrText = fmt === 'uri'
        ? `edie://pair?d=${encoded}`
        : `${URL_BASE}#${encoded}`;
    }
    $('data').value = qrText;
    $('edieQrText').textContent = qrText;
    $('ediePayload').textContent = JSON.stringify(payload, null, 2);
  }

  function readOptions() {
    const size = parseInt($('size').value, 10) || 512;
    const margin = parseInt($('margin').value, 10) || 0;
    const ecLevel = $('ecLevel').value;
    const dotStyle = $('dotStyle').value;
    const cornerSquareStyle = $('cornerSquareStyle').value;
    const cornerDotStyle = $('cornerDotStyle').value;
    const dotColor = $('dotColor').value;
    const cornerColor = $('cornerColor').value;
    const bgColor = $('bgColor').value;
    const transparentBg = $('transparentBg').checked;
    const useGradient = $('useGradient').value;
    const gradientColor = $('gradientColor').value;
    const useLogo = $('useLogo').checked;
    const logoSize = parseFloat($('logoSize').value) || 0.28;
    const logoMargin = parseInt($('logoMargin').value, 10) || 0;
    const hideDotsBehindLogo = $('hideDotsBehindLogo').checked;
    const data = $('data').value.trim() || ' ';

    const dotsOptions = { type: dotStyle, color: dotColor };
    const cornersSquareOptions = { type: cornerSquareStyle, color: cornerColor };
    const cornersDotOptions = { type: cornerDotStyle, color: cornerColor };

    if (useGradient !== 'none') {
      const gradient = {
        type: useGradient,
        rotation: useGradient === 'linear' ? Math.PI / 4 : 0,
        colorStops: [
          { offset: 0, color: dotColor },
          { offset: 1, color: gradientColor },
        ],
      };
      dotsOptions.gradient = gradient;
      delete dotsOptions.color;
    }

    const options = {
      width: size,
      height: size,
      type: 'canvas',
      data,
      margin,
      qrOptions: { errorCorrectionLevel: ecLevel },
      dotsOptions,
      cornersSquareOptions,
      cornersDotOptions,
      backgroundOptions: { color: transparentBg ? 'rgba(0,0,0,0)' : bgColor },
      imageOptions: {
        hideBackgroundDots: hideDotsBehindLogo,
        imageSize: logoSize,
        margin: logoMargin,
        crossOrigin: 'anonymous',
      },
    };

    if (useLogo) options.image = currentLogo;

    return options;
  }

  function generate() {
    const options = readOptions();
    if (!qr) {
      qr = new QRCodeStyling(options);
      container.innerHTML = '';
      qr.append(container);
    } else {
      qr.update(options);
    }
  }

  function downloadAs(ext) {
    if (!qr) generate();
    const name = mode === 'edie'
      ? `edie-ble-${($('edieId').value || 'EDIE_001').trim()}`
      : 'edie-qr';
    qr.download({ name, extension: ext });
  }

  $('generateBtn').addEventListener('click', generate);
  $('downloadPng').addEventListener('click', () => downloadAs('png'));
  $('downloadSvg').addEventListener('click', () => downloadAs('svg'));

  document.querySelectorAll('.mode-tab').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  ['edieId', 'edieType', 'edieSn'].forEach((id) => {
    $(id).addEventListener('input', () => {
      syncEdiePayload();
      generate();
    });
  });

  $('edieFormat').addEventListener('change', () => {
    syncEdiePayload();
    generate();
  });

  $('logoFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentLogo = ev.target.result;
      generate();
    };
    reader.readAsDataURL(file);
  });

  $('resetLogo').addEventListener('click', () => {
    currentLogo = DEFAULT_LOGO;
    $('logoFile').value = '';
    generate();
  });

  const liveInputs = [
    'data', 'size', 'margin', 'ecLevel',
    'dotStyle', 'cornerSquareStyle', 'cornerDotStyle',
    'dotColor', 'cornerColor', 'bgColor', 'transparentBg',
    'useGradient', 'gradientColor',
    'useLogo', 'logoSize', 'logoMargin', 'hideDotsBehindLogo',
  ];
  liveInputs.forEach((id) => {
    const el = $(id);
    if (!el) return;
    const evt = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(evt, generate);
  });

  syncEdiePayload();
  generate();
})();
