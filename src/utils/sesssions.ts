import { customAlphabet } from 'nanoid'
import { WebSocketServer } from 'ws'

const sessions: { [key: string]: { [key: string]: PackRaySession } } = {}

const idRNG = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)

class PackRaySession {
    sessionID = ""
    channelID = ""
    connections: { [key: string]: WebSocket } = {}
    clientHandlerWSS: WebSocketServer = null
    hostHandlerWSS: WebSocketServer = null

    clientPRWSS: WebSocketServer = null

    data = {

    }

    hostPeer: WebSocket
    hostPeerPR: WebSocket

    playerCount = 0

    constructor() {

    }

    createSocket() {
        this.sessionID = idRNG(4)
        if (process.env.NODE_ENV !== "production") {
            this.sessionID = "TEST"
        }

        this.createServerSocket()
        this.createClientSocket()
    }

    private createServerSocket() {
        this.hostHandlerWSS = new WebSocketServer({ noServer: true });
        let outThis = this

        this.hostHandlerWSS.on('connection', (cws) => {
            if (this.hostPeerPR) {
                cws.close()
                return
            }

            //@ts-expect-error
            outThis.hostPeerPR = cws

            cws.on("message", (raw: any) => {
                const data = JSON.parse(raw)

                if (data.type == "data_recv") {
                    const forID = data.for_id


                    this.connections[forID].send(data.content.data)
                }
            })

            cws.once("close", () => {
                this.closeConnection()
            })
        });
    }

    private createClientSocket() {
        this.clientHandlerWSS = new WebSocketServer({ noServer: true });
        let outThis = this

        this.clientHandlerWSS.on('connection', (cws) => {
            outThis.playerCount++

            const usrID = new Date().getTime().toString()
            //@ts-expect-error
            this.connections[usrID] = cws

            this.hostPeerPR.send(JSON.stringify({
                type: "new_connection",
                id: usrID
            }))

            cws.on("message", (data: any) => {
                this.hostPeerPR.send(JSON.stringify({
                    type: "data",
                    from_id: usrID,
                    content: data
                }))
            })

            cws.once("close", () => {
                outThis.playerCount--

                this.hostPeerPR.send(JSON.stringify({
                    type: "peer_disconnected",
                    id: usrID
                }))
            })
        });
    }

    closeConnection() {
        this.hostHandlerWSS.close()
        this.clientHandlerWSS.close()
        delete sessions[this.channelID][this.sessionID]
    }
}

export function createSession(channelID: string) {
    const pkS = new PackRaySession()
    pkS.channelID = channelID
    pkS.createSocket()
    if (!sessions[channelID]) {
        sessions[channelID] = {}
    }
    sessions[channelID][pkS.sessionID] = pkS

    return pkS
}

export function findSession(sessionID: string, channelID: string) {
    if (sessions[channelID][sessionID]) {
        return sessions[channelID][sessionID]
    }
}

export function countSessions() {
    let a = 0
    for (const c of Object.keys(sessions)) {
        for (const s of Object.keys(sessions[c])) {
            a++
        }
    }
    return a
}