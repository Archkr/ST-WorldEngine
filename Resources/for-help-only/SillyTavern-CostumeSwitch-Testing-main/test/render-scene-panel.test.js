import test from "node:test";
import assert from "node:assert/strict";

import { renderScenePanel } from "../src/ui/render/panel.js";
import {
    setScenePanelContainer,
    setSceneSectionsContainer,
    setSceneRosterSection,
    setSceneActiveSection,
    setSceneLiveLogSection,
    setSceneCoverageSection,
    setSceneCoveragePronouns,
    setSceneCoverageAttribution,
    setSceneCoverageAction,
    setSceneRosterList,
    setSceneActiveCards,
    setSceneLiveLog,
} from "../src/ui/scenePanelState.js";

class StubElement {
    constructor(documentRef, tagName) {
        this._documentRef = documentRef;
        this.tagName = String(tagName || "div").toUpperCase();
        this.childNodes = [];
        this.firstChild = null;
        this.parentNode = null;
        this.dataset = {};
        this.attributes = new Map();
        this.className = "";
        this.hidden = false;
        this.isConnected = false;
        this._id = "";
        this._textContent = "";
        const self = this;
        this.style = {
            setProperty: () => {},
            removeProperty: () => {},
        };
        this.classList = {
            add: (...tokens) => {
                const set = new Set(self.className.split(/\s+/).filter(Boolean));
                tokens.filter(Boolean).forEach((token) => set.add(token));
                self.className = Array.from(set).join(" ");
            },
            remove: (...tokens) => {
                const toRemove = new Set(tokens.filter(Boolean));
                const remaining = self.className
                    .split(/\s+/)
                    .filter((token) => token && !toRemove.has(token));
                self.className = remaining.join(" ");
            },
            contains: (token) => self.className.split(/\s+/).includes(token),
        };
        Object.defineProperty(this, "id", {
            get() {
                return self._id;
            },
            set(value) {
                self._id = String(value ?? "");
                if (self._id) {
                    documentRef._registerElement(self._id, self);
                }
            },
        });
    }

    appendChild(node) {
        if (!node) {
            return node;
        }
        if (node.parentNode && typeof node.parentNode.removeChild === "function") {
            node.parentNode.removeChild(node);
        }
        node.parentNode = this;
        node.isConnected = true;
        this.childNodes.push(node);
        this.firstChild = this.childNodes[0] || null;
        return node;
    }

    removeChild(node) {
        const index = this.childNodes.indexOf(node);
        if (index === -1) {
            return node;
        }
        this.childNodes.splice(index, 1);
        node.parentNode = null;
        node.isConnected = false;
        this.firstChild = this.childNodes[0] || null;
        return node;
    }

    setAttribute(name, value) {
        const normalized = String(value ?? "");
        this.attributes.set(name, normalized);
        if (name === "id") {
            this.id = normalized;
        } else if (name === "class") {
            this.className = normalized;
        } else if (name === "hidden") {
            this.hidden = true;
        }
    }

    getAttribute(name) {
        return this.attributes.has(name) ? this.attributes.get(name) : null;
    }

    removeAttribute(name) {
        this.attributes.delete(name);
        if (name === "class") {
            this.className = "";
        } else if (name === "hidden") {
            this.hidden = false;
        }
    }

    querySelector(selector) {
        const matches = this.querySelectorAll(selector);
        return matches[0] || null;
    }

    querySelectorAll(selector) {
        const tokens = String(selector || "")
            .split(",")
            .map((token) => token.trim())
            .filter(Boolean);
        if (tokens.length === 0) {
            return [];
        }
        const results = [];
        const visit = (node) => {
            if (!node) {
                return;
            }
            for (const token of tokens) {
                if (!token) {
                    continue;
                }
                if (token.startsWith(".")) {
                    const className = token.slice(1);
                    const classes = String(node.className || "")
                        .split(/\s+/)
                        .filter(Boolean);
                    if (classes.includes(className)) {
                        results.push(node);
                        break;
                    }
                }
            }
            if (Array.isArray(node.childNodes) && node.childNodes.length) {
                node.childNodes.forEach(visit);
            }
        };
        visit(this);
        return results;
    }

    set textContent(value) {
        this._textContent = String(value ?? "");
        this.childNodes = [];
        this.firstChild = null;
    }

    get textContent() {
        return this._textContent;
    }

    get children() {
        return this.childNodes;
    }
}

