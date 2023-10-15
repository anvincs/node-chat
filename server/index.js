import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// The above two lines was due to the fact that the variable __dirname is not available in modules. But it is readily available when we use require instead of import

const PORT = process.env.PORT || 3500;
const ADMIN = "Admin";

const app = express();

app.use(express.static(path.join(__dirname, "public")));
// __dirname is not available in modules.
// It is only available in require

const expressServer = app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

// state
const UserState = {
  users: [],
  setUsers: function (newUsersArray) {
    this.users = newUsersArray;
  },
};

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
  socket.emit("message", buildMsg(ADMIN, "Welcome to the chat app!"));
  // socket.emit() goes only to the connected user

  socket.on("enter-room", ({ name, room }) => {
    // leave previous room if any
    const prevRoom = getUser(socket.id)?.room;
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit("message", buildMsg(ADMIN, `${name} left the room`));
    }

    const user = activateUser(socket.id, name, room);

    // Cannot update prevoius room user list until after the state update in activate user
    if (prevRoom) {
      io.to(prevRoom).emit("userList", { users: getUsersInRoom(prevRoom) });
    }

    // join room
    socket.join(user.room);

    // To user who joined
    socket.emit(
      "message",
      buildMsg(ADMIN, `You have joined the ${user.room} chat room`)
    );

    // To everyone in the room except the user who joined
    socket.broadcast
      .to(user.room)
      .emit("message", buildMsg(ADMIN, `${user.name} joined the room`));
    // socket.broadcast.emit() goes to all the users except the connected user

    // Update user list for room
    io.to(user.room).emit("userList", { users: getUsersInRoom(user.room) });

    // Update rooms list for all
    io.emit("roomList", { rooms: getAllActiveRooms() });
  });

  // When user disconnects -  to all others
  socket.on("disconnect", () => {
    const user = getUser(socket.id);
    userLeavesApp(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        buildMsg(ADMIN, `${user.name} left the room`)
      );

      io.to(user.room).emit("userList", { users: getUsersInRoom(user.room) });

      io.emit("roomList", { rooms: getAllActiveRooms() });
    }
  });

  // Listening for a message event
  socket.on("message", ({ name, text }) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      io.to(room).emit("message", buildMsg(name, text));
    }
  });

  // Listen for activity
  socket.on("activity", (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      socket.broadcast.to(room).emit("activity", name);
    }
  });
});

function buildMsg(name, text) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat("default", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(new Date()),
  };
}

// User Functions

function activateUser(id, name, room) {
  const user = { id, name, room };
  UserState.setUsers([
    ...UserState.users.filter((user) => user.id !== id),
    user,
  ]);
  return user;
}

function userLeavesApp(id) {
  UserState.setUsers(UserState.users.filter((user) => user.id !== id));
}

function getUser(id) {
  return UserState.users.find((user) => user.id === id);
}

function getUsersInRoom(room) {
  return UserState.users.filter((user) => user.room === room);
}

function getAllActiveRooms() {
  return Array.from(new Set(UserState.users.map((user) => user.room)));
}
