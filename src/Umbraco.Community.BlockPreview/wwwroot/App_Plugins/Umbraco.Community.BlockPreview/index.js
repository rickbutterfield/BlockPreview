import { UMB_AUTH_CONTEXT as vt } from "@umbraco-cms/backoffice/auth";
import { UmbContextToken as wt } from "@umbraco-cms/backoffice/context-api";
import { nothing as Ct, html as X, ifDefined as Ve, unsafeHTML as mt, css as le, property as w, state as L, customElement as ue } from "@umbraco-cms/backoffice/external/lit";
import { UMB_BLOCK_WORKSPACE_CONTEXT as Le } from "@umbraco-cms/backoffice/block";
import { UmbLitElement as gt } from "@umbraco-cms/backoffice/lit-element";
import { UMB_PROPERTY_DATASET_CONTEXT as xt } from "@umbraco-cms/backoffice/property";
import { UmbApiError as St, tryExecute as T } from "@umbraco-cms/backoffice/resources";
import { UmbControllerBase as He } from "@umbraco-cms/backoffice/class-api";
import { UMB_BLOCK_GRID_ENTRY_CONTEXT as Tt, UMB_BLOCK_GRID_MANAGER_CONTEXT as Et } from "@umbraco-cms/backoffice/block-grid";
import { UMB_CONTENT_WORKSPACE_CONTEXT as q } from "@umbraco-cms/backoffice/content";
import { observeMultiple as _, UmbStringState as Re } from "@umbraco-cms/backoffice/observable-api";
import { UMB_BLOCK_LIST_ENTRY_CONTEXT as Pt, UMB_BLOCK_LIST_MANAGER_CONTEXT as Ut } from "@umbraco-cms/backoffice/block-list";
import { UMB_BLOCK_SINGLE_ENTRY_CONTEXT as At, UMB_BLOCK_SINGLE_MANAGER_CONTEXT as Bt } from "@umbraco-cms/backoffice/block-single";
import { UMB_BLOCK_RTE_ENTRY_CONTEXT as Ot, UMB_BLOCK_RTE_MANAGER_CONTEXT as qt } from "@umbraco-cms/backoffice/block-rte";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as Dt } from "@umbraco-cms/backoffice/document";
const Vt = {
  bodySerializer: (t) => JSON.stringify(
    t,
    (e, i) => typeof i == "bigint" ? i.toString() : i
  )
}, Lt = ({
  onRequest: t,
  onSseError: e,
  onSseEvent: i,
  responseTransformer: s,
  responseValidator: n,
  sseDefaultRetryDelay: o,
  sseMaxRetryAttempts: r,
  sseMaxRetryDelay: a,
  sseSleepFn: l,
  url: u,
  ...c
}) => {
  let d;
  const x = l ?? ((h) => new Promise((b) => setTimeout(b, h)));
  return { stream: async function* () {
    let h = o ?? 3e3, b = 0;
    const U = c.signal ?? new AbortController().signal;
    for (; !U.aborted; ) {
      b++;
      const R = c.headers instanceof Headers ? c.headers : new Headers(c.headers);
      d !== void 0 && R.set("Last-Event-ID", d);
      try {
        const A = {
          redirect: "follow",
          ...c,
          body: c.serializedBody,
          headers: R,
          signal: U
        };
        let C = new Request(u, A);
        t && (C = await t(u, A));
        const k = await (c.fetch ?? globalThis.fetch)(C);
        if (!k.ok)
          throw new Error(
            `SSE failed: ${k.status} ${k.statusText}`
          );
        if (!k.body) throw new Error("No body in SSE response");
        const m = k.body.pipeThrough(new TextDecoderStream()).getReader();
        let pe = "";
        const Ae = () => {
          try {
            m.cancel();
          } catch {
          }
        };
        U.addEventListener("abort", Ae);
        try {
          for (; ; ) {
            const { done: yt, value: bt } = await m.read();
            if (yt) break;
            pe += bt;
            const Be = pe.split(`

`);
            pe = Be.pop() ?? "";
            for (const kt of Be) {
              const _t = kt.split(`
`), H = [];
              let Oe;
              for (const v of _t)
                if (v.startsWith("data:"))
                  H.push(v.replace(/^data:\s*/, ""));
                else if (v.startsWith("event:"))
                  Oe = v.replace(/^event:\s*/, "");
                else if (v.startsWith("id:"))
                  d = v.replace(/^id:\s*/, "");
                else if (v.startsWith("retry:")) {
                  const De = Number.parseInt(
                    v.replace(/^retry:\s*/, ""),
                    10
                  );
                  Number.isNaN(De) || (h = De);
                }
              let B, qe = !1;
              if (H.length) {
                const v = H.join(`
`);
                try {
                  B = JSON.parse(v), qe = !0;
                } catch {
                  B = v;
                }
              }
              qe && (n && await n(B), s && (B = await s(B))), i?.({
                data: B,
                event: Oe,
                id: d,
                retry: h
              }), H.length && (yield B);
            }
          }
        } finally {
          U.removeEventListener("abort", Ae), m.releaseLock();
        }
        break;
      } catch (A) {
        if (e?.(A), r !== void 0 && b >= r)
          break;
        const C = Math.min(
          h * 2 ** (b - 1),
          a ?? 3e4
        );
        await x(C);
      }
    }
  }() };
}, Rt = (t) => {
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
}, $t = (t) => {
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
}, Nt = (t) => {
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
  name: i,
  style: s,
  value: n
}) => {
  if (!e) {
    const a = (t ? n : n.map((l) => encodeURIComponent(l))).join($t(s));
    switch (s) {
      case "label":
        return `.${a}`;
      case "matrix":
        return `;${i}=${a}`;
      case "simple":
        return a;
      default:
        return `${i}=${a}`;
    }
  }
  const o = Rt(s), r = n.map((a) => s === "label" || s === "simple" ? t ? a : encodeURIComponent(a) : he({
    allowReserved: t,
    name: i,
    value: a
  })).join(o);
  return s === "label" || s === "matrix" ? o + r : r;
}, he = ({
  allowReserved: t,
  name: e,
  value: i
}) => {
  if (i == null)
    return "";
  if (typeof i == "object")
    throw new Error(
      "Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these."
    );
  return `${e}=${t ? i : encodeURIComponent(i)}`;
}, Je = ({
  allowReserved: t,
  explode: e,
  name: i,
  style: s,
  value: n,
  valueOnly: o
}) => {
  if (n instanceof Date)
    return o ? n.toISOString() : `${i}=${n.toISOString()}`;
  if (s !== "deepObject" && !e) {
    let l = [];
    Object.entries(n).forEach(([c, d]) => {
      l = [
        ...l,
        c,
        t ? d : encodeURIComponent(d)
      ];
    });
    const u = l.join(",");
    switch (s) {
      case "form":
        return `${i}=${u}`;
      case "label":
        return `.${u}`;
      case "matrix":
        return `;${i}=${u}`;
      default:
        return u;
    }
  }
  const r = Nt(s), a = Object.entries(n).map(
    ([l, u]) => he({
      allowReserved: t,
      name: s === "deepObject" ? `${i}[${l}]` : l,
      value: u
    })
  ).join(r);
  return s === "label" || s === "matrix" ? r + a : a;
}, Mt = /\{[^{}]+\}/g, It = ({ path: t, url: e }) => {
  let i = e;
  const s = e.match(Mt);
  if (s)
    for (const n of s) {
      let o = !1, r = n.substring(1, n.length - 1), a = "simple";
      r.endsWith("*") && (o = !0, r = r.substring(0, r.length - 1)), r.startsWith(".") ? (r = r.substring(1), a = "label") : r.startsWith(";") && (r = r.substring(1), a = "matrix");
      const l = t[r];
      if (l == null)
        continue;
      if (Array.isArray(l)) {
        i = i.replace(
          n,
          Xe({ explode: o, name: r, style: a, value: l })
        );
        continue;
      }
      if (typeof l == "object") {
        i = i.replace(
          n,
          Je({
            explode: o,
            name: r,
            style: a,
            value: l,
            valueOnly: !0
          })
        );
        continue;
      }
      if (a === "matrix") {
        i = i.replace(
          n,
          `;${he({
            name: r,
            value: l
          })}`
        );
        continue;
      }
      const u = encodeURIComponent(
        a === "label" ? `.${l}` : l
      );
      i = i.replace(n, u);
    }
  return i;
}, Kt = ({
  baseUrl: t,
  path: e,
  query: i,
  querySerializer: s,
  url: n
}) => {
  const o = n.startsWith("/") ? n : `/${n}`;
  let r = (t ?? "") + o;
  e && (r = It({ path: e, url: r }));
  let a = i ? s(i) : "";
  return a.startsWith("?") && (a = a.substring(1)), a && (r += `?${a}`), r;
};
function Wt(t) {
  const e = t.body !== void 0;
  if (e && t.bodySerializer)
    return "serializedBody" in t ? t.serializedBody !== void 0 && t.serializedBody !== "" ? t.serializedBody : null : t.body !== "" ? t.body : null;
  if (e)
    return t.body;
}
const Gt = async (t, e) => {
  const i = typeof e == "function" ? await e(t) : e;
  if (i)
    return t.scheme === "bearer" ? `Bearer ${i}` : t.scheme === "basic" ? `Basic ${btoa(i)}` : i;
}, Ye = ({
  allowReserved: t,
  array: e,
  object: i
} = {}) => (n) => {
  const o = [];
  if (n && typeof n == "object")
    for (const r in n) {
      const a = n[r];
      if (a != null)
        if (Array.isArray(a)) {
          const l = Xe({
            allowReserved: t,
            explode: !0,
            name: r,
            style: "form",
            value: a,
            ...e
          });
          l && o.push(l);
        } else if (typeof a == "object") {
          const l = Je({
            allowReserved: t,
            explode: !0,
            name: r,
            style: "deepObject",
            value: a,
            ...i
          });
          l && o.push(l);
        } else {
          const l = he({
            allowReserved: t,
            name: r,
            value: a
          });
          l && o.push(l);
        }
    }
  return o.join("&");
}, zt = (t) => {
  if (!t)
    return "stream";
  const e = t.split(";")[0]?.trim();
  if (e) {
    if (e.startsWith("application/json") || e.endsWith("+json"))
      return "json";
    if (e === "multipart/form-data")
      return "formData";
    if (["application/", "audio/", "image/", "video/"].some(
      (i) => e.startsWith(i)
    ))
      return "blob";
    if (e.startsWith("text/"))
      return "text";
  }
}, jt = (t, e) => e ? !!(t.headers.has(e) || t.query?.[e] || t.headers.get("Cookie")?.includes(`${e}=`)) : !1, Ft = async ({
  security: t,
  ...e
}) => {
  for (const i of t) {
    if (jt(e, i.name))
      continue;
    const s = await Gt(i, e.auth);
    if (!s)
      continue;
    const n = i.name ?? "Authorization";
    switch (i.in) {
      case "query":
        e.query || (e.query = {}), e.query[n] = s;
        break;
      case "cookie":
        e.headers.append("Cookie", `${n}=${s}`);
        break;
      case "header":
      default:
        e.headers.set(n, s);
        break;
    }
  }
}, $e = (t) => Kt({
  baseUrl: t.baseUrl,
  path: t.path,
  query: t.query,
  querySerializer: typeof t.querySerializer == "function" ? t.querySerializer : Ye(t.querySerializer),
  url: t.url
}), Ne = (t, e) => {
  const i = { ...t, ...e };
  return i.baseUrl?.endsWith("/") && (i.baseUrl = i.baseUrl.substring(0, i.baseUrl.length - 1)), i.headers = Qe(t.headers, e.headers), i;
}, Ht = (t) => {
  const e = [];
  return t.forEach((i, s) => {
    e.push([s, i]);
  }), e;
}, Qe = (...t) => {
  const e = new Headers();
  for (const i of t) {
    if (!i)
      continue;
    const s = i instanceof Headers ? Ht(i) : Object.entries(i);
    for (const [n, o] of s)
      if (o === null)
        e.delete(n);
      else if (Array.isArray(o))
        for (const r of o)
          e.append(n, r);
      else o !== void 0 && e.set(
        n,
        typeof o == "object" ? JSON.stringify(o) : o
      );
  }
  return e;
};
class fe {
  constructor() {
    this.fns = [];
  }
  clear() {
    this.fns = [];
  }
  eject(e) {
    const i = this.getInterceptorIndex(e);
    this.fns[i] && (this.fns[i] = null);
  }
  exists(e) {
    const i = this.getInterceptorIndex(e);
    return !!this.fns[i];
  }
  getInterceptorIndex(e) {
    return typeof e == "number" ? this.fns[e] ? e : -1 : this.fns.indexOf(e);
  }
  update(e, i) {
    const s = this.getInterceptorIndex(e);
    return this.fns[s] ? (this.fns[s] = i, e) : !1;
  }
  use(e) {
    return this.fns.push(e), this.fns.length - 1;
  }
}
const Xt = () => ({
  error: new fe(),
  request: new fe(),
  response: new fe()
}), Jt = Ye({
  allowReserved: !1,
  array: {
    explode: !0,
    style: "form"
  },
  object: {
    explode: !0,
    style: "deepObject"
  }
}), Yt = {
  "Content-Type": "application/json"
}, Ze = (t = {}) => ({
  ...Vt,
  headers: Yt,
  parseAs: "auto",
  querySerializer: Jt,
  ...t
}), Qt = (t = {}) => {
  let e = Ne(Ze(), t);
  const i = () => ({ ...e }), s = (u) => (e = Ne(e, u), i()), n = Xt(), o = async (u) => {
    const c = {
      ...e,
      ...u,
      fetch: u.fetch ?? e.fetch ?? globalThis.fetch,
      headers: Qe(e.headers, u.headers),
      serializedBody: void 0
    };
    c.security && await Ft({
      ...c,
      security: c.security
    }), c.requestValidator && await c.requestValidator(c), c.body !== void 0 && c.bodySerializer && (c.serializedBody = c.bodySerializer(c.body)), (c.body === void 0 || c.serializedBody === "") && c.headers.delete("Content-Type");
    const d = $e(c);
    return { opts: c, url: d };
  }, r = async (u) => {
    const { opts: c, url: d } = await o(u), x = {
      redirect: "follow",
      ...c,
      body: Wt(c)
    };
    let S = new Request(d, x);
    for (const f of n.request.fns)
      f && (S = await f(S, c));
    const F = c.fetch;
    let h = await F(S);
    for (const f of n.response.fns)
      f && (h = await f(h, S, c));
    const b = {
      request: S,
      response: h
    };
    if (h.ok) {
      const f = (c.parseAs === "auto" ? zt(h.headers.get("Content-Type")) : c.parseAs) ?? "json";
      if (h.status === 204 || h.headers.get("Content-Length") === "0") {
        let m;
        switch (f) {
          case "arrayBuffer":
          case "blob":
          case "text":
            m = await h[f]();
            break;
          case "formData":
            m = new FormData();
            break;
          case "stream":
            m = h.body;
            break;
          case "json":
          default:
            m = {};
            break;
        }
        return c.responseStyle === "data" ? m : {
          data: m,
          ...b
        };
      }
      let k;
      switch (f) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          k = await h[f]();
          break;
        case "stream":
          return c.responseStyle === "data" ? h.body : {
            data: h.body,
            ...b
          };
      }
      return f === "json" && (c.responseValidator && await c.responseValidator(k), c.responseTransformer && (k = await c.responseTransformer(k))), c.responseStyle === "data" ? k : {
        data: k,
        ...b
      };
    }
    const U = await h.text();
    let R;
    try {
      R = JSON.parse(U);
    } catch {
    }
    const A = R ?? U;
    let C = A;
    for (const f of n.error.fns)
      f && (C = await f(A, h, S, c));
    if (C = C || {}, c.throwOnError)
      throw C;
    return c.responseStyle === "data" ? void 0 : {
      error: C,
      ...b
    };
  }, a = (u) => (c) => r({ ...c, method: u }), l = (u) => async (c) => {
    const { opts: d, url: x } = await o(c);
    return Lt({
      ...d,
      body: d.body,
      headers: d.headers,
      method: u,
      onRequest: async (S, F) => {
        let h = new Request(S, F);
        for (const b of n.request.fns)
          b && (h = await b(h, d));
        return h;
      },
      url: x
    });
  };
  return {
    buildUrl: $e,
    connect: a("CONNECT"),
    delete: a("DELETE"),
    get: a("GET"),
    getConfig: i,
    head: a("HEAD"),
    interceptors: n,
    options: a("OPTIONS"),
    patch: a("PATCH"),
    post: a("POST"),
    put: a("PUT"),
    request: r,
    setConfig: s,
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
}, y = Qt(Ze({
  baseUrl: "http://localhost:26293",
  throwOnError: !0
}));
class E {
  static previewGridBlock(e) {
    return (e?.client ?? y).post({
      url: "/umbraco/block-preview/api/v1/preview/grid",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e?.headers
      }
    });
  }
  /**
   * @deprecated
   */
  static getGridStylesheet(e) {
    return (e?.client ?? y).get({
      url: "/umbraco/block-preview/api/v1/preview/grid/stylesheet",
      ...e
    });
  }
  static getGridStylesheets(e) {
    return (e?.client ?? y).get({
      url: "/umbraco/block-preview/api/v1/preview/grid/stylesheets",
      ...e
    });
  }
  static previewListBlock(e) {
    return (e?.client ?? y).post({
      url: "/umbraco/block-preview/api/v1/preview/list",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e?.headers
      }
    });
  }
  /**
   * @deprecated
   */
  static getListStylesheet(e) {
    return (e?.client ?? y).get({
      url: "/umbraco/block-preview/api/v1/preview/list/stylesheet",
      ...e
    });
  }
  static getListStylesheets(e) {
    return (e?.client ?? y).get({
      url: "/umbraco/block-preview/api/v1/preview/list/stylesheets",
      ...e
    });
  }
  static previewRichTextMarkup(e) {
    return (e?.client ?? y).post({
      url: "/umbraco/block-preview/api/v1/preview/rte",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e?.headers
      }
    });
  }
  /**
   * @deprecated
   */
  static getRteStylesheet(e) {
    return (e?.client ?? y).get({
      url: "/umbraco/block-preview/api/v1/preview/rte/stylesheet",
      ...e
    });
  }
  static getRteStylesheets(e) {
    return (e?.client ?? y).get({
      url: "/umbraco/block-preview/api/v1/preview/rte/stylesheets",
      ...e
    });
  }
  static previewSingleBlock(e) {
    return (e?.client ?? y).post({
      url: "/umbraco/block-preview/api/v1/preview/single",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e?.headers
      }
    });
  }
  static getSingleBlockStylesheets(e) {
    return (e?.client ?? y).get({
      url: "/umbraco/block-preview/api/v1/preview/single/stylesheets",
      ...e
    });
  }
  static getSettings(e) {
    return (e?.client ?? y).get({
      url: "/umbraco/block-preview/api/v1/settings",
      ...e
    });
  }
}
const et = new wt("BlockPreviewContext");
var Zt = Object.defineProperty, g = (t, e, i, s) => {
  for (var n = void 0, o = t.length - 1, r; o >= 0; o--)
    (r = t[o]) && (n = r(e, i, n) || n);
  return n && Zt(e, i, n), n;
};
const ei = ["UUI-ACTION-BAR", "UMB-BLOCK-ACTION", "UMB-BLOCK-SCALE-HANDLER"];
function Me(t) {
  return t.some((s) => s instanceof Element && ei.includes(s.tagName)) ? !t.some(
    (s) => s instanceof Element && s.tagName === "UUI-BUTTON" && (s.getAttribute("href") ?? "").includes("block/edit")
  ) : !1;
}
class p extends gt {
  constructor() {
    super(), this._workspaceContextResolved = !1, this._htmlMarkup = "", this._isLoading = !1, this._error = null, this._stylesheetsAdopted = !1, this._requestId = 0, this._isConnected = !1, this._pointerStartPos = null, this._handleAnchorNavGuard = (e) => {
      Me(e.composedPath()) && e.preventDefault();
    }, this.consumeContext(et, async (e) => {
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
    this.consumeContext(xt, (e) => {
      e && (this._blockContext.culture = e.getVariantId().culture ?? "");
    });
  }
  // endregion
  // region Workspace helpers
  /**
   * Shared handler called once the workspace context provides a unique + documentTypeUnique.
   * Sets up block context, triggers block value observation, and loads stylesheets.
   */
  async handleWorkspaceData(e, i) {
    !this._isConnected || !i || (this._blockContext.unique = e?.toString() ?? "", this._blockPreviewContext?.setUnique(this._blockContext.unique), this._blockContext.documentTypeUnique = this._ownerContentTypeUnique ?? i, this._blockPreviewContext?.setDocumentTypeUnique(this._blockContext.documentTypeUnique), this._workspaceContextResolved = !0, this.observeBlockValue(), await this.fetchAndLoadStylesheets());
  }
  /**
   * Observe the nearest block workspace to resolve the content type that owns the
   * block-editor property. The document/node key still comes from the content
   * workspace (see #297); only the owning content type differs when nested.
   */
  observeOwnerContentType() {
    this.consumeContext(Le, (e) => {
      e && this.observe(e.content.structure.contentTypeUniques, (i) => {
        const s = i?.[0];
        !s || s === this._ownerContentTypeUnique || (this._ownerContentTypeUnique = s, this._blockContext.documentTypeUnique !== s && (this._blockContext.documentTypeUnique = s, this._blockPreviewContext?.setDocumentTypeUnique(s), this._workspaceContextResolved && this.renderBlockPreview()));
      });
    });
  }
  /**
   * Fallback workspace observation via UMB_BLOCK_WORKSPACE_CONTEXT.
   * Used when the primary workspace context is unavailable (e.g. nested block editing).
   */
  observeBlockWorkspaceFallback() {
    this._workspaceContextResolved || !this._blockPreviewContext || this._blockContext.unique !== "" || this.consumeContext(Le, async (e) => {
      e && this.observe(e.content.structure.contentTypeUniques, async (i) => {
        const s = i[0];
        !this._isConnected || !s || (this._blockContext.unique = this._blockPreviewContext?.getUnique() ?? "", !this._blockContext.unique && this._blockContext.workspaceEditContentPath && (this._blockContext.unique = this.extractUniqueFromWorkspacePath(this._blockContext.workspaceEditContentPath)), this._blockContext.documentTypeUnique = s, this.observeBlockValue(), await this.fetchAndLoadStylesheets());
      });
    });
  }
  async fetchAndLoadStylesheets() {
    if (this._stylesheetsAdopted || !this._blockPreviewContext) return;
    const e = await this.fetchStylesheets();
    if (e && e.length > 0) {
      const i = await Promise.all(
        e.map((n) => this._blockPreviewContext.getOrCreateStylesheet(n))
      ), s = this.renderRoot;
      s.adoptedStyleSheets = [...s.adoptedStyleSheets, ...i], this._stylesheetsAdopted = !0;
    }
  }
  // endregion
  // region Preview rendering
  resolveUniqueFromContext() {
    this._blockPreviewContext != null && this._blockContext.unique === "" && (this._blockContext.unique = this._blockPreviewContext.getUnique(), !this._blockContext.unique && this._blockContext.workspaceEditContentPath && (this._blockContext.unique = this.extractUniqueFromWorkspacePath(this._blockContext.workspaceEditContentPath))), this._blockPreviewContext != null && this._blockContext.documentTypeUnique === "" && (this._blockContext.documentTypeUnique = this._blockPreviewContext.getDocumentTypeUnique());
  }
  async renderBlockPreview() {
    if (!this._isConnected || (this.resolveUniqueFromContext(), !this.validatePreviewData()))
      return;
    this._isLoading = !0, this._error = null;
    const e = ++this._requestId;
    try {
      const { data: i, error: s } = await this._blockPreviewContext.requestQueue.enqueue(
        () => this.callPreviewApi()
      );
      if (this._requestId !== e) return;
      i != null ? (this._htmlMarkup = i, this._isLoading = !1) : s ? (this._error = St.isUmbApiError(s) ? s.message : this.localize.term("blockPreview_renderError"), this._isLoading = !1) : this._isLoading = !1;
    } catch (i) {
      if (this._requestId !== e) return;
      this._error = this.localize.term("blockPreview_renderFailed"), this._isLoading = !1, console.error("Block preview error:", i);
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
    const i = e.match(/\/workspace\/document\/edit\/([a-f0-9-]{36})/i);
    return i ? i[1] : "";
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
      const o = Math.abs(e.clientX - this._pointerStartPos.x), r = Math.abs(e.clientY - this._pointerStartPos.y);
      if (this._pointerStartPos = null, o > 5 || r > 5) {
        e.preventDefault(), e.stopPropagation();
        return;
      }
    }
    this._pointerStartPos = null;
    const s = e.composedPath();
    if (Me(s)) {
      e.preventDefault(), e.stopPropagation();
      return;
    }
    if (s.filter((o) => o instanceof Element && o.tagName === "A" && o.hasAttribute("data-block-preview-link")).length > 0) {
      e.preventDefault(), e.stopPropagation();
      const o = s.find((r) => r instanceof Element && r.tagName === "A" && r.classList.contains("block-preview-edit"));
      o instanceof Element ? window.history.pushState({}, "", o.getAttribute("href")) : window.history.pushState({}, "", this._blockContext.workspaceEditContentPath);
      return;
    }
  }
  // endregion
  // region Rendering
  render() {
    return X`
            ${this._isLoading ? X`<div class="preview-alert preview-alert-info"><uui-loader></uui-loader> <umb-localize key="blockPreview_loading">Loading preview...</umb-localize></div>` : this._error ? X`<div class="preview-alert preview-alert-error" role="alert">${this._error}</div>` : this._htmlMarkup ? X`<a
                            href=${Ve(this._blockContext.workspaceEditContentPath)}
                            @pointerdown=${this._handlePointerDown}
                            @click=${this._handleClick}
                            aria-label=${this.localize.term("blockPreview_editBlock")}
                            class="block-preview-edit"
							title=${Ve(this._blockContext.contentElementTypeAlias)}
                        >${mt(this._htmlMarkup)}</a>` : Ct}
        `;
  }
  static {
    this.styles = [
      le`
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
g([
  w({ attribute: !1, hasChanged: (t, e) => JSON.stringify(t) !== JSON.stringify(e) })
], p.prototype, "content");
g([
  w({ attribute: !1, hasChanged: (t, e) => JSON.stringify(t) !== JSON.stringify(e) })
], p.prototype, "settings");
g([
  w({ attribute: !1 })
], p.prototype, "contentKey");
g([
  w({ attribute: !1 })
], p.prototype, "config");
g([
  w({ attribute: !1 })
], p.prototype, "unpublished");
g([
  w({ attribute: !1 })
], p.prototype, "icon");
g([
  w({ attribute: !1 })
], p.prototype, "label");
g([
  L()
], p.prototype, "_htmlMarkup");
g([
  L()
], p.prototype, "_isLoading");
g([
  L()
], p.prototype, "_error");
class de {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async previewGridBlock(e, i) {
    return await T(this.#e, E.previewGridBlock({ body: e, query: i }));
  }
  async previewListBlock(e, i) {
    return await T(this.#e, E.previewListBlock({ body: e, query: i }));
  }
  async previewSingleBlock(e, i) {
    return await T(this.#e, E.previewSingleBlock({ body: e, query: i }));
  }
  async previewRichTextMarkup(e, i) {
    return await T(this.#e, E.previewRichTextMarkup({ body: e, query: i }));
  }
  async getGridStylesheets(e) {
    return await T(this.#e, E.getGridStylesheets({ query: e }));
  }
  async getListStylesheets(e) {
    return await T(this.#e, E.getListStylesheets({ query: e }));
  }
  async getSingleBlockStylesheets(e) {
    return await T(this.#e, E.getSingleBlockStylesheets({ query: e }));
  }
  async getRteStylesheets(e) {
    return await T(this.#e, E.getRteStylesheets({ query: e }));
  }
}
class ti {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async getSettings() {
    return await T(this.#e, E.getSettings());
  }
}
class ii extends He {
  #e;
  constructor(e) {
    super(e), this.#e = new ti(e);
  }
  async getSettings() {
    const e = await this.#e.getSettings();
    if (e && e?.data)
      return e.data;
  }
}
const si = 300;
function ni(t, e, i) {
  const s = (e.areas?.length ?? 0) > 0, n = !t.layoutAreas && !!e.layoutAreas;
  return s && n && i.managerObserved ? { kind: "render", reason: "layout-areas-arrived" } : i.hasMarkup && !!e.layout && (e.layout.columnSpan !== t.layout?.columnSpan || e.layout.rowSpan !== t.layout?.rowSpan) ? { kind: "debounce", reason: "resized", delayMs: si } : { kind: "none" };
}
class oi {
  #e;
  schedule(e, i) {
    clearTimeout(this.#e), this.#e = setTimeout(i, e);
  }
  cancel() {
    clearTimeout(this.#e);
  }
}
const tt = "UMB-BLOCK-GRID-ENTRY", Ce = "#actions, uui-action-bar", ae = "--block-preview-parent-actions-offset", ri = 8;
let ye;
const Ie = /* @__PURE__ */ new WeakSet();
function ai(t, e, i, s = ri) {
  const n = t.left + i, o = t.right + i;
  return n < e.right && o > e.left && t.top < e.bottom && t.bottom > e.top ? Math.ceil(o - e.left + s) : 0;
}
function ci(t, e) {
  const i = t.indexOf(e);
  for (let s = i - 1; s >= 0; s--) {
    const n = t[s];
    if (n instanceof Element && n.tagName === tt)
      return n;
  }
}
function li(t) {
  let e = t.getRootNode();
  for (; e instanceof ShadowRoot; ) {
    if (e.host.tagName === tt)
      return e.host;
    e = e.host.getRootNode();
  }
}
function ui(t) {
  Ie.has(t) || (ye ??= new CSSStyleSheet(), ye.replaceSync(`
        :host { ${ae}: 0px; }
        ${Ce} { translate: calc(-1 * var(${ae})) 0; }
    `), t.adoptedStyleSheets = [...t.adoptedStyleSheets, ye], Ie.add(t));
}
class hi {
  #e;
  #t = 0;
  /** Starts watching the block grid entry that renders `host`. */
  attach(e) {
    this.detach();
    const i = li(e);
    i?.shadowRoot && (ui(i.shadowRoot), i.addEventListener("pointerover", this.#i), i.addEventListener("pointerleave", this.#s), this.#e = i);
  }
  detach() {
    this.#e && (this.#e.removeEventListener("pointerover", this.#i), this.#e.removeEventListener("pointerleave", this.#s), this.#n(0), this.#e = void 0);
  }
  #i = (e) => {
    const i = this.#e, s = i?.shadowRoot?.querySelector(Ce);
    if (!i || !s) return;
    const n = e.composedPath();
    if (n.includes(s)) return;
    const o = ci(n, i)?.shadowRoot?.querySelector(Ce);
    this.#n(
      o ? ai(s.getBoundingClientRect(), o.getBoundingClientRect(), this.#t) : 0
    );
  };
  #s = () => this.#n(0);
  #n(e) {
    !this.#e || e === this.#t || (this.#t = e, e ? this.#e.style.setProperty(ae, `${e}px`) : this.#e.style.removeProperty(ae));
  }
}
var di = Object.defineProperty, pi = Object.getOwnPropertyDescriptor, it = (t) => {
  throw TypeError(t);
}, st = (t, e, i, s) => {
  for (var n = s > 1 ? void 0 : s ? pi(e, i) : e, o = t.length - 1, r; o >= 0; o--)
    (r = t[o]) && (n = (s ? r(e, i, n) : r(n)) || n);
  return s && n && di(e, i, n), n;
}, ge = (t, e, i) => e.has(t) || it("Cannot " + i), P = (t, e, i) => (ge(t, e, "read from private field"), i ? i.call(t) : e.get(t)), $ = (t, e, i) => e.has(t) ? it("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), Ke = (t, e, i, s) => (ge(t, e, "write to private field"), e.set(t, i), i), N = (t, e, i) => (ge(t, e, "access private method"), i), M, Q, O, nt, I, Z, ot, ce;
const fi = "block-grid-preview";
let z = class extends p {
  constructor() {
    super(), $(this, O), $(this, M), $(this, Q, new hi()), this._blockContext = {
      unique: "",
      documentTypeUnique: "",
      contentUdi: "",
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
    }, $(this, I, !1), $(this, Z, new oi()), Ke(this, M, new de(this));
  }
  set blockGridValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockGridValue = e;
  }
  get blockGridValue() {
    return this._blockGridValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await N(this, O, nt).call(this);
  }
  connectedCallback() {
    super.connectedCallback(), P(this, Q).attach(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), P(this, Z).cancel(), P(this, Q).detach();
  }
  observeBlockValue() {
    this.consumeContext(Tt, async (t) => {
      t && this.observe(
        _([
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
          i,
          s,
          n,
          o,
          r,
          a,
          l
        ]) => {
          const u = this._blockContext.layout?.columnSpan, c = this._blockContext.layout?.rowSpan, d = this._blockContext.layoutAreas;
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = i ?? "", this._blockContext.workspaceEditContentPath = s ?? "", this._blockContext.contentElementTypeAlias = n ?? "", this._blockContext.contentElementTypeKey = o ?? "", this._blockContext.areas = r, this._blockContext.layout = a, this._blockContext.layoutAreas = l, !P(this, I) && this._blockContext.contentUdi && (Ke(this, I, !0), await N(this, O, ot).call(this));
          const x = ni(
            { layoutAreas: d, layout: { columnSpan: u, rowSpan: c } },
            { areas: r, layoutAreas: l, layout: a },
            { hasMarkup: !!this._htmlMarkup, managerObserved: P(this, I) }
          );
          x.kind === "render" ? (this.blockGridValue = {
            ...this._blockGridValue,
            layout: { "Umbraco.BlockGrid": N(this, O, ce).call(this) }
          }, this.renderBlockPreview()) : x.kind === "debounce" && (this.blockGridValue = {
            ...this._blockGridValue,
            layout: { "Umbraco.BlockGrid": N(this, O, ce).call(this) }
          }, P(this, Z).schedule(x.delayMs, () => this.renderBlockPreview()));
        }
      );
    });
  }
  async callPreviewApi() {
    return await P(this, M).previewGridBlock(
      JSON.stringify(this.blockGridValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        contentElementAlias: this._blockContext.contentElementTypeAlias,
        documentTypeUnique: this._blockContext.documentTypeUnique,
        contentUdi: this._blockContext.contentUdi,
        settingsUdi: this._blockContext.settingsUdi,
        culture: this._blockContext.culture,
        blockIndex: this._blockContext.blockIndex
      }
    );
  }
  async fetchStylesheets() {
    const { data: t } = await P(this, M).getGridStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
M = /* @__PURE__ */ new WeakMap();
Q = /* @__PURE__ */ new WeakMap();
O = /* @__PURE__ */ new WeakSet();
nt = async function() {
  try {
    await this.getContext(q, { passContextAliasMatches: !0 }), this.consumeContext(q, (t) => {
      t && this.observe(
        _([t.unique, t.structure.contentTypeUniques]),
        async ([e, i]) => {
          await this.handleWorkspaceData(e?.toString(), i?.[0]);
        }
      );
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
I = /* @__PURE__ */ new WeakMap();
Z = /* @__PURE__ */ new WeakMap();
ot = async function() {
  this.consumeContext(Et, (t) => {
    t && this.observe(
      _([
        t.contents,
        t.settings,
        t.exposes,
        t.propertyAlias
      ]),
      async ([e, i, s, n]) => {
        this._blockContext.blockEditorAlias = n ?? "", this.blockGridValue = {
          contentData: e ?? [],
          settingsData: i ?? [],
          expose: s ?? [],
          layout: { "Umbraco.BlockGrid": N(this, O, ce).call(this) }
        }, this._blockContext.blockIndex = (e ?? []).findIndex((o) => o.key === this._blockContext.contentUdi), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
ce = function() {
  return [
    {
      areas: this._blockContext.areas.map((i) => ({
        key: i.key,
        items: this._blockContext.layoutAreas?.find((n) => n.key === i.key)?.items ?? []
      })),
      columnSpan: this._blockContext.layout?.columnSpan ?? 0,
      rowSpan: this._blockContext.layout?.rowSpan ?? 0,
      contentKey: this._blockContext.layout?.contentKey ?? "",
      settingsKey: this._blockContext.layout?.settingsKey
    }
  ];
};
z.styles = [
  ...p.styles,
  le`
            :host {
                display: block;
                height: 100%;
            }

            a.block-preview-edit {
                height: 100%;
            }
        `
];
st([
  w({ attribute: !1 })
], z.prototype, "blockGridValue", 1);
z = st([
  ue(fi)
], z);
var yi = Object.defineProperty, bi = Object.getOwnPropertyDescriptor, rt = (t) => {
  throw TypeError(t);
}, xe = (t, e, i, s) => {
  for (var n = s > 1 ? void 0 : s ? bi(e, i) : e, o = t.length - 1, r; o >= 0; o--)
    (r = t[o]) && (n = (s ? r(e, i, n) : r(n)) || n);
  return s && n && yi(e, i, n), n;
}, Se = (t, e, i) => e.has(t) || rt("Cannot " + i), be = (t, e, i) => (Se(t, e, "read from private field"), e.get(t)), ke = (t, e, i) => e.has(t) ? rt("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), We = (t, e, i, s) => (Se(t, e, "write to private field"), e.set(t, i), i), Ge = (t, e, i) => (Se(t, e, "access private method"), i), K, ee, at, te, ct;
const ki = "block-list-preview";
let D = class extends p {
  constructor() {
    super(), ke(this, ee), ke(this, K), this._blockContext = {
      unique: "",
      documentTypeUnique: "",
      contentUdi: "",
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
    }, ke(this, te, !1), We(this, K, new de(this));
  }
  set blockListValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockListValue = e;
  }
  get blockListValue() {
    return this._blockListValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await Ge(this, ee, at).call(this);
  }
  observeBlockValue() {
    this.consumeContext(Pt, (t) => {
      t && this.observe(
        _([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey
        ]),
        async ([
          e,
          i,
          s,
          n,
          o
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = i ?? "", this._blockContext.workspaceEditContentPath = s ?? "", this._blockContext.contentElementTypeAlias = n ?? "", this._blockContext.contentElementTypeKey = o ?? "", !be(this, te) && this._blockContext.contentUdi && (We(this, te, !0), await Ge(this, ee, ct).call(this));
        }
      );
    });
  }
  async callPreviewApi() {
    return await be(this, K).previewListBlock(
      JSON.stringify(this.blockListValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        contentElementAlias: this._blockContext.contentElementTypeAlias,
        documentTypeUnique: this._blockContext.documentTypeUnique,
        contentUdi: this._blockContext.contentUdi,
        settingsUdi: this._blockContext.settingsUdi,
        culture: this._blockContext.culture,
        blockIndex: this._blockContext.blockIndex
      }
    );
  }
  async fetchStylesheets() {
    const { data: t } = await be(this, K).getListStylesheets({
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
ee = /* @__PURE__ */ new WeakSet();
at = async function() {
  try {
    await this.getContext(q, { passContextAliasMatches: !0 }), this.consumeContext(q, (t) => {
      t && this.observe(
        _([t.unique, t.structure.contentTypeUniques]),
        async ([e, i]) => {
          await this.handleWorkspaceData(e?.toString(), i?.[0]);
        }
      );
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
te = /* @__PURE__ */ new WeakMap();
ct = function() {
  this.consumeContext(Ut, (t) => {
    t && this.observe(
      _([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([
        e,
        i,
        s,
        n,
        o
      ]) => {
        this._blockContext.blockEditorAlias = o ?? "", this.blockListValue = {
          contentData: e?.filter((r) => r.key === this._blockContext.contentUdi) ?? [],
          settingsData: i?.filter((r) => r.key === this._blockContext.settingsUdi) ?? [],
          expose: n?.filter((r) => r.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.BlockList": s?.filter((r) => r.contentKey === this._blockContext.contentUdi) ?? []
          }
        }, this._blockContext.blockIndex = e?.indexOf(this.blockListValue.contentData[0]), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
D.styles = [
  ...p.styles,
  le`
            :host {
                display: block;
                height: 100%;
            }

            a.block-preview-edit {
                height: 100%;
            }
        `
];
xe([
  L()
], D.prototype, "_blockListValue", 2);
xe([
  w({ attribute: !1 })
], D.prototype, "blockListValue", 1);
D = xe([
  ue(ki)
], D);
var _i = Object.defineProperty, vi = Object.getOwnPropertyDescriptor, lt = (t) => {
  throw TypeError(t);
}, Te = (t, e, i, s) => {
  for (var n = s > 1 ? void 0 : s ? vi(e, i) : e, o = t.length - 1, r; o >= 0; o--)
    (r = t[o]) && (n = (s ? r(e, i, n) : r(n)) || n);
  return s && n && _i(e, i, n), n;
}, Ee = (t, e, i) => e.has(t) || lt("Cannot " + i), _e = (t, e, i) => (Ee(t, e, "read from private field"), e.get(t)), ve = (t, e, i) => e.has(t) ? lt("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), ze = (t, e, i, s) => (Ee(t, e, "write to private field"), e.set(t, i), i), je = (t, e, i) => (Ee(t, e, "access private method"), i), W, ie, ut, se, ht;
const wi = "block-single-preview";
let V = class extends p {
  constructor() {
    super(), ve(this, ie), ve(this, W), this._blockContext = {
      unique: "",
      documentTypeUnique: "",
      contentUdi: "",
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
    }, ve(this, se, !1), ze(this, W, new de(this));
  }
  set blockSingleValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockSingleValue = e;
  }
  get blockSingleValue() {
    return this._blockSingleValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await je(this, ie, ut).call(this);
  }
  observeBlockValue() {
    this.consumeContext(At, (t) => {
      t && this.observe(
        _([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey
        ]),
        async ([
          e,
          i,
          s,
          n,
          o
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = i ?? "", this._blockContext.workspaceEditContentPath = s ?? "", this._blockContext.contentElementTypeAlias = n ?? "", this._blockContext.contentElementTypeKey = o ?? "", _e(this, se) || (ze(this, se, !0), await je(this, ie, ht).call(this));
        }
      );
    });
  }
  async callPreviewApi() {
    return await _e(this, W).previewSingleBlock(
      JSON.stringify(this.blockSingleValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        contentElementAlias: this._blockContext.contentElementTypeAlias,
        documentTypeUnique: this._blockContext.documentTypeUnique,
        contentUdi: this._blockContext.contentUdi,
        settingsUdi: this._blockContext.settingsUdi,
        culture: this._blockContext.culture,
        blockIndex: this._blockContext.blockIndex
      }
    );
  }
  async fetchStylesheets() {
    const { data: t } = await _e(this, W).getSingleBlockStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
W = /* @__PURE__ */ new WeakMap();
ie = /* @__PURE__ */ new WeakSet();
ut = async function() {
  try {
    await this.getContext(q, { passContextAliasMatches: !0 }), this.consumeContext(q, (t) => {
      t && this.observe(
        _([t.unique, t.structure.contentTypeUniques]),
        async ([e, i]) => {
          await this.handleWorkspaceData(e?.toString(), i?.[0]);
        }
      );
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
se = /* @__PURE__ */ new WeakMap();
ht = function() {
  this.consumeContext(Bt, (t) => {
    t && this.observe(
      _([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([
        e,
        i,
        s,
        n,
        o
      ]) => {
        this._blockContext.blockEditorAlias = o ?? "", this.blockSingleValue = {
          contentData: e?.filter((r) => r.key === this._blockContext.contentUdi) ?? [],
          settingsData: i?.filter((r) => r.key === this._blockContext.settingsUdi) ?? [],
          expose: n?.filter((r) => r.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.SingleBlock": s?.filter((r) => r.contentKey === this._blockContext.contentUdi) ?? []
          }
        }, this._blockContext.blockIndex = e?.indexOf(this.blockSingleValue.contentData[0]), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
V.styles = [
  ...p.styles,
  le`
            :host {
                display: block;
                height: 100%;
            }

            a.block-preview-edit {
                height: 100%;
            }
        `
];
Te([
  L()
], V.prototype, "_blockSingleValue", 2);
Te([
  w({ attribute: !1 })
], V.prototype, "blockSingleValue", 1);
V = Te([
  ue(wi)
], V);
var Ci = Object.defineProperty, mi = Object.getOwnPropertyDescriptor, dt = (t) => {
  throw TypeError(t);
}, Pe = (t, e, i, s) => {
  for (var n = s > 1 ? void 0 : s ? mi(e, i) : e, o = t.length - 1, r; o >= 0; o--)
    (r = t[o]) && (n = (s ? r(e, i, n) : r(n)) || n);
  return s && n && Ci(e, i, n), n;
}, Ue = (t, e, i) => e.has(t) || dt("Cannot " + i), J = (t, e, i) => (Ue(t, e, "read from private field"), e.get(t)), Y = (t, e, i) => e.has(t) ? dt("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), we = (t, e, i, s) => (Ue(t, e, "write to private field"), e.set(t, i), i), Fe = (t, e, i) => (Ue(t, e, "access private method"), i), G, ne, pt, oe, re, ft;
const gi = "rich-text-preview";
let j = class extends p {
  constructor() {
    super(), Y(this, ne), Y(this, G), this._blockContext = {
      unique: "",
      documentTypeUnique: "",
      contentUdi: "",
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
    }, Y(this, oe, !1), Y(this, re, !1), we(this, G, new de(this));
  }
  set blockRteValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockRteValue = e;
  }
  get blockRteValue() {
    return this._blockRteValue;
  }
  setupContextObservers() {
    this.observePropertyDataset(), this.observeBlockValue(), Fe(this, ne, pt).call(this);
  }
  observeBlockValue() {
    J(this, oe) || (we(this, oe, !0), this.consumeContext(Ot, (t) => {
      t != null && this.observe(
        _([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey
        ]),
        async ([
          e,
          i,
          s,
          n,
          o
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = i ?? "", this._blockContext.workspaceEditContentPath = s ?? "", this._blockContext.contentElementTypeAlias = n ?? "", this._blockContext.contentElementTypeKey = o ?? "", !J(this, re) && this._blockContext.contentUdi && (we(this, re, !0), await Fe(this, ne, ft).call(this));
        }
      );
    }));
  }
  async callPreviewApi() {
    return await J(this, G).previewRichTextMarkup(
      JSON.stringify(this.blockRteValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        contentElementAlias: this._blockContext.contentElementTypeAlias,
        documentTypeUnique: this._blockContext.documentTypeUnique,
        culture: this._blockContext.culture
      }
    );
  }
  async fetchStylesheets() {
    const { data: t } = await J(this, G).getRteStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique
    });
    return t;
  }
};
G = /* @__PURE__ */ new WeakMap();
ne = /* @__PURE__ */ new WeakSet();
pt = function() {
  try {
    this.consumeContext(Dt, (t) => {
      t && (this._workspaceContextResolved = !0, this.observe(
        _([t.unique, t.contentTypeUnique]),
        async ([e, i]) => {
          await this.handleWorkspaceData(e?.toString(), i);
        }
      ));
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
oe = /* @__PURE__ */ new WeakMap();
re = /* @__PURE__ */ new WeakMap();
ft = function() {
  this.consumeContext(qt, (t) => {
    t != null && this.observe(
      _([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([
        e,
        i,
        s,
        n,
        o
      ]) => {
        this._blockContext.blockEditorAlias = o ?? "", this.blockRteValue = {
          contentData: e?.filter((r) => r.key === this._blockContext.contentUdi) ?? [],
          settingsData: i?.filter((r) => r.key === this._blockContext.settingsUdi) ?? [],
          expose: n?.filter((r) => r.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.RichText": s?.filter((r) => r.contentKey === this._blockContext.contentUdi) ?? []
          }
        }, !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
Pe([
  L()
], j.prototype, "_blockRteValue", 2);
Pe([
  w({ attribute: !1 })
], j.prototype, "blockRteValue", 1);
j = Pe([
  ue(gi)
], j);
class xi {
  #e;
  #t = 0;
  #i = [];
  constructor(e = 3) {
    this.#e = e;
  }
  /**
   * Enqueue a task to run with concurrency limiting.
   * If fewer than `maxConcurrent` tasks are active, the task runs immediately.
   * Otherwise it waits until a slot is available.
   */
  async enqueue(e) {
    this.#t >= this.#e && await new Promise((i) => {
      this.#i.push(i);
    }), this.#t++;
    try {
      return await e();
    } finally {
      this.#t--, this.#i.length > 0 && this.#i.shift()();
    }
  }
}
class me extends He {
  #e = new xi(3);
  #t = /* @__PURE__ */ new Map();
  /** Shared concurrency-limited queue for preview API requests. */
  get requestQueue() {
    return this.#e;
  }
  // Node key cache used as a fallback when a preview cannot reach its content
  // workspace directly (e.g. when nested inside another block, whose workspace
  // context shadows the document workspace under the shared 'UmbWorkspaceContext'
  // alias).
  #i = new Re("");
  #s = new Re("");
  constructor(e) {
    super(e);
  }
  getUnique() {
    return this.#i.getValue();
  }
  async setUnique(e) {
    e !== "" && this.#i.setValue(e);
  }
  getDocumentTypeUnique() {
    return this.#s.getValue();
  }
  async setDocumentTypeUnique(e) {
    e !== "" && this.#s.setValue(e);
  }
  getOrCreateStylesheet(e) {
    const i = this.#t.get(e);
    if (i) return i;
    const s = fetch(e).then((n) => n.text()).then((n) => {
      const o = new CSSStyleSheet();
      return o.replaceSync(n), o;
    });
    return this.#t.set(e, s), s;
  }
}
const Si = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BlockPreviewContext: me,
  default: me
}, Symbol.toStringTag, { value: "Module" })), Ti = [
  {
    type: "globalContext",
    alias: "BlockPreview.Context",
    name: "BlockPreview Context",
    js: () => Promise.resolve().then(() => Si)
  }
], Ei = Ti, Pi = [
  {
    type: "localization",
    alias: "BlockPreview.Localization.En",
    name: "BlockPreview English Localization",
    meta: {
      culture: "en"
    },
    js: () => import("./en-BNTuLdKT.js")
  }
], Ui = Pi, zi = async (t, e) => {
  t.consumeContext(vt, async (i) => {
    if (!i) return;
    const s = i.getOpenApiConfiguration();
    y.setConfig({
      baseUrl: s?.base ?? "",
      auth: s?.token ?? void 0,
      credentials: s?.credentials ?? "same-origin"
    }), y.interceptors.request.use(async (a, l) => {
      const u = await s.token();
      return a.headers.set("Authorization", `Bearer ${u}`), a;
    });
    const o = await new ii(t).getSettings();
    let r = [];
    if (o) {
      if (o.blockGrid.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.GridCustomView",
          name: "BlockPreview Grid Custom View",
          element: z,
          forBlockEditor: "block-grid"
        };
        o.blockGrid.contentTypes?.length !== 0 && (a.forContentTypeAlias = o.blockGrid.contentTypes), r.push(a);
      }
      if (o.blockList.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.ListCustomView",
          name: "BlockPreview List Custom View",
          element: D,
          forBlockEditor: "block-list"
        };
        o.blockList.contentTypes?.length !== 0 && (a.forContentTypeAlias = o.blockList.contentTypes), r.push(a);
      }
      if (o.singleBlock.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.SingleBlockCustomView",
          name: "BlockPreview Single Block Custom View",
          element: V,
          forBlockEditor: "block-single"
        };
        o.singleBlock.contentTypes?.length !== 0 && (a.forContentTypeAlias = o.singleBlock.contentTypes), r.push(a);
      }
      if (o.richText.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.RichTextCustomView",
          name: "BlockPreview Rich Text Custom View",
          element: j,
          forBlockEditor: "block-rte"
        };
        o.richText.contentTypes?.length !== 0 && (a.forContentTypeAlias = o.richText.contentTypes), r.push(a);
      }
    }
    e.registerMany([
      ...r,
      ...Ei,
      ...Ui
    ]), t.provideContext(et, new me(t));
  });
};
export {
  z as BlockGridPreviewCustomView,
  D as BlockListPreviewCustomView,
  p as BlockPreviewBaseElement,
  V as BlockSinglePreviewCustomView,
  de as PreviewDataSource,
  j as RichTextPreviewCustomView,
  ti as SettingsDataSource,
  ii as SettingsRepository,
  Me as isBlockActionNavigation,
  zi as onInit
};
//# sourceMappingURL=index.js.map
