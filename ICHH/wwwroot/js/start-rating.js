(function () {
  var container = document.getElementById('icStarWidget');
  var textEl = document.getElementById('icRatingText');
  var hiddenEl = document.getElementById('icRatingVal');
  var totalStars = 5;
  var selected = 0;   // 0 = nothing chosen yet
  var hovered = 0;   // value being previewed

  var labels = {
    0.5: '0.5 star', 1: '1 star', 1.5: '1.5 stars', 2: '2 stars',
    2.5: '2.5 stars', 3: '3 stars', 3.5: '3.5 stars', 4: '4 stars',
    4.5: '4.5 stars', 5: '5 stars'
  };

  // SVG star path (rounded corners via stroke-linejoin/linecap)
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var STAR_PATH = 'M28,6 L34,20 L50,22 L39,33 L42,49 L28,42 L14,49 L17,33 L6,22 L22,20 Z';

  function makeSvgStar(fillColor) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 56 56');
    svg.setAttribute('width', '56');
    svg.setAttribute('height', '56');
    svg.style.display = 'block';
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', STAR_PATH);
    path.setAttribute('fill', fillColor);
    path.setAttribute('stroke', fillColor);
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
    return svg;
  }

  // Build 5 star wrappers
  var wraps = [];
  for (var i = 1; i <= totalStars; i++) {
    var wrap = document.createElement('div');
    wrap.className = 'ic-star-wrap';
    wrap.title = i + ' stars';

    // Grey background star
    var bgSvg = makeSvgStar('#ddd');
    bgSvg.className = 'ic-star-bg';

    // Amber fill star inside a clipping wrapper
    var fillWrap = document.createElement('div');
    fillWrap.className = 'ic-star-fill-wrap';
    var fillSvg = makeSvgStar('#f5a623');
    fillWrap.appendChild(fillSvg);

    var zLeft = document.createElement('span');
    zLeft.className = 'ic-zone ic-zone-left';
    zLeft.dataset.val = (i - 0.5).toString();

    var zRight = document.createElement('span');
    zRight.className = 'ic-zone ic-zone-right';
    zRight.dataset.val = i.toString();

    wrap.appendChild(bgSvg);
    wrap.appendChild(fillWrap);
    wrap.appendChild(zLeft);
    wrap.appendChild(zRight);
    container.appendChild(wrap);
    wraps.push({ wrap: wrap, fill: fillWrap });
  }

  function render(val) {
    for (var s = 0; s < totalStars; s++) {
      var starNum = s + 1;
      var fillPct;
      if (val >= starNum) fillPct = '100%';
      else if (val >= starNum - 0.5) fillPct = '50%';
      else fillPct = '0%';
      wraps[s].fill.style.width = fillPct;
    }
  }

  function onZoneEnter(e) {
    hovered = parseFloat(e.target.dataset.val);
    render(hovered);
  }

  function onContainerLeave() {
    hovered = 0;
    render(selected);
  }

  function onZoneClick(e) {
    selected = parseFloat(e.target.dataset.val);
    hiddenEl.value = selected;
    textEl.textContent = (labels[selected] || selected) + ' selected';
    render(selected);
  }

  // Attach events to every zone
  var zones = container.querySelectorAll('.ic-zone');
  zones.forEach(function (z) {
    z.addEventListener('mouseenter', onZoneEnter);
    z.addEventListener('click', onZoneClick);
  });
  container.addEventListener('mouseleave', onContainerLeave);
})();