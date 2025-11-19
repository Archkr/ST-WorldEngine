export async function resolve(specifier, context, defaultResolve) {
    if (specifier === "../../../extensions.js") {
        return { url: "node:mock/extensions", shortCircuit: true };
    }
    if (specifier === "../../../../script.js") {
        return { url: "node:mock/script", shortCircuit: true };
    }
    if (specifier === "../../../slash-commands.js") {
        return { url: "node:mock/slash", shortCircuit: true };
    }
    if (specifier === "../regex/engine.js" || specifier === "../../regex/engine.js" || specifier === "../../../../regex/engine.js") {
        return { url: "node:mock/regex-engine", shortCircuit: true };
    }
    return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
    if (url === "node:mock/extensions") {
        return {
            format: "module",
            source: `const store = globalThis.__extensionSettingsStore || (globalThis.__extensionSettingsStore = {});\nexport const extension_settings = store;\nexport function getContext() {\n    const extra = globalThis.__mockContext;\n    const base = { extensionSettings: store, saveSettingsDebounced: () => {} };\n    if (extra && typeof extra === "object") {\n        return { ...base, ...extra };\n    }\n    return base;\n}\nexport async function renderExtensionTemplateAsync() {\n    return '<div id="cs-scene-panel"></div>';\n}`,
            shortCircuit: true,
        };
    }
    if (url === "node:mock/script") {
        return {
            format: "module",
            source: `export const saveSettingsDebounced = () => {};\nexport const saveChatDebounced = () => {};\nexport const event_types = {};\nexport const eventSource = { on: () => {}, off: () => {} };\nexport const system_message_types = { NARRATOR: "narrator" };`,
            shortCircuit: true,
        };
    }
    if (url === "node:mock/slash") {
        return {
            format: "module",
            source: `export const executeSlashCommandsOnChatInput = async () => {};\nexport const registerSlashCommand = () => {};`,
            shortCircuit: true,
        };
    }
    if (url === "node:mock/regex-engine") {
        return {
            format: "module",
            source: `const store = globalThis.__regexMockStore || (globalThis.__regexMockStore = { scripts: {} });\nconst SCRIPT_TYPE_ORDER = [0, 2, 1];\nexport const SCRIPT_TYPES = { GLOBAL: 0, PRESET: 2, SCOPED: 1 };\nfunction readScripts(type) {\n    const key = String(type);\n    const value = store.scripts[key];\n    if (Array.isArray(value)) {\n        return value;\n    }\n    const empty = [];\n    store.scripts[key] = empty;\n    return empty;\n}\nexport function getScriptsByType(scriptType, { allowedOnly } = {}) {\n    const scripts = readScripts(scriptType);\n    if (!allowedOnly) {\n        return scripts.slice();\n    }\n    return scripts.filter(script => script && script.allowed !== false);\n}\nexport function getRegexScripts({ allowedOnly } = {}) {\n    return SCRIPT_TYPE_ORDER.flatMap(type => getScriptsByType(type, { allowedOnly }));\n}\nexport function runRegexScript(script, text) {\n    const input = typeof text === 'string' ? text : String(text ?? '');\n    if (!script) {\n        return input;\n    }\n    if (typeof script.apply === 'function') {\n        return script.apply(input);\n    }\n    if (typeof script.findRegex === 'string') {\n        try {\n            const flags = typeof script.flags === 'string' ? script.flags : 'g';\n            const regex = new RegExp(script.findRegex, flags);\n            const replacement = typeof script.replaceString === 'string' ? script.replaceString : '';\n            return input.replace(regex, replacement);\n        } catch {\n            return input;\n        }\n    }\n    return input;\n}`,
            shortCircuit: true,
        };
    }
    return defaultLoad(url, context, defaultLoad);
}
