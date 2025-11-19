let popoutVisible = false;
let $popout = null;
let $drawerContent = null;

let settingsKey = '';
let dragElementFn = null;
let loadMovingUIStateFn = null;
let visibilityChangeCallback = null;

/**
 * Configure popout dependencies and callbacks.
 * @param {object} options
 * @param {string} options.settingsKey - Drawer settings key.
 * @param {Function} [options.dragElement] - Drag helper from RossAscends mods.
 * @param {Function} [options.loadMovingUIState] - Loader for persisted positions.
 * @param {Function} [options.onVisibilityChange] - Called with popout visibility state.
 */
export function configurePopout(options = {}) {
    settingsKey = options.settingsKey || settingsKey;
    dragElementFn = options.dragElement || dragElementFn;
    loadMovingUIStateFn = options.loadMovingUIState || loadMovingUIStateFn;
    visibilityChangeCallback = options.onVisibilityChange || visibilityChangeCallback;
}

/**
 * Returns whether the popout is currently visible.
 * @returns {boolean}
 */
export function isPopoutVisible() {
    return popoutVisible;
}

/**
 * Toggle the popout between open and closed states.
 */
export function togglePopout() {
    if (popoutVisible) {
        closePopout();
    } else {
        openPopout();
    }
}

/**
 * Open the settings popout and move the drawer content inside it.
 */
export function openPopout() {
    if (popoutVisible) return;

    const $drawer = $(`#${settingsKey}-drawer`);
    const $drawerHeader = $drawer.find('.inline-drawer-header');
    const $drawerContentElement = $drawer.find('.inline-drawer-content');
    const isCollapsed = !$drawerContentElement.hasClass('open');

    if (isCollapsed) {
        $drawerHeader.trigger('click');
    }

    $popout = $(`
        <div id="moonlit_echoes_popout" class="draggable" style="display: none;">
            <div class="panelControlBar flex-container" id="moonlitEchoesPopoutHeader">
                <div class="fa-solid fa-moon" style="margin-right: 10px;"></div>
                <div class="title">Moonlit Echoes Theme</div>
                <div class="flex1"></div>
                <div class="fa-solid fa-grip drag-grabber hoverglow"></div>
                <div class="fa-solid fa-circle-xmark hoverglow dragClose"></div>
            </div>
            <div id="moonlit_echoes_content_container"></div>
        </div>
    `);

    $('#movingDivs').append($popout);

    $drawerContentElement.removeClass('open').detach()
        .appendTo($popout.find('#moonlit_echoes_content_container'));
    $drawerContentElement.addClass('open').show();
    $drawerContent = $drawerContentElement;

    if (typeof loadMovingUIStateFn === 'function') {
        try {
            loadMovingUIStateFn();
        } catch (error) {
            // Silent error handling to avoid breaking UI.
        }
    }

    if (typeof dragElementFn === 'function') {
        try {
            dragElementFn($popout);
        } catch (error) {
            // Silent error handling to avoid breaking UI.
        }
    }

    $popout.find('.dragClose').on('click', () => closePopout());

    $popout.fadeIn(250);
    setVisibility(true);

    $(document).on('keydown.moonlit_popout', (event) => {
        if (event.key === 'Escape') {
            closePopout();
        }
    });
}

/**
 * Close the settings popout and return the drawer content to its original location.
 */
export function closePopout() {
    if (!popoutVisible || !$popout) return;

    const $currentPopout = $popout;
    const $currentDrawerContent = $drawerContent;

    $currentPopout.fadeOut(250, () => {
        const $drawer = $(`#${settingsKey}-drawer`);

        if ($currentDrawerContent) {
            $currentDrawerContent.detach().appendTo($drawer);
            $currentDrawerContent.addClass('open').show();
        }

        $currentPopout.remove();

        if ($popout === $currentPopout) {
            $popout = null;
        }
    });

    setVisibility(false);
    $(document).off('keydown.moonlit_popout');
}

function setVisibility(visible) {
    popoutVisible = visible;

    if (typeof visibilityChangeCallback === 'function') {
        try {
            visibilityChangeCallback(visible);
        } catch (error) {
            // Silent error handling to avoid interrupting UI flow.
        }
    }
    if (!visible) {
        $drawerContent = null;
    }
}
