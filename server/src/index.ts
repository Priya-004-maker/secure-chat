import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { connectDB } from "@/lib/db";
import authRoutes from "@/routes/auth.routes";
import messageRoutes from "@/routes/message.routes";
import userRoutes from "@/routes/user.routes";
import { requestLogger, errorLogger } from "@/middleware/logger";

config({ quiet: true });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.json({ message: "Server healthy!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

app.use(errorLogger);

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running at Port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
