let trackedFrameOrigins = new WeakMap();

export function rememberFrameOrigin(frameWindow, origin, iframe = null) {
    if (!frameWindow) return;

    trackedFrameOrigins.set(frameWindow, {
        origin,
        iframe,
    });
}

export function resolveTrackedFrame(event) {
    const { data } = event || {};
    const frameInfo = event?.source ? trackedFrameOrigins.get(event.source) : null;

    if (!frameInfo) {
        console.warn('[World Engine] Ignoring message from untracked frame.', {
            origin: event?.origin,
            type: data?.type,
        });
        return null;
    }

    if (frameInfo.origin && event?.origin && frameInfo.origin !== event.origin) {
        console.warn('[World Engine] Ignoring message from unexpected origin.', {
            expected: frameInfo.origin,
            received: event.origin,
            type: data?.type,
        });
        return null;
    }

    return frameInfo;
}

export function clearTrackedFrameOriginsForTest() {
    trackedFrameOrigins = new WeakMap();
}

