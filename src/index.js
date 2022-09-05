import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";
import {MongoClient, ObjectId} from "mongodb";

dotenv.config();

// express.json()
const server=express();
server.use(express.json());
server.use(cors());

// calling mongo
const mongoClient= new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(()=>{
    db=mongoClient.db('bate_papo_uol')
})

// templates
const userSchema = joi.object({
    name: joi.string().min(1).trim().required(),
  });


// get and post APIs
server.post('/participants',async (req,res)=>{
    const user_profile=req.body;
    const validation = userSchema.validate(req.body, {
        abortEarly: false,
    });

    try {
        if (validation.error) {
            res.status(422).send(validation.error.details);
            return;
        }

        const user=await db.collection("participants").find().toArray();
        user.find((user_val)=> {
            if (user_val.name===user_profile.name){
                res.sendStatus(409);
                return;
            }
        })
        
        await db.collection("participants").insertOne({
            name:user_profile.name,
            lastStatus: Date.now()
        })

        await db.collection("message").insertOne({
            from: user_profile.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format("HH:MM:ss")
        })
        
		res.sendStatus(201);

	} catch (error) {
	  res.sendStatus(500);
	}
});

server.listen(5000,function(){console.log('port 5000')});