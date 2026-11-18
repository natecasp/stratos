/* Hairline figures for the Stratos site. Each figure registers itself with
   hairline(); after the page renders, every <img> still of a figure is swapped
   for the live figure, which answers the pointer and walks its own tour while
   it is on screen. Figures: Hairline (MIT, Lucas Marques); drawings: Stratos. */
(function () {
  'use strict';
  var FIGS = {};
  window.hairline = function (fig) { FIGS[fig.name] = fig; };
  var BY_FILE = { 'fig-book.svg': 'book', 'fig-hypotube.svg': 'spiral', 'fig-welding.svg': 'rotary', 'fig-flat-sheet.svg': 'nest', 'fig-grinding.svg': 'infeed' };
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function live(img) {
    if (img.closest('.bthumb')) return;   // article thumbnails stay still
    var file = (img.getAttribute('src') || '').split('/').pop(), fig = FIGS[BY_FILE[file]];
    if (!fig) return;
    var stage = document.createElement('div');
    stage.setAttribute('data-hairline', fig.name);
    stage.setAttribute('data-hairline-theme', 'dark');
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', img.getAttribute('alt') || fig.means);
    stage.style.cssText = '--hl-hi:#24a8f2;--hl-plate:#0a0a0b;width:100%';
    img.parentNode.replaceChild(stage, img);
    var svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage);
    var read = { textContent: '' };
    fig.mount({ stage: stage, svg: svg, read: read }, fig.range[1]);
    if (still || !window.IntersectionObserver) return;
    // on screen, an unseen pointer walks the figure's tour; a real pointer takes over
    var lap = null;
    new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting;
      if (on && !lap) lap = HL.tour(stage, fig.tour || HL.LAP);
      else if (!on && lap) { lap.stop(); lap = null; }
    }, { threshold: 0.4 }).observe(stage);
  }
  window.hairlineMountAll = function () {
    HL.inject(document);
    Array.prototype.slice.call(document.querySelectorAll('img[src*="assets/fig-"]')).forEach(live);
  };
})();

