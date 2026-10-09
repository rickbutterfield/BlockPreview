import { UMB_AUTH_CONTEXT as bt } from "@umbraco-cms/backoffice/auth";
import { UmbContextToken as yt } from "@umbraco-cms/backoffice/context-api";
import { nothing as kt, html as X, ifDefined as Be, unsafeHTML as ft, css as ae, property as T, state as $, customElement as le } from "@umbraco-cms/backoffice/external/lit";
import { UMB_BLOCK_WORKSPACE_CONTEXT as qe } from "@umbraco-cms/backoffice/block";
import { UmbLitElement as _t } from "@umbraco-cms/backoffice/lit-element";
import { UMB_PROPERTY_DATASET_CONTEXT as wt } from "@umbraco-cms/backoffice/property";
import { UmbApiError as Ct, tryExecute as E } from "@umbraco-cms/backoffice/resources";
import { UmbControllerBase as ze } from "@umbraco-cms/backoffice/class-api";
import { UMB_BLOCK_GRID_ENTRY_CONTEXT as vt, UMB_BLOCK_GRID_MANAGER_CONTEXT as mt } from "@umbraco-cms/backoffice/block-grid";
import { UMB_CONTENT_WORKSPACE_CONTEXT as D } from "@umbraco-cms/backoffice/content";
import { observeMultiple as m, UmbStringState as Oe } from "@umbraco-cms/backoffice/observable-api";
import { UMB_BLOCK_LIST_ENTRY_CONTEXT as gt, UMB_BLOCK_LIST_MANAGER_CONTEXT as xt } from "@umbraco-cms/backoffice/block-list";
import { UMB_BLOCK_SINGLE_ENTRY_CONTEXT as Tt, UMB_BLOCK_SINGLE_MANAGER_CONTEXT as St } from "@umbraco-cms/backoffice/block-single";
import { UMB_BLOCK_RTE_ENTRY_CONTEXT as Et, UMB_BLOCK_RTE_MANAGER_CONTEXT as Ut } from "@umbraco-cms/backoffice/block-rte";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as Pt } from "@umbraco-cms/backoffice/document";
const At = {
  bodySerializer: (t) => JSON.stringify(t, (e, s) => typeof s == "bigint" ? s.toString() : s)
};
function Bt({
  onRequest: t,
  onSseError: e,
  onSseEvent: s,
  responseTransformer: i,
  responseValidator: r,
  sseDefaultRetryDelay: n,
  sseMaxRetryAttempts: o,
  sseMaxRetryDelay: a,
  sseSleepFn: l,
  url: k,
  ...u
}) {
  let c;
  const f = l ?? ((h) => new Promise((p) => setTimeout(p, h)));
  return { stream: async function* () {
    let h = n ?? 3e3, p = 0;
    const v = u.signal ?? new AbortController().signal;
    for (; !v.aborted; ) {
      p++;
      const j = u.headers instanceof Headers ? u.headers : new Headers(u.headers);
      c !== void 0 && j.set("Last-Event-ID", c);
      try {
        const P = {
          redirect: "follow",
          ...u,
          body: u.serializedBody,
          headers: j,
          signal: v
        };
        let A = new Request(k, P);
        t && (A = await t(k, P));
        const b = await (u.fetch ?? globalThis.fetch)(A);
        if (!b.ok) throw new Error(`SSE failed: ${b.status} ${b.statusText}`);
        if (!b.body) throw new Error("No body in SSE response");
        const g = b.body.pipeThrough(new TextDecoderStream()).getReader();
        let _ = "";
        const Se = () => {
          try {
            g.cancel();
          } catch {
          }
        };
        v.addEventListener("abort", Se);
        try {
          for (; ; ) {
            const { done: ut, value: ht } = await g.read();
            if (ut) break;
            _ += ht, _ = _.replace(/\r\n?/g, `
`);
            const Ee = _.split(`

`);
            _ = Ee.pop() ?? "";
            for (const dt of Ee) {
              const pt = dt.split(`
`), H = [];
              let Ue;
              for (const x of pt)
                if (x.startsWith("data:"))
                  H.push(x.replace(/^data:\s*/, ""));
                else if (x.startsWith("event:"))
                  Ue = x.replace(/^event:\s*/, "");
                else if (x.startsWith("id:"))
                  c = x.replace(/^id:\s*/, "");
                else if (x.startsWith("retry:")) {
                  const Ae = Number.parseInt(x.replace(/^retry:\s*/, ""), 10);
                  Number.isNaN(Ae) || (h = Ae);
                }
              let B, Pe = !1;
              if (H.length) {
                const x = H.join(`
`);
                try {
                  B = JSON.parse(x), Pe = !0;
                } catch {
                  B = x;
                }
              }
              Pe && (r && await r(B), i && (B = await i(B))), s?.({
                data: B,
                event: Ue,
                id: c,
                retry: h
              }), H.length && (yield B);
            }
          }
        } finally {
          v.removeEventListener("abort", Se), g.releaseLock();
        }
        break;
      } catch (P) {
        if (e?.(P), o !== void 0 && p >= o)
          break;
        const A = Math.min(h * 2 ** (p - 1), a ?? 3e4);
        await f(A);
      }
    }
  }() };
}
const qt = (t) => {
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
}, Ge = ({
  allowReserved: t,
  explode: e,
  name: s,
  style: i,
  value: r
}) => {
  if (!e) {
    const a = (t ? r : r.map((l) => encodeURIComponent(l))).join(Ot(i));
    switch (i) {
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
  const n = qt(i), o = r.map((a) => i === "label" || i === "simple" ? t ? a : encodeURIComponent(a) : ce({
    allowReserved: t,
    name: s,
    value: a
  })).join(n);
  return i === "label" || i === "matrix" ? n + o : o;
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
}, je = ({
  allowReserved: t,
  explode: e,
  name: s,
  style: i,
  value: r,
  valueOnly: n
}) => {
  if (r instanceof Date)
    return n ? r.toISOString() : `${s}=${r.toISOString()}`;
  if (i !== "deepObject" && !e) {
    let l = [];
    Object.entries(r).forEach(([u, c]) => {
      l = [...l, u, t ? c : encodeURIComponent(c)];
    });
    const k = l.join(",");
    switch (i) {
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
  const o = Dt(i), a = Object.entries(r).map(
    ([l, k]) => ce({
      allowReserved: t,
      name: i === "deepObject" ? `${s}[${l}]` : l,
      value: k
    })
  ).join(o);
  return i === "label" || i === "matrix" ? o + a : a;
}, Vt = /\{[^{}]+\}/g, Lt = ({ path: t, url: e }) => {
  let s = e;
  const i = e.match(Vt);
  if (i)
    for (const r of i) {
      let n = !1, o = r.substring(1, r.length - 1), a = "simple";
      o.endsWith("*") && (n = !0, o = o.substring(0, o.length - 1)), o.startsWith(".") ? (o = o.substring(1), a = "label") : o.startsWith(";") && (o = o.substring(1), a = "matrix");
      const l = t[o];
      if (l == null)
        continue;
      if (Array.isArray(l)) {
        s = s.replace(r, Ge({ explode: n, name: o, style: a, value: l }));
        continue;
      }
      if (typeof l == "object") {
        s = s.replace(
          r,
          je({
            explode: n,
            name: o,
            style: a,
            value: l,
            valueOnly: !0
          })
        );
        continue;
      }
      if (a === "matrix") {
        s = s.replace(
          r,
          `;${ce({
            name: o,
            value: l
          })}`
        );
        continue;
      }
      const k = encodeURIComponent(
        a === "label" ? `.${l}` : l
      );
      s = s.replace(r, k);
    }
  return s;
}, $t = ({
  baseUrl: t,
  path: e,
  query: s,
  querySerializer: i,
  url: r
}) => {
  const n = r.startsWith("/") ? r : `/${r}`;
  let o = (t ?? "") + n;
  e && (o = Lt({ path: e, url: o }));
  let a = s ? i(s) : "";
  return a.startsWith("?") && (a = a.substring(1)), a && (o += `?${a}`), o;
};
function De(t) {
  const e = t.body !== void 0;
  if (e && t.bodySerializer)
    return "serializedBody" in t ? t.serializedBody !== void 0 && t.serializedBody !== "" ? t.serializedBody : null : t.body !== "" ? t.body : null;
  if (e)
    return t.body;
}
const Mt = async (t, e) => {
  const s = typeof e == "function" ? await e(t) : e;
  if (s)
    return t.scheme === "bearer" ? `Bearer ${s}` : t.scheme === "basic" ? `Basic ${btoa(s)}` : s;
}, He = ({
  parameters: t = {},
  ...e
} = {}) => (i) => {
  const r = [];
  if (i && typeof i == "object")
    for (const n in i) {
      const o = i[n];
      if (o == null)
        continue;
      const a = t[n] || e;
      if (Array.isArray(o)) {
        const l = Ge({
          allowReserved: a.allowReserved,
          explode: !0,
          name: n,
          style: "form",
          value: o,
          ...a.array
        });
        l && r.push(l);
      } else if (typeof o == "object") {
        const l = je({
          allowReserved: a.allowReserved,
          explode: !0,
          name: n,
          style: "deepObject",
          value: o,
          ...a.object
        });
        l && r.push(l);
      } else {
        const l = ce({
          allowReserved: a.allowReserved,
          name: n,
          value: o
        });
        l && r.push(l);
      }
    }
  return r.join("&");
}, Rt = (t) => {
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
}, Nt = (t, e) => e ? !!(t.headers.has(e) || t.query?.[e] || t.headers.get("Cookie")?.includes(`${e}=`)) : !1, It = async ({
  security: t,
  ...e
}) => {
  for (const s of t) {
    if (Nt(e, s.name))
      continue;
    const i = await Mt(s, e.auth);
    if (!i)
      continue;
    const r = s.name ?? "Authorization";
    switch (s.in) {
      case "query":
        e.query || (e.query = {}), e.query[r] = i;
        break;
      case "cookie":
        e.headers.append("Cookie", `${r}=${i}`);
        break;
      case "header":
      default:
        e.headers.set(r, i);
        break;
    }
  }
}, Ve = (t) => $t({
  baseUrl: t.baseUrl,
  path: t.path,
  query: t.query,
  querySerializer: typeof t.querySerializer == "function" ? t.querySerializer : He(t.querySerializer),
  url: t.url
}), Le = (t, e) => {
  const s = { ...t, ...e };
  return s.baseUrl?.endsWith("/") && (s.baseUrl = s.baseUrl.substring(0, s.baseUrl.length - 1)), s.headers = Xe(t.headers, e.headers), s;
}, Kt = (t) => {
  const e = [];
  return t.forEach((s, i) => {
    e.push([i, s]);
  }), e;
}, Xe = (...t) => {
  const e = new Headers();
  for (const s of t) {
    if (!s)
      continue;
    const i = s instanceof Headers ? Kt(s) : Object.entries(s);
    for (const [r, n] of i)
      if (n === null)
        e.delete(r);
      else if (Array.isArray(n))
        for (const o of n)
          e.append(r, o);
      else n !== void 0 && e.set(
        r,
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
    const i = this.getInterceptorIndex(e);
    return this.fns[i] ? (this.fns[i] = s, e) : !1;
  }
  use(e) {
    return this.fns.push(e), this.fns.length - 1;
  }
}
const Wt = () => ({
  error: new de(),
  request: new de(),
  response: new de()
}), zt = He({
  allowReserved: !1,
  array: {
    explode: !0,
    style: "form"
  },
  object: {
    explode: !0,
    style: "deepObject"
  }
}), Gt = {
  "Content-Type": "application/json"
}, Fe = (t = {}) => ({
  ...At,
  headers: Gt,
  parseAs: "auto",
  querySerializer: zt,
  ...t
}), jt = (t = {}) => {
  let e = Le(Fe(), t);
  const s = () => ({ ...e }), i = (u) => (e = Le(e, u), s()), r = Wt(), n = async (u) => {
    const c = {
      ...e,
      ...u,
      fetch: u.fetch ?? e.fetch ?? globalThis.fetch,
      headers: Xe(e.headers, u.headers),
      serializedBody: void 0
    };
    c.security && await It({
      ...c,
      security: c.security
    }), c.requestValidator && await c.requestValidator(c), c.body !== void 0 && c.bodySerializer && (c.serializedBody = c.bodySerializer(c.body)), (c.body === void 0 || c.serializedBody === "") && c.headers.delete("Content-Type");
    const f = c, C = Ve(f);
    return { opts: f, url: C };
  }, o = async (u) => {
    const c = u.throwOnError ?? e.throwOnError, f = u.responseStyle ?? e.responseStyle;
    let C, d;
    try {
      const { opts: h, url: p } = await n(u), v = {
        redirect: "follow",
        ...h,
        body: De(h)
      };
      C = new Request(p, v);
      for (const b of r.request.fns)
        b && (C = await b(C, h));
      const j = h.fetch;
      d = await j(C);
      for (const b of r.response.fns)
        b && (d = await b(d, C, h));
      const P = {
        request: C,
        response: d
      };
      if (d.ok) {
        const b = (h.parseAs === "auto" ? Rt(d.headers.get("Content-Type")) : h.parseAs) ?? "json";
        if (d.status === 204 || d.headers.get("Content-Length") === "0") {
          let _;
          switch (b) {
            case "arrayBuffer":
            case "blob":
            case "text":
              _ = await d[b]();
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
        let g;
        switch (b) {
          case "arrayBuffer":
          case "blob":
          case "formData":
          case "text":
            g = await d[b]();
            break;
          case "json": {
            const _ = await d.text();
            g = _ ? JSON.parse(_) : {};
            break;
          }
          case "stream":
            return h.responseStyle === "data" ? d.body : {
              data: d.body,
              ...P
            };
        }
        return b === "json" && (h.responseValidator && await h.responseValidator(g), h.responseTransformer && (g = await h.responseTransformer(g))), h.responseStyle === "data" ? g : {
          data: g,
          ...P
        };
      }
      const A = await d.text();
      let he;
      try {
        he = JSON.parse(A);
      } catch {
      }
      throw he ?? A;
    } catch (h) {
      let p = h;
      for (const v of r.error.fns)
        v && (p = await v(p, d, C, u));
      if (p = p || {}, c)
        throw p;
      return f === "data" ? void 0 : {
        error: p,
        request: C,
        response: d
      };
    }
  }, a = (u) => (c) => o({ ...c, method: u }), l = (u) => async (c) => {
    const { opts: f, url: C } = await n(c);
    return Bt({
      ...f,
      body: f.body,
      method: u,
      onRequest: async (d, h) => {
        let p = new Request(d, h);
        for (const v of r.request.fns)
          v && (p = await v(p, f));
        return p;
      },
      serializedBody: De(f),
      url: C
    });
  };
  return {
    buildUrl: (u) => Ve({ ...e, ...u }),
    connect: a("CONNECT"),
    delete: a("DELETE"),
    get: a("GET"),
    getConfig: s,
    head: a("HEAD"),
    interceptors: r,
    options: a("OPTIONS"),
    patch: a("PATCH"),
    post: a("POST"),
    put: a("PUT"),
    request: o,
    setConfig: i,
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
}, w = jt(Fe({ baseUrl: "http://localhost:26294/", throwOnError: !0 }));
class U {
  static previewGridBlock(e) {
    return (e.client ?? w).post({
      url: "/umbraco/block-preview/api/v1/preview/grid",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
  }
  /**
   * @deprecated
   */
  static getGridStylesheet(e) {
    return (e?.client ?? w).get({ url: "/umbraco/block-preview/api/v1/preview/grid/stylesheet", ...e });
  }
  static getGridStylesheets(e) {
    return (e?.client ?? w).get({ url: "/umbraco/block-preview/api/v1/preview/grid/stylesheets", ...e });
  }
  static previewListBlock(e) {
    return (e.client ?? w).post({
      url: "/umbraco/block-preview/api/v1/preview/list",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
  }
  /**
   * @deprecated
   */
  static getListStylesheet(e) {
    return (e?.client ?? w).get({ url: "/umbraco/block-preview/api/v1/preview/list/stylesheet", ...e });
  }
  static getListStylesheets(e) {
    return (e?.client ?? w).get({ url: "/umbraco/block-preview/api/v1/preview/list/stylesheets", ...e });
  }
  static previewRichTextMarkup(e) {
    return (e.client ?? w).post({
      url: "/umbraco/block-preview/api/v1/preview/rte",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
  }
  /**
   * @deprecated
   */
  static getRteStylesheet(e) {
    return (e?.client ?? w).get({ url: "/umbraco/block-preview/api/v1/preview/rte/stylesheet", ...e });
  }
  static getRteStylesheets(e) {
    return (e?.client ?? w).get({ url: "/umbraco/block-preview/api/v1/preview/rte/stylesheets", ...e });
  }
  static previewSingleBlock(e) {
    return (e.client ?? w).post({
      url: "/umbraco/block-preview/api/v1/preview/single",
      ...e,
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
  }
  static getSingleBlockStylesheets(e) {
    return (e?.client ?? w).get({ url: "/umbraco/block-preview/api/v1/preview/single/stylesheets", ...e });
  }
  static getSettings(e) {
    return (e?.client ?? w).get({ url: "/umbraco/block-preview/api/v1/settings", ...e });
  }
}
const Je = new yt("BlockPreviewContext");
var Ht = Object.defineProperty, S = (t, e, s, i) => {
  for (var r = void 0, n = t.length - 1, o; n >= 0; n--)
    (o = t[n]) && (r = o(e, s, r) || r);
  return r && Ht(e, s, r), r;
};
const Xt = ["UUI-ACTION-BAR", "UMB-BLOCK-ACTION", "UMB-BLOCK-SCALE-HANDLER"];
function $e(t) {
  return t.some((i) => i instanceof Element && Xt.includes(i.tagName)) ? !t.some(
    (i) => i instanceof Element && i.tagName === "UUI-BUTTON" && (i.getAttribute("href") ?? "").includes("block/edit")
  ) : !1;
}
class y extends _t {
  constructor() {
    super(), this._workspaceContextResolved = !1, this._htmlMarkup = "", this._isLoading = !1, this._error = null, this._stylesheetsAdopted = !1, this._requestId = 0, this._isConnected = !1, this._pointerStartPos = null, this._handleAnchorNavGuard = (e) => {
      $e(e.composedPath()) && e.preventDefault();
    }, this.consumeContext(Je, async (e) => {
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
    this.consumeContext(wt, (e) => {
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
    this.consumeContext(qe, (e) => {
      e && this.observe(e.content.structure.contentTypeUniques, (s) => {
        const i = s?.[0];
        !i || i === this._ownerContentTypeUnique || (this._ownerContentTypeUnique = i, this._blockContext.documentTypeUnique !== i && (this._blockContext.documentTypeUnique = i, this._blockPreviewContext?.setDocumentTypeUnique(i), this._workspaceContextResolved && this.renderBlockPreview()));
      });
    });
  }
  /**
   * Fallback workspace observation via UMB_BLOCK_WORKSPACE_CONTEXT.
   * Used when the primary workspace context is unavailable (e.g. nested block editing).
   */
  observeBlockWorkspaceFallback() {
    this._workspaceContextResolved || !this._blockPreviewContext || this._blockContext.unique !== "" || this.consumeContext(qe, async (e) => {
      e && this.observe(e.content.structure.contentTypeUniques, async (s) => {
        const i = s[0];
        !this._isConnected || !i || (this._blockContext.unique = this._blockPreviewContext?.getUnique() ?? "", !this._blockContext.unique && this._blockContext.workspaceEditContentPath && (this._blockContext.unique = this.extractUniqueFromWorkspacePath(this._blockContext.workspaceEditContentPath)), this._blockContext.documentTypeUnique = i, this.observeBlockValue(), await this.fetchAndLoadStylesheets());
      });
    });
  }
  async fetchAndLoadStylesheets() {
    if (this._stylesheetsAdopted || !this._blockPreviewContext) return;
    const e = await this.fetchStylesheets();
    if (e && e.length > 0) {
      const s = await Promise.all(
        e.map((r) => this._blockPreviewContext.getOrCreateStylesheet(r))
      ), i = this.renderRoot;
      i.adoptedStyleSheets = [...i.adoptedStyleSheets, ...s], this._stylesheetsAdopted = !0;
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
      const { data: s, error: i } = await this._blockPreviewContext.requestQueue.enqueue(
        () => this.callPreviewApi()
      );
      if (this._requestId !== e) return;
      s != null ? (this._htmlMarkup = s, this._isLoading = !1) : i ? (this._error = Ct.isUmbApiError(i) ? i.message : this.localize.term("blockPreview_renderError"), this._isLoading = !1) : this._isLoading = !1;
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
      const n = Math.abs(e.clientX - this._pointerStartPos.x), o = Math.abs(e.clientY - this._pointerStartPos.y);
      if (this._pointerStartPos = null, n > 5 || o > 5) {
        e.preventDefault(), e.stopPropagation();
        return;
      }
    }
    this._pointerStartPos = null;
    const i = e.composedPath();
    if ($e(i)) {
      e.preventDefault(), e.stopPropagation();
      return;
    }
    if (i.filter((n) => n instanceof Element && n.tagName === "A" && n.hasAttribute("data-block-preview-link")).length > 0) {
      e.preventDefault(), e.stopPropagation();
      const n = i.find((o) => o instanceof Element && o.tagName === "A" && o.classList.contains("block-preview-edit"));
      n instanceof Element ? window.history.pushState({}, "", n.getAttribute("href")) : window.history.pushState({}, "", this._blockContext.workspaceEditContentPath);
      return;
    }
  }
  // endregion
  // region Rendering
  render() {
    return X`
            ${this._isLoading ? X`<div class="preview-alert preview-alert-info"><uui-loader></uui-loader> <umb-localize key="blockPreview_loading">Loading preview...</umb-localize></div>` : this._error ? X`<div class="preview-alert preview-alert-error" role="alert">${this._error}</div>` : this._htmlMarkup ? X`<a
                            href=${Be(this._blockContext.workspaceEditContentPath)}
                            @pointerdown=${this._handlePointerDown}
                            @click=${this._handleClick}
                            aria-label=${this.localize.term("blockPreview_editBlock")}
                            class="block-preview-edit"
							title=${Be(this._blockContext.contentElementTypeAlias)}
                        >${ft(this._htmlMarkup)}</a>` : kt}
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
S([
  T({ attribute: !1, hasChanged: (t, e) => JSON.stringify(t) !== JSON.stringify(e) })
], y.prototype, "content");
S([
  T({ attribute: !1, hasChanged: (t, e) => JSON.stringify(t) !== JSON.stringify(e) })
], y.prototype, "settings");
S([
  T({ attribute: !1 })
], y.prototype, "contentKey");
S([
  T({ attribute: !1 })
], y.prototype, "config");
S([
  T({ attribute: !1 })
], y.prototype, "unpublished");
S([
  T({ attribute: !1 })
], y.prototype, "icon");
S([
  T({ attribute: !1 })
], y.prototype, "label");
S([
  $()
], y.prototype, "_htmlMarkup");
S([
  $()
], y.prototype, "_isLoading");
S([
  $()
], y.prototype, "_error");
class ue {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async previewGridBlock(e, s) {
    return await E(this.#e, U.previewGridBlock({ body: e, query: s }));
  }
  async previewListBlock(e, s) {
    return await E(this.#e, U.previewListBlock({ body: e, query: s }));
  }
  async previewSingleBlock(e, s) {
    return await E(this.#e, U.previewSingleBlock({ body: e, query: s }));
  }
  async previewRichTextMarkup(e, s) {
    return await E(this.#e, U.previewRichTextMarkup({ body: e, query: s }));
  }
  async getGridStylesheets(e) {
    return await E(this.#e, U.getGridStylesheets({ query: e }));
  }
  async getListStylesheets(e) {
    return await E(this.#e, U.getListStylesheets({ query: e }));
  }
  async getSingleBlockStylesheets(e) {
    return await E(this.#e, U.getSingleBlockStylesheets({ query: e }));
  }
  async getRteStylesheets(e) {
    return await E(this.#e, U.getRteStylesheets({ query: e }));
  }
}
class Ft {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async getSettings() {
    return await E(this.#e, U.getSettings());
  }
}
class Jt extends ze {
  #e;
  constructor(e) {
    super(e), this.#e = new Ft(e);
  }
  async getSettings() {
    const e = await this.#e.getSettings();
    if (e && e?.data)
      return e.data;
  }
}
const Yt = 300;
function Qt(t, e, s) {
  const i = (e.areas?.length ?? 0) > 0, r = !t.layoutAreas && !!e.layoutAreas;
  return i && r && s.managerObserved ? { kind: "render", reason: "layout-areas-arrived" } : s.hasMarkup && !!e.layout && (e.layout.columnSpan !== t.layout?.columnSpan || e.layout.rowSpan !== t.layout?.rowSpan) ? { kind: "debounce", reason: "resized", delayMs: Yt } : { kind: "none" };
}
class Zt {
  #e;
  schedule(e, s) {
    clearTimeout(this.#e), this.#e = setTimeout(s, e);
  }
  cancel() {
    clearTimeout(this.#e);
  }
}
var es = Object.defineProperty, ts = Object.getOwnPropertyDescriptor, Ye = (t) => {
  throw TypeError(t);
}, Qe = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ts(e, s) : e, n = t.length - 1, o; n >= 0; n--)
    (o = t[n]) && (r = (i ? o(e, s, r) : o(r)) || r);
  return i && r && es(e, s, r), r;
}, we = (t, e, s) => e.has(t) || Ye("Cannot " + s), O = (t, e, s) => (we(t, e, "read from private field"), s ? s.call(t) : e.get(t)), F = (t, e, s) => e.has(t) ? Ye("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), Me = (t, e, s, i) => (we(t, e, "write to private field"), e.set(t, s), s), M = (t, e, s) => (we(t, e, "access private method"), s), R, q, Ze, N, Q, et, ne;
const ss = "block-grid-preview";
let z = class extends y {
  constructor() {
    super(), F(this, q), F(this, R), this._blockContext = {
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
    }, F(this, N, !1), F(this, Q, new Zt()), Me(this, R, new ue(this));
  }
  set blockGridValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockGridValue = e;
  }
  get blockGridValue() {
    return this._blockGridValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await M(this, q, Ze).call(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), O(this, Q).cancel();
  }
  observeBlockValue() {
    this.consumeContext(vt, async (t) => {
      t && this.observe(
        m([
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
          i,
          r,
          n,
          o,
          a,
          l
        ]) => {
          const k = this._blockContext.layout?.columnSpan, u = this._blockContext.layout?.rowSpan, c = this._blockContext.layoutAreas;
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = s ?? "", this._blockContext.workspaceEditContentPath = i ?? "", this._blockContext.contentElementTypeAlias = r ?? "", this._blockContext.contentElementTypeKey = n ?? "", this._blockContext.areas = o, this._blockContext.layout = a, this._blockContext.layoutAreas = l, !O(this, N) && this._blockContext.contentUdi && (Me(this, N, !0), await M(this, q, et).call(this));
          const f = Qt(
            { layoutAreas: c, layout: { columnSpan: k, rowSpan: u } },
            { areas: o, layoutAreas: l, layout: a },
            { hasMarkup: !!this._htmlMarkup, managerObserved: O(this, N) }
          );
          f.kind === "render" ? (this.blockGridValue = {
            ...this._blockGridValue,
            layout: { "Umbraco.BlockGrid": M(this, q, ne).call(this) }
          }, this.renderBlockPreview()) : f.kind === "debounce" && (this.blockGridValue = {
            ...this._blockGridValue,
            layout: { "Umbraco.BlockGrid": M(this, q, ne).call(this) }
          }, O(this, Q).schedule(f.delayMs, () => this.renderBlockPreview()));
        }
      );
    });
  }
  async callPreviewApi() {
    return await O(this, R).previewGridBlock(
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
    const { data: t } = await O(this, R).getGridStylesheets({
      documentTypeUnique: this._blockContext.documentTypeUnique,
      nodeKey: this._blockContext.unique
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
R = /* @__PURE__ */ new WeakMap();
q = /* @__PURE__ */ new WeakSet();
Ze = async function() {
  try {
    await this.getContext(D, { passContextAliasMatches: !0 }), this.consumeContext(D, (t) => {
      t && this.observe(
        m([t.unique, t.structure.contentTypeUniques]),
        async ([e, s]) => {
          await this.handleWorkspaceData(e?.toString(), s?.[0]);
        }
      );
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
N = /* @__PURE__ */ new WeakMap();
Q = /* @__PURE__ */ new WeakMap();
et = async function() {
  this.consumeContext(mt, (t) => {
    t && this.observe(
      m([
        t.contents,
        t.settings,
        t.exposes,
        t.propertyAlias
      ]),
      async ([e, s, i, r]) => {
        this._blockContext.blockEditorAlias = r ?? "", this.blockGridValue = {
          contentData: e ?? [],
          settingsData: s ?? [],
          expose: i ?? [],
          layout: { "Umbraco.BlockGrid": M(this, q, ne).call(this) }
        }, this._blockContext.blockIndex = (e ?? []).findIndex((n) => n.key === this._blockContext.contentUdi), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
ne = function() {
  return [
    {
      areas: this._blockContext.areas.map((s) => ({
        key: s.key,
        items: this._blockContext.layoutAreas?.find((r) => r.key === s.key)?.items ?? []
      })),
      columnSpan: this._blockContext.layout?.columnSpan ?? 0,
      rowSpan: this._blockContext.layout?.rowSpan ?? 0,
      contentKey: this._blockContext.layout?.contentKey ?? "",
      settingsKey: this._blockContext.layout?.settingsKey
    }
  ];
};
z.styles = [
  ...y.styles,
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
Qe([
  T({ attribute: !1 })
], z.prototype, "blockGridValue", 1);
z = Qe([
  le(ss)
], z);
var is = Object.defineProperty, rs = Object.getOwnPropertyDescriptor, tt = (t) => {
  throw TypeError(t);
}, Ce = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? rs(e, s) : e, n = t.length - 1, o; n >= 0; n--)
    (o = t[n]) && (r = (i ? o(e, s, r) : o(r)) || r);
  return i && r && is(e, s, r), r;
}, ve = (t, e, s) => e.has(t) || tt("Cannot " + s), pe = (t, e, s) => (ve(t, e, "read from private field"), e.get(t)), be = (t, e, s) => e.has(t) ? tt("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), Re = (t, e, s, i) => (ve(t, e, "write to private field"), e.set(t, s), s), Ne = (t, e, s) => (ve(t, e, "access private method"), s), I, Z, st, ee, it;
const os = "block-list-preview";
let V = class extends y {
  constructor() {
    super(), be(this, Z), be(this, I), this._blockContext = {
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
    }, be(this, ee, !1), Re(this, I, new ue(this));
  }
  set blockListValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockListValue = e;
  }
  get blockListValue() {
    return this._blockListValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await Ne(this, Z, st).call(this);
  }
  observeBlockValue() {
    this.consumeContext(gt, (t) => {
      t && this.observe(
        m([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey
        ]),
        async ([
          e,
          s,
          i,
          r,
          n
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = s ?? "", this._blockContext.workspaceEditContentPath = i ?? "", this._blockContext.contentElementTypeAlias = r ?? "", this._blockContext.contentElementTypeKey = n ?? "", !pe(this, ee) && this._blockContext.contentUdi && (Re(this, ee, !0), await Ne(this, Z, it).call(this));
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
      nodeKey: this._blockContext.unique
    });
    return t;
  }
  validatePreviewData() {
    return super.validatePreviewData() && this._blockContext.contentUdi !== "";
  }
};
I = /* @__PURE__ */ new WeakMap();
Z = /* @__PURE__ */ new WeakSet();
st = async function() {
  try {
    await this.getContext(D, { passContextAliasMatches: !0 }), this.consumeContext(D, (t) => {
      t && this.observe(
        m([t.unique, t.structure.contentTypeUniques]),
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
it = function() {
  this.consumeContext(xt, (t) => {
    t && this.observe(
      m([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([
        e,
        s,
        i,
        r,
        n
      ]) => {
        this._blockContext.blockEditorAlias = n ?? "", this.blockListValue = {
          contentData: e?.filter((o) => o.key === this._blockContext.contentUdi) ?? [],
          settingsData: s?.filter((o) => o.key === this._blockContext.settingsUdi) ?? [],
          expose: r?.filter((o) => o.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.BlockList": i?.filter((o) => o.contentKey === this._blockContext.contentUdi) ?? []
          }
        }, this._blockContext.blockIndex = e?.indexOf(this.blockListValue.contentData[0]), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
V.styles = [
  ...y.styles,
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
Ce([
  $()
], V.prototype, "_blockListValue", 2);
Ce([
  T({ attribute: !1 })
], V.prototype, "blockListValue", 1);
V = Ce([
  le(os)
], V);
var ns = Object.defineProperty, as = Object.getOwnPropertyDescriptor, rt = (t) => {
  throw TypeError(t);
}, me = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? as(e, s) : e, n = t.length - 1, o; n >= 0; n--)
    (o = t[n]) && (r = (i ? o(e, s, r) : o(r)) || r);
  return i && r && ns(e, s, r), r;
}, ge = (t, e, s) => e.has(t) || rt("Cannot " + s), ye = (t, e, s) => (ge(t, e, "read from private field"), e.get(t)), ke = (t, e, s) => e.has(t) ? rt("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), Ie = (t, e, s, i) => (ge(t, e, "write to private field"), e.set(t, s), s), Ke = (t, e, s) => (ge(t, e, "access private method"), s), K, te, ot, se, nt;
const ls = "block-single-preview";
let L = class extends y {
  constructor() {
    super(), ke(this, te), ke(this, K), this._blockContext = {
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
    }, ke(this, se, !1), Ie(this, K, new ue(this));
  }
  set blockSingleValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockSingleValue = e;
  }
  get blockSingleValue() {
    return this._blockSingleValue;
  }
  async setupContextObservers() {
    this.observePropertyDataset(), await Ke(this, te, ot).call(this);
  }
  observeBlockValue() {
    this.consumeContext(Tt, (t) => {
      t && this.observe(
        m([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey
        ]),
        async ([
          e,
          s,
          i,
          r,
          n
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = s ?? "", this._blockContext.workspaceEditContentPath = i ?? "", this._blockContext.contentElementTypeAlias = r ?? "", this._blockContext.contentElementTypeKey = n ?? "", ye(this, se) || (Ie(this, se, !0), await Ke(this, te, nt).call(this));
        }
      );
    });
  }
  async callPreviewApi() {
    return await ye(this, K).previewSingleBlock(
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
    const { data: t } = await ye(this, K).getSingleBlockStylesheets({
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
te = /* @__PURE__ */ new WeakSet();
ot = async function() {
  try {
    await this.getContext(D, { passContextAliasMatches: !0 }), this.consumeContext(D, (t) => {
      t && this.observe(
        m([t.unique, t.structure.contentTypeUniques]),
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
nt = function() {
  this.consumeContext(St, (t) => {
    t && this.observe(
      m([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([
        e,
        s,
        i,
        r,
        n
      ]) => {
        this._blockContext.blockEditorAlias = n ?? "", this.blockSingleValue = {
          contentData: e?.filter((o) => o.key === this._blockContext.contentUdi) ?? [],
          settingsData: s?.filter((o) => o.key === this._blockContext.settingsUdi) ?? [],
          expose: r?.filter((o) => o.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.SingleBlock": i?.filter((o) => o.contentKey === this._blockContext.contentUdi) ?? []
          }
        }, this._blockContext.blockIndex = e?.indexOf(this.blockSingleValue.contentData[0]), !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
L.styles = [
  ...y.styles,
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
  $()
], L.prototype, "_blockSingleValue", 2);
me([
  T({ attribute: !1 })
], L.prototype, "blockSingleValue", 1);
L = me([
  le(ls)
], L);
var cs = Object.defineProperty, us = Object.getOwnPropertyDescriptor, at = (t) => {
  throw TypeError(t);
}, xe = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? us(e, s) : e, n = t.length - 1, o; n >= 0; n--)
    (o = t[n]) && (r = (i ? o(e, s, r) : o(r)) || r);
  return i && r && cs(e, s, r), r;
}, Te = (t, e, s) => e.has(t) || at("Cannot " + s), J = (t, e, s) => (Te(t, e, "read from private field"), e.get(t)), Y = (t, e, s) => e.has(t) ? at("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), fe = (t, e, s, i) => (Te(t, e, "write to private field"), e.set(t, s), s), We = (t, e, s) => (Te(t, e, "access private method"), s), W, ie, lt, re, oe, ct;
const hs = "rich-text-preview";
let G = class extends y {
  constructor() {
    super(), Y(this, ie), Y(this, W), this._blockContext = {
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
    }, Y(this, re, !1), Y(this, oe, !1), fe(this, W, new ue(this));
  }
  set blockRteValue(t) {
    const e = t ? { ...t } : {};
    e.layout ??= {}, e.contentData ??= [], e.settingsData ??= [], e.expose ??= [], this._blockRteValue = e;
  }
  get blockRteValue() {
    return this._blockRteValue;
  }
  setupContextObservers() {
    this.observePropertyDataset(), this.observeBlockValue(), We(this, ie, lt).call(this);
  }
  observeBlockValue() {
    J(this, re) || (fe(this, re, !0), this.consumeContext(Et, (t) => {
      t != null && this.observe(
        m([
          t.contentKey,
          t.settingsKey,
          t.workspaceEditContentPath,
          t.contentElementTypeAlias,
          t.contentElementTypeKey
        ]),
        async ([
          e,
          s,
          i,
          r,
          n
        ]) => {
          this._blockContext.contentUdi = e ?? "", this._blockContext.settingsUdi = s ?? "", this._blockContext.workspaceEditContentPath = i ?? "", this._blockContext.contentElementTypeAlias = r ?? "", this._blockContext.contentElementTypeKey = n ?? "", !J(this, oe) && this._blockContext.contentUdi && (fe(this, oe, !0), await We(this, ie, ct).call(this));
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
        culture: this._blockContext.culture
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
lt = function() {
  try {
    this.consumeContext(Pt, (t) => {
      t && (this._workspaceContextResolved = !0, this.observe(
        m([t.unique, t.contentTypeUnique]),
        async ([e, s]) => {
          await this.handleWorkspaceData(e?.toString(), s);
        }
      ));
    }).passContextAliasMatches();
  } catch {
    this.observeBlockWorkspaceFallback();
  }
};
re = /* @__PURE__ */ new WeakMap();
oe = /* @__PURE__ */ new WeakMap();
ct = function() {
  this.consumeContext(Ut, (t) => {
    t != null && this.observe(
      m([
        t.contents,
        t.settings,
        t.layouts,
        t.exposes,
        t.propertyAlias
      ]),
      async ([
        e,
        s,
        i,
        r,
        n
      ]) => {
        this._blockContext.blockEditorAlias = n ?? "", this.blockRteValue = {
          contentData: e?.filter((o) => o.key === this._blockContext.contentUdi) ?? [],
          settingsData: s?.filter((o) => o.key === this._blockContext.settingsUdi) ?? [],
          expose: r?.filter((o) => o.contentKey === this._blockContext.contentUdi) ?? [],
          layout: {
            "Umbraco.RichText": i?.filter((o) => o.contentKey === this._blockContext.contentUdi) ?? []
          }
        }, !this._htmlMarkup && !this._isLoading && this.renderBlockPreview();
      }
    );
  });
};
xe([
  $()
], G.prototype, "_blockRteValue", 2);
xe([
  T({ attribute: !1 })
], G.prototype, "blockRteValue", 1);
G = xe([
  le(hs)
], G);
class ds {
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
class _e extends ze {
  #e = new ds(3);
  #t = /* @__PURE__ */ new Map();
  /** Shared concurrency-limited queue for preview API requests. */
  get requestQueue() {
    return this.#e;
  }
  // Node key cache used as a fallback when a preview cannot reach its content
  // workspace directly (e.g. when nested inside another block, whose workspace
  // context shadows the document workspace under the shared 'UmbWorkspaceContext'
  // alias).
  #s = new Oe("");
  #i = new Oe("");
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
    const i = fetch(e).then((r) => r.text()).then((r) => {
      const n = new CSSStyleSheet();
      return n.replaceSync(r), n;
    });
    return this.#t.set(e, i), i;
  }
}
const ps = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BlockPreviewContext: _e,
  default: _e
}, Symbol.toStringTag, { value: "Module" })), bs = [
  {
    type: "globalContext",
    alias: "BlockPreview.Context",
    name: "BlockPreview Context",
    js: () => Promise.resolve().then(() => ps)
  }
], ys = bs, ks = [
  {
    type: "localization",
    alias: "BlockPreview.Localization.En",
    name: "BlockPreview English Localization",
    meta: {
      culture: "en"
    },
    js: () => import("./en-BNTuLdKT.js")
  }
], fs = ks, Os = async (t, e) => {
  t.consumeContext(bt, async (s) => {
    if (!s) return;
    const i = s.getOpenApiConfiguration();
    w.setConfig({
      baseUrl: i?.base ?? "",
      auth: i?.token ?? void 0,
      credentials: i?.credentials ?? "same-origin"
    }), w.interceptors.request.use(async (a, l) => {
      const k = await i.token();
      return a.headers.set("Authorization", `Bearer ${k}`), a;
    });
    const n = await new Jt(t).getSettings();
    let o = [];
    if (n) {
      if (n.blockGrid.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.GridCustomView",
          name: "BlockPreview Grid Custom View",
          element: z,
          forBlockEditor: "block-grid"
        };
        n.blockGrid.contentTypes?.length !== 0 && (a.forContentTypeAlias = n.blockGrid.contentTypes), o.push(a);
      }
      if (n.blockList.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.ListCustomView",
          name: "BlockPreview List Custom View",
          element: V,
          forBlockEditor: "block-list"
        };
        n.blockList.contentTypes?.length !== 0 && (a.forContentTypeAlias = n.blockList.contentTypes), o.push(a);
      }
      if (n.singleBlock.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.SingleBlockCustomView",
          name: "BlockPreview Single Block Custom View",
          element: L,
          forBlockEditor: "block-single"
        };
        n.singleBlock.contentTypes?.length !== 0 && (a.forContentTypeAlias = n.singleBlock.contentTypes), o.push(a);
      }
      if (n.richText.enabled) {
        let a = {
          type: "blockEditorCustomView",
          alias: "BlockPreview.RichTextCustomView",
          name: "BlockPreview Rich Text Custom View",
          element: G,
          forBlockEditor: "block-rte"
        };
        n.richText.contentTypes?.length !== 0 && (a.forContentTypeAlias = n.richText.contentTypes), o.push(a);
      }
    }
    e.registerMany([
      ...o,
      ...ys,
      ...fs
    ]), t.provideContext(Je, new _e(t));
  });
};
export {
  z as BlockGridPreviewCustomView,
  V as BlockListPreviewCustomView,
  y as BlockPreviewBaseElement,
  L as BlockSinglePreviewCustomView,
  ue as PreviewDataSource,
  G as RichTextPreviewCustomView,
  Ft as SettingsDataSource,
  Jt as SettingsRepository,
  $e as isBlockActionNavigation,
  Os as onInit
};
//# sourceMappingURL=index.js.map
