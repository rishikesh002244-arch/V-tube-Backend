import mongoose from "mongoose";
import { User } from "./src/models/user.models.js";
import dotenv from "dotenv";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const run = async () => {
  try {
    const DB_NAME = "vidtube"; // Assuming from memory
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log("Connected to MongoDB!");

    const user = await User.create({
      fullname: "one",
      avatar: "http://example.com/avatar.png", // required string
      coverImage: "http://example.com/cover.png",
      email: "one1234567@gmail.com",
      password: "123",
      username: "one1234567"
    });
    console.log("User created successfully!", user._id);
  } catch (error) {
    console.error("USER CREATE ERROR --->", error);
  } finally {
    mongoose.disconnect();
  }
};
run();
