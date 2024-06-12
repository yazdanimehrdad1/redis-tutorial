import { createClient } from "redis";
import * as hash from 'object-hash';

let redisClient = undefined;
export const initializeRedisClient = async () => {
    let redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    if(redisUrl){
        redisClient = createClient({url: redisUrl}).on("error", (e)=>{
            console.error(`Redis client error: ${e}`);
        });
    }

    try{
        await redisClient.connect();
        console.log(`Redis client connected ${redisUrl}`);
    }catch(e){
        console.error(`Redis client connection error: ${e}`);
    }
};

const requestToKey = (req) => {
    const reqDataToHash = {
        query: req.query,
        body: req.body,
    };
    //Given the http://localhost:3000/api/v1/users GET call, requestToKey() will return something like:
    // "/api/v1/users@c0004b1d98e598127f787c287aaf7c0db94454f1"
    return `${req.path}@${hash.sha1(reqDataToHash)}`;
};

const isRedisWorking = () => {
    return !!redisClient?.isOpen;
};    


const writeDataToRedis = async (key, data, options) => {
    try{
        await redisClient.set(key, data, options);
    }catch(e){
        console.error(`Error writing to Redis: ${e}`);
    }
};

const readDataFromRedis = async (key) => {
    let cacheValue = undefined;
    if(isRedisWorking()){
        try{
            cacheValue = await redisClient.get(key);
            return cacheValue;
        }catch(e){
            console.error(`Error reading from Redis: ${e}`);
        }
    }
};

export const redisCacheMiddleware = async (req, res, next) => {
    const options = {
        EX: 21600, // 6h
    }
    if(isRedisWorking()){
        const key = requestToKey(req);

        const cachedValue = await readDataFromRedis(key);
        if(cachedValue){
            try{
                // if it is JSON data, then return it
                return res.json(JSON.parse(cachedValue));
            } catch {
                // if it is not JSON data, then return it
                return res.send(cachedValue);
        }
        }else{
            const oldSend = res.send;
            res.send = (data)=>{
                res.send = oldSend;

                // cache the response only if it is successful
                if (res.statusCode.toString().startsWith("2")) {
                    writeDataToRedis(key, data, options).then();
                }

                return res.send(data);
            };
            //continue to the controller function
            next();
        }

    }else{
        // if Redis is not working, continue to the controller function
        next();

    }
};