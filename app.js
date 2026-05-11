(function () {
  console.log('[Edie QR] v3 loaded');
  const DEFAULT_LOGO = 'assets/edie.png';

  const DEFAULT_BLE = {
    svc: '13ED935D-24D0-473C-A129-6659BD3CB1D8',
    tx:  'BA087F5F-E068-4FA1-AA11-A8AAD60AE31F',
    rx:  '35D7B2A9-36AB-4003-BB15-9A03178AF5B9',
    mtu: 247,
  };

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

  // BLE 모드 진입 시 *인식률에 결정적인 것만* 보장. 모양/색상은 사용자 선택 유지.
  function ensureScanSafeMinimums() {
    if ($('ecLevel').value === 'L') $('ecLevel').value = 'H';
    if (parseInt($('margin').value, 10) < 4) $('margin').value = '8';
  }

  function syncEdiePayload() {
    const payload = {
      v: 1,
      type: 'edie_ble',
      name: ($('edieId').value || '').trim() || 'EDIE_001',
      svc: ($('edieSvc').value || '').trim(),
      tx:  ($('edieTx').value  || '').trim(),
      rx:  ($('edieRx').value  || '').trim(),
      mtu: parseInt($('edieMtu').value, 10) || 247,
    };
    const json = JSON.stringify(payload);
    $('data').value = json;
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

  ['edieId', 'edieSvc', 'edieTx', 'edieRx', 'edieMtu'].forEach((id) => {
    $(id).addEventListener('input', () => {
      syncEdiePayload();
      generate();
    });
  });

  $('edieResetUuids').addEventListener('click', () => {
    $('edieSvc').value = DEFAULT_BLE.svc;
    $('edieTx').value  = DEFAULT_BLE.tx;
    $('edieRx').value  = DEFAULT_BLE.rx;
    $('edieMtu').value = String(DEFAULT_BLE.mtu);
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
