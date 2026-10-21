// ============================================
// FORGE VIDEO EDITOR - KEYBOARD SHORTCUTS
// ============================================
import {
    getProject,
    getSelectedItem,
    selectItem,
    clearSelection,
    undo,
    redo,
    setCurrentTime,
    setPlaying,
    setTimelineZoom,
    saveProjectLocal,
    removeClip,
    duplicateClip,
    on
} from "./state.js";

// --------------------------------------------
// INITIALIZE
// --------------------------------------------

export function initShortcuts() {

    window.addEventListener(
        "keydown",
        handleKeyDown
    );

    setupGlobalClickProtection();
}


// --------------------------------------------
// KEYBOARD HANDLER
// --------------------------------------------

function handleKeyDown(event) {

    // ----------------------------------------
    // Ignore shortcuts while typing
    // ----------------------------------------

    if (
        isTypingTarget(event.target)
    ) {

        // Escape is still useful while editing.
        if (event.key !== "Escape") {
            return;
        }
    }


    // ----------------------------------------
    // CTRL / CMD
    // ----------------------------------------

    const modifier =
        event.ctrlKey ||
        event.metaKey;


    // Undo
    if (
        modifier &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        undo();

        return;
    }


    // Redo
    if (
        modifier &&
        (
            event.key.toLowerCase() === "y" ||
            (
                event.key.toLowerCase() === "z" &&
                event.shiftKey
            )
        )
    ) {

        event.preventDefault();

        redo();

        return;
    }


    // Save
    if (
        modifier &&
        event.key.toLowerCase() === "s"
    ) {

        event.preventDefault();

        saveProjectLocal();

        showShortcutToast(
            "Project saved"
        );

        return;
    }


    // Duplicate
    if (
        modifier &&
        event.key.toLowerCase() === "d"
    ) {

        event.preventDefault();

        duplicateSelectedClip();

        return;
    }


    // Select all clips
    if (
        modifier &&
        event.key.toLowerCase() === "a"
    ) {

        event.preventDefault();

        selectAllClips();

        return;
    }


    // ----------------------------------------
    // SINGLE KEY SHORTCUTS
    // ----------------------------------------

    switch (
        event.key.toLowerCase()
    ) {

        // ------------------------------------
        // Space = Play / Pause
        // ------------------------------------

        case " ":

            event.preventDefault();

            togglePlayback();

            break;


        // ------------------------------------
        // K = Play / Pause
        // ------------------------------------

        case "k":

            event.preventDefault();

            togglePlayback();

            break;


        // ------------------------------------
        // J = Previous / Reverse seek
        // ------------------------------------

        case "j":

            event.preventDefault();

            seekRelative(
                -1
            );

            break;


        // ------------------------------------
        // L = Forward seek
        // ------------------------------------

        case "l":

            event.preventDefault();

            seekRelative(
                1
            );

            break;


        // ------------------------------------
        // Arrow Left
        // ------------------------------------

        case "arrowleft":

            event.preventDefault();

            seekRelative(
                event.shiftKey
                    ? -1
                    : -1 / 30
            );

            break;


        // ------------------------------------
        // Arrow Right
        // ------------------------------------

        case "arrowright":

            event.preventDefault();

            seekRelative(
                event.shiftKey
                    ? 1
                    : 1 / 30
            );

            break;


        // ------------------------------------
        // Home
        // ------------------------------------

        case "home":

            event.preventDefault();

            setCurrentTime(
                0
            );

            break;


        // ------------------------------------
        // End
        // ------------------------------------

        case "end":

            event.preventDefault();

            seekToTimelineEnd();

            break;


        // ------------------------------------
        // Delete
        // ------------------------------------

        case "delete":
        case "backspace":

            event.preventDefault();

            deleteSelected();

            break;


        // ------------------------------------
        // S = Split
        // ------------------------------------

        case "s":

            event.preventDefault();

            splitSelected();

            break;


        // ------------------------------------
        // Escape
        // ------------------------------------

        case "escape":

            event.preventDefault();

            clearSelection();

            break;


        // ------------------------------------
        // + = Timeline zoom in
        // ------------------------------------

        case "+":
        case "=":

            if (
                event.shiftKey ||
                event.key === "+"
            ) {

                event.preventDefault();

                changeTimelineZoom(
                    0.15
                );
            }

            break;


        // ------------------------------------
        // - = Timeline zoom out
        // ------------------------------------

        case "-":
        case "_":

            event.preventDefault();

            changeTimelineZoom(
                -0.15
            );

            break;


        // ------------------------------------
        // F = Fullscreen
        // ------------------------------------

        case "f":

            event.preventDefault();

            toggleFullscreen();

            break;


        // ------------------------------------
        // M = Mute
        // ------------------------------------

        case "m":

            event.preventDefault();

            toggleMute();

            break;
    }
}