/* ---- spiral ---- */
(function () {
/**
 * Spiral: a hypotube held in a collet on a carriage, fed under a laser nozzle
 * that stands still. The pointer's place along the tube sets how far it has
 * been fed, on a spring: the collet pushes it forward, turning it, and every
 * ring that has passed under the nozzle carries an interrupted spiral. Move
 * back and the tube runs back. The newest slot is bright. The slider is how far
 * the pattern turns from one ring of slots to the next.
 *
 * The pattern: scrub. One spring, a hit test on the fixed plane of the
 * tube's axis, and a rest with half the tube already cut.
 */
const {
  Cam, clamp, fit, hull, open, poly, proj, rings, unproj, spring, stepS,
  disposer, mk, pointer, put, prism, register, solid,
} = HL;

const ZC = 46, R = 11, DX = 6, XN = 30, F = 120, REST = 0.55, ROT = 0.06;
const TIP = XN + 3, CF = -127, CL = 22, RC = 26;   // the free end and the collet's face, at feed 0
const RS = []; for (let s = 4; s <= F + 2; s += DX) RS.push(s);
const VY = 0.612, VZ = 0.5;
const faces = (th) => VY * Math.cos(th) + VZ * Math.sin(th) > 0.02;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let TW = value;
  const C = Cam(45, 0.5, 1.4);
  fit(C, [[-160, -40, -6], [140, 40, -6], [140, -40, -6], [-160, 40, -6], [XN, 0, ZC + 62], [TIP + F, 0, ZC], [CF - CL, 0, ZC + RC]], 200, 166);
  const P = proj(C);
  const ring = (x, z, r, n = 36) => { const o = []; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; o.push(P(x, r * Math.cos(a), z + r * Math.sin(a))); } return o; };

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-160, -40, 140, 40, 12, 2.2);
  put(solid(g), prism(P, () => true, br, bi, -6, 0));
  // the rail the carriage runs on
  const [rr, ri] = rings(CF - CL - 8, -9, CF + F + 6, 9, 3, 1);
  put(solid(g), prism(P, () => true, rr, ri, 0, 4));
  // the carriage and the collet on it; they move with the tube
  const ped = solid(g);
  const colSil = mk("path", { class: "sil" }, g), colFace = mk("path", { class: "nf" }, g);
  const mark = mk("path", { class: "nf lo" }, g);

  // the tube, from the collet's face to its free end: opaque segments, then its two edges, so it reads as one tube
  const xs = []; for (let x = CF; x < TIP - 0.01; x += DX) xs.push(x);
  const segs = xs.map(() => mk("path", { class: "fo" }, g));
  const slots = RS.map(() => mk("path", { class: "nf" }, g));
  const edgeA = mk("path", { class: "nf sil" }, g), edgeB = mk("path", { class: "nf sil" }, g);
  const endFace = mk("path", { class: "nf" }, g), lumen = mk("path", { class: "nf lo" }, g);
  // the nozzle, fixed: a tapered body over the tube, and a dashed guide to its focus
  const nz = solid(g), guide = mk("path", { class: "nf dash" }, g);
  const disc = (n) => { const o = []; for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; o.push([XN + n * Math.cos(a), n * Math.sin(a)]); } return o; };
  const ztip = ZC + R + 10;
  nz.sil.setAttribute("d", poly(hull(disc(4).map(([x, y]) => P(x, y, ztip)).concat(disc(10).map(([x, y]) => P(x, y, ztip + 28)), disc(10).map(([x, y]) => P(x, y, ztip + 46))))));
  nz.cr.setAttribute("d", open(disc(8.6).filter((_, k) => k < 13).map(([x, y]) => P(x, y, ztip + 46))));
  guide.setAttribute("d", open([P(XN, 0, ztip), P(XN, 0, ZC + R)]));

  const sp = spring(REST, { eps: 0.002 });
  let shown = "";
  function draw() {
    const f = clamp(sp.x, 0, 1), u = f * F, rot = u * ROT;
    const key = f.toFixed(4) + TW;
    if (key === shown) return;
    shown = key;
    // the collet and its carriage, carried forward by the feed
    const cf = CF + u;
    const [qr, qi] = rings(cf - CL + 2, -16, cf - 2, 16, 4, 1.2);
    put(ped, prism(P, () => true, qr, qi, 4, ZC - RC + 2));
    colSil.setAttribute("d", poly(hull(ring(cf - CL, ZC, RC).concat(ring(cf, ZC, RC)))));
    colFace.setAttribute("d", poly(ring(cf, ZC, RC)));
    mark.setAttribute("d", open([P(cf + 0.2, (R + 4) * Math.cos(rot), ZC + (R + 4) * Math.sin(rot)), P(cf + 0.2, (RC - 3) * Math.cos(rot), ZC + (RC - 3) * Math.sin(rot))]));
    // the tube
    xs.forEach((x, j) => segs[j].setAttribute("d", poly(hull(ring(x + u, ZC, R).concat(ring(Math.min(x + DX, TIP) + u, ZC, R))))));
    let newest = -1;
    RS.forEach((s, i) => {
      if (u < s - 2) { slots[i].setAttribute("d", ""); return; }
      newest = i;
      // two arcs of slot per ring, a strut between, turned a step each ring and with the tube: the interrupted spiral
      const x = TIP - s + u, th0 = i * TW + rot;
      let d = "";
      for (const [a0, a1] of [[th0, th0 + 2.1], [th0 + 3.14, th0 + 5.24]]) {
        const run = [];
        for (let k = 0; k <= 10; k++) {
          const a = a0 + ((a1 - a0) * k) / 10;
          if (faces(a)) run.push(P(x, (R + 0.05) * Math.cos(a), ZC + (R + 0.05) * Math.sin(a)));
          else if (run.length) { if (run.length > 1) d += open(run); run.length = 0; }
        }
        if (run.length > 1) d += open(run);
      }
      slots[i].setAttribute("d", d);
    });
    slots.forEach((el, i) => el.classList.toggle("hi", i === newest));
    // the edges: the points of the end rings farthest either side of the axis as it runs on screen
    const c0 = P(0, 0, ZC), c1 = P(1, 0, ZC), nx = -(c1[1] - c0[1]), ny = c1[0] - c0[0];
    const top = [], bot = [];
    for (const x of [cf, TIP + u]) {
      let hi = null, lo = null, bh = -1e9, bl = 1e9;
      for (const p of ring(x, ZC, R, 48)) { const v = p[0] * nx + p[1] * ny; if (v > bh) { bh = v; hi = p; } if (v < bl) { bl = v; lo = p; } }
      top.push(hi); bot.push(lo);
    }
    edgeA.setAttribute("d", open(top)); edgeB.setAttribute("d", open(bot));
    endFace.setAttribute("d", poly(ring(TIP + u, ZC, R)));
    lumen.setAttribute("d", poly(ring(TIP + u + 0.5, ZC, R - 2.6)));
  }
  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  /** The pointer on the plane of the tube's axis, which never moves: further along feeds the tube further. */
  function aim(p) {
    const [x] = unproj(C, p[0], p[1], ZC);
    sp.t = clamp((x + 110) / 240, 0, 1);
    read.textContent = "feed " + Math.round(sp.t * 100) + "%";
    B.wake();
  }
  read.textContent = "rest";
  bag.add(pointer(stage, { move: aim, leave: () => { sp.t = REST; read.textContent = "rest"; B.wake(); } }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { TW = v; shown = ""; B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "spiral",
  means: "A hypotube fed and turned under a fixed laser nozzle: point along it to feed it through and cut an interrupted spiral.",
  rules: [1, 3, 5, 8],
  range: [0.6, 0.95, 1.3],
  tour: [[300, 230], [150, 140], [260, 200], [120, 125], null],
  mount,
});
})();

