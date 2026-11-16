/* dc-lite: a small runtime for the Stratos pages. It renders one <template> of
   markup with {{holes}}, <sc-if> blocks, on* event holes and ref holes, driven
   by a component class (renderVals, setState, lifecycle), and updates only the
   bindings whose values changed. */
(function () {
  'use strict';
  var HOLE = /\{\{\s*([\w.$]+)\s*\}\}/g;
  var ONE = /^\{\{\s*([\w.$]+)\s*\}\}$/;

  function lookup(vals, path) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, vals);
  }
  function fill(tpl, vals) {
    return tpl.replace(HOLE, function (_, k) { var v = lookup(vals, k); return v == null || v === false ? '' : String(v); });
  }

  function DCLogic(props) { this.props = props || {}; this.state = null; }
  DCLogic.prototype.setState = function (patch) {
    var prev = this.state;
    var p = typeof patch === 'function' ? patch(prev || {}, this.props) : patch;
    this.state = Object.assign({}, prev || {}, p);
    if (this.__dc) this.__dc.schedule(prev);
  };
  DCLogic.prototype.renderVals = function () { return {}; };
  window.DCLogic = DCLogic;

  var EVT = { onclick: 'click', onsubmit: 'submit', onkeydown: 'keydown', onfocus: 'focus', onblur: 'blur', oninput: 'input' };

  function mount(tpl, Cls, props, host) {
    var frag = tpl.content.cloneNode(true);
    var binds = [], refs = [], current = {};

    function walk(node) {
      if (node.nodeType === 3) {
        if (node.nodeValue.indexOf('{{') >= 0) binds.push({ t: 'text', el: node, tpl: node.nodeValue, last: null });
        return;
      }
      if (node.nodeType !== 1) return;
      Array.prototype.slice.call(node.childNodes).forEach(walk);
      if (node.tagName.toLowerCase() === 'sc-if') {
        var m = ONE.exec((node.getAttribute('value') || '').trim());
        var anchor = document.createComment('if');
        var kids = Array.prototype.slice.call(node.childNodes);
        node.parentNode.replaceChild(anchor, node);
        binds.push({ t: 'if', anchor: anchor, kids: kids, key: m ? m[1] : 'false', shown: false });
        return;
      }
      Array.prototype.slice.call(node.attributes).forEach(function (a) {
        var name = a.name, val = a.value, m1 = ONE.exec(val.trim());
        if (name === 'hint-placeholder-val') { node.removeAttribute(name); return; }
        if (name === 'ref' && m1) { node.removeAttribute(name); refs.push({ el: node, key: m1[1] }); return; }
        if (name.indexOf('on') === 0 && m1) {
          node.removeAttribute(name);
          var tag = node.tagName.toLowerCase();
          var type = name === 'onchange' ? (tag === 'input' || tag === 'textarea' ? 'input' : 'change') : (EVT[name] || name.slice(2));
          var key = m1[1];
          node.addEventListener(type, function (e) { var fn = lookup(current, key); if (typeof fn === 'function') fn(e); });
          return;
        }
        if (val.indexOf('{{') >= 0) {
          if (name === 'value') node.removeAttribute('value');
          binds.push({ t: 'attr', el: node, name: name, tpl: val, last: null });
        }
      });
    }
    Array.prototype.slice.call(frag.childNodes).forEach(walk);

    function apply(vals) {
      current = vals;
      for (var i = 0; i < binds.length; i++) {
        var b = binds[i];
        if (b.t === 'text') { var s = fill(b.tpl, vals); if (s !== b.last) { b.el.nodeValue = s; b.last = s; } }
        else if (b.t === 'attr') {
          var v = fill(b.tpl, vals);
          if (v === b.last) continue;
          b.last = v;
          if (b.name === 'value') { if (b.el.value !== v) b.el.value = v; }
          else b.el.setAttribute(b.name, v);
        } else if (b.t === 'if') {
          var on = !!lookup(vals, b.key);
          if (on === b.shown) continue;
          b.shown = on;
          if (on) b.kids.forEach(function (k) { b.anchor.parentNode.insertBefore(k, b.anchor); });
          else b.kids.forEach(function (k) { if (k.parentNode) k.parentNode.removeChild(k); });
        }
      }
    }

    var inst = new Cls(props);
    var queued = false, prevState = null;
    inst.__dc = {
      schedule: function (prev) {
        if (!queued) prevState = prev;
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () {
          queued = false;
          apply(inst.renderVals());
          if (inst.componentDidUpdate) inst.componentDidUpdate(inst.props, prevState);
        });
      }
    };
    apply(inst.renderVals());
    host.appendChild(frag);
    refs.forEach(function (r) { var fn = lookup(current, r.key); if (typeof fn === 'function') fn(r.el); });
    // the select and textarea need their values after they are in the page
    binds.forEach(function (b) { if (b.t === 'attr' && b.name === 'value' && b.el.isConnected) b.el.value = b.last; });
    if (inst.componentDidMount) inst.componentDidMount();
    return inst;
  }
  window.DCLite = { mount: mount };
})();