// --------------------------------------------
// PLAYBACK
// --------------------------------------------

function togglePlayback() {

    const project =
        getProject();

    setPlaying(
        !project.playback.playing
    );
}


// --------------------------------------------
// SEEK
// --------------------------------------------

function seekRelative(
    amount
) {

    const project =
        getProject();

    const current =
        project.currentTime || 0;


    const duration =
        getTimelineDuration(
            project
        );


    const next =
        Math.min(
            duration,
            Math.max(
                0,
                current + amount
            )
        );


    setCurrentTime(
        next
    );
}


// --------------------------------------------
// TIMELINE END
// --------------------------------------------

function seekToTimelineEnd() {

    const project =
        getProject();


    const duration =
        getTimelineDuration(
            project
        );


    setCurrentTime(
        duration
    );
}


// --------------------------------------------
// DUPLICATE
// --------------------------------------------

function duplicateSelectedClip() {

    const selected = getSelectedItem();

    if (!selected || selected.type !== "clip") {
        return;
    }

    const copy = duplicateClip(selected.id);

    if (copy) {
        showShortcutToast("Clip duplicated");
    }
}

// --------------------------------------------
// DELETE
// --------------------------------------------

function deleteSelected() {
    const selected = getSelectedItem();

    if (!selected) return;

    if (selected.type !== "clip") {
        clearSelection();
        return;
    }

    const project = getProject();

    let clip = null;

    for (const track of project.tracks || []) {
        const found = (track.clips || []).find(
            item => item.id === selected.id
        );

        if (found) {
            clip = found;
            break;
        }
    }

    if (!clip) {
        clearSelection();
        return;
    }

    removeClip(
        clip.id
    );

    clearSelection();

    showShortcutToast("Clip deleted");
}

// --------------------------------------------
// SPLIT
// --------------------------------------------

function splitSelected() {

    const selected =
        getSelectedItem();

    if (!selected) return;


    if (
        selected.type !== "clip"
    ) {
        return;
    }


    // timeline.js owns the actual split
    // implementation. Trigger its shortcut
    // event instead of duplicating the logic.
    window.dispatchEvent(
        new CustomEvent(
            "forge:split-selected"
        )
    );
}


// --------------------------------------------
// SELECT ALL
// --------------------------------------------

function selectAllClips() {

    const project =
        getProject();


    const clips = [];


    for (
        const track
        of project.tracks || []
    ) {

        for (
            const clip
            of track.clips || []
        ) {

            clips.push(
                clip
            );
        }
    }


    if (!clips.length) return;


    // State currently supports one selection.
    // Select the first clip while keeping the
    // architecture ready for multi-selection.
    selectItem(
        clips[0].id,
        "clip"
    );


    showShortcutToast(
        `${clips.length} clip(s) available`
    );
}


// --------------------------------------------
// TIMELINE ZOOM
// --------------------------------------------

function changeTimelineZoom(
    amount
) {

    const project =
        getProject();


    const current =
        project.timeline.zoom || 1;


    const next =
        Math.min(
            4,
            Math.max(
                0.25,
                current + amount
            )
        );


    setTimelineZoom(
        next
    );
}


// --------------------------------------------
// FULLSCREEN
// --------------------------------------------

function toggleFullscreen() {

    const preview =
        document.getElementById(
            "previewArea"
        ) ||
        document.querySelector(
            ".preview-area"
        ) ||
        document.getElementById(
            "videoCanvas"
        );


    if (!preview) return;


    if (
        document.fullscreenElement
    ) {

        document.exitFullscreen();

        return;
    }


    if (
        preview.requestFullscreen
    ) {

        preview.requestFullscreen();
    }
}


// --------------------------------------------
// MUTE
// --------------------------------------------