/* ---- rotary ---- */
(function () {
/**
 * Rotary: two tubes butt-joined in a rotary chuck under a fixed laser nozzle.
 * The pointer's sweep turns the work, on a spring: as it turns, the nozzle lays
 * overlapping weld spots at the top of the joint, and the finished bead rolls
 * down and round with the tube; marks on both tubes turn with it. The spot
 * under the nozzle is bright. The slider is how many spots make one turn.
 *
 * The pattern: scrub. One spring, a hit test on fixed screen bounds, and a
 * rest with the weld half way round.
 */
const {
  Cam, clamp, fit, hull, open, poly, proj, rings, spring, stepS,
  disposer, mk, place, pointer, put, prism, register, solid,
} = HL;

const ZC = 48, R = 15, XA = -118, XB = 112, TAU = Math.PI * 2, REST = 0.22;
const VY = 0.612, VZ = 0.5, faces = (th) => VY * Math.cos(th) + VZ * Math.sin(th) > 0.05;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let n = Math.round(value);
  const C = Cam(45, 0.5, 1.3);
  fit(C, [[-146, -40, -6], [120, 40, -6], [120, -40, -6], [-146, 40, -6], [0, 0, ZC + R + 62], [XB, 0, ZC - R]], 200, 166);
  const P = proj(C);
  const ring = (x, r, k = 40) => { const o = []; for (let i = 0; i < k; i++) { const a = (i / k) * TAU; o.push(P(x, r * Math.cos(a), ZC + r * Math.sin(a))); } return o; };
  const onTube = (x, r, th) => P(x, r * Math.cos(th), ZC + r * Math.sin(th));

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-146, -40, 120, 40, 12, 2.2);
  put(solid(g), prism(P, () => true, br, bi, -6, 0));
  // the rotary chuck: a pedestal, its body, its face, and three jaws on the face
  const [pr, pi] = rings(-142, -18, -122, 18, 4, 1.2);
  put(solid(g), prism(P, () => true, pr, pi, 0, ZC - 28));
  mk("path", { class: "sil", d: poly(hull(ring(-146, 32).concat(ring(XA, 32)))) }, g);
  mk("path", { class: "nf", d: poly(ring(XA, 32)) }, g);
  const jaws = mk("path", { class: "nf lo" }, g);
  const far = mk("path", { class: "sil" }, g), farMarks = mk("path", { class: "nf lo" }, g);
  const near = mk("path", { class: "sil" }, g), nearMarks = mk("path", { class: "nf lo" }, g);
  mk("path", { class: "nf", d: poly(ring(XB, R)) }, g);
  mk("path", { class: "nf lo", d: poly(ring(XB + 0.5, R - 3)) }, g);
  far.setAttribute("d", poly(hull(ring(XA, R).concat(ring(0, R)))));
  near.setAttribute("d", poly(hull(ring(0, R).concat(ring(XB, R)))));
  const joint = mk("path", { class: "nf lo" }, g), bead = mk("path", { class: "nf" }, g), spots = mk("g", {}, g);
  // the nozzle over the joint, and a dashed guide to its focus
  const disc = (r) => { const o = []; for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; o.push([r * Math.cos(a), r * Math.sin(a)]); } return o; };
  const zt = ZC + R + 9, nz = solid(g);
  nz.sil.setAttribute("d", poly(hull(disc(3.5).map(([x, y]) => P(x, y, zt)).concat(disc(9).map(([x, y]) => P(x, y, zt + 26)), disc(9).map(([x, y]) => P(x, y, zt + 44))))));
  nz.cr.setAttribute("d", open(disc(7.6).filter((_, i) => i < 13).map(([x, y]) => P(x, y, zt + 44))));
  mk("path", { class: "nf dash", d: open([P(0, 0, zt), P(0, 0, ZC + R)]) }, g);

  const vis = (a0, a1, x, r) => { let d = "", run = []; for (let i = 0; i <= 24; i++) { const a = a0 + ((a1 - a0) * i) / 24; if (faces(a)) run.push(onTube(x, r, a)); else { if (run.length > 1) d += open(run); run = []; } } if (run.length > 1) d += open(run); return d; };
  joint.setAttribute("d", vis(-Math.PI, Math.PI, 0, R));

  const sp = spring(REST * TAU, { eps: 0.002 });
  let shown = "";
  function draw() {
    const phi = clamp(sp.x, 0, TAU), key = phi.toFixed(4) + n;
    if (key === shown) return;
    shown = key;
    const top = Math.PI / 2;
    // the bead: laid from the nozzle back round through the angle turned, seen where it faces us
    bead.setAttribute("d", phi > 0.02 ? vis(top - phi, top, -2.6, R + 0.9) + vis(top - phi, top, 2.6, R + 0.9) : "");
    spots.replaceChildren();
    const step = TAU / n, laid = Math.floor(phi / step);
    for (let k = 0; k <= laid; k++) {
      const a = top - (phi - k * step);
      if (!faces(a)) continue;
      const el = mk("circle", { r: 2.3, class: k === laid ? "dot" : "dot m" }, spots);
      place(el, onTube(0, R + 1.2, a));
    }
    // marks that turn with the work, so the turn reads on both tubes and the chuck
    const marks = (x0, x1) => [0, TAU / 3, (2 * TAU) / 3].map((b) => b - phi).filter(faces).map((a) => open([onTube(x0, R, a), onTube(x1, R, a)])).join("");
    farMarks.setAttribute("d", marks(-86, -30));
    nearMarks.setAttribute("d", marks(30, 86));
    jaws.setAttribute("d", [0.4, 0.4 + TAU / 3, 0.4 + (2 * TAU) / 3].map((b) => b - phi).map((a) => open([onTube(XA, 18, a), onTube(XA, 28, a)])).join(""));
  }
  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  /** Fixed screen bounds, which never move: left to right turns the work once round. */
  function aim(p) {
    sp.t = clamp((p[0] - 70) / 260, 0, 1) * TAU;
    read.textContent = "weld " + Math.round((sp.t / TAU) * 360) + "°";
    B.wake();
  }
  read.textContent = "rest";
  bag.add(pointer(stage, { move: aim, leave: () => { sp.t = REST * TAU; read.textContent = "rest"; B.wake(); } }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { n = Math.round(clamp(v, 12, 72)); shown = ""; B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "rotary",
  means: "Two tubes turn under a laser: each turn lays overlapping weld spots round the butt joint, and the bead rolls round with them.",
  rules: [1, 3, 5, 8],
  range: [24, 36, 52],
  tour: [[110, 160], [230, 160], [320, 160], null],
  mount,
});
})();

