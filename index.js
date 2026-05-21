const {
default: makeWASocket,
useMultiFileAuthState,
downloadMediaMessage
} = require("@whiskeysockets/baileys")

const P = require("pino")
const qrcode = require("qrcode-terminal")
const fs = require("fs")
const axios = require("axios")
const yts = require("yt-search")
const ytdl = require("ytdl-core")
const sharp = require("sharp")

const admins = [
"521TU_NUMERO@s.whatsapp.net"
]

let xp = {}
let spam = {}

async function startBot(){

const { state, saveCreds } =
await useMultiFileAuthState("./auth")

const sock = makeWASocket({
logger: P({ level: "silent" }),
auth: state
})

sock.ev.on("creds.update", saveCreds)

// ================= QR =================

sock.ev.on("connection.update", ({ connection, qr })=>{

if(qr){
qrcode.generate(qr, { small: true })
}

if(connection === "open"){
console.log("BOT ONLINE 24/7")
}

})

// ================= BIENVENIDAS =================

sock.ev.on("group-participants.update", async(data)=>{

const group = data.id
const users = data.participants

for(let user of users){

if(data.action === "add"){

await sock.sendMessage(group,{
text:`👋 Bienvenido @${user.split("@")[0]}`,
mentions:[user]
})

}

}

})

// ================= MENSAJES =================

sock.ev.on("messages.upsert", async({ messages })=>{

const msg = messages[0]

if(!msg.message) return

const from = msg.key.remoteJid

const sender =
msg.key.participant || from

const body =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

// ================= ANTI SPAM =================

if(!spam[sender]){
spam[sender] = { messages:0 }
}

spam[sender].messages++

if(spam[sender].messages > 7){

await sock.sendMessage(from,{
text:"🚫 Spam detectado"
})

return
}

setTimeout(()=>{
spam[sender].messages = 0
},5000)

// ================= XP =================

if(!xp[sender]){
xp[sender] = 0
}

xp[sender] += 5

// ================= MENU =================

if(body === "!menu"){

await sock.sendMessage(from,{
text:`
╔══════ BOT ══════╗

🤖 !ia pregunta
🎵 !play canción
🎥 !video video
🖼️ !sticker
📈 !xp
🎮 !dados
😂 !meme
🌎 !traducir texto
🧠 !frase
📥 !tiktok link
👑 !admin

╚═════════════════╝
`
})

}

// ================= IA =================

if(body.startsWith("!ia ")){

const pregunta =
body.replace("!ia ","")

try{

const respuesta = await axios.get(
"https://api.simsimi.vn/v2/simtalk",
{
params:{
text: pregunta,
lc:"es"
}
}
)

await sock.sendMessage(from,{
text:`🤖 ${respuesta.data.message}`
})

}catch{

await sock.sendMessage(from,{
text:"❌ Error IA"
})

}

}

// ================= MUSICA =================

if(body.startsWith("!play ")){

const query =
body.replace("!play ","")

const search =
await yts(query)

const video =
search.videos[0]

if(!video){

return sock.sendMessage(from,{
text:"❌ No encontré música"
})

}

await sock.sendMessage(from,{
text:`🎵 Descargando ${video.title}`
})

const stream =
ytdl(video.url,{
filter:"audioonly"
})

const path = "./audio.mp3"

stream.pipe(fs.createWriteStream(path))

stream.on("finish", async()=>{

await sock.sendMessage(from,{
audio: fs.readFileSync(path),
mimetype:"audio/mp4"
})

fs.unlinkSync(path)

})

}

// ================= VIDEO =================

if(body.startsWith("!video ")){

const query =
body.replace("!video ","")

const search =
await yts(query)

const video =
search.videos[0]

if(!video){

return sock.sendMessage(from,{
text:"❌ No encontré video"
})

}

await sock.sendMessage(from,{
text:`🎥 Descargando ${video.title}`
})

const stream =
ytdl(video.url)

const path = "./video.mp4"

stream.pipe(fs.createWriteStream(path))

stream.on("finish", async()=>{

await sock.sendMessage(from,{
video: fs.readFileSync(path),
caption: video.title
})

fs.unlinkSync(path)

})

}

// ================= STICKER =================

if(
body === "!sticker" &&
msg.message.imageMessage
){

const buffer =
await downloadMediaMessage(
msg,
"buffer",
{},
{}
)

const sticker =
await sharp(buffer)
.webp()
.toBuffer()

await sock.sendMessage(from,{
sticker: sticker
})

}

// ================= XP =================

if(body === "!xp"){

await sock.sendMessage(from,{
text:`⭐ XP: ${xp[sender]}`
})

}

// ================= DADOS =================

if(body === "!dados"){

const numero =
Math.floor(Math.random()*6)+1

await sock.sendMessage(from,{
text:`🎲 Salió: ${numero}`
})

}

// ================= MEMES =================

if(body === "!meme"){

const memes = [
"😂 Yo programando a las 3 AM",
"💀 Cuando el código funciona y no sabes por qué",
"🔥 GitHub salvando vidas",
"🤡 Error en la línea 1"
]

const random =
memes[Math.floor(Math.random()*memes.length)]

await sock.sendMessage(from,{
text: random
})

}

// ================= FRASES =================

if(body === "!frase"){

const frases = [
"💡 Nunca dejes de aprender",
"🚀 El éxito llega con práctica",
"🔥 Todo error enseña algo",
"🧠 La disciplina supera la motivación"
]

const frase =
frases[Math.floor(Math.random()*frases.length)]

await sock.sendMessage(from,{
text: frase
})

}

// ================= TRADUCTOR =================

if(body.startsWith("!traducir ")){

const texto =
body.replace("!traducir ","")

try{

const res = await axios.get(
"https://api.mymemory.translated.net/get",
{
params:{
q:texto,
langpair:"es|en"
}
}
)

await sock.sendMessage(from,{
text:`🌎 ${res.data.responseData.translatedText}`
})

}catch{

await sock.sendMessage(from,{
text:"❌ Error traducción"
})

}

}

// ================= TIKTOK =================

if(body.startsWith("!tiktok ")){

const url =
body.replace("!tiktok ","")

try{

const api =
await axios.get(
`https://tikwm.com/api/?url=${url}`
)

const video =
api.data.data.play

await sock.sendMessage(from,{
video:{ url: video },
caption:"TikTok descargado"
})

}catch{

await sock.sendMessage(from,{
text:"❌ Error TikTok"
})

}

}

// ================= ADMIN =================

if(body === "!admin"){

if(!admins.includes(sender)){

return sock.sendMessage(from,{
text:"❌ No eres admin"
})

}

await sock.sendMessage(from,{
text:"👑 Admin detectado"
})

}

})

}

startBot()
