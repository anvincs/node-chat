import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// The above two lines was due to the fact that the variable __dirname is not available in modules. But it is readily available when we use require instead of import

const PORT = process.env.PORT || 3500;

const app = express();

app.use(express.static(path.join(__dirname, "public")));
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
  // console.log(`User ${socket.id} connected`);

  // Upon connection - Only to the user who connected
  socket.emit("message", "Welcome to Chat App");
  // socket.emit() goes only to the connected user

  // Upon connection - To all the users except the user who connected
  socket.broadcast.emit(
    "message",
    `${socket.id.substring(0, 5)} joined the chat`
  );
  // socket.broadcast.emit() goes to all the users except the connected user

  // Listening for a message event
  socket.on("message", (data) => {
    io.emit("message", `${socket.id.substring(0, 5)} : ${data}`);
  });

  // When user disconnects -  to all others
  socket.on("disconnect", () => {
    socket.broadcast.emit(
      "message",
      `${socket.id.substring(0, 5)} left the chat`
    );
  });

  // Listen for activity
  socket.on("activity", (name) => {
    socket.broadcast.emit("activity", name);
  });
});