/* ---- nest ---- */
(function () {
/**
 * Nest: a thin sheet with twelve parts laser-cut and nested in it, each a
 * rounded tab with a pierced hole, sitting in its own kerf. The pointer is put
 * on the sheet; the part under it lifts out, its neighbours less, each on its
 * own spring, and leaves its cut-out showing. At rest one part is already
 * half out. The slider is the reach, in parts.
 *
 * The pattern: a field. Springs, a falloff by distance, a hit test on the
 * sheet's plane (which never moves), and a rest that is a composition.
 */
const {
  Cam, circ, clamp, facing, fit, open, poly, proj, rings, ringAt, run, unproj,
  spring, stepS, disposer, mk, pointer, put, prism, register, solid,
} = HL;

const NX = 4, NY = 3, CELL = 34, PW = 26, T = 3, LIFT = 26, EX = NX * CELL, EY = NY * CELL;
const falloff = (u) => (u <= 0 ? 1 : u <= 0.5 ? 1 - u * 1.3 : u <= 1 ? 0.35 - (u - 0.5) * 0.6 : 0.05);
const at = (ring, cx, cy) => ring.map((q) => ({ u: q.u + cx, v: q.v + cy, nu: q.nu, nv: q.nv }));
const REST = [[1, 1, 13], [2, 1, 4], [1, 2, 3], [0, 1, 2]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-8, -8, -T], [EX + 8, EY + 8, -T], [EX + 8, -8, -T], [-8, EY + 8, -T], [0, 0, LIFT + T], [EX, 0, LIFT + T]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [sr, si] = rings(-8, -8, EX + 8, EY + 8, 8, 1.6);
  put(solid(g), prism(P, front, sr, si, -T, 0));
  const parts = [], rest = (i, j) => (REST.find((r) => r[0] === i && r[1] === j) || [0, 0, 0])[2];
  // back to front: by i + j from the far corner
  for (let s = 0; s <= NX + NY - 2; s++) for (let i = 0; i < NX; i++) {
    const j = s - i;
    if (j < 0 || j >= NY) continue;
    const x0 = i * CELL + (CELL - PW) / 2, y0 = j * CELL + (CELL - PW) / 2;
    const [ring, inner] = rings(x0, y0, x0 + PW, y0 + PW, 6, 1.1);
    // the kerf the part was cut from, on the sheet, seen once the part lifts
    mk("path", { d: poly(ringAt(P, ring, 0)), class: "nf lo" }, g);
    const h0 = rest(i, j);
    parts.push({ i, j, ring, inner, h0, hole: circ(3.2, 24), cx: x0 + PW / 2, cy: y0 + PW / 2, sp: spring(h0, { eps: 0.05 }), el: solid(g), dot: mk("path", { class: "nf" }, g), drawn: NaN });
  }
  const peak = parts.reduce((a, b) => (b.h0 > a.h0 ? b : a));
  let lit = peak;
  lit.el.sil.classList.add("hi");

  function draw(p) {
    const h = clamp(p.sp.x, 0, LIFT + 4);
    if (h === p.drawn) return;
    p.drawn = h;
    // only what stands above the sheet is drawn: a seated part is flush, a kerf outline
    put(p.el, prism(P, front, p.ring, p.inner, Math.max(0, h - T), Math.max(h, 0.05)));
    p.dot.setAttribute("d", poly(ringAt(P, at(p.hole, p.cx, p.cy), h)));
  }
  const B = register(stage, (dt) => { let m = false; for (const p of parts) { if (stepS(p.sp, dt)) m = true; draw(p); } return m; });
  bag.add(B.unregister);

  let over = null;
  function retarget() {
    let want = peak;
    if (over) {
      const ci = clamp(Math.floor(over[0] / CELL), 0, NX - 1), cj = clamp(Math.floor(over[1] / CELL), 0, NY - 1);
      for (const p of parts) p.sp.t = LIFT * falloff(Math.hypot(p.i - ci, p.j - cj) / reach);
      want = parts.find((p) => p.i === ci && p.j === cj);
      read.textContent = `part ${ci + 1}·${cj + 1}`;
    } else { for (const p of parts) p.sp.t = p.h0; read.textContent = "rest"; }
    if (want !== lit) { lit.el.sil.classList.remove("hi"); want.el.sil.classList.add("hi"); lit = want; }
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (pt) => { const w = unproj(C, pt[0], pt[1], 0); over = w[0] > -8 && w[1] > -8 && w[0] < EX + 8 && w[1] < EY + 8 ? w : null; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { reach = v; if (over) retarget(); }, destroy: bag.dispose };
}

hairline({
  name: "nest",
  means: "Parts laser-cut from a flat sheet: the one you point at lifts out of its kerf, its neighbours less.",
  rules: [1, 3, 5, 6],
  range: [0.8, 1.4, 2.2],
  tour: [[150, 150], [250, 170], [200, 210], null],
  mount,
});
})();

