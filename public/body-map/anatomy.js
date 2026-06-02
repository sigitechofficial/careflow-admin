/**
 * CareFlow Body Map — uses assets/new.svg verbatim (798×815, front + back).
 * Hit targets are built proactively from BodyMapCatalog (not raw #layer1 paths).
 */
(function (global) {
  'use strict';

  var Catalog = global.BodyMapCatalog;
  if (!Catalog) {
    console.error('BodyMapCatalog required — load careflow-body-map-catalog.js first');
    return;
  }

  var DIAGRAM_SVG = 'assets/new.svg';
  var DIAGRAM_W = Catalog.DIAGRAM_ROOT_VB ? Catalog.DIAGRAM_ROOT_VB.w : 798.03553;
  var DIAGRAM_H = Catalog.DIAGRAM_ROOT_VB ? Catalog.DIAGRAM_ROOT_VB.h : 815.24999;

  var diagramProbeSvg = null;
  var diagramDecorHtml = null;
  var diagramDecorByView = {};
  var diagramCropCache = {};

  function prefixDecorIds(html, viewKey) {
    var p = 'z-' + String(viewKey).replace(/[^a-z0-9_-]/gi, '') + '-';
    return html
      .replace(/\bid="([^"]+)"/g, 'id="' + p + '$1"')
      .replace(/url\(#([^)]+)\)/g, 'url(#' + p + '$1)');
  }

  function getDiagramDecorForView(viewKey) {
    if (!diagramDecorHtml && global.BODY_MAP_SVG_INLINE) {
      diagramDecorHtml = extractDiagramDecor(global.BODY_MAP_SVG_INLINE);
    }
    if (!diagramDecorHtml) return '';
    if (!diagramDecorByView[viewKey]) {
      diagramDecorByView[viewKey] = prefixDecorIds(diagramDecorHtml, viewKey);
    }
    return diagramDecorByView[viewKey];
  }

  function extractDiagramDecor(svgText) {
    if (!svgText || typeof DOMParser === 'undefined') return '';
    var doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    var svg = doc.documentElement;
    if (!svg) return '';
    var parts = [];
    var i;
    for (i = 0; i < svg.childNodes.length; i++) {
      var node = svg.childNodes[i];
      if (node.nodeType !== 1) continue;
      if (node.tagName === 'style') continue;
      if (node.id === 'layer1') {
        var clone = node.cloneNode(true);
        clone.setAttribute('opacity', '0');
        clone.setAttribute('pointer-events', 'none');
        parts.push(clone.outerHTML);
        continue;
      }
      parts.push(node.outerHTML);
    }
    return parts.join('');
  }

  function ensureDiagramProbe() {
    if (diagramProbeSvg) return diagramProbeSvg;
    if (typeof document === 'undefined') return null;
    var svgText = global.BODY_MAP_SVG_INLINE;
    if (!svgText) return null;
    if (!diagramDecorHtml) diagramDecorHtml = extractDiagramDecor(svgText);
    var host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-12000px;top:0;width:' + DIAGRAM_W + 'px;height:' + DIAGRAM_H + 'px;visibility:hidden;pointer-events:none';
    host.innerHTML = svgText;
    document.body.appendChild(host);
    diagramProbeSvg = host.querySelector('svg');
    return diagramProbeSvg;
  }

  function getDiagramCrop(viewKey) {
    if (diagramCropCache[viewKey]) return diagramCropCache[viewKey];
    var probe = ensureDiagramProbe();
    if (!probe) return null;
    var crop = Catalog.computeDiagramCrop(probe, viewKey);
    if (crop) diagramCropCache[viewKey] = crop;
    return crop;
  }

  function fitZoomDiagramRegions(zoomSvg, viewKey) {
    var probe = ensureDiagramProbe();
    if (!probe || !zoomSvg) return;
    var crop = Catalog.applyZoomWireRegions(probe, zoomSvg, viewKey);
    if (crop) diagramCropCache[viewKey] = crop;
    Catalog.cacheRegionAnchors(zoomSvg);
    cacheAnchorsFromSvg(zoomSvg);
  }

  /** Lookup map generated from catalog (single source of truth) */
  var SVG_REGION_META = {};
  Catalog.DUAL_REGION_SPECS.forEach(function (s) {
    SVG_REGION_META[s.id] = { part: s.part, side: s.side, figure: s.figure, group: s.group };
  });

  function region(id, part, side, figure, cx, cy, path, group) {
    return { id: id, part: part, side: side, figure: figure, cx: cx, cy: cy, path: path, group: group || '' };
  }

  var DUAL_REGIONS = Catalog.DUAL_REGION_SPECS.map(function (s) {
    return { id: s.id, part: s.part, side: s.side, figure: s.figure, group: s.group, cx: 50, cy: 50 };
  });

  var VIEWS = { dual: { regions: DUAL_REGIONS, vb: '0 0 ' + DIAGRAM_W + ' ' + DIAGRAM_H, w: DIAGRAM_W, h: DIAGRAM_H, label: 'Front and back', usesSvg: true } };
  Object.keys(Catalog.ZOOM_VIEWS).forEach(function (vk) {
    var z = Catalog.ZOOM_VIEWS[vk];
    VIEWS[vk] = { regions: z.regions, vb: z.vb, w: z.w, h: z.h, label: z.label };
  });

  function getRegionMeta(svgId) {
    return SVG_REGION_META[svgId] || Catalog.catalogMetaById(svgId) || null;
  }

  function recordViewFromRegion(r, canvasView) {
    if (canvasView === 'dual') return r.figure === 'back' ? 'back' : 'front';
    if (VIEWS[canvasView] && !VIEWS[canvasView].usesSvg) return canvasView;
    if (canvasView === 'front' || canvasView === 'back') return canvasView;
    return r.figure || 'front';
  }

  function figureLocalCoords(rootX, rootY, figure, svgW, svgH) {
    var halfW = svgW / 2;
    var figX0 = figure === 'back' ? halfW : 0;
    var figW = halfW;
    return {
      x: Math.max(0, Math.min(100, Math.round(((rootX - figX0) / figW) * 1000) / 10)),
      y: Math.max(0, Math.min(100, Math.round((rootY / svgH) * 1000) / 10)),
    };
  }

  function pathCenterInSvgRoot(path, svg) {
    var bbox = path.getBBox();
    var pt = svg.createSVGPoint();
    pt.x = bbox.x + bbox.width / 2;
    pt.y = bbox.y + bbox.height / 2;
    var ctm = path.getCTM();
    if (!ctm) return { x: pt.x, y: pt.y };
    var root = pt.matrixTransform(ctm);
    return { x: root.x, y: root.y };
  }

  function injectRegionStyles(doc) {
    if (doc.getElementById('body-map-region-styles')) return;
    var style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.id = 'body-map-region-styles';
    style.textContent = [
      '.body-region{fill:rgba(79,70,229,0);stroke:rgba(79,70,229,0);stroke-width:14px;stroke-linejoin:round;vector-effect:non-scaling-stroke;cursor:pointer;pointer-events:all;transition:fill .12s,stroke .12s}',
      '.body-region:hover{fill:rgba(79,70,229,0.18);stroke:#4f46e5;stroke-width:1.5}',
      '.body-region.selected{fill:rgba(79,70,229,0.28);stroke:#4f46e5;stroke-width:2}',
      '.body-region:focus{outline:none;fill:rgba(79,70,229,0.28);stroke:#4f46e5}',
      '.body-region-ref{pointer-events:none;fill:none;stroke:none}',
    ].join('');
    doc.documentElement.insertBefore(style, doc.documentElement.firstChild);
  }

  /** Wire diagram: #layer1 as reference anchors, #body-hit-mesh for all clicks */
  function wireSvgRegions(svgRoot, selectedId) {
    var doc, svg;
    if (svgRoot && svgRoot.contentDocument) {
      doc = svgRoot.contentDocument;
      svg = doc.documentElement;
    } else if (svgRoot && (svgRoot.ownerSVGElement || svgRoot.tagName === 'svg')) {
      svg = svgRoot.tagName === 'svg' ? svgRoot : svgRoot.ownerSVGElement;
      doc = svg.ownerDocument;
    } else {
      return 0;
    }
    var group = svg.getElementById ? svg.getElementById('layer1') : doc.getElementById('layer1');
    if (!group) return 0;

    injectRegionStyles(doc);
    group.setAttribute('opacity', '1');
    group.setAttribute('fill', 'none');
    group.setAttribute('pointer-events', 'none');

    svg.querySelectorAll(':scope > g:not(#layer1):not(#body-hit-mesh)').forEach(function (g) {
      g.setAttribute('pointer-events', 'none');
    });

    var count = Catalog.buildHitMesh(svg, selectedId);
    var mesh = svg.getElementById('body-hit-mesh');
    var group = svg.getElementById('layer1');
    if (mesh && group && mesh.parentNode === group) group.appendChild(mesh);
    return count;
  }

  function buildSvg(viewKey, selectedId) {
    var v = VIEWS[viewKey] || VIEWS.dual;
    if (v.usesSvg) {
      return '<div class="body-map-svg-slot" data-view="dual" aria-label="' + v.label + ' body map"></div>';
    }

    var zoomMeta = Catalog.ZOOM_VIEWS[viewKey] || {};
    var mirrorOf = zoomMeta.mirrorOf;
    var artKey = mirrorOf || viewKey;
    var art = Catalog.ZOOM_ART && Catalog.ZOOM_ART[artKey];
    var usesDiagram = Catalog.isZoomDiagramView(viewKey);
    var vbParts = (v.vb || '0 0 200 200').split(/\s+/);
    var vbW = parseFloat(vbParts[2]) || 200;
    var mirrorTransform = mirrorOf ? ' transform="scale(-1,1) translate(-' + vbW + ',0)"' : '';
    var diagramCrop = usesDiagram ? getDiagramCrop(viewKey) : null;
    var decorHtml = usesDiagram ? getDiagramDecorForView(viewKey) : '';

    var svgClass = 'body-anatomy-svg clinical zoom-view' + (usesDiagram ? ' diagram-zoom' : '') +
      (art && art.realistic ? ' realistic-chest' : '');
    var parts = [
      '<svg class="' + svgClass + '" data-view-key="' + viewKey + '" viewBox="' + v.vb + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + v.label + ' body map">',
      '<defs>',
      '<linearGradient id="zoom-skin" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#fbfdff"/><stop offset="1" stop-color="#eef2f7"/>',
      '</linearGradient>',
      '<radialGradient id="zoom-shade" cx="50%" cy="40%" r="55%">',
      '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#cbd5e1" stop-opacity="0.35"/>',
      '</radialGradient>',
      (art && art.extraDefs ? art.extraDefs : ''),
      '</defs>',
      '<rect width="100%" height="100%" fill="#ffffff"/>',
    ];

    if (usesDiagram && diagramCrop && decorHtml) {
      parts.push('<g class="clinical-decor diagram-crop" aria-hidden="true">');
      parts.push(
        '<svg viewBox="' + diagramCrop.x + ' ' + diagramCrop.y + ' ' + diagramCrop.w + ' ' + diagramCrop.h + '" ' +
        'width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'
      );
      parts.push(
        '<svg viewBox="0 0 ' + DIAGRAM_W + ' ' + DIAGRAM_H + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">'
      );
      parts.push(decorHtml);
      parts.push('</svg></svg></g>');
    } else if (art) {
      parts.push('<g class="clinical-decor' + (art.realistic ? ' realistic-anatomy' : '') + '"' + mirrorTransform + ' aria-hidden="true" stroke-linejoin="round" stroke-linecap="round">');
      if (!art.realistic && art.outline) {
        parts.push('<path d="' + art.outline + '" fill="url(#zoom-skin)" stroke="#0e0f0e" stroke-width="2.5"/>');
      }
      if (!art.realistic && art.shading) {
        parts.push('<path d="' + (typeof art.shading === 'string' ? art.shading : art.outline) + '" fill="url(#zoom-shade)" stroke="none"/>');
      }
      if (art.realistic) {
        parts.push('<rect width="100%" height="100%" fill="#faf8f4"/>');
      }
      (art.shapes || []).forEach(function (s) {
        if (s.type === 'ellipse') {
          parts.push('<ellipse cx="' + s.cx + '" cy="' + s.cy + '" rx="' + s.rx + '" ry="' + s.ry + '" fill="' + s.fill + '"' +
            (s.stroke && s.stroke !== 'none' ? ' stroke="' + s.stroke + '" stroke-width="' + (s.sw || 1) + '"' : '') + '/>');
        } else {
          parts.push('<path d="' + s.d + '" fill="' + (s.fill || 'none') + '"' +
            (s.stroke && s.stroke !== 'none' ? ' stroke="' + s.stroke + '" stroke-width="' + (s.sw || 1) + '"' : '') + '/>');
        }
      });
      (art.details || []).forEach(function (d) {
        var stroke = d.stroke || '#475569';
        parts.push('<path d="' + d.d + '" fill="none" stroke="' + stroke + '" stroke-width="' + (d.sw || 1.5) + '"' +
          (d['stroke-dasharray'] ? ' stroke-dasharray="' + d['stroke-dasharray'] + '"' : '') + '/>');
      });
      parts.push('</g>');
    }

    parts.push('<g class="body-regions"' + mirrorTransform + '>');
    v.regions.forEach(function (r) {
      var sel = selectedId === r.id ? ' selected' : '';
      var fig = r.figure || 'front';
      var grp = r.group ? ' data-group="' + r.group + '"' : '';
      parts.push(
        '<path class="body-region' + sel + '" data-id="' + r.id + '" data-part="' + r.part + '" data-side="' + r.side + '" data-figure="' + fig + '"' + grp + ' data-cx="' + r.cx + '" data-cy="' + r.cy + '" d="' + r.path + '" tabindex="0" role="button" aria-label="' + r.side + ' ' + r.part + '"/>'
      );
    });
    parts.push('</g></svg>');
    return parts.join('');
  }

  function loadInlineDiagram(slotEl, selectedId, done) {
    function mount(svgText) {
      slotEl.innerHTML = svgText;
      var svg = slotEl.querySelector('svg');
      if (!svg) return 0;
      svg.classList.add('body-anatomy-svg', 'clinical');
      svg.setAttribute('role', 'img');
      svg.style.display = 'block';
      svg.style.width = '100%';
      svg.style.height = 'auto';
      var n = wireSvgRegions(svg, selectedId);
      Catalog.cacheRegionAnchors(svg);
      cacheAnchorsFromSvg(svg);
      if (typeof done === 'function') done(svg, n);
      return n;
    }
    if (global.BODY_MAP_SVG_INLINE) return mount(global.BODY_MAP_SVG_INLINE);
    if (typeof fetch === 'function') {
      fetch(DIAGRAM_SVG).then(function (r) { return r.text(); }).then(mount).catch(function () {
        slotEl.innerHTML = '<p style="padding:24px;color:#64748b">Could not load body map SVG.</p>';
      });
      return 0;
    }
    return 0;
  }

  function getViewMeta(viewKey) {
    return VIEWS[viewKey] || VIEWS.dual;
  }

  function getRegionCount(viewKey) {
    return (VIEWS[viewKey] || VIEWS.dual).regions.length;
  }

  function totalRegions() {
    return listAllRegions().length;
  }

  function listAllRegions() {
    return Catalog.listAllCatalogRegions();
  }

  var cachedAnchors = {};

  function cacheAnchorsFromSvg(svg) {
    if (!svg) return cachedAnchors;
    svg.querySelectorAll('.body-region[data-id]').forEach(function (path) {
      var id = path.getAttribute('data-id');
      cachedAnchors[id] = {
        x: parseFloat(path.getAttribute('data-cx')),
        y: parseFloat(path.getAttribute('data-cy')),
        part: path.getAttribute('data-part'),
        side: path.getAttribute('data-side'),
        figure: path.getAttribute('data-figure'),
        group: path.getAttribute('data-group') || '',
      };
    });
    return cachedAnchors;
  }

  function getAnchor(regionId) {
    return cachedAnchors[regionId] || null;
  }

  function markerClassForRecordType(typeKey) {
    var map = {
      injury: 'm-injury', wound: 'm-wound', pressure: 'm-pressure', skin: 'm-skin',
      pain: 'm-pain', medication: 'm-med', device: 'm-pressure', other: 'm-injury',
    };
    return map[typeKey] || 'm-injury';
  }

  function markerClassForSubtype(typeKey, subtype) {
    if (typeKey === 'medication' && subtype) {
      var s = subtype.toLowerCase();
      if (s.indexOf('patch') >= 0) return 'm-patch';
      if (s.indexOf('injection') >= 0) return 'm-injection';
      if (s.indexOf('spray') >= 0) return 'm-spray';
      if (s.indexOf('cream') >= 0 || s.indexOf('ointment') >= 0 || s.indexOf('lotion') >= 0) return 'm-med';
    }
    if (typeKey === 'medication') return 'm-med';
    return markerClassForRecordType(typeKey);
  }

  function clientToMarkerLocal(clientX, clientY, hostEl, canvasView) {
    if (!hostEl) return null;
    var rect = hostEl.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    var px = ((clientX - rect.left) / rect.width) * 100;
    var py = ((clientY - rect.top) / rect.height) * 100;
    px = Math.max(0, Math.min(100, px));
    py = Math.max(0, Math.min(100, py));
    if (canvasView === 'dual') {
      if (px < 50) {
        return { view: 'front', canvasView: 'dual', x: Math.round((px / 50) * 1000) / 10, y: Math.round(py * 10) / 10 };
      }
      return { view: 'back', canvasView: 'dual', x: Math.round(((px - 50) / 50) * 1000) / 10, y: Math.round(py * 10) / 10 };
    }
    return { view: canvasView, canvasView: canvasView, x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10 };
  }

  function clientPointInPath(path, clientX, clientY) {
    if (!path || !path.isPointInFill) return false;
    var svg = path.ownerSVGElement;
    if (!svg) return false;
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var ctm = path.getScreenCTM();
    if (!ctm) return false;
    var local = pt.matrixTransform(ctm.inverse());
    try {
      if (path.isPointInFill(local)) return true;
      if (path.isPointInStroke && path.isPointInStroke(local)) return true;
    } catch (err) { /* ignore */ }
    return false;
  }

  /** isPointInFill ignores clip-path — test clip rect in layer1 space when present */
  function clientInClipRect(path, clientX, clientY, svg) {
    var clipUrl = path.getAttribute('clip-path');
    if (!clipUrl) return true;
    var idMatch = /#([^)]+)/.exec(clipUrl);
    if (!idMatch) return true;
    var clipEl = svg.getElementById(idMatch[1]);
    if (!clipEl) return true;
    var rect = clipEl.querySelector('rect');
    if (!rect) return true;
    var rx = parseFloat(rect.getAttribute('x'));
    var ry = parseFloat(rect.getAttribute('y'));
    var rw = parseFloat(rect.getAttribute('width'));
    var rh = parseFloat(rect.getAttribute('height'));
    if (isNaN(rx) || isNaN(ry) || isNaN(rw) || isNaN(rh)) return true;
    var layer1 = svg.getElementById('layer1');
    var ctm = layer1 ? layer1.getScreenCTM() : svg.getScreenCTM();
    if (!ctm) return true;
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var local = pt.matrixTransform(ctm.inverse());
    return local.x >= rx && local.x <= rx + rw && local.y >= ry && local.y <= ry + rh;
  }

  function inferSideFromCoords(coords, part) {
    if (!coords) return null;
    var frontFacing = coords.view === 'front';
    if (part === 'Head' || part === 'Neck') {
      if (frontFacing) {
        if (coords.x > 62) return 'Left';
        if (coords.x < 38) return 'Right';
      } else {
        if (coords.x < 38) return 'Left';
        if (coords.x > 62) return 'Right';
      }
      return 'Centre';
    }
    if (frontFacing) {
      if (coords.x > 60) return 'Left';
      if (coords.x < 40) return 'Right';
      return 'Centre';
    }
    if (coords.x < 40) return 'Left';
    if (coords.x > 60) return 'Right';
    return 'Centre';
  }

  function sideMatchBias(path, coords, part) {
    var pathSide = path.getAttribute('data-side');
    if (!pathSide || pathSide === 'Centre') return 0;
    var inferred = inferSideFromCoords(coords, part);
    if (!inferred || inferred === 'Centre') return 0;
    return pathSide === inferred ? 0 : 1;
  }

  function pathCenterRoot(path, svg) {
    return pathCenterInSvgRoot(path, svg);
  }

  function regionPriority(part) {
    return Catalog.regionPriority(part);
  }

  function pathArea(path) {
    try {
      var b = path.getBBox();
      return b.width * b.height;
    } catch (e) {
      return 99999;
    }
  }

  function sideFromPartName(part) {
    if (!part) return null;
    if (/^Left /i.test(part)) return 'Left';
    if (/^Right /i.test(part)) return 'Right';
    return null;
  }

  function anchorDistanceFromCoords(path, coords, canvasView) {
    if (!coords || !path) return 999;
    var figure = path.getAttribute('data-figure');
    if (canvasView === 'dual') {
      if (coords.view === 'front' && figure === 'back') return 999;
      if (coords.view === 'back' && figure === 'front') return 999;
    } else if (canvasView && canvasView !== figure) {
      return 999;
    }
    var cx = parseFloat(path.getAttribute('data-cx'));
    var cy = parseFloat(path.getAttribute('data-cy'));
    if (isNaN(cx) || isNaN(cy)) return 999;
    return Math.hypot(coords.x - cx, coords.y - cy);
  }

  function pickBestHitPath(paths, coords, canvasView) {
    if (!paths.length) return null;
    if (paths.length === 1) return paths[0];
    var partHint = paths[0].getAttribute('data-part') || '';
    return paths.slice().sort(function (a, b) {
      var aa = pathArea(a);
      var bb = pathArea(b);
      if (Math.abs(aa - bb) > 12) return aa - bb;
      var pa = regionPriority(a.getAttribute('data-part') || '');
      var pb = regionPriority(b.getAttribute('data-part') || '');
      if (pa !== pb) return pb - pa;
      var partHint = a.getAttribute('data-part') || '';
      var ba = sideMatchBias(a, coords, a.getAttribute('data-part') || partHint);
      var bbias = sideMatchBias(b, coords, b.getAttribute('data-part') || partHint);
      if (ba !== bbias) return ba - bbias;
      var da = anchorDistanceFromCoords(a, coords, canvasView);
      var db = anchorDistanceFromCoords(b, coords, canvasView);
      if (Math.abs(da - db) > 0.5) return da - db;
      return aa - bb;
    })[0];
  }

  function nearestRegionPath(svg, clientX, clientY, maxScreenPx, coords, canvasView) {
    if (!svg) return null;
    var candidates = [];
    svg.querySelectorAll('.body-region').forEach(function (path) {
      var dist = anchorDistanceFromCoords(path, coords, canvasView);
      if (dist >= 28) return;
      candidates.push({
        path: path,
        dist: dist,
        pri: regionPriority(path.getAttribute('data-part') || ''),
      });
    });
    if (!candidates.length) {
      var pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      var rootCtm = svg.getScreenCTM();
      if (!rootCtm) return null;
      var rootPt = pt.matrixTransform(rootCtm.inverse());
      var scale = Math.abs(rootCtm.a) || 1;
      var maxSvg = maxScreenPx / scale;
      svg.querySelectorAll('.body-region').forEach(function (path) {
        var figure = path.getAttribute('data-figure');
        if (canvasView === 'dual' && coords) {
          if (coords.view === 'front' && figure === 'back') return;
          if (coords.view === 'back' && figure === 'front') return;
        }
        var center = pathCenterRoot(path, svg);
        var dx = rootPt.x - center.x;
        var dy = rootPt.y - center.y;
        var screenDist = Math.sqrt(dx * dx + dy * dy);
        if (screenDist < maxSvg) {
          candidates.push({ path: path, dist: screenDist, pri: regionPriority(path.getAttribute('data-part') || '') });
        }
      });
    }
    if (!candidates.length) return null;
    candidates.sort(function (a, b) {
      if (Math.abs(a.dist - b.dist) > 3) return a.dist - b.dist;
      return b.pri - a.pri;
    });
    return candidates[0].path;
  }

  /** Head/neck only — parts named "Left eye" etc. already carry side */
  function refineSide(defaultSide, coords, part) {
    var implied = sideFromPartName(part);
    if (implied) return implied;
    if (defaultSide && defaultSide !== 'Centre') return defaultSide;
    if (!coords) return defaultSide || 'Centre';
    if (part === 'Head' || part === 'Neck') {
      return inferSideFromCoords(coords, part) || defaultSide || 'Centre';
    }
    return defaultSide || 'Centre';
  }

  function formatRegionLabel(part, side) {
    if (sideFromPartName(part)) return part;
    if (side && side !== 'Centre') return side + ' — ' + part;
    return part;
  }

  function resolveRegionAtClick(clientX, clientY, hostEl, canvasView) {
    if (!hostEl) return null;
    var svg = hostEl.querySelector('svg');
    if (!svg) return null;
    var coords = clientToMarkerLocal(clientX, clientY, hostEl, canvasView);
    if (!coords) return null;

    var paths = Array.prototype.slice.call(svg.querySelectorAll('.body-region'));
    var matches = [];
    var i;
    for (i = 0; i < paths.length; i++) {
      var fig = paths[i].getAttribute('data-figure');
      if (canvasView === 'dual') {
        if (coords.view === 'front' && fig === 'back') continue;
        if (coords.view === 'back' && fig === 'front') continue;
      }
      if (!clientPointInPath(paths[i], clientX, clientY)) continue;
      if (!clientInClipRect(paths[i], clientX, clientY, svg)) continue;
      matches.push(paths[i]);
    }
    var hitPath = pickBestHitPath(matches, coords, canvasView);
    if (!hitPath) hitPath = nearestRegionPath(svg, clientX, clientY, 72, coords, canvasView);
    if (!hitPath) return null;

    var part = hitPath.getAttribute('data-part');
    var side = refineSide(hitPath.getAttribute('data-side'), coords, part);
    return {
      path: hitPath,
      id: hitPath.getAttribute('data-id'),
      part: part,
      side: side,
      label: formatRegionLabel(part, side),
      figure: hitPath.getAttribute('data-figure'),
      group: hitPath.getAttribute('data-group') || '',
      coords: coords,
    };
  }

  function markerPosition(record, canvasView) {
    var x = record.x;
    var y = record.y;
    if (canvasView === 'dual') {
      if (record.view === 'back') return { left: (50 + x * 0.5) + '%', top: y + '%' };
      if (record.view === 'front') return { left: (x * 0.5) + '%', top: y + '%' };
      return { left: x + '%', top: y + '%' };
    }
    if (canvasView === record.view) return { left: x + '%', top: y + '%' };
    return null;
  }

  function getRegionFocus(regionId) {
    return Catalog.getRegionFocus(regionId);
  }

  global.BodyMapAnatomy = {
    VIEWS: VIEWS,
    DIAGRAM_SVG: DIAGRAM_SVG,
    SVG_REGION_META: SVG_REGION_META,
    BODY_PART_NAMES: Catalog.BODY_PART_NAMES,
    ANATOMY_GROUPS: Catalog.ANATOMY_GROUPS,
    buildSvg: buildSvg,
    wireSvgRegions: wireSvgRegions,
    loadInlineDiagram: loadInlineDiagram,
    getRegionMeta: getRegionMeta,
    getViewMeta: getViewMeta,
    getRegionCount: getRegionCount,
    totalRegions: totalRegions,
    recordViewFromRegion: recordViewFromRegion,
    markerPosition: markerPosition,
    figureLocalCoords: figureLocalCoords,
    clientToMarkerLocal: clientToMarkerLocal,
    resolveRegionAtClick: resolveRegionAtClick,
    refineSide: refineSide,
    formatRegionLabel: formatRegionLabel,
    inferSideFromCoords: inferSideFromCoords,
    clientPointInPath: clientPointInPath,
    viewKeys: Object.keys(VIEWS),
    listAllRegions: listAllRegions,
    cacheAnchorsFromSvg: cacheAnchorsFromSvg,
    getAnchor: getAnchor,
    getRegionFocus: getRegionFocus,
    ensureDiagramProbe: ensureDiagramProbe,
    fitZoomDiagramRegions: fitZoomDiagramRegions,
    cachedAnchors: cachedAnchors,
    markerClassForRecordType: markerClassForRecordType,
    markerClassForSubtype: markerClassForSubtype,
  };
})(typeof window !== 'undefined' ? window : this);
