/*
 * KWin Script Move Snap
 * Copyright 2022 Aaron Nixon <kdedoom@cookiedoom.com>
 * GNU General Public License v3.0
 */

"use strict";

const MoveSnapDistance = 30;

let windowBorders = [];
let centerFences = [];

function CalculateScreens(Screens) {
    centerFences.splice(0);

    let widths = 0;

    Screens = workspace.screens.length;

    for (let s = 0; s < Screens; s++) {
        let Screen = workspace.screens[s].geometry;
        let Fence = widths + Math.floor(Screen.width / 2);

        centerFences.push(Fence);

        widths += Screen.width;
    }
}

function GetDistance(point, rect) {
    let dx = point.left - rect.left;
    let dy = point.top - rect.top;

    let d = Math.sqrt(dx * dx + dy * dy);

    if (d <= MoveSnapDistance) {
        return {left: dx, top: dy};
    }

    return false;
}

function NearQuad(quad, rect) {
    let Bleh =
    GetDistance(quad.TL, rect) ||
    GetDistance(quad.TR, rect) ||
    GetDistance(quad.BR, rect) ||
    GetDistance(quad.BL, rect);

    return Bleh;
}

function MoveResized(rect) {
    let window = workspace.activeWindow;
    let Frame = window.clientGeometry;

    let Quad = {
        TL: {left: Frame.left - MoveSnapDistance, top: Frame.top - MoveSnapDistance},
        TR: {left: Frame.left + MoveSnapDistance, top: Frame.top - MoveSnapDistance},
        BR: {left: Frame.left + MoveSnapDistance, top: Frame.top + MoveSnapDistance},
        BL: {left: Frame.left - MoveSnapDistance, top: Frame.top + MoveSnapDistance}
    };

    if (window.screen <= centerFences.length) {
        for (let s = 0; s < centerFences.length; s++) {
            let fromRight  = centerFences[s] - rect.right;
            let fromLeft   = rect.left - centerFences[s];
            let fromCenter = (rect.left + Math.round(rect.width / 2)) - centerFences[s];

            if (fromRight < MoveSnapDistance && fromRight > 0) {
                rect.x += fromRight;
                rect.left += fromRight;
                rect.right += fromRight;

                window.frameGeometry = rect;

                workspace.showOutline(rect);

                return;
            }
            else if (fromLeft < MoveSnapDistance && fromLeft > 0) {
                rect.x -= fromLeft;
                rect.left -= fromLeft;
                rect.right -= fromLeft;

                window.frameGeometry = rect;

                workspace.showOutline(rect);

                return;
            }
            else if (fromCenter < 15 && fromCenter > -15) {
                rect.x -= fromCenter;
                rect.left -= fromCenter;
                rect.right -= fromCenter;

                window.frameGeometry = rect;

                workspace.showOutline(rect);

                return;
            }
        }
    }

    for (var c = 0; c < windowBorders.length; c++) {
        if (!windowBorders[c]) {
            continue;
        }

        let cWindow = windowBorders[c];

        if (cWindow.internalId === window.internalId) {
            windowBorders[c] = window;

            continue;
        }

        if (cWindow.desktop !== window.desktop) {
            continue;
        }

        let Point = NearQuad(Quad, cWindow.clientGeometry);

        if (!Point) {
            continue;
        }

        rect.x -= Point.left;
        rect.left -= Point.left;
        rect.right -= Point.left;

        rect.y -= Point.top;
        rect.top -= Point.top;
        rect.bottom -= Point.top;

        window.frameGeometry = rect;

        windowBorders[c] = window;

        workspace.showOutline(rect);

        return;
    }

    workspace.hideOutline();
}

function SetupWindow(window) {
    window.interactiveMoveResizeStepped.connect(MoveResized);

    window.interactiveMoveResizeFinished.connect(function (window) {
        workspace.hideOutline();
    });
}

workspace.windowAdded.connect(function(window) {
    if (window.normalWindow !== undefined && window.normalWindow === true) {
        SetupWindow(window);

        windowBorders.push(window);
    }
});

workspace.windowRemoved.connect(function(window) {
    for (let c = 0; c < windowBorders.length; c++) {
        if (windowBorders[c].internalId === window.internalId) {
            windowBorders.splice(c, 1);

            break;
        }
    }
});

workspace.desktopsChanged.connect(CalculateScreens);
workspace.desktopLayoutChanged.connect(CalculateScreens);
workspace.virtualScreenSizeChanged.connect(CalculateScreens);
workspace.virtualScreenGeometryChanged.connect(CalculateScreens);

const windows = workspace.windowList();

for (var i = 0; i < windows.length; i++) {
    if (windows[i].normalWindow !== undefined && windows[i].normalWindow === true) {
        SetupWindow(windows[i]);

        windowBorders.push(windows[i]);
    }
}

CalculateScreens(workspace.screens.length);