/* ---- infeed ---- */
(function () {
/**
 * Infeed: a centerless grinder. A tube lies on a work-rest blade between a
 * large grinding wheel and a smaller regulating wheel, all on one bed. The
 * pointer's place along the tube's axis feeds it through, on a spring: what
 * has passed the wheels comes out ground, a step smaller, on the bright edge;
 * what waits upstream is raw stock. The slider is how much the grind removes.
 *
 * The pattern: scrub. One spring, a hit test on the fixed plane of the tube's
 * axis, and a rest with the tube half fed.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, proj, rings, unproj, spring, stepS,
  disposer, mk, pointer, put, prism, register, solid,
} = HL;

const TY = 7, TZ = 26, R0 = 10, L = 130, WX0 = 0, WX1 = 34, XMIN = -140, XMAX = -14, REST = 0.4;
const GW = { y: -45, z: 56, r: 48, hub: 12 }, RW = { y: 52, z: 44, r: 34, hub: 9 };

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let depth = value;
  const C = Cam(45, 0.5, 1.12);
  fit(C, [[-128, -100, -6], [124, 92, -6], [124, -100, -6], [-128, 92, -6], [WX0, GW.y, GW.z + GW.r], [WX1, RW.y + RW.r, RW.z], [XMAX + L, TY + R0, TZ]], 200, 166);
  const P = proj(C), front = facing(C);
  /** A ring round the x axis at x, centred on (y, z). */
  const xring = (x, y, z, r, n = 40) => { const o = []; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; o.push(P(x, y + r * Math.cos(a), z + r * Math.sin(a))); } return o; };
  /** A solid lying along x from x0 to x1: its silhouette and its near face, the +x end, which faces the camera. */
  const xcyl = (x0, x1, y, z, r) => ({ sil: poly(hull(xring(x0, y, z, r).concat(xring(x1, y, z, r)))), face: poly(xring(x1, y, z, r)) });

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-128, -100, 124, 92, 12, 2.2);
  put(solid(g), prism(P, front, br, bi, -6, 0));
  /** A wheel: its body, its face, and a hub set into the face. */
  function wheel(w) {
    const c = xcyl(WX0, WX1, w.y, w.z, w.r), el = solid(g);
    el.sil.setAttribute("d", c.sil);
    mk("path", { d: c.face, class: "nf" }, g);
    mk("path", { d: poly(xring(WX1, w.y, w.z, w.r - 2.2)), class: "nf lo" }, g);
    mk("path", { d: poly(xring(WX1 + 2, w.y, w.z, w.hub)), class: "nf" }, g);
    // a pedestal under the wheel
    const [pr, pi] = rings(WX0 + 4, w.y - 14, WX1 - 4, w.y + 14, 4, 1.2);
    put(solid(g), prism(P, front, pr, pi, 0, Math.max(2, w.z - w.r + 2)));
  }
  wheel(GW);
  // the work-rest blade, under the tube, running its whole length
  const [wr, wi] = rings(-96, TY - 2.5, 80, TY + 2.5, 1.2, 0.6);
  put(solid(g), prism(P, front, wr, wi, 0, TZ - R0));
  const raw = solid(g), rawFace = mk("path", { class: "nf" }, g);
  const ground = solid(g), lum = mk("path", { class: "nf lo" }, g), gFace = mk("path", { class: "nf" }, g);
  ground.sil.classList.add("hi");
  wheel(RW);

  const sp = spring(REST, { eps: 0.002 });
  let shown = "";
  function draw() {
    const f = clamp(sp.x, 0, 1), xs = XMIN + f * (XMAX - XMIN), xe = xs + L, r1 = R0 - depth, mid = (WX0 + WX1) / 2;
    const key = f.toFixed(4) + depth;
    if (key === shown) return;
    shown = key;
    const rc = xcyl(xs, Math.min(mid, xe), TY, TZ, R0);
    raw.sil.setAttribute("d", rc.sil);
    rawFace.setAttribute("d", xe <= mid ? rc.face : "");
    if (xe > mid) {
      const gc = xcyl(mid, xe, TY, TZ, r1);
      ground.sil.setAttribute("d", gc.sil);
      gFace.setAttribute("d", gc.face);
      lum.setAttribute("d", poly(xring(xe, TY, TZ, r1 * 0.62, 28)));
    }
    read.textContent = read.textContent === "rest" ? "rest" : "ground " + Math.round(Math.max(0, xe - mid));
  }
  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  /** The pointer, put on the plane of the tube's axis, which never moves: where along x it is sets the feed. */
  function aim(p) {
    const [x] = unproj(C, p[0], p[1], TZ);
    sp.t = clamp((x + L / 2 - 30 - XMIN) / (XMAX - XMIN), 0, 1);
    read.textContent = "ground " + Math.round(Math.max(0, XMIN + sp.t * (XMAX - XMIN) + L - (WX0 + WX1) / 2));
    shown = ""; B.wake();
  }
  read.textContent = "rest";
  bag.add(pointer(stage, { move: aim, leave: () => { sp.t = REST; read.textContent = "rest"; shown = ""; B.wake(); } }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { depth = clamp(v, 0.5, 4); shown = ""; B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "infeed",
  means: "A tube fed between grinding and regulating wheels: point along it to feed it through, and it comes out ground.",
  rules: [1, 3, 5, 6],
  range: [1.5, 2.5, 3.5],
  tour: [[150, 134], [225, 173], [272, 197], null],
  mount,
});
})();

