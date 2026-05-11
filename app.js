(function () {
  const DEFAULT_LOGO = 'assets/edie.png';

  const $ = (id) => document.getElementById(id);
  const container = $('qrContainer');

  let currentLogo = DEFAULT_LOGO;
  let qr = null;

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
    qr.download({ name: 'edie-qr', extension: ext });
  }

  $('generateBtn').addEventListener('click', generate);
  $('downloadPng').addEventListener('click', () => downloadAs('png'));
  $('downloadSvg').addEventListener('click', () => downloadAs('svg'));

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

  generate();
})();
