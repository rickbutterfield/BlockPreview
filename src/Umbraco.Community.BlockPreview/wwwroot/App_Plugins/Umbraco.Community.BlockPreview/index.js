import { UMB_AUTH_CONTEXT as pt } from "@umbraco-cms/backoffice/auth";
import { UmbContextToken as bt } from "@umbraco-cms/backoffice/context-api";
import { nothing as kt, html as H, ifDefined as Be, unsafeHTML as yt, css as ae, property as w, state as N, customElement as ce } from "@umbraco-cms/backoffice/external/lit";
import { UMB_BLOCK_WORKSPACE_CONTEXT as qe } from "@umbraco-cms/backoffice/block";
import { UMB_PARENT_ENTITY_CONTEXT as ft } from "@umbraco-cms/backoffice/entity";
import { UmbLitElement as _t } from "@umbraco-cms/backoffice/lit-element";
import { UMB_PROPERTY_DATASET_CONTEXT as Ct } from "@umbraco-cms/backoffice/property";
import { UmbApiError as wt, tryExecute as E } from "@umbraco-cms/backoffice/resources";
import { UmbControllerBase as We } from "@umbraco-cms/backoffice/class-api";
import { UMB_BLOCK_GRID_ENTRY_CONTEXT as vt, UMB_BLOCK_GRID_MANAGER_CONTEXT as mt } from "@umbraco-cms/backoffice/block-grid";
import { UMB_CONTENT_WORKSPACE_CONTEXT as O } from "@umbraco-cms/backoffice/content";
import { observeMultiple as _, UmbStringState as Oe } from "@umbraco-cms/backoffice/observable-api";
import { UMB_BLOCK_LIST_ENTRY_CONTEXT as gt, UMB_BLOCK_LIST_MANAGER_CONTEXT as xt } from "@umbraco-cms/backoffice/block-list";
import { UMB_BLOCK_SINGLE_ENTRY_CONTEXT as Tt, UMB_BLOCK_SINGLE_MANAGER_CONTEXT as Et } from "@umbraco-cms/backoffice/block-single";
import { UMB_BLOCK_RTE_ENTRY_CONTEXT as St, UMB_BLOCK_RTE_MANAGER_CONTEXT as Ut } from "@umbraco-cms/backoffice/block-rte";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as Pt } from "@umbraco-cms/backoffice/document";
const At = {
  bodySerializer: (t) => JSON.stringify(
    t,
    (e, i) => typeof i == "bigint" ? i.toString() : i
  )
}, Bt = ({
  onRequest: t,
  onSseError: e,
  onSseEvent: i,
  responseTransformer: s,
  responseValidator: r,
  sseDefaultRetryDelay: o,
  sseMaxRetryAttempts: n,
  sseMaxRetryDelay: a,
  sseSleepFn: l,
  url: u,
  ...c
}) => {
  let d;
  const x = l ?? ((h) => new Promise((y) => setTimeout(y, h)));
  return { stream: async function* () {
    let h = o ?? 3e3, y = 0;
    const U = c.signal ?? new AbortController().signal;
    for (; !U.aborted; ) {
      y++;
      const L = c.headers instanceof Headers ? c.headers : new Headers(c.headers);
      d !== void 0 && L.set("Last-Event-ID", d);
      try {
        const P = {
          redirect: "follow",
          ...c,
          body: c.serializedBody,
          headers: L,
          signal: U
        };
        let v = new Request(u, P);
        t && (v = await t(u, P));
        const f = await (c.fetch ?? globalThis.fetch)(v);
        if (!f.ok)
          throw new Error(
            `SSE failed: ${f.status} ${f.statusText}`
          );
        if (!f.body) throw new Error("No body in SSE response");
        const m = f.body.pipeThrough(new TextDecoderStream()).getReader();
        let he = "";
        const Ee = () => {
          try {
            m.cancel();
          } catch {
          }
        };
        U.addEventListener("abort", Ee);
        try {
          for (; ; ) {
            const { done: lt, value: ut } = await m.read();
            if (lt) break;
            he += ut;
            const Se = he.split(`

`);
            he = Se.pop() ?? "";
            for (const ht of Se) {
              const dt = ht.split(`
`), X = [];
              let Ue;
              for (const C of dt)
                if (C.startsWith("data:"))
                  X.push(C.replace(/^data:\s*/, ""));
                else if (C.startsWith("event:"))
                  Ue = C.replace(/^event:\s*/, "");
                else if (C.startsWith("id:"))
                  d = C.replace(/^id:\s*/, "");
                else if (C.startsWith("retry:")) {
                  const Ae = Number.parseInt(
                    C.replace(/^retry:\s*/, ""),
                    10
                  );
                  Number.isNaN(Ae) || (h = Ae);
                }
              let A, Pe = !1;
              if (X.length) {
                const C = X.join(`
`);
                try {
                  A = JSON.parse(C), Pe = !0;
                } catch {
                  A = C;
                }
              }
              Pe && (r && await r(A), s && (A = await s(A))), i?.({
                data: A,
                event: Ue,
                id: d,
                retry: h
              }), X.length && (yield A);
            }
          }
        } finally {
          U.removeEventListener("abort", Ee), m.releaseLock();
        }
        break;
      } catch (P) {
        if (e?.(P), n !== void 0 && y >= n)
          break;
        const v = Math.min(
          h * 2 ** (y - 1),
          a ?? 3e4
        );
        await x(v);
      }
    }
  }() };
}, qt = (t) => {
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
}, Ot = (t) => {
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
}, Dt = (t) => {
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
}, ze = ({
  allowReserved: t,
  explode: e,
  name: i,
  style: s,
  value: r
}) => {
  if (!e) {
    const a = (t ? r : r.map((l) => encodeURIComponent(l))).join(Ot(s));
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
  const o = qt(s), n = r.map((a) => s === "label" || s === "simple" ? t ? a : encodeURIComponent(a) : le({
    allowReserved: t,
    name: i,
    value: a
  })).join(o);
  return s === "label" || s === "matrix" ? o + n : n;
}, le = ({
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
}, Ge = ({
  allowReserved: t,
  explode: e,
  name: i,
  style: s,
  value: r,
  valueOnly: o
}) => {
  if (r instanceof Date)
    return o ? r.toISOString() : `${i}=${r.toISOString()}`;
  if (s !== "deepObject" && !e) {
    let l = [];
    Object.entries(r).forEach(([c, d]) => {
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
  const n = Dt(s), a = Object.entries(r).map(
    ([l, u]) => le({
      allowReserved: t,
      name: s === "deepObject" ? `${i}[${l}]` : l,
      value: u
    })
  ).join(n);
  return s === "label" || s === "matrix" ? n + a : a;
}, Vt = /\{[^{}]+\}/g, Nt = ({ path: t, url: e }) => {
  let i = e;
  const s = e.match(Vt);
  if (s)
    for (const r of s) {
      let o = !1, n = r.substring(1, r.length - 1), a = "simple";
      n.endsWith("*") && (o = !0, n = n.substring(0, n.length - 1)), n.startsWith(".") ? (n = n.substring(1), a = "label") : n.startsWith(";") && (n = n.substring(1), a = "matrix");
      const l = t[n];
      if (l == null)
        continue;
      if (Array.isArray(l)) {
        i = i.replace(
          r,
          ze({ explode: o, name: n, style: a, value: l })
        );
        continue;
      }
      if (typeof l == "object") {
        i = i.replace(
          r,
          Ge({
            explode: o,
            name: n,
            style: a,
            value: l,
            valueOnly: !0
          })
        );
        continue;
      }
      if (a === "matrix") {
        i = i.replace(
          r,
          `;${le({
            name: n,
            value: l
          })}`
        );
        continue;
      }
      const u = encodeURIComponent(
        a === "label" ? `.${l}` : l
      );
      i = i.replace(r, u);
    }
  return i;
}, Lt = ({
  baseUrl: t,
  path: e,
  query: i,
  querySerializer: s,
  url: r
}) => {
  const o = r.startsWith("/") ? r : `/${r}`;
  let n = (t ?? "") + o;
  e && (n = Nt({ path: e, url: n }));
  let a = i ? s(i) : "";
  return a.startsWith("?") && (a = a.substring(1)), a && (n += `?${a}`), n;
};
function $t(t) {
  const e = t.body !== void 0;
  if (e && t.bodySerializer)
    return "serializedBody" in t ? t.serializedBody !== void 0 && t.serializedBody !== "" ? t.serializedBody : null : t.body !== "" ? t.body : null;
  if (e)
    return t.body;
}
const Mt = async (t, e) => {
  const i = typeof e == "function" ? await e(t) : e;
  if (i)
    return t.scheme === "bearer" ? `Bearer ${i}` : t.scheme === "basic" ? `Basic ${btoa(i)}` : i;
}, je = ({
  allowReserved: t,
  array: e,
  object: i
} = {}) => (r) => {
  const o = [];
  if (r && typeof r == "object")
    for (const n in r) {
      const a = r[n];
      if (a != null)
        if (Array.isArray(a)) {
          const l = ze({
            allowReserved: t,
            explode: !0,
            name: n,
            style: "form",
            value: a,
            ...e
          });
          l && o.push(l);
        } else if (typeof a == "object") {
          const l = Ge({
            allowReserved: t,
            explode: !0,
            name: n,
            style: "deepObject",
            value: a,
            ...i
          });
          l && o.push(l);
        } else {
          const l = le({
            allowReserved: t,
            name: n,
            value: a
          });
          l && o.push(l);
        }
    }
  return o.join("&");
}, Rt = (t) => {
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
}, It = (t, e) => e ? !!(t.headers.has(e) || t.query?.[e] || t.headers.get("Cookie")?.includes(`${e}=`)) : !1, Kt = async ({
  security: t,
  ...e
}) => {
  for (const i of t) {
    if (It(e, i.name))
      continue;
    const s = await Mt(i, e.auth);
    if (!s)
      continue;
    const r = i.name ?? "Authorization";
    switch (i.in) {
      case "query":
        e.query || (e.query = {}), e.query[r] = s;
        break;
      case "cookie":
        e.headers.append("Cookie", `${r}=${s}`);
        break;
      case "header":
      default:
        e.headers.set(r, s);
        break;
    }
  }
}, De = (t) => Lt({
  baseUrl: t.baseUrl,
  path: t.path,
  query: t.query,
  querySerializer: typeof t.querySerializer == "function" ? t.querySerializer : je(t.querySerializer),
  url: t.url
}), Ve = (t, e) => {
  const i = { ...t, ...e };
  return i.baseUrl?.endsWith("/") && (i.baseUrl = i.baseUrl.substring(0, i.baseUrl.length - 1)), i.headers = Xe(t.headers, e.headers), i;
}, Wt = (t) => {
  const e = [];
  return t.forEach((i, s) => {
    e.push([s, i]);
  }), e;
}, Xe = (...t) => {
  const e = new Headers();
  for (const i of t) {
    if (!i)
      continue;
    const s = i instanceof Headers ? Wt(i) : Object.entries(i);
    for (const [r, o] of s)
      if (o === null)
        e.delete(r);
      else if (Array.isArray(o))
        for (const n of o)
          e.append(r, n);
      else o !== void 0 && e.set(
        r,
        typeof o == "object" ? JSON.stringify(o) : o
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
const zt = () => ({
  error: new de(),
  request: new de(),
  response: new de()
}), Gt = je({
  allowReserved: !1,
  array: {
    explode: !0,
    style: "form"
  },
  object: {
    explode: !0,
    style: "deepObject"
  }
}), jt = {
  "Content-Type": "application/json"
}, He = (t = {}) => ({
  ...At,
  headers: jt,
  parseAs: "auto",
  querySerializer: Gt,
  ...t
}), Xt = (t = {}) => {
  let e = Ve(He(), t);
  const i = () => ({ ...e }), s = (u) => (e = Ve(e, u), i()), r = zt(), o = async (u) => {
    const c = {
      ...e,
      ...u,
      fetch: u.fetch ?? e.fetch ?? globalThis.fetch,
      headers: Xe(e.headers, u.headers),
      serializedBody: void 0
    };
    c.security && await Kt({
      ...c,
      security: c.security
    }), c.requestValidator && await c.requestValidator(c), c.body !== void 0 && c.bodySerializer && (c.serializedBody = c.bodySerializer(c.body)), (c.body === void 0 || c.serializedBody === "") && c.headers.delete("Content-Type");
    const d = De(c);
    return { opts: c, url: d };
  }, n = async (u) => {
    const { opts: c, url: d } = await o(u), x = {
      redirect: "follow",
      ...c,
      body: $t(c)
    };
    let T = new Request(d, x);
    for (const b of r.request.fns)
      b && (T = await b(T, c));
    const j = c.fetch;
    let h = await j(T);
    for (const b of r.response.fns)
      b && (h = await b(h, T, c));
    const y = {
      request: T,
      response: h
    };
    if (h.ok) {
      const b = (c.parseAs === "auto" ? Rt(h.headers.get("Content-Type")) : c.parseAs) ?? "json";
      if (h.status === 204 || h.headers.get("Content-Length") === "0") {
        let m;
        switch (b) {
          case "arrayBuffer":
          case "blob":
          case "text":
            m = await h[b]();
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
          ...y
        };
      }
      let f;
      switch (b) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          f = await h[b]();
          break;
        case "stream":
          return c.responseStyle === "data" ? h.body : {
            data: h.body,
            ...y
          };
      }
      return b === "json" && (c.responseValidator && await c.responseValidator(f), c.responseTransformer && (f = await c.responseTransformer(f))), c.responseStyle === "data" ? f : {
        data: f,
        ...y
      };
    }
    const U = await h.text();
    let L;
    try {
      L = JSON.parse(U);
    } catch {
    }
    const P = L ?? U;
    let v = P;
    for (const b of r.error.fns)
      b && (v = await b(P, h, T, c));
    if (v = v || {}, c.throwOnError)
      throw v;
    return c.responseStyle === "data" ? void 0 : {
      error: v,
      ...y
    };
  }, a = (u) => (c) => n({ ...c, method: u }), l = (u) => async (c) => {
    const { opts: d, url: x } = await o(c);
    return Bt({
      ...d,
      body: d.body,
      headers: d.headers,
      method: u,
      onRequest: async (T, j) => {
        let h = new Request(T, j);
        for (const y of r.request.fns)
          y && (h = await y(h, d));
        return h;
      },
      url: x
    });
  };
  return {
    buildUrl: De,
    connect: a("CONNECT"),
    delete: a("DELETE"),
    get: a("GET"),
    getConfig: i,
    head: a("HEAD"),
    interceptors: r,
    options: a("OPTIONS"),
    patch: a("PATCH"),
    post: a("POST"),
    put: a("PUT"),
    request: n,
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
}, k = Xt(He({
  baseUrl: "http://localhost:26293",
  throwOnError: !0
}));
class S {
  static previewGridBlock(e) {
    return (e?.client ?? k).post({
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
    return (e?.client ?? k).get({
      url: "/umbraco/block-preview/api/v1/preview/grid/stylesheet",
      ...e
    });
  }
  static getGridStylesheets(e) {
    return (e?.client ?? k).get({
      url: "/umbraco/block-preview/api/v1/preview/grid/stylesheets",
      ...e
    });
  }
  static previewListBlock(e) {
    return (e?.client ?? k).post({
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
    return (e?.client ?? k).get({
      url: "/umbraco/block-preview/api/v1/preview/list/stylesheet",
      ...e
    });
  }
  static getListStylesheets(e) {
    return (e?.client ?? k).get({
      url: "/umbraco/block-preview/api/v1/preview/list/stylesheets",
      ...e
    });
  }
  static previewRichTextMarkup(e) {
    return (e?.client ?? k).post({
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
    return (e?.client ?? k).get({
      url: "/umbraco/block-preview/api/v1/preview/rte/stylesheet",
      ...e
    });
  }
  static getRteStylesheets(e) {
    return (e?.client ?? k).get({
      url: "/umbraco/block-preview/api/v1/preview/rte/stylesheets",
      ...e
    });
  }
  static previewSingleBlock(e) {
    return (e?.client ?? k).post({
      url: "/umbraco/block-preview/api/v1/preview/single",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e?.headers
      }
    });
  }
  static getSingleBlockStylesheets(e) {
    return (e?.client ?? k).get({
      url: "/umbraco/block-preview/api/v1/preview/single/stylesheets",
      ...e
    });
  }
  static getSettings(e) {
    return (e?.client ?? k).get({
      url: "/umbraco/block-preview/api/v1/settings",
      ...e
    });
  }
}
const Fe = new bt("BlockPreviewContext");
var Ht = Object.defineProperty, g = (t, e, i, s) => {
  for (var r = void 0, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (r = n(e, i, r) || r);
  return r && Ht(e, i, r), r;
};
const Ft = ["UUI-ACTION-BAR", "UMB-BLOCK-ACTION", "UMB-BLOCK-SCALE-HANDLER"];
function Ne(t) {
  return t.some((s) => s instanceof Element && Ft.includes(s.tagName)) ? !t.some(
    (s) => s instanceof Element && s.tagName === "UUI-BUTTON" && (s.getAttribute("href") ?? "").includes("block/edit")
  ) : !1;
}
class p extends _t {
  constructor() {
    super(), this._workspaceContextResolved = !1, this._isNewDocument = !1, this._htmlMarkup = "", this._isLoading = !1, this._error = null, this._stylesheetsAdopted = !1, this._requestId = 0, this._isConnected = !1, this._pointerStartPos = null, this._handleAnchorNavGuard = (e) => {
      Ne(e.composedPath()) && e.preventDefault();
    }, this.consumeContext(Fe, async (e) => {
      this._blockPreviewContext = e, this.observeOwnerContentType(), this.observeParentEntity(), await this.setupContextObservers();
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
    this.consumeContext(Ct, (e) => {
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
    this.consumeContext(qe, (e) => {
      e && this.observe(e.content.structure.contentTypeUniques, (i) => {
        const s = i?.[0];
        !s || s === this._ownerContentTypeUnique || (this._ownerContentTypeUnique = s, this._blockContext.documentTypeUnique !== s && (this._blockContext.documentTypeUnique = s, this._blockPreviewContext?.setDocumentTypeUnique(s), this._workspaceContextResolved && this.renderBlockPreview()));
      });
    });
  }
  /**
   * Observe the parent of the document. A document that has not been saved yet cannot be
   * found on the server, which then renders the preview against this parent instead.
   */
  observeParentEntity() {
    this.consumeContext(ft, (e) => {
      e && this.observe(e.parent, (i) => {
        const s = i?.unique ?? "";
        s !== this._blockContext.parentUnique && (this._blockContext.parentUnique = s, this._isNewDocument && this._workspaceContextResolved && this.renderBlockPreview());
      });
    });
  }
  /** Tracks whether the document workspace is creating a new document. */
  observeIsNewDocument(e) {
    this.observe(e, (i) => {
      this._isNewDocument = i === !0;
    });
  }
  /**
   * Fallback workspace observation via UMB_BLOCK_WORKSPACE_CONTEXT.
   * Used when the primary workspace context is unavailable (e.g. nested block editing).
   */
  observeBlockWorkspaceFallback() {
    this._workspaceContextResolved || !this._blockPreviewContext || this._blockContext.unique !== "" || this.consumeContext(qe, async (e) => {
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
        e.map((r) => this._blockPreviewContext.getOrCreateStylesheet(r))
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
      i != null ? (this._htmlMarkup = i, this._isLoading = !1) : s ? (this._error = wt.isUmbApiError(s) ? s.message : this.localize.term("blockPreview_renderError"), this._isLoading = !1) : this._isLoading = !1;
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
      const o = Math.abs(e.clientX - this._pointerStartPos.x), n = Math.abs(e.clientY - this._pointerStartPos.y);
      if (this._pointerStartPos = null, o > 5 || n > 5) {
        e.preventDefault(), e.stopPropagation();
        return;
      }
    }
    this._pointerStartPos = null;
    const s = e.composedPath();
    if (Ne(s)) {
      e.preventDefault(), e.stopPropagation();
      return;
    }
    if (s.filter((o) => o instanceof Element && o.tagName === "A" && o.hasAttribute("data-block-preview-link")).length > 0) {
      e.preventDefault(), e.stopPropagation();
      const o = s.find((n) => n instanceof Element && n.tagName === "A" && n.classList.contains("block-preview-edit"));
      o instanceof Element ? window.history.pushState({}, "", o.getAttribute("href")) : window.history.pushState({}, "", this._blockContext.workspaceEditContentPath);
      return;
    }
  }
  // endregion
  // region Rendering
  render() {
    return H`
            ${this._isLoading ? H`<div class="preview-alert preview-alert-info"><uui-loader></uui-loader> <umb-localize key="blockPreview_loading">Loading preview...</umb-localize></div>` : this._error ? H`<div class="preview-alert preview-alert-error" role="alert">${this._error}</div>` : this._htmlMarkup ? H`<a
                            href=${Be(this._blockContext.workspaceEditContentPath)}
                            @pointerdown=${this._handlePointerDown}
                            @click=${this._handleClick}
                            aria-label=${this.localize.term("blockPreview_editBlock")}
                            class="block-preview-edit"
							title=${Be(this._blockContext.contentElementTypeAlias)}
                        >${yt(this._htmlMarkup)}</a>` : kt}
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
  N()
], p.prototype, "_htmlMarkup");
g([
  N()
], p.prototype, "_isLoading");
g([
  N()
], p.prototype, "_error");
class ue {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async previewGridBlock(e, i) {
    return await E(this.#e, S.previewGridBlock({ body: e, query: i }));
  }
  async previewListBlock(e, i) {
    return await E(this.#e, S.previewListBlock({ body: e, query: i }));
  }
  async previewSingleBlock(e, i) {
    return await E(this.#e, S.previewSingleBlock({ body: e, query: i }));
  }
  async previewRichTextMarkup(e, i) {
    return await E(this.#e, S.previewRichTextMarkup({ body: e, query: i }));
  }
  async getGridStylesheets(e) {
    return await E(this.#e, S.getGridStylesheets({ query: e }));
  }
  async getListStylesheets(e) {
    return await E(this.#e, S.getListStylesheets({ query: e }));
  }
  async getSingleBlockStylesheets(e) {
    return await E(this.#e, S.getSingleBlockStylesheets({ query: e }));
  }
  async getRteStylesheets(e) {
    return await E(this.#e, S.getRteStylesheets({ query: e }));
  }
}
class Jt {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async getSettings() {
    return await E(this.#e, S.getSettings());
  }
}
class Yt extends We {
  #e;
  constructor(e) {
    super(e), this.#e = new Jt(e);
  }
  async getSettings() {
    const e = await this.#e.getSettings();
    if (e && e?.data)
      return e.data;
  }
}
const Qt = 300;
function Zt(t, e, i) {
  const s = (e.areas?.length ?? 0) > 0, r = !t.layoutAreas && !!e.layoutAreas;
  return s && r && i.managerObserved ? { kind: "render", reason: "layout-areas-arrived" } : i.hasMarkup && !!e.layout && (e.layout.columnSpan !== t.layout?.columnSpan || e.layout.rowSpan !== t.layout?.rowSpan) ? { kind: "debounce", reason: "resized", delayMs: Qt } : { kind: "none" };
}
class ei {
  #e;
  schedule(e, i) {
    clearTimeout(this.#e), this.#e = setTimeout(i, e);
  }
  cancel() {
    clearTimeout(this.#e);
  }
}
var ti = Object.defineProperty, ii = Object.getOwnPropertyDescriptor, Je = (t) => {
  throw TypeError(t);
}, Ye = (t, e, i, s) => {
  for (var r = s > 1 ? void 0 : s ? ii(e, i) : e, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (r = (s ? n(e, i, r) : n(r)) || r);
  return s && r && ti(e, i, r), r;
}, Ce = (t, e, i) => e.has(t) || Je("Cannot " + i), q = (t, e, i) => (Ce(t, e, "read from private field"), i ? i.call(t) : e.get(t)), F = (t, e, i) => e.has(t) ? Je("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), Le = (t, e, i, s) => (Ce(t, e, "write to private field"), e.set(t, i), i), $ = (t, e, i) => (Ce(t, e, "access private method"), i), M, B, Qe, R, Q, Ze, oe;
const si = "block-grid-preview";
let z = class extends p {
  constructor() {
    super(), F(this, B), F(this, M), this._blockContext = {
      unique: "",
      parentUnique: "",
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
    }, F(this, R, !1), F(this, Q, new ei()), Le(this, M, new ue(this));
  }
  set blockGridValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockGridValue = e;
  }
  get blockGridValue() {
    return this._blockGridValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await $(this, B, Qe).call(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), q(this, Q).cancel();
  }
  observeBlockValue() {
    this.consumeContext(vt, async (t) => {
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
          r,
          o,
          n,
          a,
          l
        ]) => {
          const u = this._blockContext.layout?.columnSpan, c = this._blockContext.layout?.rowSpan, d = this._blockContext.layoutAreas;
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = i ?? "", this._blockContext.workspaceEditContentPath = s ?? "", this._blockContext.contentElementTypeAlias = r ?? "", this._blockContext.contentElementTypeKey = o ?? "", this._blockContext.areas = n, this._blockContext.layout = a, this._blockContext.layoutAreas = l, !q(this, R) && this._blockContext.contentUdi && (Le(this, R, !0), await $(this, B, Ze).call(this));
          const x = Zt(
            { layoutAreas: d, layout: { columnSpan: u, rowSpan: c } },
            { areas: n, layoutAreas: l, layout: a },
            { hasMarkup: !!this._htmlMarkup, managerObserved: q(this, R) }
          );
          x.kind === "render" ? (this.blockGridValue = {
            ...this._blockGridValue,
            layout: { "Umbraco.BlockGrid": $(this, B, oe).call(this) }
          }, this.renderBlockPreview()) : x.kind === "debounce" && (this.blockGridValue = {
            ...this._blockGridValue,
            layout: { "Umbraco.BlockGrid": $(this, B, oe).call(this) }
          }, q(this, Q).schedule(x.delayMs, () => this.renderBlockPreview()));
        }
      );
    });
  }
  async callPreviewApi() {
    return await q(this, M).previewGridBlock(
      JSON.stringify(this.blockGridValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        parentKey: this._blockContext.parentUnique || void 0,
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
    const { data: t } = await q(this, M).getGridStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique,
      parentKey: this._blockContext.parentUnique || void 0
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
M = /* @__PURE__ */ new WeakMap();
B = /* @__PURE__ */ new WeakSet();
Qe = async function() {
  try {
    await this.getContext(O, { passContextAliasMatches: !0 }), this.consumeContext(O, (t) => {
      t && (this.observeIsNewDocument(t.isNew), this.observe(
        _([t.unique, t.structure.contentTypeUniques]),
        async ([e, i]) => {
          await this.handleWorkspaceData(e?.toString(), i?.[0]);
        }
      ));
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
R = /* @__PURE__ */ new WeakMap();
Q = /* @__PURE__ */ new WeakMap();
Ze = async function() {
  this.consumeContext(mt, (t) => {
    t && this.observe(
      _([
        t.contents,
        t.settings,
        t.exposes,
        t.propertyAlias
      ]),
      async ([e, i, s, r]) => {
        this._blockContext.blockEditorAlias = r ?? "", this.blockGridValue = {
          contentData: e ?? [],
          settingsData: i ?? [],
          expose: s ?? [],
          layout: { "Umbraco.BlockGrid": $(this, B, oe).call(this) }
        }, this._blockContext.blockIndex = (e ?? []).findIndex((o) => o.key === this._blockContext.contentUdi), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
oe = function() {
  return [
    {
      areas: this._blockContext.areas.map((i) => ({
        key: i.key,
        items: this._blockContext.layoutAreas?.find((r) => r.key === i.key)?.items ?? []
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
Ye([
  w({ attribute: !1 })
], z.prototype, "blockGridValue", 1);
z = Ye([
  ce(si)
], z);
var ri = Object.defineProperty, ni = Object.getOwnPropertyDescriptor, et = (t) => {
  throw TypeError(t);
}, we = (t, e, i, s) => {
  for (var r = s > 1 ? void 0 : s ? ni(e, i) : e, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (r = (s ? n(e, i, r) : n(r)) || r);
  return s && r && ri(e, i, r), r;
}, ve = (t, e, i) => e.has(t) || et("Cannot " + i), pe = (t, e, i) => (ve(t, e, "read from private field"), e.get(t)), be = (t, e, i) => e.has(t) ? et("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), $e = (t, e, i, s) => (ve(t, e, "write to private field"), e.set(t, i), i), Me = (t, e, i) => (ve(t, e, "access private method"), i), I, Z, tt, ee, it;
const oi = "block-list-preview";
let D = class extends p {
  constructor() {
    super(), be(this, Z), be(this, I), this._blockContext = {
      unique: "",
      parentUnique: "",
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
    }, be(this, ee, !1), $e(this, I, new ue(this));
  }
  set blockListValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockListValue = e;
  }
  get blockListValue() {
    return this._blockListValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await Me(this, Z, tt).call(this);
  }
  observeBlockValue() {
    this.consumeContext(gt, (t) => {
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
          r,
          o
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = i ?? "", this._blockContext.workspaceEditContentPath = s ?? "", this._blockContext.contentElementTypeAlias = r ?? "", this._blockContext.contentElementTypeKey = o ?? "", !pe(this, ee) && this._blockContext.contentUdi && ($e(this, ee, !0), await Me(this, Z, it).call(this));
        }
      );
    });
  }
  async callPreviewApi() {
    return await pe(this, I).previewListBlock(
      JSON.stringify(this.blockListValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        parentKey: this._blockContext.parentUnique || void 0,
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
    const { data: t } = await pe(this, I).getListStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique,
      parentKey: this._blockContext.parentUnique || void 0
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
I = /* @__PURE__ */ new WeakMap();
Z = /* @__PURE__ */ new WeakSet();
tt = async function() {
  try {
    await this.getContext(O, { passContextAliasMatches: !0 }), this.consumeContext(O, (t) => {
      t && (this.observeIsNewDocument(t.isNew), this.observe(
        _([t.unique, t.structure.contentTypeUniques]),
        async ([e, i]) => {
          await this.handleWorkspaceData(e?.toString(), i?.[0]);
        }
      ));
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
ee = /* @__PURE__ */ new WeakMap();
it = function() {
  this.consumeContext(xt, (t) => {
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
        r,
        o
      ]) => {
        this._blockContext.blockEditorAlias = o ?? "", this.blockListValue = {
          contentData: e?.filter((n) => n.key === this._blockContext.contentUdi) ?? [],
          settingsData: i?.filter((n) => n.key === this._blockContext.settingsUdi) ?? [],
          expose: r?.filter((n) => n.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.BlockList": s?.filter((n) => n.contentKey === this._blockContext.contentUdi) ?? []
          }
        }, this._blockContext.blockIndex = e?.indexOf(this.blockListValue.contentData[0]), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
D.styles = [
  ...p.styles,
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
we([
  N()
], D.prototype, "_blockListValue", 2);
we([
  w({ attribute: !1 })
], D.prototype, "blockListValue", 1);
D = we([
  ce(oi)
], D);
var ai = Object.defineProperty, ci = Object.getOwnPropertyDescriptor, st = (t) => {
  throw TypeError(t);
}, me = (t, e, i, s) => {
  for (var r = s > 1 ? void 0 : s ? ci(e, i) : e, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (r = (s ? n(e, i, r) : n(r)) || r);
  return s && r && ai(e, i, r), r;
}, ge = (t, e, i) => e.has(t) || st("Cannot " + i), ke = (t, e, i) => (ge(t, e, "read from private field"), e.get(t)), ye = (t, e, i) => e.has(t) ? st("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), Re = (t, e, i, s) => (ge(t, e, "write to private field"), e.set(t, i), i), Ie = (t, e, i) => (ge(t, e, "access private method"), i), K, te, rt, ie, nt;
const li = "block-single-preview";
let V = class extends p {
  constructor() {
    super(), ye(this, te), ye(this, K), this._blockContext = {
      unique: "",
      parentUnique: "",
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
    }, ye(this, ie, !1), Re(this, K, new ue(this));
  }
  set blockSingleValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockSingleValue = e;
  }
  get blockSingleValue() {
    return this._blockSingleValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await Ie(this, te, rt).call(this);
  }
  observeBlockValue() {
    this.consumeContext(Tt, (t) => {
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
          r,
          o
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = i ?? "", this._blockContext.workspaceEditContentPath = s ?? "", this._blockContext.contentElementTypeAlias = r ?? "", this._blockContext.contentElementTypeKey = o ?? "", ke(this, ie) || (Re(this, ie, !0), await Ie(this, te, nt).call(this));
        }
      );
    });
  }
  async callPreviewApi() {
    return await ke(this, K).previewSingleBlock(
      JSON.stringify(this.blockSingleValue),
      {
        blockEditorAlias: this._blockContext.blockEditorAlias,
        nodeKey: this._blockContext.unique,
        parentKey: this._blockContext.parentUnique || void 0,
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
    const { data: t } = await ke(this, K).getSingleBlockStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique,
      parentKey: this._blockContext.parentUnique || void 0
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
K = /* @__PURE__ */ new WeakMap();
te = /* @__PURE__ */ new WeakSet();
rt = async function() {
  try {
    await this.getContext(O, { passContextAliasMatches: !0 }), this.consumeContext(O, (t) => {
      t && (this.observeIsNewDocument(t.isNew), this.observe(
        _([t.unique, t.structure.contentTypeUniques]),
        async ([e, i]) => {
          await this.handleWorkspaceData(e?.toString(), i?.[0]);
        }
      ));
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
ie = /* @__PURE__ */ new WeakMap();
nt = function() {
  this.consumeContext(Et, (t) => {
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
        r,
        o
      ]) => {
        this._blockContext.blockEditorAlias = o ?? "", this.blockSingleValue = {
          contentData: e?.filter((n) => n.key === this._blockContext.contentUdi) ?? [],
          settingsData: i?.filter((n) => n.key === this._blockContext.settingsUdi) ?? [],
          expose: r?.filter((n) => n.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.SingleBlock": s?.filter((n) => n.contentKey === this._blockContext.contentUdi) ?? []
          }
        }, this._blockContext.blockIndex = e?.indexOf(this.blockSingleValue.contentData[0]), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
V.styles = [
  ...p.styles,
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
me([
  N()
], V.prototype, "_blockSingleValue", 2);
me([
  w({ attribute: !1 })
], V.prototype, "blockSingleValue", 1);
V = me([
  ce(li)
], V);
var ui = Object.defineProperty, hi = Object.getOwnPropertyDescriptor, ot = (t) => {
  throw TypeError(t);
}, xe = (t, e, i, s) => {
  for (var r = s > 1 ? void 0 : s ? hi(e, i) : e, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (r = (s ? n(e, i, r) : n(r)) || r);
  return s && r && ui(e, i, r), r;
}, Te = (t, e, i) => e.has(t) || ot("Cannot " + i), J = (t, e, i) => (Te(t, e, "read from private field"), e.get(t)), Y = (t, e, i) => e.has(t) ? ot("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), fe = (t, e, i, s) => (Te(t, e, "write to private field"), e.set(t, i), i), Ke = (t, e, i) => (Te(t, e, "access private method"), i), W, se, at, re, ne, ct;
const di = "rich-text-preview";
let G = class extends p {
  constructor() {
    super(), Y(this, se), Y(this, W), this._blockContext = {
      unique: "",
      parentUnique: "",
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
    }, Y(this, re, !1), Y(this, ne, !1), fe(this, W, new ue(this));
  }
  set blockRteValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockRteValue = e;
  }
  get blockRteValue() {
    return this._blockRteValue;
  }
  setupContextObservers() {
    this.observePropertyDataset(), this.observeBlockValue(), Ke(this, se, at).call(this);
  }
  observeBlockValue() {
    J(this, re) || (fe(this, re, !0), this.consumeContext(St, (t) => {
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
          r,
          o
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = i ?? "", this._blockContext.workspaceEditContentPath = s ?? "", this._blockContext.contentElementTypeAlias = r ?? "", this._blockContext.contentElementTypeKey = o ?? "", !J(this, ne) && this._blockContext.contentUdi && (fe(this, ne, !0), await Ke(this, se, ct).call(this));
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
        parentKey: this._blockContext.parentUnique || void 0,
        contentElementAlias: this._blockContext.contentElementTypeAlias,
        documentTypeUnique: this._blockContext.documentTypeUnique,
        culture: this._blockContext.culture
      }
    );
  }
  async fetchStylesheets() {
    const { data: t } = await J(this, W).getRteStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique,
      parentKey: this._blockContext.parentUnique || void 0
    });
    return t;
  }
};
W = /* @__PURE__ */ new WeakMap();
se = /* @__PURE__ */ new WeakSet();
at = function() {
  try {
    this.consumeContext(Pt, (t) => {
      t && (this._workspaceContextResolved = !0, this.observeIsNewDocument(t.isNew), this.observe(
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
re = /* @__PURE__ */ new WeakMap();
ne = /* @__PURE__ */ new WeakMap();
ct = function() {
  this.consumeContext(Ut, (t) => {
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
        r,
        o
      ]) => {
        this._blockContext.blockEditorAlias = o ?? "", this.blockRteValue = {
          contentData: e?.filter((n) => n.key === this._blockContext.contentUdi) ?? [],
          settingsData: i?.filter((n) => n.key === this._blockContext.settingsUdi) ?? [],
          expose: r?.filter((n) => n.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.RichText": s?.filter((n) => n.contentKey === this._blockContext.contentUdi) ?? []
          }
        }, !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
xe([
  N()
], G.prototype, "_blockRteValue", 2);
xe([
  w({ attribute: !1 })
], G.prototype, "blockRteValue", 1);
G = xe([
  ce(di)
], G);
class pi {
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
class _e extends We {
  #e = new pi(3);
  #t = /* @__PURE__ */ new Map();
  /** Shared concurrency-limited queue for preview API requests. */
  get requestQueue() {
    return this.#e;
  }
  // Node key cache used as a fallback when a preview cannot reach its content
  // workspace directly (e.g. when nested inside another block, whose workspace
  // context shadows the document workspace under the shared 'UmbWorkspaceContext'
  // alias).
  #i = new Oe("");
  #s = new Oe("");
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
    const s = fetch(e).then((r) => r.text()).then((r) => {
      const o = new CSSStyleSheet();
      return o.replaceSync(r), o;
    });
    return this.#t.set(e, s), s;
  }
}
const bi = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BlockPreviewContext: _e,
  default: _e
}, Symbol.toStringTag, { value: "Module" })), ki = [
  {
    type: "globalContext",
    alias: "BlockPreview.Context",
    name: "BlockPreview Context",
    js: () => Promise.resolve().then(() => bi)
  }
], yi = ki, fi = [
  {
    type: "localization",
    alias: "BlockPreview.Localization.En",
    name: "BlockPreview English Localization",
    meta: {
      culture: "en"
    },
    js: () => import("./en-BNTuLdKT.js")
  }
], _i = fi, Vi = async (t, e) => {
  t.consumeContext(pt, async (i) => {
    if (!i) return;
    const s = i.getOpenApiConfiguration();
    k.setConfig({
      baseUrl: s?.base ?? "",
      auth: s?.token ?? void 0,
      credentials: s?.credentials ?? "same-origin"
    }), k.interceptors.request.use(async (a, l) => {
      const u = await s.token();
      return a.headers.set("Authorization", `Bearer ${u}`), a;
    });
    const o = await new Yt(t).getSettings();
    let n = [];
    if (o) {
      if (o.blockGrid.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.GridCustomView",
          name: "BlockPreview Grid Custom View",
          element: z,
          forBlockEditor: "block-grid"
        };
        o.blockGrid.contentTypes?.length !== 0 && (a.forContentTypeAlias = o.blockGrid.contentTypes), n.push(a);
      }
      if (o.blockList.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.ListCustomView",
          name: "BlockPreview List Custom View",
          element: D,
          forBlockEditor: "block-list"
        };
        o.blockList.contentTypes?.length !== 0 && (a.forContentTypeAlias = o.blockList.contentTypes), n.push(a);
      }
      if (o.singleBlock.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.SingleBlockCustomView",
          name: "BlockPreview Single Block Custom View",
          element: V,
          forBlockEditor: "block-single"
        };
        o.singleBlock.contentTypes?.length !== 0 && (a.forContentTypeAlias = o.singleBlock.contentTypes), n.push(a);
      }
      if (o.richText.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.RichTextCustomView",
          name: "BlockPreview Rich Text Custom View",
          element: G,
          forBlockEditor: "block-rte"
        };
        o.richText.contentTypes?.length !== 0 && (a.forContentTypeAlias = o.richText.contentTypes), n.push(a);
      }
    }
    e.registerMany([
      ...n,
      ...yi,
      ..._i
    ]), t.provideContext(Fe, new _e(t));
  });
};
export {
  z as BlockGridPreviewCustomView,
  D as BlockListPreviewCustomView,
  p as BlockPreviewBaseElement,
  V as BlockSinglePreviewCustomView,
  ue as PreviewDataSource,
  G as RichTextPreviewCustomView,
  Jt as SettingsDataSource,
  Yt as SettingsRepository,
  Ne as isBlockActionNavigation,
  Vi as onInit
};
//# sourceMappingURL=index.js.map
