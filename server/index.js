import express from "express";
import { Server } from "socket.io";
import path from 'path'
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// The above two lines was due to the fact that the variable __dirname is not available in modules. But it is readily available when we use require instead of import

const PORT = process.env.PORT || 3500;

const app = express()

app.use(express.static(path.join(__dirname, "public")))
// __dirname is not available in modules.
// It is only available in require

const expressServer = app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

const io = new Server(expressServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? false
        : ["http://localhost:5500", "http://127.0.0.1:5500"],
  },
});

io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);

  socket.on("message", (data) => {
    // console.log(data);
    io.emit("message", `${socket.id.substring(0, 5)} : ${data}`);
  });
});