function withScenePanelDom(callback) {
    const elements = new Map();
    let previousDocument = globalThis.document;
    let previousElement = globalThis.Element;
    let previousHTMLElement = globalThis.HTMLElement;

    const documentRef = {
        body: null,
        createElement: (tagName) => new StubElement(documentRef, tagName),
        getElementById: (id) => elements.get(id) || null,
        _registerElement: (id, element) => {
            elements.set(id, element);
        },
    };
    documentRef.body = new StubElement(documentRef, "body");
    documentRef.body.isConnected = true;

    globalThis.document = documentRef;
    globalThis.Element = StubElement;
    globalThis.HTMLElement = StubElement;

    try {
        callback({
            createElement: (tagName) => new StubElement(documentRef, tagName),
            registerElement: (id, element) => {
                element.id = id;
                return element;
            },
            elements,
        });
    } finally {
        if (previousDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = previousDocument;
        }
        if (previousElement === undefined) {
            delete globalThis.Element;
        } else {
            globalThis.Element = previousElement;
        }
        if (previousHTMLElement === undefined) {
            delete globalThis.HTMLElement;
        } else {
            globalThis.HTMLElement = previousHTMLElement;
        }
        setScenePanelContainer(null);
        setSceneSectionsContainer(null);
        setSceneRosterSection(null);
        setSceneActiveSection(null);
        setSceneLiveLogSection(null);
        setSceneCoverageSection(null);
        setSceneCoveragePronouns(null);
        setSceneCoverageAttribution(null);
        setSceneCoverageAction(null);
        setSceneRosterList(null);
        setSceneActiveCards(null);
        setSceneLiveLog(null);
    }
}

test("renderScenePanel respects coverage section visibility setting", () => {
    withScenePanelDom(({ createElement, registerElement }) => {
        const container = createElement("div");
        const sectionsContainer = createElement("div");
        const coverageSection = createElement("section");
        const coveragePronouns = createElement("div");
        const coverageAttribution = createElement("div");
        const coverageAction = createElement("div");

        setScenePanelContainer({ el: container });
        setSceneSectionsContainer({ el: sectionsContainer });
        setSceneCoverageSection({ el: coverageSection });
        setSceneCoveragePronouns({ el: coveragePronouns });
        setSceneCoverageAttribution({ el: coverageAttribution });
        setSceneCoverageAction({ el: coverageAction });

        registerElement("cs-scene-panel-toggle", createElement("button"));
        registerElement("cs-scene-section-toggle-roster", createElement("button"));
        registerElement("cs-scene-section-toggle-active", createElement("button"));
        registerElement("cs-scene-section-toggle-log", createElement("button"));
        registerElement("cs-scene-panel-toggle-auto-open", createElement("button"));
        const coverageToggle = registerElement("cs-scene-section-toggle-coverage", createElement("button"));

        renderScenePanel({
            settings: {
                enabled: true,
                sections: {
                    roster: false,
                    activeCharacters: false,
                    liveLog: false,
                    coverage: false,
                },
            },
        });

        assert.equal(coverageSection.getAttribute("data-scene-panel-hidden"), "true");
        assert.equal(coverageToggle.getAttribute("aria-pressed"), "false");
        assert.equal(coverageToggle.getAttribute("aria-hidden"), "false");
        assert.equal(coverageToggle.getAttribute("hidden"), null);
        assert.equal(coverageToggle.getAttribute("disabled"), null);
    });
});

test("renderScenePanel expands layout when coverage is the only visible section", () => {
    withScenePanelDom(({ createElement, registerElement }) => {
        const container = createElement("div");
        const sectionsContainer = createElement("div");
        const rosterSection = createElement("section");
        const activeSection = createElement("section");
        const logSection = createElement("section");
        const coverageSection = createElement("section");
        const coveragePronouns = createElement("div");
        const coverageAttribution = createElement("div");
        const coverageAction = createElement("div");

        setScenePanelContainer({ el: container });
        setSceneSectionsContainer({ el: sectionsContainer });
        setSceneRosterSection({ el: rosterSection });
        setSceneActiveSection({ el: activeSection });
        setSceneLiveLogSection({ el: logSection });
        setSceneCoverageSection({ el: coverageSection });
        setSceneCoveragePronouns({ el: coveragePronouns });
        setSceneCoverageAttribution({ el: coverageAttribution });
        setSceneCoverageAction({ el: coverageAction });

        rosterSection.className = "cs-scene-panel__section";
        activeSection.className = "cs-scene-panel__section";
        logSection.className = "cs-scene-panel__section";
        coverageSection.className = "cs-scene-panel__section";

        sectionsContainer.appendChild(rosterSection);
        sectionsContainer.appendChild(activeSection);
        sectionsContainer.appendChild(logSection);
        sectionsContainer.appendChild(coverageSection);

        registerElement("cs-scene-panel-toggle", createElement("button"));
        registerElement("cs-scene-section-toggle-roster", createElement("button"));
        registerElement("cs-scene-section-toggle-active", createElement("button"));
        registerElement("cs-scene-section-toggle-log", createElement("button"));
        registerElement("cs-scene-panel-toggle-auto-open", createElement("button"));
        registerElement("cs-scene-section-toggle-coverage", createElement("button"));

        renderScenePanel({
            settings: {
                enabled: true,
                sections: {
                    roster: false,
                    activeCharacters: false,
                    liveLog: false,
                    coverage: true,
                },
            },
        });

        assert.equal(coverageSection.getAttribute("data-scene-panel-hidden"), "false");
        assert.equal(sectionsContainer.getAttribute("data-visible-sections"), "1");
        assert.equal(sectionsContainer.getAttribute("data-sections-expanded"), "true");
    });
});