/* ---- book ---- */
(function () {
/**
 * Book: an open book lying on a plate, a page caught mid-turn. Each half is a
 * block of pages whose top sheet rises from the spine; the left page carries
 * lines of text, the right a small drawing of a cut hypotube. The pointer's
 * place across the book sets how far the loose page has turned, on a spring;
 * its free edge is the bright mark. The slider is how much the page curls as
 * it turns.
 *
 * The pattern: scrub. One spring, a hit test on the fixed plane of the open
 * pages, and a rest with the page a third of the way over.
 */
const {
  Cam, clamp, fit, hull, open, poly, proj, rings, unproj, spring, stepS,
  disposer, mk, pointer, put, prism, register, solid,
} = HL;

const W = 74, D = 52, ZB = 4, ZP = 14, REST = 0.36, N = 26;
const lift = (u) => ZB + (ZP - ZB) * (1 - Math.exp(-u / 9));     // a page's height at distance u from the spine

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let CURL = value;
  const C = Cam(45, 0.5, 1.38);
  fit(C, [[-W - 10, -D - 10, -6], [W + 10, D + 10, -6], [W + 10, -D - 10, -6], [-W - 10, D + 10, -6], [0, -D, ZP + W * 0.95], [0, D, ZP + W * 0.95]], 200, 160);
  const P = proj(C);
  const path = (pts, close) => (close ? poly(pts) : open(pts));

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-W - 26, -D - 22, W + 26, D + 22, 12, 2.2);
  put(solid(g), prism(P, () => true, br, bi, -6, 0));
  // the cover, a board just larger than the pages
  const [cr, ci] = rings(-W - 4, -D - 4, W + 4, D + 4, 3, 1);
  put(solid(g), prism(P, () => true, cr, ci, 0, ZB - 1.5));

  /** A sheet bent along x and running straight along y: its curve in (x, z), swept from y0 to y1. */
  function sheet(parent) {
    return { body: mk("path", { class: "fo" }, parent), a: mk("path", { class: "nf" }, parent), b: mk("path", { class: "nf" }, parent), ends: mk("path", { class: "nf" }, parent) };
  }
  function drawSheet(s, curve, y0, y1) {
    let d = "";
    for (let i = 0; i < curve.length - 1; i++) {
      const [x0, z0] = curve[i], [x1, z1] = curve[i + 1];
      let q = [P(x0, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z0)];
      const area = q.reduce((t, p, k) => { const n = q[(k + 1) % 4]; return t + p[0] * n[1] - n[0] * p[1]; }, 0);
      if (area < 0) q = q.reverse();
      d += poly(q);
    }
    s.body.setAttribute("d", d);
    s.a.setAttribute("d", path(curve.map(([x, z]) => P(x, y0, z)), false));
    s.b.setAttribute("d", path(curve.map(([x, z]) => P(x, y1, z)), false));
    const e = curve[curve.length - 1];
    s.ends.setAttribute("d", path([P(e[0], y0, e[1]), P(e[0], y1, e[1])], false));
  }

  /** One half of the book: the page block's near side, its fore-edge (right half only), and its top page. */
  function half(sign) {
    const h = { g: mk("g", {}, g) };
    const top = []; for (let i = 0; i <= N; i++) { const u = (W * i) / N; top.push([sign * u, lift(u)]); }
    // the side facing the viewer (y = +D), from the cover up to the top page
    const side = top.map(([x, z]) => P(x, D, z)).concat([P(sign * W, D, ZB - 1.5), P(0, D, ZB - 1.5)]);
    mk("path", { class: "fo", d: poly(side) }, h.g);
    mk("path", { class: "nf", d: poly(side) }, h.g);
    for (const f of [0.35, 0.65]) mk("path", { class: "nf lo", d: open(top.map(([x, z]) => P(x, D, ZB - 1.5 + (z - ZB + 1.5) * f))) }, h.g);
    if (sign > 0) {
      // the fore-edge: the page ends, stacked
      const fe = [P(W, -D, ZB - 1.5), P(W, D, ZB - 1.5), P(W, D, lift(W)), P(W, -D, lift(W))];
      mk("path", { class: "fo", d: poly(fe) }, h.g); mk("path", { class: "nf", d: poly(fe) }, h.g);
      for (const f of [0.3, 0.55, 0.8]) { const z = ZB - 1.5 + (lift(W) - ZB + 1.5) * f; mk("path", { class: "nf lo", d: open([P(W, -D, z), P(W, D, z)]) }, h.g); }
    }
    const s = sheet(h.g); drawSheet(s, top, -D, D);
    return h;
  }
  const left = half(-1), right = half(1);
  // what is printed: lines of text on the left page; on the right, a heading line and a cut hypotube
  const onPage = (x, y) => P(x, y, lift(Math.abs(x)) + 0.1);
  for (let r = 0; r < 9; r++) {
    const y = -D + 12 + r * 9.5, x0 = -W + 10, x1 = -14 - (r % 3 === 2 ? 22 : 0);
    mk("path", { class: "nf lo", d: open([onPage(x0, y), onPage((x0 + x1) / 2, y), onPage(x1, y)]) }, left.g);
  }
  mk("path", { class: "nf lo", d: open([onPage(16, -D + 12), onPage(44, -D + 12)]) }, right.g);
  const tubeY0 = -D + 26, tubeY1 = D - 14, tx = 40, tr = 6;
  for (const dx of [-tr, tr]) mk("path", { class: "nf", d: open([onPage(tx + dx, tubeY0), onPage(tx + dx, tubeY1)]) }, right.g);
  for (let k = 0; k < 9; k++) { const y = tubeY0 + 6 + k * 7.5, o = k % 2 ? 2 : -2; mk("path", { class: "nf lo", d: open([onPage(tx - tr + 1 + o, y), onPage(tx + tr - 1 + o, y)]) }, right.g); }

  // the page in the air: drawn over whichever half it lies above
  const turning = mk("g", {}, g);
  const page = sheet(turning);
  page.a.classList.add("sil"); page.b.classList.add("sil");
  page.ends.classList.add("hi");

  const sp = spring(REST, { eps: 0.002 });
  let shown = "";
  function draw() {
    const t = clamp(sp.x, 0, 1), key = t.toFixed(4) + CURL;
    if (key === shown) return;
    shown = key;
    // the page's centre line, built from its spine out: it leaves the spine at the turn's angle and curls back as it goes
    const th = t * Math.PI, curve = [[0, ZB + 0.6]];
    let x = 0, z = ZB + 0.6;
    for (let i = 1; i <= N; i++) {
      const s = i / N, a = th + CURL * Math.sin(th) * s * s * 0.9;
      const ds = W / N, rise = i < 3 ? (ZP - ZB) / 3 : 0;
      x += Math.cos(a) * ds; z += Math.sin(a) * ds + rise * (1 - Math.abs(Math.cos(th)));
      curve.push([x, Math.max(z, lift(Math.abs(x)) + 0.4)]);
    }
    drawSheet(page, curve, -D, D);
    // past halfway the page lies over the left half, so the right half is painted after it
    if (th > Math.PI / 2) g.insertBefore(turning, right.g); else g.appendChild(turning);
    read.textContent = t < 0.04 ? "closed" : t > 0.96 ? "turned" : "page " + Math.round(t * 100) + "%";
  }
  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  /** The pointer on the plane of the open pages: from the right edge to the left edge turns the page over. */
  function aim(p) {
    const [x] = unproj(C, p[0], p[1], ZP);
    sp.t = clamp((W - x) / (2 * W), 0, 1);
    B.wake();
  }
  read.textContent = "rest";
  bag.add(pointer(stage, { move: aim, leave: () => { sp.t = REST; B.wake(); } }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { CURL = v; shown = ""; B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "book",
  means: "An open book with a page caught mid-turn: point across it to turn the page; the slider is how much the page curls.",
  rules: [1, 3, 5, 8],
  range: [0.2, 0.7, 1.2],
  tour: [[300, 200], [200, 150], [120, 120], [240, 170], null],
  mount,
});
})();

hairlineMountAll();
