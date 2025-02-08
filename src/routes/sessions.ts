import express from 'express'
import { createSession, findSession } from '../utils/sesssions'
import http from "http";
import config from "../config"

const router = express.Router()
const packrayWS = process.env.PACKRAY_WS ?? "ws://127.0.0.1:6423"

router.post("/host", (req, res) => {
    if (!req.body.channel) {
        res.status(400)
        res.json({
            success: false,
            code: "MISSING_CHANNEL_ID"
        })
        return
    }
    const session = createSession(req.body.channel)

    res.json({
        success: true,
        code: session.sessionID,
        PRWSURL: `${packrayWS}/ws/${req.body.channel}/HOST:${session.sessionID}`
    })
})

router.post("/join/:code", (req, res) => {
    if (!req.body.channel) {
        res.status(400)
        res.json({
            success: false,
            code: "MISSING_CHANNEL_ID"
        })
        return
    }
    const channel = req.body.channel
    const session = findSession(req.params.code.toUpperCase(), channel)
    
    if (session) {
        res.json({
            success: true,
            code: session.sessionID,
            WSURL: `${packrayWS}/ws/${channel}/${session.sessionID}`,
        })
    } else {
        res.status(404)
        res.json({
            success: false,
            code: "SESSION_NOT_FOUND"
        })
    }
})

function init(server: http.Server) {
    server.on('upgrade', function upgrade(request, socket, head) {
        const pathname = request.url;

        if (pathname.startsWith(`/ws/`)) {
            const pathSplit = pathname.split("/")
            let channelCode = pathSplit[pathSplit.length - 2]
            let roomCode = pathSplit[pathSplit.length - 1]
            let isHost = false
            let isPRChannel = false

            console.log("Forwarding WS ", roomCode)

            if (roomCode.startsWith("HOST:")) {
                roomCode = roomCode.replace("HOST:", "")
                isHost = true
            }

            const session = findSession(roomCode, channelCode)

            if (session) {
                if (isHost) {
                    session.hostHandlerWSS.handleUpgrade(request, socket, head, function done(ws) {
                        session.hostHandlerWSS.emit('connection', ws, request);
                    })
                } else {
                    session.clientHandlerWSS.handleUpgrade(request, socket, head, function done(ws) {
                        session.clientHandlerWSS.emit('connection', ws, request);
                    })
                }
            } else {
                socket.destroy();
            }
        } else {
            socket.destroy();
        }
    });

}

export default { router, init }