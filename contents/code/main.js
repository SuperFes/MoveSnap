/*
 * KWin Script Move Snap
 * Copyright 2022 Aaron Nixon <kdedoom@cookiedoom.com>
 * GNU General Public License v3.0
 */

"use strict";

const clients = workspace.clientList();

var clientBorders = [];
var centerFences = [];

let widths = 0;

for (var s = 0; s < workspace.numScreens; s++) {
    let Screen = workspace.clientArea({}, s, 0);
    let Fence = widths + Math.floor(Screen.width / 2);

    centerFences[s] = Fence;

    widths += Screen.width;
}

function GetDistance(point, rect) {
    let dx = point.left - rect.left;
    let dy = point.top - rect.top;

    let d = Math.sqrt(dx * dx + dy * dy);

    if (d <= 30) {
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

function MoveResized(client, rect) {
    let Frame = client.frameGeometry;

    let Quad = {
        TL: {left: Frame.left - 30, top: Frame.top - 30},
        TR: {left: Frame.left + 30, top: Frame.top - 30},
        BR: {left: Frame.left + 30, top: Frame.top + 30},
        BL: {left: Frame.left - 30, top: Frame.top + 30}
    };

    if (client.screen < workspace.numScreens) {
        for (let s = 0; s < workspace.numScreens; s++) {
            let fromRight = centerFences[s] - rect.right;
            let fromLeft = rect.left - centerFences[s];

            if (fromRight < 15 && fromRight > 0) {
                rect.x += fromRight;
                rect.left += fromRight;
                rect.right += fromRight;

                client.frameGeometry = rect;

                workspace.showOutline(rect);

                return;
            }
            else if (fromLeft < 15 && fromLeft > 0) {
                rect.x -= fromLeft;
                rect.left -= fromLeft;
                rect.right -= fromLeft;

                client.frameGeometry = rect;

                workspace.showOutline(rect);

                return;
            }
        }
    }

    for (var c = 0; c < clientBorders.length; c++) {
        if (!clientBorders[c]) {
            continue;
        }

        let cClient = clientBorders[c];

        if (cClient.windowId == client.windowId) {
            clientBorders[c] = client;
            continue;
        }

        if (cClient.desktop !== client.desktop) {
            continue;
        }

        let Point = NearQuad(Quad, cClient.frameGeometry);

        if (!Point) {
            continue;
        }

        rect.x -= Point.left;
        rect.left -= Point.left;
        rect.right -= Point.left;

        rect.y -= Point.top;
        rect.top -= Point.top;
        rect.bottom -= Point.top;

        client.frameGeometry = rect;

        workspace.showOutline(rect);

        return;
    }

    workspace.hideOutline();
}

function SetupClient(client) {
    client.clientStepUserMovedResized.connect(MoveResized);

    client.clientFinishUserMovedResized.connect(function (client) {
        workspace.hideOutline();
    });
}

for (var i = 0; i < clients.length; i++) {
    if (clients[i].normalWindow !== undefined && clients[i].normalWindow === true) {
        SetupClient(clients[i]);

        clientBorders.push(clients[i]);
    }
}

workspace.clientAdded.connect(function(client) {
    if (client.normalWindow !== undefined && client.normalWindow === true) {
        SetupClient(client);

        clientBorders.push(client);
    }
});

workspace.clientRemoved.connect(function(client) {
    for (let c = 0; c < clientBorders.length; c++) {
        if (clientBorders[c].windowId == client.windowId) {
            clientBorders.splice(c, 1);

            break;
        }
    }
});

workspace.numberScreensChanged.connect(function (count) {
    for (var s = 0; s < workspace.numScreens; s++) {
        let Screen = workspace.clientArea({}, s, 0);
        let Fence = widths + Math.floor(Screen.width / 2);

        centerFences[s] = Fence;

        widths += Screen.width;
    }
});