function toggleMute() {

    const video =
        document.getElementById(
            "mainVideo"
        );


    if (!video) return;


    video.muted =
        !video.muted;


    showShortcutToast(
        video.muted
            ? "Muted"
            : "Unmuted"
    );
}


// --------------------------------------------
// TYPING CHECK
// --------------------------------------------

function isTypingTarget(
    target
) {

    if (!target) {
        return false;
    }


    const tag =
        target.tagName?.toLowerCase();


    if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select"
    ) {

        return true;
    }


    if (
        target.isContentEditable
    ) {

        return true;
    }


    return false;
}


// --------------------------------------------
// PROJECT DURATION
// --------------------------------------------

function getTimelineDuration(
    project
) {

    let duration =
        Number(
            project.duration
        ) || 0;


    for (
        const track
        of project.tracks || []
    ) {

        for (
            const clip
            of track.clips || []
        ) {

            const end =
                (
                    clip.start || 0
                ) +
                (
                    clip.duration || 0
                );


            duration =
                Math.max(
                    duration,
                    end
                );
        }
    }


    return duration;
}


// --------------------------------------------
// GLOBAL CLICK PROTECTION
// --------------------------------------------

function setupGlobalClickProtection() {

    document.addEventListener(
        "keydown",
        event => {

            // Prevent browser quick-find
            // from interfering with editor.
            if (
                event.key === "/" &&
                !isTypingTarget(
                    event.target
                )
            ) {

                event.preventDefault();
            }
        }
    );
}


// --------------------------------------------
// TOAST
// --------------------------------------------

function showShortcutToast(
    message
) {

    let toast =
        document.querySelector(
            ".shortcut-toast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.className =
            "shortcut-toast";

        document.body.appendChild(
            toast
        );
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toast._timer
    );


    toast._timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            1200
        );
}


// --------------------------------------------
// PUBLIC SHORTCUT MAP
// --------------------------------------------

export function getShortcutMap() {

    return {

        "Space":
            "Play / Pause",

        "K":
            "Play / Pause",

        "J":
            "Seek backward",

        "L":
            "Seek forward",

        "←":
            "Previous frame",

        "→":
            "Next frame",

        "Shift + ←":
            "Seek backward 1 second",

        "Shift + →":
            "Seek forward 1 second",

        "Home":
            "Go to beginning",

        "End":
            "Go to end",

        "S":
            "Split clip",

        "Delete":
            "Delete selected clip",

        "Backspace":
            "Delete selected clip",

        "Ctrl + Z":
            "Undo",

        "Ctrl + Shift + Z":
            "Redo",

        "Ctrl + Y":
            "Redo",

        "Ctrl + S":
            "Save project",

        "Ctrl + D":
            "Duplicate clip",

        "Ctrl + A":
            "Select all",

        "+":
            "Timeline zoom in",

        "-":
            "Timeline zoom out",

        "F":
            "Fullscreen",

        "M":
            "Mute / Unmute",

        "Esc":
            "Clear selection"
    };
}


// --------------------------------------------
// HELP OVERLAY
// --------------------------------------------

export function showShortcutHelp() {

    const map =
        getShortcutMap();


    let overlay =
        document.getElementById(
            "shortcutHelp"
        );


    if (!overlay) {

        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "shortcutHelp";

        overlay.className =
            "shortcut-help";


        const content =
            document.createElement(
                "div"
            );

        content.className =
            "shortcut-help-content";


        const title =
            document.createElement(
                "h2"
            );

        title.textContent =
            "Keyboard Shortcuts";


        content.appendChild(
            title
        );


        Object.entries(
            map
        ).forEach(
            ([key, description]) => {

                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    "shortcut-row";


                row.innerHTML =
                    `
                    <kbd>${key}</kbd>
                    <span>${description}</span>
                    `;


                content.appendChild(
                    row
                );
            }
        );


        const close =
            document.createElement(
                "button"
            );

        close.type =
            "button";

        close.textContent =
            "Close";

        close.addEventListener(
            "click",
            () => {

                overlay.remove();
            }
        );


        content.appendChild(
            close
        );

        overlay.appendChild(
            content
        );

        document.body.appendChild(
            overlay
        );

    } else {

        overlay.classList.toggle(
            "active"
        );
    }
}