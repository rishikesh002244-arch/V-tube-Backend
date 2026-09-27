import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import dns from "dns";

// Fix for Node.js "querySrv ECONNREFUSED" DNS issues on Windows with certain ISPs
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () =>{
    try{
      const connectionInstance =   await mongoose
      .connect( `${process.env.MONGODB_URI}/${DB_NAME}`)

      console.log(`\n mongoDB connected! DB host 
        :${connectionInstance.connection.host}`);
      
    } catch(error){
        console.log("mongoDB connection error",error)
        process.exit(1)
    }
}

export default connectDB