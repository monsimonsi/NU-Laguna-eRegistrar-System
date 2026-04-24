const dotenv = require("dotenv");
const connectDatabase = require("./config/db");
const app = require("./app");

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set");
    }

    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
