import test from "node:test";
import assert from "node:assert/strict";

import { renderCoverageSection } from "../src/ui/render/coverage.js";

class StubElement {
    constructor(tagName) {
        this.tagName = String(tagName || "div").toUpperCase();
        this.childNodes = [];
        this.firstChild = null;
        this.parentNode = null;
        this.dataset = {};
        this.attributes = new Map();
        this.className = "";
        this._textContent = "";
        this.style = {
            setProperty: () => {},
            removeProperty: () => {},
        };
        this.classList = {
            add: () => {},
            remove: () => {},
            contains: () => false,
        };
    }

    appendChild(node) {
        if (!node) {
            return node;
        }
        this.childNodes.push(node);
        node.parentNode = this;
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
        this.firstChild = this.childNodes[0] || null;
        return node;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
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

function withDomEnvironment(callback) {
    const previousDocument = globalThis.document;
    const previousElement = globalThis.Element;
    globalThis.Element = StubElement;
    globalThis.document = {
        createElement: (tagName) => new StubElement(tagName),
    };
    try {
        callback();
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
    }
}

test("renderCoverageSection renders suggestions and updates state", () => {
    withDomEnvironment(() => {
        const section = new StubElement("section");
        const pronouns = new StubElement("div");
        const attribution = new StubElement("div");
        const action = new StubElement("div");

        renderCoverageSection({
            section,
            pronouns,
            attribution,
            action,
        }, {
            missingPronouns: ["ze", "hir"],
            missingAttributionVerbs: ["intoned"],
            missingActionVerbs: [],
        }, { hasBuffer: true });

        assert.equal(section.getAttribute("data-has-content"), "true");
        assert.equal(section.dataset.state, "ready");

        const pronounList = pronouns.children[0];
        assert.ok(pronounList, "pronoun list should be rendered");
        assert.equal(pronounList.children.length, 2);
        assert.equal(pronounList.children[0].textContent, "ze");

        const attributionList = attribution.children[0];
        assert.ok(attributionList, "attribution list should be rendered");
        assert.equal(attributionList.children.length, 1);
        assert.equal(attributionList.children[0].dataset.value, "intoned");

        const actionPlaceholder = action.children[0];
        assert.ok(actionPlaceholder, "action placeholder should render when empty");
        assert.equal(actionPlaceholder.textContent, "No coverage gaps detected.");
        assert.equal(actionPlaceholder.dataset.tone, "informative");
    });
});

test("renderCoverageSection shows awaiting message when no buffer", () => {
    withDomEnvironment(() => {
        const section = new StubElement("section");
        const pronouns = new StubElement("div");
        const attribution = new StubElement("div");
        const action = new StubElement("div");

        renderCoverageSection({
            section,
            pronouns,
            attribution,
            action,
        }, {}, { hasBuffer: false });

        assert.equal(section.getAttribute("data-has-content"), "false");
        assert.equal(section.dataset.state, "pending");

        const pronounPlaceholder = pronouns.children[0];
        assert.ok(pronounPlaceholder, "pronoun placeholder should render when waiting");
        assert.equal(pronounPlaceholder.textContent, "Coverage suggestions will appear after the next assistant message.");

        const attributionPlaceholder = attribution.children[0];
        assert.equal(attributionPlaceholder.textContent, "Coverage suggestions will appear after the next assistant message.");
        const actionPlaceholder = action.children[0];
        assert.equal(actionPlaceholder.textContent, "Coverage suggestions will appear after the next assistant message.");
    });
});
