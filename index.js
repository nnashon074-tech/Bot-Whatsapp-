import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys"
import express from "express"

const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("WhatsApp Bot Running ✅")
})

app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth")

  const sock = makeWASocket({
    auth: state,
    mobile: true
  })

  // 🔑 Generate pairing code (ONLY if not registered)
  if (!state.creds.registered) {
    const code = await sock.requestPairingCode("255748529340")
    console.log("PAIRING CODE:", code)
  }

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
      console.log("WhatsApp Connected Successfully ✅")
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        startBot()
      } else {
        console.log("Logged out ❌")
      }
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    if (text.toLowerCase() === "ping") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "pong 🟢"
      })
    }
  })
}

startBot()
