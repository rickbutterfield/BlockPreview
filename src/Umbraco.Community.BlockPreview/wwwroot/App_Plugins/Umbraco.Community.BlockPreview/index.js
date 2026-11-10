import { UMB_AUTH_CONTEXT as bt } from "@umbraco-cms/backoffice/auth";
import { UmbContextToken as _t } from "@umbraco-cms/backoffice/context-api";
import { nothing as Ct, html as X, ifDefined as De, unsafeHTML as wt, css as ae, property as x, state as M, customElement as le } from "@umbraco-cms/backoffice/external/lit";
import { UMB_BLOCK_WORKSPACE_CONTEXT as Ve } from "@umbraco-cms/backoffice/block";
import { UmbLitElement as vt } from "@umbraco-cms/backoffice/lit-element";
import { UMB_PROPERTY_DATASET_CONTEXT as mt } from "@umbraco-cms/backoffice/property";
import { UmbApiError as gt, tryExecute as S } from "@umbraco-cms/backoffice/resources";
import { UmbControllerBase as He } from "@umbraco-cms/backoffice/class-api";
import { UMB_BLOCK_GRID_ENTRY_CONTEXT as xt, UMB_BLOCK_GRID_MANAGER_CONTEXT as Et } from "@umbraco-cms/backoffice/block-grid";
import { UMB_CONTENT_WORKSPACE_CONTEXT as D } from "@umbraco-cms/backoffice/content";
import { observeMultiple as v, UmbStringState as Le } from "@umbraco-cms/backoffice/observable-api";
import { UMB_BLOCK_LIST_ENTRY_CONTEXT as Tt, UMB_BLOCK_LIST_MANAGER_CONTEXT as St } from "@umbraco-cms/backoffice/block-list";
import { UMB_BLOCK_SINGLE_ENTRY_CONTEXT as Ut, UMB_BLOCK_SINGLE_MANAGER_CONTEXT as Pt } from "@umbraco-cms/backoffice/block-single";
import { UMB_BLOCK_RTE_ENTRY_CONTEXT as Bt, UMB_BLOCK_RTE_MANAGER_CONTEXT as At } from "@umbraco-cms/backoffice/block-rte";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as qt } from "@umbraco-cms/backoffice/document";
const Ot = {
  bodySerializer: (t) => JSON.stringify(t, (e, s) => typeof s == "bigint" ? s.toString() : s)
};
function Dt({
  onRequest: t,
  onSseError: e,
  onSseEvent: s,
  responseTransformer: o,
  responseValidator: i,
  sseDefaultRetryDelay: n,
  sseMaxRetryAttempts: r,
  sseMaxRetryDelay: a,
  sseSleepFn: l,
  url: k,
  ...u
}) {
  let c;
  const b = l ?? ((h) => new Promise((p) => setTimeout(p, h)));
  return { stream: async function* () {
    let h = n ?? 3e3, p = 0;
    const w = u.signal ?? new AbortController().signal;
    for (; !w.aborted; ) {
      p++;
      const j = u.headers instanceof Headers ? u.headers : new Headers(u.headers);
      c !== void 0 && j.set("Last-Event-ID", c);
      try {
        const P = {
          redirect: "follow",
          ...u,
          body: u.serializedBody,
          headers: j,
          signal: w
        };
        let B = new Request(k, P);
        t && (B = await t(k, P));
        const y = await (u.fetch ?? globalThis.fetch)(B);
        if (!y.ok) throw new Error(`SSE failed: ${y.status} ${y.statusText}`);
        if (!y.body) throw new Error("No body in SSE response");
        const m = y.body.pipeThrough(new TextDecoderStream()).getReader();
        let _ = "";
        const Pe = () => {
          try {
            m.cancel();
          } catch {
          }
        };
        w.addEventListener("abort", Pe);
        try {
          for (; ; ) {
            const { done: pt, value: yt } = await m.read();
            if (pt) break;
            _ += yt, _ = _.replace(/\r\n?/g, `
`);
            const Be = _.split(`

`);
            _ = Be.pop() ?? "";
            for (const ft of Be) {
              const kt = ft.split(`
`), H = [];
              let Ae;
              for (const g of kt)
                if (g.startsWith("data:"))
                  H.push(g.replace(/^data:\s*/, ""));
                else if (g.startsWith("event:"))
                  Ae = g.replace(/^event:\s*/, "");
                else if (g.startsWith("id:"))
                  c = g.replace(/^id:\s*/, "");
                else if (g.startsWith("retry:")) {
                  const Oe = Number.parseInt(g.replace(/^retry:\s*/, ""), 10);
                  Number.isNaN(Oe) || (h = Oe);
                }
              let A, qe = !1;
              if (H.length) {
                const g = H.join(`
`);
                try {
                  A = JSON.parse(g), qe = !0;
                } catch {
                  A = g;
                }
              }
              qe && (i && await i(A), o && (A = await o(A))), s?.({
                data: A,
                event: Ae,
                id: c,
                retry: h
              }), H.length && (yield A);
            }
          }
        } finally {
          w.removeEventListener("abort", Pe), m.releaseLock();
        }
        break;
      } catch (P) {
        if (e?.(P), r !== void 0 && p >= r)
          break;
        const B = Math.min(h * 2 ** (p - 1), a ?? 3e4);
        await b(B);
      }
    }
  }() };
}
const Vt = (t) => {
  switch (t) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, Lt = (t) => {
  switch (t) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
}, Mt = (t) => {
  switch (t) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, Xe = ({
  allowReserved: t,
  explode: e,
  name: s,
  style: o,
  value: i
}) => {
  if (!e) {
    const a = (t ? i : i.map((l) => encodeURIComponent(l))).join(Lt(o));
    switch (o) {
      case "label":
        return `.${a}`;
      case "matrix":
        return `;${s}=${a}`;
      case "simple":
        return a;
      default:
        return `${s}=${a}`;
    }
  }
  const n = Vt(o), r = i.map((a) => o === "label" || o === "simple" ? t ? a : encodeURIComponent(a) : ce({
    allowReserved: t,
    name: s,
    value: a
  })).join(n);
  return o === "label" || o === "matrix" ? n + r : r;
}, ce = ({
  allowReserved: t,
  name: e,
  value: s
}) => {
  if (s == null)
    return "";
  if (typeof s == "object")
    throw new Error(
      "Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these."
    );
  return `${e}=${t ? s : encodeURIComponent(s)}`;
}, Fe = ({
  allowReserved: t,
  explode: e,
  name: s,
  style: o,
  value: i,
  valueOnly: n
}) => {
  if (i instanceof Date)
    return n ? i.toISOString() : `${s}=${i.toISOString()}`;
  if (o !== "deepObject" && !e) {
    let l = [];
    Object.entries(i).forEach(([u, c]) => {
      l = [...l, u, t ? c : encodeURIComponent(c)];
    });
    const k = l.join(",");
    switch (o) {
      case "form":
        return `${s}=${k}`;
      case "label":
        return `.${k}`;
      case "matrix":
        return `;${s}=${k}`;
      default:
        return k;
    }
  }
  const r = Mt(o), a = Object.entries(i).map(
    ([l, k]) => ce({
      allowReserved: t,
      name: o === "deepObject" ? `${s}[${l}]` : l,
      value: k
    })
  ).join(r);
  return o === "label" || o === "matrix" ? r + a : a;
}, $t = /\{[^{}]+\}/g, Kt = ({ path: t, url: e }) => {
  let s = e;
  const o = e.match($t);
  if (o)
    for (const i of o) {
      let n = !1, r = i.substring(1, i.length - 1), a = "simple";
      r.endsWith("*") && (n = !0, r = r.substring(0, r.length - 1)), r.startsWith(".") ? (r = r.substring(1), a = "label") : r.startsWith(";") && (r = r.substring(1), a = "matrix");
      const l = t[r];
      if (l == null)
        continue;
      if (Array.isArray(l)) {
        s = s.replace(i, Xe({ explode: n, name: r, style: a, value: l }));
        continue;
      }
      if (typeof l == "object") {
        s = s.replace(
          i,
          Fe({
            explode: n,
            name: r,
            style: a,
            value: l,
            valueOnly: !0
          })
        );
        continue;
      }
      if (a === "matrix") {
        s = s.replace(
          i,
          `;${ce({
            name: r,
            value: l
          })}`
        );
        continue;
      }
      const k = encodeURIComponent(
        a === "label" ? `.${l}` : l
      );
      s = s.replace(i, k);
    }
  return s;
}, Rt = ({
  baseUrl: t,
  path: e,
  query: s,
  querySerializer: o,
  url: i
}) => {
  const n = i.startsWith("/") ? i : `/${i}`;
  let r = (t ?? "") + n;
  e && (r = Kt({ path: e, url: r }));
  let a = s ? o(s) : "";
  return a.startsWith("?") && (a = a.substring(1)), a && (r += `?${a}`), r;
};
function Me(t) {
  const e = t.body !== void 0;
  if (e && t.bodySerializer)
    return "serializedBody" in t ? t.serializedBody !== void 0 && t.serializedBody !== "" ? t.serializedBody : null : t.body !== "" ? t.body : null;
  if (e)
    return t.body;
}
const Nt = async (t, e) => {
  const s = typeof e == "function" ? await e(t) : e;
  if (s)
    return t.scheme === "bearer" ? `Bearer ${s}` : t.scheme === "basic" ? `Basic ${btoa(s)}` : s;
}, Je = ({
  parameters: t = {},
  ...e
} = {}) => (o) => {
  const i = [];
  if (o && typeof o == "object")
    for (const n in o) {
      const r = o[n];
      if (r == null)
        continue;
      const a = t[n] || e;
      if (Array.isArray(r)) {
        const l = Xe({
          allowReserved: a.allowReserved,
          explode: !0,
          name: n,
          style: "form",
          value: r,
          ...a.array
        });
        l && i.push(l);
      } else if (typeof r == "object") {
        const l = Fe({
          allowReserved: a.allowReserved,
          explode: !0,
          name: n,
          style: "deepObject",
          value: r,
          ...a.object
        });
        l && i.push(l);
      } else {
        const l = ce({
          allowReserved: a.allowReserved,
          name: n,
          value: r
        });
        l && i.push(l);
      }
    }
  return i.join("&");
}, It = (t) => {
  if (!t)
    return "stream";
  const e = t.split(";")[0]?.trim();
  if (e) {
    if (e.startsWith("application/json") || e.endsWith("+json"))
      return "json";
    if (e === "multipart/form-data")
      return "formData";
    if (["application/", "audio/", "image/", "video/"].some((s) => e.startsWith(s)))
      return "blob";
    if (e.startsWith("text/"))
      return "text";
  }
}, Wt = (t, e) => e ? !!(t.headers.has(e) || t.query?.[e] || t.headers.get("Cookie")?.includes(`${e}=`)) : !1, zt = async ({
  security: t,
  ...e
}) => {
  for (const s of t) {
    if (Wt(e, s.name))
      continue;
    const o = await Nt(s, e.auth);
    if (!o)
      continue;
    const i = s.name ?? "Authorization";
    switch (s.in) {
      case "query":
        e.query || (e.query = {}), e.query[i] = o;
        break;
      case "cookie":
        e.headers.append("Cookie", `${i}=${o}`);
        break;
      case "header":
      default:
        e.headers.set(i, o);
        break;
    }
  }
}, $e = (t) => Rt({
  baseUrl: t.baseUrl,
  path: t.path,
  query: t.query,
  querySerializer: typeof t.querySerializer == "function" ? t.querySerializer : Je(t.querySerializer),
  url: t.url
}), Ke = (t, e) => {
  const s = { ...t, ...e };
  return s.baseUrl?.endsWith("/") && (s.baseUrl = s.baseUrl.substring(0, s.baseUrl.length - 1)), s.headers = Qe(t.headers, e.headers), s;
}, Gt = (t) => {
  const e = [];
  return t.forEach((s, o) => {
    e.push([o, s]);
  }), e;
}, Qe = (...t) => {
  const e = new Headers();
  for (const s of t) {
    if (!s)
      continue;
    const o = s instanceof Headers ? Gt(s) : Object.entries(s);
    for (const [i, n] of o)
      if (n === null)
        e.delete(i);
      else if (Array.isArray(n))
        for (const r of n)
          e.append(i, r);
      else n !== void 0 && e.set(
        i,
        typeof n == "object" ? JSON.stringify(n) : n
      );
  }
  return e;
};
class de {
  constructor() {
    this.fns = [];
  }
  clear() {
    this.fns = [];
  }
  eject(e) {
    const s = this.getInterceptorIndex(e);
    this.fns[s] && (this.fns[s] = null);
  }
  exists(e) {
    const s = this.getInterceptorIndex(e);
    return !!this.fns[s];
  }
  getInterceptorIndex(e) {
    return typeof e == "number" ? this.fns[e] ? e : -1 : this.fns.indexOf(e);
  }
  update(e, s) {
    const o = this.getInterceptorIndex(e);
    return this.fns[o] ? (this.fns[o] = s, e) : !1;
  }
  use(e) {
    return this.fns.push(e), this.fns.length - 1;
  }
}
const jt = () => ({
  error: new de(),
  request: new de(),
  response: new de()
}), Ht = Je({
  allowReserved: !1,
  array: {
    explode: !0,
    style: "form"
  },
  object: {
    explode: !0,
    style: "deepObject"
  }
}), Xt = {
  "Content-Type": "application/json"
}, Ye = (t = {}) => ({
  ...Ot,
  headers: Xt,
  parseAs: "auto",
  querySerializer: Ht,
  ...t
}), Ft = (t = {}) => {
  let e = Ke(Ye(), t);
  const s = () => ({ ...e }), o = (u) => (e = Ke(e, u), s()), i = jt(), n = async (u) => {
    const c = {
      ...e,
      ...u,
      fetch: u.fetch ?? e.fetch ?? globalThis.fetch,
      headers: Qe(e.headers, u.headers),
      serializedBody: void 0
    };
    c.security && await zt({
      ...c,
      security: c.security
    }), c.requestValidator && await c.requestValidator(c), c.body !== void 0 && c.bodySerializer && (c.serializedBody = c.bodySerializer(c.body)), (c.body === void 0 || c.serializedBody === "") && c.headers.delete("Content-Type");
    const b = c, C = $e(b);
    return { opts: b, url: C };
  }, r = async (u) => {
    const c = u.throwOnError ?? e.throwOnError, b = u.responseStyle ?? e.responseStyle;
    let C, d;
    try {
      const { opts: h, url: p } = await n(u), w = {
        redirect: "follow",
        ...h,
        body: Me(h)
      };
      C = new Request(p, w);
      for (const y of i.request.fns)
        y && (C = await y(C, h));
      const j = h.fetch;
      d = await j(C);
      for (const y of i.response.fns)
        y && (d = await y(d, C, h));
      const P = {
        request: C,
        response: d
      };
      if (d.ok) {
        const y = (h.parseAs === "auto" ? It(d.headers.get("Content-Type")) : h.parseAs) ?? "json";
        if (d.status === 204 || d.headers.get("Content-Length") === "0") {
          let _;
          switch (y) {
            case "arrayBuffer":
            case "blob":
            case "text":
              _ = await d[y]();
              break;
            case "formData":
              _ = new FormData();
              break;
            case "stream":
              _ = d.body;
              break;
            case "json":
            default:
              _ = {};
              break;
          }
          return h.responseStyle === "data" ? _ : {
            data: _,
            ...P
          };
        }
        let m;
        switch (y) {
          case "arrayBuffer":
          case "blob":
          case "formData":
          case "text":
            m = await d[y]();
            break;
          case "json": {
            const _ = await d.text();
            m = _ ? JSON.parse(_) : {};
            break;
          }
          case "stream":
            return h.responseStyle === "data" ? d.body : {
              data: d.body,
              ...P
            };
        }
        return y === "json" && (h.responseValidator && await h.responseValidator(m), h.responseTransformer && (m = await h.responseTransformer(m))), h.responseStyle === "data" ? m : {
          data: m,
          ...P
        };
      }
      const B = await d.text();
      let he;
      try {
        he = JSON.parse(B);
      } catch {
      }
      throw he ?? B;
    } catch (h) {
      let p = h;
      for (const w of i.error.fns)
        w && (p = await w(p, d, C, u));
      if (p = p || {}, c)
        throw p;
      return b === "data" ? void 0 : {
        error: p,
        request: C,
        response: d
      };
    }
  }, a = (u) => (c) => r({ ...c, method: u }), l = (u) => async (c) => {
    const { opts: b, url: C } = await n(c);
    return Dt({
      ...b,
      body: b.body,
      method: u,
      onRequest: async (d, h) => {
        let p = new Request(d, h);
        for (const w of i.request.fns)
          w && (p = await w(p, b));
        return p;
      },
      serializedBody: Me(b),
      url: C
    });
  };
  return {
    buildUrl: (u) => $e({ ...e, ...u }),
    connect: a("CONNECT"),
    delete: a("DELETE"),
    get: a("GET"),
    getConfig: s,
    head: a("HEAD"),
    interceptors: i,
    options: a("OPTIONS"),
    patch: a("PATCH"),
    post: a("POST"),
    put: a("PUT"),
    request: r,
    setConfig: o,
    sse: {
      connect: l("CONNECT"),
      delete: l("DELETE"),
      get: l("GET"),
      head: l("HEAD"),
      options: l("OPTIONS"),
      patch: l("PATCH"),
      post: l("POST"),
      put: l("PUT"),
      trace: l("TRACE")
    },
    trace: a("TRACE")
  };
}, E = Ft(Ye({ baseUrl: "http://localhost:26294/", throwOnError: !0 }));
class U {
  static previewGridBlock(e) {
    return (e.client ?? E).post({
      url: "/umbraco/block-preview/api/v1/preview/grid",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
  }
  static getGridStylesheets(e) {
    return (e?.client ?? E).get({ url: "/umbraco/block-preview/api/v1/preview/grid/stylesheets", ...e });
  }
  static previewListBlock(e) {
    return (e.client ?? E).post({
      url: "/umbraco/block-preview/api/v1/preview/list",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
  }
  static getListStylesheets(e) {
    return (e?.client ?? E).get({ url: "/umbraco/block-preview/api/v1/preview/list/stylesheets", ...e });
  }
  static previewRichTextMarkup(e) {
    return (e.client ?? E).post({
      url: "/umbraco/block-preview/api/v1/preview/rte",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
  }
  static getRteStylesheets(e) {
    return (e?.client ?? E).get({ url: "/umbraco/block-preview/api/v1/preview/rte/stylesheets", ...e });
  }
  static previewSingleBlock(e) {
    return (e.client ?? E).post({
      url: "/umbraco/block-preview/api/v1/preview/single",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
  }
  static getSingleBlockStylesheets(e) {
    return (e?.client ?? E).get({ url: "/umbraco/block-preview/api/v1/preview/single/stylesheets", ...e });
  }
  static getSettings(e) {
    return (e?.client ?? E).get({ url: "/umbraco/block-preview/api/v1/settings", ...e });
  }
}
const Ze = new _t("BlockPreviewContext");
function Jt(t, e, s) {
  if (!t) return t;
  const o = s.filter((i) => i.contentKey === e);
  return o.some((i) => !i.culture || i.culture === t) ? t : o.find((i) => i.culture)?.culture ?? t;
}
function Ce(t, e) {
  return t?.key || e;
}
function we(t, e) {
  return e ? (t ?? []).filter((s) => Ce(s, s.contentKey) === e) : [];
}
function ve(t, e, s) {
  const o = (r) => Ce(r, r.contentKey) === s, i = (r) => o(r) || !s && r.contentKey === e, n = (r) => {
    const a = r ?? [], l = a.findIndex(i);
    if (l >= 0) return l;
    for (const k of a)
      for (const u of k.areas ?? []) {
        const c = n(u.items);
        if (c >= 0) return c;
      }
    return -1;
  };
  return Math.max(n(t), 0);
}
var Qt = Object.defineProperty, T = (t, e, s, o) => {
  for (var i = void 0, n = t.length - 1, r; n >= 0; n--)
    (r = t[n]) && (i = r(e, s, i) || i);
  return i && Qt(e, s, i), i;
};
const Yt = ["UUI-ACTION-BAR", "UMB-BLOCK-ACTION", "UMB-BLOCK-SCALE-HANDLER"];
function Re(t) {
  return t.some((o) => o instanceof Element && Yt.includes(o.tagName)) ? !t.some(
    (o) => o instanceof Element && o.tagName === "UUI-BUTTON" && (o.getAttribute("href") ?? "").includes("block/edit")
  ) : !1;
}
class f extends vt {
  constructor() {
    super(), this._workspaceContextResolved = !1, this._htmlMarkup = "", this._isLoading = !1, this._error = null, this._stylesheetsAdopted = !1, this._requestId = 0, this._isConnected = !1, this._exposes = [], this._pointerStartPos = null, this._handleAnchorNavGuard = (e) => {
      Re(e.composedPath()) && e.preventDefault();
    }, this.consumeContext(Ze, async (e) => {
      this._blockPreviewContext = e, this.observeOwnerContentType(), await this.setupContextObservers();
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._isConnected = !0, this.addEventListener("click", this._handleAnchorNavGuard, { capture: !0 });
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._isConnected = !1, this.removeEventListener("click", this._handleAnchorNavGuard, { capture: !0 });
  }
  updated(e) {
    super.updated(e), (e.has("content") || e.has("settings")) && this.renderBlockPreview();
  }
  // region Shared context observers
  observePropertyDataset() {
    this.consumeContext(mt, (e) => {
      e && (this._blockContext.culture = e.getVariantId().culture ?? "");
    });
  }
  // endregion
  // region Workspace helpers
  /**
   * Shared handler called once the workspace context provides a unique + documentTypeUnique.
   * Sets up block context, triggers block value observation, and loads stylesheets.
   */
  async handleWorkspaceData(e, s) {
    !this._isConnected || !s || (this._blockContext.unique = e?.toString() ?? "", this._blockPreviewContext?.setUnique(this._blockContext.unique), this._blockContext.documentTypeUnique = this._ownerContentTypeUnique ?? s, this._blockPreviewContext?.setDocumentTypeUnique(this._blockContext.documentTypeUnique), this._workspaceContextResolved = !0, this.observeBlockValue(), await this.fetchAndLoadStylesheets());
  }
  /**
   * Observe the nearest block workspace to resolve the content type that owns the
   * block-editor property. The document/node key still comes from the content
   * workspace (see #297); only the owning content type differs when nested.
   */
  observeOwnerContentType() {
    this.consumeContext(Ve, (e) => {
      e && this.observe(e.content.structure.contentTypeUniques, (s) => {
        const o = s?.[0];
        !o || o === this._ownerContentTypeUnique || (this._ownerContentTypeUnique = o, this._blockContext.documentTypeUnique !== o && (this._blockContext.documentTypeUnique = o, this._blockPreviewContext?.setDocumentTypeUnique(o), this._workspaceContextResolved && this.renderBlockPreview()));
      });
    });
  }
  /**
   * Fallback workspace observation via UMB_BLOCK_WORKSPACE_CONTEXT.
   * Used when the primary workspace context is unavailable (e.g. nested block editing).
   */
  observeBlockWorkspaceFallback() {
    this._workspaceContextResolved || !this._blockPreviewContext || this._blockContext.unique !== "" || this.consumeContext(Ve, async (e) => {
      e && this.observe(e.content.structure.contentTypeUniques, async (s) => {
        const o = s[0];
        !this._isConnected || !o || (this._blockContext.unique = this._blockPreviewContext?.getUnique() ?? "", !this._blockContext.unique && this._blockContext.workspaceEditContentPath && (this._blockContext.unique = this.extractUniqueFromWorkspacePath(this._blockContext.workspaceEditContentPath)), this._blockContext.documentTypeUnique = o, this.observeBlockValue(), await this.fetchAndLoadStylesheets());
      });
    });
  }
  async fetchAndLoadStylesheets() {
    if (this._stylesheetsAdopted || !this._blockPreviewContext) return;
    const e = await this.fetchStylesheets();
    if (e && e.length > 0) {
      const s = await Promise.all(
        e.map((i) => this._blockPreviewContext.getOrCreateStylesheet(i))
      ), o = this.renderRoot;
      o.adoptedStyleSheets = [...o.adoptedStyleSheets, ...s], this._stylesheetsAdopted = !0;
    }
  }
  // endregion
  // region Preview rendering
  resolveUniqueFromContext() {
    this._blockPreviewContext != null && this._blockContext.unique === "" && (this._blockContext.unique = this._blockPreviewContext.getUnique(), !this._blockContext.unique && this._blockContext.workspaceEditContentPath && (this._blockContext.unique = this.extractUniqueFromWorkspacePath(this._blockContext.workspaceEditContentPath))), this._blockPreviewContext != null && this._blockContext.documentTypeUnique === "" && (this._blockContext.documentTypeUnique = this._blockPreviewContext.getDocumentTypeUnique());
  }
  /**
   * The culture to render the preview in: the culture being edited, or the culture the
   * block was first created in when it hasn't been created in this one yet (#340).
   */
  get previewCulture() {
    return Jt(this._blockContext.culture, this._blockContext.contentUdi, this._exposes);
  }
  /**
   * Stores the block value's exposes and re-renders an existing preview when they change
   * the preview culture, e.g. once the block is created in the culture being edited.
   */
  setExposes(e) {
    const s = this.previewCulture;
    this._exposes = e ?? [], this._htmlMarkup && this.previewCulture !== s && this.renderBlockPreview();
  }
  /** Records the block's layout identity once its entry context has provided the layout item. */
  applyLayoutIdentity(e) {
    this._blockContext.layoutKey = Ce(e, this._blockContext.contentUdi), this._blockContext.isExternalContent = !!e?.isExternalContent;
  }
  /** The layout key for the preview request, omitted while the block has none yet. */
  get layoutKeyQuery() {
    return this._blockContext.layoutKey || void 0;
  }
  async renderBlockPreview() {
    if (!this._isConnected || (this.resolveUniqueFromContext(), !this.validatePreviewData()))
      return;
    this._isLoading = !0, this._error = null;
    const e = ++this._requestId;
    try {
      const { data: s, error: o } = await this._blockPreviewContext.requestQueue.enqueue(
        () => this.callPreviewApi()
      );
      if (this._requestId !== e) return;
      s != null ? (this._htmlMarkup = s, this._isLoading = !1) : o ? (this._error = gt.isUmbApiError(o) ? o.message : this.localize.term("blockPreview_renderError"), this._isLoading = !1) : this._isLoading = !1;
    } catch (s) {
      if (this._requestId !== e) return;
      this._error = this.localize.term("blockPreview_renderFailed"), this._isLoading = !1, console.error("Block preview error:", s);
    }
  }
  /**
   * Validates that sufficient data is available for a preview request.
   * Subclasses may override to add additional checks (e.g. contentUdi).
   */
  validatePreviewData() {
    const e = this._blockContext;
    return e.unique !== "" && e.blockEditorAlias !== "" && e.contentElementTypeAlias !== "";
  }
  // endregion
  // region Utilities
  extractUniqueFromWorkspacePath(e) {
    const s = e.match(/\/workspace\/document\/edit\/([a-f0-9-]{36})/i);
    return s ? s[1] : "";
  }
  _handlePointerDown(e) {
    this._pointerStartPos = { x: e.clientX, y: e.clientY };
  }
  _handleClick(e) {
    if (("pointerType" in e ? e.pointerType : "") !== "") {
      if (!this._pointerStartPos) {
        e.preventDefault(), e.stopPropagation();
        return;
      }
      const n = Math.abs(e.clientX - this._pointerStartPos.x), r = Math.abs(e.clientY - this._pointerStartPos.y);
      if (this._pointerStartPos = null, n > 5 || r > 5) {
        e.preventDefault(), e.stopPropagation();
        return;
      }
    }
    this._pointerStartPos = null;
    const o = e.composedPath();
    if (Re(o)) {
      e.preventDefault(), e.stopPropagation();
      return;
    }
    if (o.filter((n) => n instanceof Element && n.tagName === "A" && n.hasAttribute("data-block-preview-link")).length > 0) {
      e.preventDefault(), e.stopPropagation();
      const n = o.find((r) => r instanceof Element && r.tagName === "A" && r.classList.contains("block-preview-edit"));
      n instanceof Element ? window.history.pushState({}, "", n.getAttribute("href")) : window.history.pushState({}, "", this._blockContext.workspaceEditContentPath);
      return;
    }
  }
  // endregion
  // region Rendering
  render() {
    return X`
            ${this._isLoading ? X`<div class="preview-alert preview-alert-info"><uui-loader></uui-loader> <umb-localize key="blockPreview_loading">Loading preview...</umb-localize></div>` : this._error ? X`<div class="preview-alert preview-alert-error" role="alert">${this._error}</div>` : this._htmlMarkup ? X`<a
                            href=${De(this._blockContext.workspaceEditContentPath)}
                            @pointerdown=${this._handlePointerDown}
                            @click=${this._handleClick}
                            aria-label=${this.localize.term("blockPreview_editBlock")}
                            class="block-preview-edit"
							title=${De(this._blockContext.contentElementTypeAlias)}
                        >${wt(this._htmlMarkup)}</a>` : Ct}
        `;
  }
  static {
    this.styles = [
      ae`
            a.block-preview-edit {
                display: block;
                color: inherit;
                text-decoration: inherit;
                border: 1px solid transparent;
                border-radius: 2px;
            }

            a.block-preview-edit:hover {
                border-color: var(--uui-color-interactive-emphasis, #3544b1);
            }

            .preview-alert {
                background-color: var(--uui-color-danger, #f0ac00);
                border: 1px solid transparent;
                border-radius: 0;
                margin-bottom: 20px;
                padding: 8px 35px 8px 14px;
                position: relative;

                &, a, h4 {
                    color: #fff;
                }

                pre {
                    white-space: normal;
                }

                uui-loader {
                    color: #fff;
                    margin-right: 16px;
                }
            }

            .preview-alert-warning {
                background-color: var(--uui-color-warning, #f0ac00);
                border-color: transparent;
                color: #000;
            }

            .preview-alert-info {
                background-color: var(--uui-color-default, #3544b1);
                border-color: transparent;
                color: #fff;
            }

            .preview-alert-danger, .preview-alert-error {
                background-color: var(--uui-color-danger, #f0ac00);
                border-color: transparent;
                color: #fff;
            }
        `
    ];
  }
}
T([
  x({ attribute: !1, hasChanged: (t, e) => JSON.stringify(t) !== JSON.stringify(e) })
], f.prototype, "content");
T([
  x({ attribute: !1, hasChanged: (t, e) => JSON.stringify(t) !== JSON.stringify(e) })
], f.prototype, "settings");
T([
  x({ attribute: !1 })
], f.prototype, "contentKey");
T([
  x({ attribute: !1 })
], f.prototype, "config");
T([
  x({ attribute: !1 })
], f.prototype, "unpublished");
T([
  x({ attribute: !1 })
], f.prototype, "icon");
T([
  x({ attribute: !1 })
], f.prototype, "label");
T([
  M()
], f.prototype, "_htmlMarkup");
T([
  M()
], f.prototype, "_isLoading");
T([
  M()
], f.prototype, "_error");
class ue {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async previewGridBlock(e, s) {
    return await S(this.#e, U.previewGridBlock({ body: e, query: s }));
  }
  async previewListBlock(e, s) {
    return await S(this.#e, U.previewListBlock({ body: e, query: s }));
  }
  async previewSingleBlock(e, s) {
    return await S(this.#e, U.previewSingleBlock({ body: e, query: s }));
  }
  async previewRichTextMarkup(e, s) {
    return await S(this.#e, U.previewRichTextMarkup({ body: e, query: s }));
  }
  async getGridStylesheets(e) {
    return await S(this.#e, U.getGridStylesheets({ query: e }));
  }
  async getListStylesheets(e) {
    return await S(this.#e, U.getListStylesheets({ query: e }));
  }
  async getSingleBlockStylesheets(e) {
    return await S(this.#e, U.getSingleBlockStylesheets({ query: e }));
  }
  async getRteStylesheets(e) {
    return await S(this.#e, U.getRteStylesheets({ query: e }));
  }
}
class Zt {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async getSettings() {
    return await S(this.#e, U.getSettings());
  }
}
class es extends He {
  #e;
  constructor(e) {
    super(e), this.#e = new Zt(e);
  }
  async getSettings() {
    const e = await this.#e.getSettings();
    if (e && e?.data)
      return e.data;
  }
}
const ts = 300;
function ss(t, e, s) {
  const o = (e.areas?.length ?? 0) > 0, i = !t.layoutAreas && !!e.layoutAreas;
  return o && i && s.managerObserved ? { kind: "render", reason: "layout-areas-arrived" } : s.hasMarkup && !!e.layout && (e.layout.columnSpan !== t.layout?.columnSpan || e.layout.rowSpan !== t.layout?.rowSpan) ? { kind: "debounce", reason: "resized", delayMs: ts } : { kind: "none" };
}
class is {
  #e;
  schedule(e, s) {
    clearTimeout(this.#e), this.#e = setTimeout(s, e);
  }
  cancel() {
    clearTimeout(this.#e);
  }
}
var os = Object.defineProperty, rs = Object.getOwnPropertyDescriptor, et = (t) => {
  throw TypeError(t);
}, tt = (t, e, s, o) => {
  for (var i = o > 1 ? void 0 : o ? rs(e, s) : e, n = t.length - 1, r; n >= 0; n--)
    (r = t[n]) && (i = (o ? r(e, s, i) : r(i)) || i);
  return o && i && os(e, s, i), i;
}, me = (t, e, s) => e.has(t) || et("Cannot " + s), O = (t, e, s) => (me(t, e, "read from private field"), s ? s.call(t) : e.get(t)), F = (t, e, s) => e.has(t) ? et("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), Ne = (t, e, s, o) => (me(t, e, "write to private field"), e.set(t, s), s), $ = (t, e, s) => (me(t, e, "access private method"), s), K, q, st, R, Y, it, ne;
const ns = "block-grid-preview";
let z = class extends f {
  constructor() {
    super(), F(this, q), F(this, K), this._blockContext = {
      unique: "",
      documentTypeUnique: "",
      contentUdi: "",
      layoutKey: "",
      isExternalContent: !1,
      settingsUdi: "",
      blockEditorAlias: "",
      culture: "",
      workspaceEditContentPath: "",
      contentElementTypeAlias: "",
      contentElementTypeKey: "",
      areas: [],
      layout: void 0,
      layoutAreas: void 0,
      blockIndex: 0
    }, this._blockGridValue = {
      layout: {},
      expose: [],
      contentData: [],
      settingsData: []
    }, F(this, R, !1), F(this, Y, new is()), Ne(this, K, new ue(this));
  }
  set blockGridValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockGridValue = e;
  }
  get blockGridValue() {
    return this._blockGridValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await $(this, q, st).call(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), O(this, Y).cancel();
  }
  observeBlockValue() {
    this.consumeContext(xt, async (t) => {
      t && this.observe(
        v([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey,
          t.areas,
          t.layout,
          t.layoutAreas
        ]),
        async ([
          e,
          s,
          o,
          i,
          n,
          r,
          a,
          l
        ]) => {
          const k = this._blockContext.layout?.columnSpan, u = this._blockContext.layout?.rowSpan, c = this._blockContext.layoutAreas;
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = s ?? "", this._blockContext.workspaceEditContentPath = o ?? "", this._blockContext.contentElementTypeAlias = i ?? "", this._blockContext.contentElementTypeKey = n ?? "", this._blockContext.areas = r, this._blockContext.layout = a, this._blockContext.layoutAreas = l, this.applyLayoutIdentity(a), !O(this, R) && this._blockContext.contentUdi && (Ne(this, R, !0), await $(this, q, it).call(this));
          const b = ss(
            { layoutAreas: c, layout: { columnSpan: k, rowSpan: u } },
            { areas: r, layoutAreas: l, layout: a },
            { hasMarkup: !!this._htmlMarkup, managerObserved: O(this, R) }
          );
          b.kind === "render" ? (this.blockGridValue = {
            ...this._blockGridValue,
            layout: { "Umbraco.BlockGrid": $(this, q, ne).call(this) }
          }, this.renderBlockPreview()) : b.kind === "debounce" && (this.blockGridValue = {
            ...this._blockGridValue,
            layout: { "Umbraco.BlockGrid": $(this, q, ne).call(this) }
          }, O(this, Y).schedule(b.delayMs, () => this.renderBlockPreview()));
        }
      );
    });
  }
  async callPreviewApi() {
    return await O(this, K).previewGridBlock(
      JSON.stringify(this.blockGridValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        contentElementAlias: this._blockContext.contentElementTypeAlias,
        documentTypeUnique: this._blockContext.documentTypeUnique,
        contentUdi: this._blockContext.contentUdi,
        settingsUdi: this._blockContext.settingsUdi,
        culture: this.previewCulture,
        blockIndex: this._blockContext.blockIndex,
        layoutKey: this.layoutKeyQuery
      }
    );
  }
  async fetchStylesheets() {
    const { data: t } = await O(this, K).getGridStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
K = /* @__PURE__ */ new WeakMap();
q = /* @__PURE__ */ new WeakSet();
st = async function() {
  try {
    await this.getContext(D, { passContextAliasMatches: !0 }), this.consumeContext(D, (t) => {
      t && this.observe(
        v([t.unique, t.structure.contentTypeUniques]),
        async ([e, s]) => {
          await this.handleWorkspaceData(e?.toString(), s?.[0]);
        }
      );
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
R = /* @__PURE__ */ new WeakMap();
Y = /* @__PURE__ */ new WeakMap();
it = async function() {
  this.consumeContext(Et, (t) => {
    t && this.observe(
      v([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([e, s, o, i, n]) => {
        this._blockContext.blockEditorAlias = n ?? "", this.blockGridValue = {
          contentData: e ?? [],
          settingsData: s ?? [],
          expose: i ?? [],
          layout: { "Umbraco.BlockGrid": $(this, q, ne).call(this) }
        }, this.setExposes(i), this._blockContext.blockIndex = ve(o, this._blockContext.contentUdi, this._blockContext.layoutKey), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
ne = function() {
  const t = this._blockContext.areas.map((s) => ({
    key: s.key,
    items: this._blockContext.layoutAreas?.find((i) => i.key === s.key)?.items ?? []
  }));
  return [
    {
      // The layout item's own key; the same Library element can appear more than once.
      key: this._blockContext.layoutKey,
      areas: t,
      columnSpan: this._blockContext.layout?.columnSpan ?? 0,
      rowSpan: this._blockContext.layout?.rowSpan ?? 0,
      // A new block renders before its layout entry arrives (#322), so fall back to the
      // entry's own keys: an empty contentKey can't be read as a Guid on the server.
      contentKey: this._blockContext.layout?.contentKey || this._blockContext.contentUdi,
      settingsKey: this._blockContext.layout?.settingsKey || this._blockContext.settingsUdi || void 0,
      isExternalContent: this._blockContext.isExternalContent || void 0
    }
  ];
};
z.styles = [
  ...f.styles,
  ae`
            :host {
                display: block;
                height: 100%;
            }

            a.block-preview-edit {
                height: 100%;
            }
        `
];
tt([
  x({ attribute: !1 })
], z.prototype, "blockGridValue", 1);
z = tt([
  le(ns)
], z);
var as = Object.defineProperty, ls = Object.getOwnPropertyDescriptor, ot = (t) => {
  throw TypeError(t);
}, ge = (t, e, s, o) => {
  for (var i = o > 1 ? void 0 : o ? ls(e, s) : e, n = t.length - 1, r; n >= 0; n--)
    (r = t[n]) && (i = (o ? r(e, s, i) : r(i)) || i);
  return o && i && as(e, s, i), i;
}, xe = (t, e, s) => e.has(t) || ot("Cannot " + s), pe = (t, e, s) => (xe(t, e, "read from private field"), e.get(t)), ye = (t, e, s) => e.has(t) ? ot("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), Ie = (t, e, s, o) => (xe(t, e, "write to private field"), e.set(t, s), s), We = (t, e, s) => (xe(t, e, "access private method"), s), N, Z, rt, ee, nt;
const cs = "block-list-preview";
let V = class extends f {
  constructor() {
    super(), ye(this, Z), ye(this, N), this._blockContext = {
      unique: "",
      documentTypeUnique: "",
      contentUdi: "",
      layoutKey: "",
      isExternalContent: !1,
      settingsUdi: "",
      blockEditorAlias: "",
      culture: "",
      workspaceEditContentPath: "",
      contentElementTypeAlias: "",
      contentElementTypeKey: "",
      blockIndex: 0
    }, this._blockListValue = {
      layout: {},
      expose: [],
      contentData: [],
      settingsData: []
    }, ye(this, ee, !1), Ie(this, N, new ue(this));
  }
  set blockListValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockListValue = e;
  }
  get blockListValue() {
    return this._blockListValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await We(this, Z, rt).call(this);
  }
  observeBlockValue() {
    this.consumeContext(Tt, (t) => {
      t && this.observe(
        v([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey,
          t.layout
        ]),
        async ([
          e,
          s,
          o,
          i,
          n,
          r
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = s ?? "", this._blockContext.workspaceEditContentPath = o ?? "", this._blockContext.contentElementTypeAlias = i ?? "", this._blockContext.contentElementTypeKey = n ?? "", this.applyLayoutIdentity(r), !pe(this, ee) && this._blockContext.contentUdi && (Ie(this, ee, !0), await We(this, Z, nt).call(this));
        }
      );
    });
  }
  async callPreviewApi() {
    return await pe(this, N).previewListBlock(
      JSON.stringify(this.blockListValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        contentElementAlias: this._blockContext.contentElementTypeAlias,
        documentTypeUnique: this._blockContext.documentTypeUnique,
        contentUdi: this._blockContext.contentUdi,
        settingsUdi: this._blockContext.settingsUdi,
        culture: this.previewCulture,
        blockIndex: this._blockContext.blockIndex,
        layoutKey: this.layoutKeyQuery
      }
    );
  }
  async fetchStylesheets() {
    const { data: t } = await pe(this, N).getListStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
N = /* @__PURE__ */ new WeakMap();
Z = /* @__PURE__ */ new WeakSet();
rt = async function() {
  try {
    await this.getContext(D, { passContextAliasMatches: !0 }), this.consumeContext(D, (t) => {
      t && this.observe(
        v([t.unique, t.structure.contentTypeUniques]),
        async ([e, s]) => {
          await this.handleWorkspaceData(e?.toString(), s?.[0]);
        }
      );
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
ee = /* @__PURE__ */ new WeakMap();
nt = function() {
  this.consumeContext(St, (t) => {
    t && this.observe(
      v([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([
        e,
        s,
        o,
        i,
        n
      ]) => {
        this._blockContext.blockEditorAlias = n ?? "", this.blockListValue = {
          contentData: e?.filter((r) => r.key === this._blockContext.contentUdi) ?? [],
          settingsData: s?.filter((r) => r.key === this._blockContext.settingsUdi) ?? [],
          expose: i?.filter((r) => r.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.BlockList": we(o, this._blockContext.layoutKey)
          }
        }, this.setExposes(i), this._blockContext.blockIndex = ve(o, this._blockContext.contentUdi, this._blockContext.layoutKey), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
V.styles = [
  ...f.styles,
  ae`
            :host {
                display: block;
                height: 100%;
            }

            a.block-preview-edit {
                height: 100%;
            }
        `
];
ge([
  M()
], V.prototype, "_blockListValue", 2);
ge([
  x({ attribute: !1 })
], V.prototype, "blockListValue", 1);
V = ge([
  le(cs)
], V);
var us = Object.defineProperty, hs = Object.getOwnPropertyDescriptor, at = (t) => {
  throw TypeError(t);
}, Ee = (t, e, s, o) => {
  for (var i = o > 1 ? void 0 : o ? hs(e, s) : e, n = t.length - 1, r; n >= 0; n--)
    (r = t[n]) && (i = (o ? r(e, s, i) : r(i)) || i);
  return o && i && us(e, s, i), i;
}, Te = (t, e, s) => e.has(t) || at("Cannot " + s), fe = (t, e, s) => (Te(t, e, "read from private field"), e.get(t)), ke = (t, e, s) => e.has(t) ? at("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), ze = (t, e, s, o) => (Te(t, e, "write to private field"), e.set(t, s), s), Ge = (t, e, s) => (Te(t, e, "access private method"), s), I, te, lt, se, ct;
const ds = "block-single-preview";
let L = class extends f {
  constructor() {
    super(), ke(this, te), ke(this, I), this._blockContext = {
      unique: "",
      documentTypeUnique: "",
      contentUdi: "",
      layoutKey: "",
      isExternalContent: !1,
      settingsUdi: "",
      blockEditorAlias: "",
      culture: "",
      workspaceEditContentPath: "",
      contentElementTypeAlias: "",
      contentElementTypeKey: "",
      blockIndex: 0
    }, this._blockSingleValue = {
      layout: {},
      expose: [],
      contentData: [],
      settingsData: []
    }, ke(this, se, !1), ze(this, I, new ue(this));
  }
  set blockSingleValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockSingleValue = e;
  }
  get blockSingleValue() {
    return this._blockSingleValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await Ge(this, te, lt).call(this);
  }
  observeBlockValue() {
    this.consumeContext(Ut, (t) => {
      t && this.observe(
        v([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey,
          t.layout
        ]),
        async ([
          e,
          s,
          o,
          i,
          n,
          r
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = s ?? "", this._blockContext.workspaceEditContentPath = o ?? "", this._blockContext.contentElementTypeAlias = i ?? "", this._blockContext.contentElementTypeKey = n ?? "", this.applyLayoutIdentity(r), fe(this, se) || (ze(this, se, !0), await Ge(this, te, ct).call(this));
        }
      );
    });
  }
  async callPreviewApi() {
    return await fe(this, I).previewSingleBlock(
      JSON.stringify(this.blockSingleValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        contentElementAlias: this._blockContext.contentElementTypeAlias,
        documentTypeUnique: this._blockContext.documentTypeUnique,
        contentUdi: this._blockContext.contentUdi,
        settingsUdi: this._blockContext.settingsUdi,
        culture: this.previewCulture,
        blockIndex: this._blockContext.blockIndex,
        layoutKey: this.layoutKeyQuery
      }
    );
  }
  async fetchStylesheets() {
    const { data: t } = await fe(this, I).getSingleBlockStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
I = /* @__PURE__ */ new WeakMap();
te = /* @__PURE__ */ new WeakSet();
lt = async function() {
  try {
    await this.getContext(D, { passContextAliasMatches: !0 }), this.consumeContext(D, (t) => {
      t && this.observe(
        v([t.unique, t.structure.contentTypeUniques]),
        async ([e, s]) => {
          await this.handleWorkspaceData(e?.toString(), s?.[0]);
        }
      );
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
se = /* @__PURE__ */ new WeakMap();
ct = function() {
  this.consumeContext(Pt, (t) => {
    t && this.observe(
      v([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([
        e,
        s,
        o,
        i,
        n
      ]) => {
        this._blockContext.blockEditorAlias = n ?? "", this.blockSingleValue = {
          contentData: e?.filter((r) => r.key === this._blockContext.contentUdi) ?? [],
          settingsData: s?.filter((r) => r.key === this._blockContext.settingsUdi) ?? [],
          expose: i?.filter((r) => r.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.SingleBlock": we(o, this._blockContext.layoutKey)
          }
        }, this.setExposes(i), this._blockContext.blockIndex = ve(o, this._blockContext.contentUdi, this._blockContext.layoutKey), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
L.styles = [
  ...f.styles,
  ae`
            :host {
                display: block;
                height: 100%;
            }

            a.block-preview-edit {
                height: 100%;
            }
        `
];
Ee([
  M()
], L.prototype, "_blockSingleValue", 2);
Ee([
  x({ attribute: !1 })
], L.prototype, "blockSingleValue", 1);
L = Ee([
  le(ds)
], L);
var ps = Object.defineProperty, ys = Object.getOwnPropertyDescriptor, ut = (t) => {
  throw TypeError(t);
}, Se = (t, e, s, o) => {
  for (var i = o > 1 ? void 0 : o ? ys(e, s) : e, n = t.length - 1, r; n >= 0; n--)
    (r = t[n]) && (i = (o ? r(e, s, i) : r(i)) || i);
  return o && i && ps(e, s, i), i;
}, Ue = (t, e, s) => e.has(t) || ut("Cannot " + s), J = (t, e, s) => (Ue(t, e, "read from private field"), e.get(t)), Q = (t, e, s) => e.has(t) ? ut("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), be = (t, e, s, o) => (Ue(t, e, "write to private field"), e.set(t, s), s), je = (t, e, s) => (Ue(t, e, "access private method"), s), W, ie, ht, oe, re, dt;
const fs = "rich-text-preview";
let G = class extends f {
  constructor() {
    super(), Q(this, ie), Q(this, W), this._blockContext = {
      unique: "",
      documentTypeUnique: "",
      contentUdi: "",
      layoutKey: "",
      isExternalContent: !1,
      settingsUdi: "",
      blockEditorAlias: "",
      culture: "",
      workspaceEditContentPath: "",
      contentElementTypeAlias: "",
      contentElementTypeKey: "",
      blockIndex: 0
    }, this._blockRteValue = {
      layout: {},
      expose: [],
      contentData: [],
      settingsData: []
    }, Q(this, oe, !1), Q(this, re, !1), be(this, W, new ue(this));
  }
  set blockRteValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockRteValue = e;
  }
  get blockRteValue() {
    return this._blockRteValue;
  }
  setupContextObservers() {
    this.observePropertyDataset(), this.observeBlockValue(), je(this, ie, ht).call(this);
  }
  observeBlockValue() {
    J(this, oe) || (be(this, oe, !0), this.consumeContext(Bt, (t) => {
      t != null && this.observe(
        v([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey,
          t.layout
        ]),
        async ([
          e,
          s,
          o,
          i,
          n,
          r
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = s ?? "", this._blockContext.workspaceEditContentPath = o ?? "", this._blockContext.contentElementTypeAlias = i ?? "", this._blockContext.contentElementTypeKey = n ?? "", this.applyLayoutIdentity(r), !J(this, re) && this._blockContext.contentUdi && (be(this, re, !0), await je(this, ie, dt).call(this));
        }
      );
    }));
  }
  async callPreviewApi() {
    return await J(this, W).previewRichTextMarkup(
      JSON.stringify(this.blockRteValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        contentElementAlias: this._blockContext.contentElementTypeAlias,
        documentTypeUnique: this._blockContext.documentTypeUnique,
        culture: this.previewCulture,
        layoutKey: this.layoutKeyQuery
      }
    );
  }
  async fetchStylesheets() {
    const { data: t } = await J(this, W).getRteStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique
    });
    return t;
  }
};
W = /* @__PURE__ */ new WeakMap();
ie = /* @__PURE__ */ new WeakSet();
ht = function() {
  try {
    this.consumeContext(qt, (t) => {
      t && (this._workspaceContextResolved = !0, this.observe(
        v([t.unique, t.contentTypeUnique]),
        async ([e, s]) => {
          await this.handleWorkspaceData(e?.toString(), s);
        }
      ));
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
oe = /* @__PURE__ */ new WeakMap();
re = /* @__PURE__ */ new WeakMap();
dt = function() {
  this.consumeContext(At, (t) => {
    t != null && this.observe(
      v([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([
        e,
        s,
        o,
        i,
        n
      ]) => {
        this._blockContext.blockEditorAlias = n ?? "", this.blockRteValue = {
          contentData: e?.filter((r) => r.key === this._blockContext.contentUdi) ?? [],
          settingsData: s?.filter((r) => r.key === this._blockContext.settingsUdi) ?? [],
          expose: i?.filter((r) => r.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.RichText": we(o, this._blockContext.layoutKey)
          }
        }, this.setExposes(i), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
Se([
  M()
], G.prototype, "_blockRteValue", 2);
Se([
  x({ attribute: !1 })
], G.prototype, "blockRteValue", 1);
G = Se([
  le(fs)
], G);
class ks {
  #e;
  #t = 0;
  #s = [];
  constructor(e = 3) {
    this.#e = e;
  }
  /**
   * Enqueue a task to run with concurrency limiting.
   * If fewer than `maxConcurrent` tasks are active, the task runs immediately.
   * Otherwise it waits until a slot is available.
   */
  async enqueue(e) {
    this.#t >= this.#e && await new Promise((s) => {
      this.#s.push(s);
    }), this.#t++;
    try {
      return await e();
    } finally {
      this.#t--, this.#s.length > 0 && this.#s.shift()();
    }
  }
}
class _e extends He {
  #e = new ks(3);
  #t = /* @__PURE__ */ new Map();
  /** Shared concurrency-limited queue for preview API requests. */
  get requestQueue() {
    return this.#e;
  }
  // Node key cache used as a fallback when a preview cannot reach its content
  // workspace directly (e.g. when nested inside another block, whose workspace
  // context shadows the document workspace under the shared 'UmbWorkspaceContext'
  // alias).
  #s = new Le("");
  #i = new Le("");
  constructor(e) {
    super(e);
  }
  getUnique() {
    return this.#s.getValue();
  }
  async setUnique(e) {
    e !== "" && this.#s.setValue(e);
  }
  getDocumentTypeUnique() {
    return this.#i.getValue();
  }
  async setDocumentTypeUnique(e) {
    e !== "" && this.#i.setValue(e);
  }
  getOrCreateStylesheet(e) {
    const s = this.#t.get(e);
    if (s) return s;
    const o = fetch(e).then((i) => i.text()).then((i) => {
      const n = new CSSStyleSheet();
      return n.replaceSync(i), n;
    });
    return this.#t.set(e, o), o;
  }
}
const bs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BlockPreviewContext: _e,
  default: _e
}, Symbol.toStringTag, { value: "Module" })), _s = [
  {
    type: "globalContext",
    alias: "BlockPreview.Context",
    name: "BlockPreview Context",
    js: () => Promise.resolve().then(() => bs)
  }
], Cs = _s, ws = [
  {
    type: "localization",
    alias: "BlockPreview.Localization.En",
    name: "BlockPreview English Localization",
    meta: {
      culture: "en"
    },
    js: () => import("./en-BNTuLdKT.js")
  }
], vs = ws, Ms = async (t, e) => {
  t.consumeContext(bt, async (s) => {
    if (!s) return;
    s.configureClient(E);
    const i = await new es(t).getSettings();
    let n = [];
    if (i) {
      if (i.blockGrid.enabled) {
        let r = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.GridCustomView",
          name: "BlockPreview Grid Custom View",
          element: z,
          forBlockEditor: "block-grid"
        };
        i.blockGrid.contentTypes?.length !== 0 && (r.forContentTypeAlias = i.blockGrid.contentTypes), n.push(r);
      }
      if (i.blockList.enabled) {
        let r = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.ListCustomView",
          name: "BlockPreview List Custom View",
          element: V,
          forBlockEditor: "block-list"
        };
        i.blockList.contentTypes?.length !== 0 && (r.forContentTypeAlias = i.blockList.contentTypes), n.push(r);
      }
      if (i.singleBlock.enabled) {
        let r = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.SingleBlockCustomView",
          name: "BlockPreview Single Block Custom View",
          element: L,
          forBlockEditor: "block-single"
        };
        i.singleBlock.contentTypes?.length !== 0 && (r.forContentTypeAlias = i.singleBlock.contentTypes), n.push(r);
      }
      if (i.richText.enabled) {
        let r = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.RichTextCustomView",
          name: "BlockPreview Rich Text Custom View",
          element: G,
          forBlockEditor: "block-rte"
        };
        i.richText.contentTypes?.length !== 0 && (r.forContentTypeAlias = i.richText.contentTypes), n.push(r);
      }
    }
    e.registerMany([
      ...n,
      ...Cs,
      ...vs
    ]), t.provideContext(Ze, new _e(t));
  });
};
export {
  z as BlockGridPreviewCustomView,
  V as BlockListPreviewCustomView,
  f as BlockPreviewBaseElement,
  L as BlockSinglePreviewCustomView,
  ue as PreviewDataSource,
  G as RichTextPreviewCustomView,
  Zt as SettingsDataSource,
  es as SettingsRepository,
  Re as isBlockActionNavigation,
  Ms as onInit
};
//# sourceMappingURL=index.js.map
