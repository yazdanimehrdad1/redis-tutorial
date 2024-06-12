import express from "express";

import * as dotenv from 'dotenv';


import UserController from "./src/controllers/user";
import {initializeRedisClient,redisCacheMiddleware} from "./src/middlewares/redis";



async function initializeExpressServer(){
    // initialize an Express application
    const app = express();
    app.use(express.json());


    await initializeRedisClient();
    
    // register an endpoint
    app.get("/api/v1/users", redisCacheMiddleware, UserController.getAll);
    
    // start the server
    const port = 3001;
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
}


initializeExpressServer()
    .then()
    .catch((e)=> console.error(`Error initializing the server: ${e}`));