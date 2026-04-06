/**
 * Minimal DOM polyfill for testing React hooks in Node.js environment (Node 25+).
 * jsdom cannot be loaded synchronously due to ESM top-level await, so we provide
 * a minimal implementation of the DOM APIs that @testing-library/react needs.
 *
 * Usage: call setupMinimalDOM() in a beforeAll() in tests with @vitest-environment node.
 */
export function setupMinimalDOM() {
  const makeEl = (nodeType = 1, tag = "div"): any => {
    const el: any = {
      nodeType,
      tagName: tag.toUpperCase(),
      nodeName: tag.toUpperCase(),
      nodeValue: null,
      textContent: "",
      innerHTML: "",
      children: [] as any[],
      childNodes: [] as any[],
      parentNode: null as any,
      style: {},
      className: "",
      id: "",
      _attrs: {} as Record<string, string>,
      _handlers: {} as Record<string, Function[]>,
    }
    el.setAttribute = (k: string, v: string) => { el._attrs[k] = v }
    el.getAttribute = (k: string) => el._attrs[k] ?? null
    el.removeAttribute = (k: string) => { delete el._attrs[k] }
    el.hasAttribute = (k: string) => k in el._attrs
    el.addEventListener = (type: string, fn: Function) => {
      ;(el._handlers[type] = el._handlers[type] || []).push(fn)
    }
    el.removeEventListener = (type: string, fn: Function) => {
      if (el._handlers[type]) el._handlers[type] = el._handlers[type].filter((f: any) => f !== fn)
    }
    el.dispatchEvent = () => true
    el.appendChild = (child: any) => {
      child.parentNode = el
      el.children.push(child)
      el.childNodes.push(child)
      return child
    }
    el.removeChild = (child: any) => {
      child.parentNode = null
      el.children = el.children.filter((c: any) => c !== child)
      el.childNodes = el.childNodes.filter((c: any) => c !== child)
      return child
    }
    el.insertBefore = (newNode: any, refNode: any) => {
      newNode.parentNode = el
      const i = el.children.indexOf(refNode)
      if (i < 0) { el.children.push(newNode); el.childNodes.push(newNode) }
      else { el.children.splice(i, 0, newNode); el.childNodes.splice(i, 0, newNode) }
      return newNode
    }
    el.replaceChild = (newChild: any, oldChild: any) => {
      const i = el.children.indexOf(oldChild)
      if (i >= 0) { el.children[i] = newChild; el.childNodes[i] = newChild }
      newChild.parentNode = el
      oldChild.parentNode = null
      return oldChild
    }
    el.contains = (other: any) => el.children.includes(other)
    el.cloneNode = () => makeEl(nodeType, tag)
    el.querySelectorAll = () => []
    el.querySelector = () => null
    el.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 })
    el.focus = () => {}
    el.blur = () => {}
    el.click = () => {}
    return el
  }

  const body = makeEl(1, "body")
  const head = makeEl(1, "head")

  const doc: any = {
    nodeType: 9,
    nodeName: "#document",
    body,
    head,
    documentElement: body,
    defaultView: null as any,
    _handlers: {} as Record<string, Function[]>,
    activeElement: body,
  }
  doc.ownerDocument = doc
  body.ownerDocument = doc
  head.ownerDocument = doc

  doc.createElement = (tag: string) => {
    const el = makeEl(1, tag)
    el.ownerDocument = doc
    return el
  }
  doc.createElementNS = (_ns: string, tag: string) => {
    const el = makeEl(1, tag)
    el.ownerDocument = doc
    return el
  }
  doc.createTextNode = (text: string) => {
    const n = makeEl(3, "#text")
    n.nodeValue = text; n.textContent = text; n.ownerDocument = doc
    return n
  }
  doc.createComment = (text: string) => {
    const n = makeEl(8, "#comment")
    n.nodeValue = text; n.ownerDocument = doc
    return n
  }
  doc.createRange = () => ({
    createContextualFragment: (html: string) => { const d = doc.createElement("div"); d.innerHTML = html; return d },
    setStart: () => {},
    setEnd: () => {},
  })
  doc.addEventListener = (type: string, fn: Function) => {
    ;(doc._handlers[type] = doc._handlers[type] || []).push(fn)
  }
  doc.removeEventListener = (type: string, fn: Function) => {
    if (doc._handlers[type]) doc._handlers[type] = doc._handlers[type].filter((f: any) => f !== fn)
  }
  doc.dispatchEvent = () => true
  doc.querySelectorAll = () => []
  doc.querySelector = () => null
  doc.getSelection = () => null

  class FakeHTMLElement { nodeType = 1; style = {}; tagName = "ELEMENT" }
  class FakeHTMLIFrameElement extends FakeHTMLElement { tagName = "IFRAME"; contentWindow = null }
  class FakeWindow {}

  const win: any = new FakeWindow()
  Object.assign(win, {
    document: doc,
    location: { href: "" },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    setTimeout: (fn: any, ms: any) => setTimeout(fn, ms),
    clearTimeout: (id: any) => clearTimeout(id),
    setInterval: (fn: any, ms: any) => setInterval(fn, ms),
    clearInterval: (id: any) => clearInterval(id),
    requestAnimationFrame: (fn: any) => setTimeout(fn, 0),
    cancelAnimationFrame: (id: any) => clearTimeout(id),
    performance: { now: () => Date.now() },
    navigator: { userAgent: "" },
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    scrollX: 0,
    scrollY: 0,
    HTMLElement: FakeHTMLElement,
    HTMLIFrameElement: FakeHTMLIFrameElement,
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 },
    Event: class { constructor(public type: string) {}; stopPropagation() {}; preventDefault() {} },
    CustomEvent: class { constructor(public type: string, public opts?: any) {} },
    MessageChannel: class {
      port1 = { postMessage: () => {}, onmessage: null }
      port2 = { postMessage: () => {}, onmessage: null }
    },
  })
  win.window = win
  doc.defaultView = win

  ;(global as any).document = doc
  ;(global as any).window = win
  ;(global as any).HTMLElement = FakeHTMLElement
  ;(global as any).HTMLIFrameElement = FakeHTMLIFrameElement
  ;(global as any).Element = FakeHTMLElement
  ;(global as any).Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 }
  ;(global as any).MutationObserver = class { observe() {}; disconnect() {}; takeRecords() { return [] } }
  ;(global as any).Event = class { constructor(public type: string) {}; stopPropagation() {}; preventDefault() {} }
  ;(global as any).CustomEvent = class extends (global as any).Event { detail: any }
  ;(global as any).MessageChannel = class {
    port1 = { postMessage: () => {}, onmessage: null }
    port2 = { postMessage: () => {}, onmessage: null }
  }
}
