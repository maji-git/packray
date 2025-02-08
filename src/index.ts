import WebSocket, { WebSocketServer } from 'ws';
import http from "http";
import express from 'express'
import cors from 'cors'
import SessionsRoute from './routes/sessions'
import { countSessions } from './utils/sesssions';

const app = express()
const port = process.env.PORT || 6423

const server = http.createServer({}, app)

app.use(express.json())
app.use(cors({
    origin: [
        "http://localhost:8000",
        "http://localhost:8060",
        "http://localhost:8080",
        "https://himaji.xyz",
        "https://static.himaji.xyz",
        "https://io.himaji.xyz",
        "https://html.itch.zone"
    ]
}))

app.use("/", express.static("./page"))

SessionsRoute.init(server)
app.use("/session", SessionsRoute.router)

app.get("/stats/session-count", (req, res) => {
    res.send(countSessions().toString())
})

server.listen(port, () => {
    console.log("Ready! ", port)
})