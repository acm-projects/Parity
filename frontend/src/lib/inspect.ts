/** What we read from the element picked in the Elements panel. */
export interface ElementSnapshot {
  tag: string;
  selector: string;
  text: string;
  role: string;
  name: string; // accessible name
  interactive: boolean;
  native: boolean; // a real <button>, <a href>, <input>...
  explicitRole: string;
  hasOwnText: boolean;
  isImage: boolean;
  hasAlt: boolean;
  tabindex: number | null;
  ariaHidden: boolean;
  langSet: boolean;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string; // #rrggbb, blended with its background
  background: string; // #rrggbb, effective background
  width: number;
  height: number;
  padding: number; // average of the 4 sides
  gap: number;
  borderRadius: number;
  ancestry?: string; // class names of the element and all its parents, space separated
  pageTitle?: string; // document.title of the inspected page
  pagePath?: string; // location.pathname of the inspected page
}

/**
 * Runs inside the inspected page ($0 = the element selected in DevTools).
 * Kept as a plain string so the bundler cannot rewrite it.
 * Do not use backticks, dollar-brace or backslashes in here.
 */
export const COLLECT = `(function (el) {
  if (!el || el.nodeType !== 1 || el === document.documentElement || el === document.body) return null;
  var cs = getComputedStyle(el);
  function px(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function round1(n) { return Math.round(n * 10) / 10; }
  function parse(c) {
    c = c || '';
    var i = c.indexOf('('), j = c.lastIndexOf(')');
    if (c.indexOf('rgb') !== 0 || i < 0 || j < 0) return null;
    var p = c.slice(i + 1, j).replace(/,/g, ' ').replace('/', ' ').split(' ')
      .filter(function (s) { return s; })
      .map(function (s) { return s.slice(-1) === '%' ? parseFloat(s) / 100 : parseFloat(s); });
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function hex(c) {
    function h(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }
  function mix(top, under) {
    return {
      r: under.r * (1 - top.a) + top.r * top.a,
      g: under.g * (1 - top.a) + top.g * top.a,
      b: under.b * (1 - top.a) + top.b * top.a
    };
  }
  function bgOf(node) {
    var layers = [];
    for (var n = node; n && n.nodeType === 1; n = n.parentElement) {
      var c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    var base = { r: 255, g: 255, b: 255 };
    for (var i = layers.length - 1; i >= 0; i--) base = mix(layers[i], base);
    return base;
  }
  function nameOf(e) {
    var v = e.getAttribute('aria-label');
    if (v && v.trim()) return v.trim();
    var lb = e.getAttribute('aria-labelledby');
    if (lb) {
      var t = lb.split(' ').map(function (id) { var x = document.getElementById(id); return x ? x.textContent : ''; }).join(' ').trim();
      if (t) return t;
    }
    if (e.tagName === 'IMG') return (e.getAttribute('alt') || '').trim();
    if (e.labels && e.labels.length) {
      var s = Array.prototype.map.call(e.labels, function (l) { return l.textContent; }).join(' ').trim();
      if (s) return s;
    }
    if (e.tagName === 'INPUT' && (e.type === 'submit' || e.type === 'button') && e.value) return e.value;
    var txt = (e.innerText || e.textContent || '').trim();
    if (txt) return txt.replace(/  +/g, ' ').slice(0, 80);
    var ti = e.getAttribute('title');
    if (ti && ti.trim()) return ti.trim();
    var img = e.querySelector ? e.querySelector('img[alt]') : null;
    if (img && img.getAttribute('alt')) return img.getAttribute('alt');
    return '';
  }

  var bg = bgOf(el);
  var fg = parse(cs.color) || { r: 0, g: 0, b: 0, a: 1 };
  fg = mix(fg, bg);

  var tag = el.tagName;
  var lt = tag.toLowerCase();
  var explicitRole = (el.getAttribute('role') || '').toLowerCase();
  var inputType = tag === 'INPUT' ? (el.getAttribute('type') || 'text').toLowerCase() : '';
  var implicit = '';
  if (tag === 'A' && el.hasAttribute('href')) implicit = 'link';
  else if (tag === 'BUTTON' || inputType === 'button' || inputType === 'submit' || inputType === 'reset' || inputType === 'image') implicit = 'button';
  else if (inputType === 'checkbox') implicit = 'checkbox';
  else if (inputType === 'radio') implicit = 'radio';
  else if (tag === 'INPUT' || tag === 'TEXTAREA') implicit = 'textbox';
  else if (tag === 'SELECT') implicit = 'combobox';
  else if (tag === 'IMG') implicit = 'img';
  else if (/^H[1-6]$/.test(tag)) implicit = 'heading';

  var roleInteractive = ['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'option', 'textbox', 'combobox', 'slider'].indexOf(explicitRole) > -1;
  var native = (tag === 'A' && el.hasAttribute('href')) || tag === 'BUTTON' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'SUMMARY' || (tag === 'INPUT' && inputType !== 'hidden');
  var tiAttr = el.getAttribute('tabindex');
  var tabindex = tiAttr === null ? null : parseInt(tiAttr, 10);
  if (tabindex !== null && isNaN(tabindex)) tabindex = null;
  var insideNative = !!(el.parentElement && el.parentElement.closest('a[href],button,select,summary'));
  var clickable = !insideNative && (typeof el.onclick === 'function' || cs.cursor === 'pointer');
  var interactive = native || roleInteractive || (tabindex !== null && tabindex >= 0) || clickable;
  var isImage = tag === 'IMG' || (lt === 'svg' && explicitRole === 'img');

  var hasOwnText = false;
  for (var k = 0; k < el.childNodes.length; k++) {
    var cn = el.childNodes[k];
    if (cn.nodeType === 3 && cn.nodeValue.trim()) { hasOwnText = true; break; }
  }

  var sel = lt;
  if (el.id) sel += '#' + el.id;
  else if (typeof el.className === 'string' && el.className.trim()) {
    sel += '.' + el.className.trim().split(' ').filter(function (s) { return s; }).slice(0, 2).join('.');
  }

  var chain = [];
  for (var an = el; an && an.nodeType === 1; an = an.parentElement) {
    if (typeof an.className === 'string' && an.className.trim()) chain.push(an.className.trim());
  }

  var r = el.getBoundingClientRect();
  return {
    tag: lt,
    selector: sel,
    text: (el.innerText || '').trim().slice(0, 60),
    role: explicitRole || implicit,
    name: nameOf(el),
    interactive: interactive,
    native: native,
    explicitRole: explicitRole,
    hasOwnText: hasOwnText,
    isImage: isImage,
    hasAlt: el.hasAttribute('alt'),
    tabindex: tabindex,
    ariaHidden: el.getAttribute('aria-hidden') === 'true',
    langSet: !!(document.documentElement.getAttribute('lang') || '').trim(),
    fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').replace(/'/g, '').trim(),
    fontSize: px(cs.fontSize),
    fontWeight: parseInt(cs.fontWeight, 10) || 400,
    color: hex(fg),
    background: hex(bg),
    width: round1(r.width),
    height: round1(r.height),
    padding: round1((px(cs.paddingTop) + px(cs.paddingRight) + px(cs.paddingBottom) + px(cs.paddingLeft)) / 4),
    gap: round1(px(cs.columnGap) || px(cs.rowGap)),
    borderRadius: round1(px(cs.borderTopLeftRadius)),
    ancestry: chain.join(' '),
    pageTitle: document.title || '',
    pagePath: location.pathname || '/'
  };
})($0)`;

/** Used by the dev-only "Try element example" button (no DevTools needed). */
export const SAMPLE_ELEMENT: ElementSnapshot = {
  tag: "div",
  selector: "div.signup-btn",
  text: "Sign up",
  role: "",
  name: "Sign up",
  interactive: true,
  native: false,
  explicitRole: "",
  hasOwnText: true,
  isImage: false,
  hasAlt: false,
  tabindex: null,
  ariaHidden: false,
  langSet: true,
  fontFamily: "Inter",
  fontSize: 14,
  fontWeight: 600,
  color: "#A99BE0",
  background: "#FFFFFF",
  width: 96,
  height: 32,
  padding: 8,
  gap: 0,
  borderRadius: 0,
};