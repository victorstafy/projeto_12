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

const messagesSchema = joi.object({
    to: joi.string().min(1).trim().required(),
    text: joi.string().min(1).trim().required(),
    type: joi.valid("message", "private_message").required(),
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

server.get('/participants',async (req,res)=>{
    try{
        const participants= await db.collection("participants").find().toArray();
        res.send(participants);
    }
    catch{
        res.sendStatus(500);
    } 
})

server.post('/messages', async (req,res)=>{
    const user_msg=req.body;
    const validation = messagesSchema.validate(req.body, {
        abortEarly: false,
    });

    try{
        const current_user = req.headers.user;

        if (validation.error) {
            res.status(422).send(validation.error.details);
            return;
        }

        const participant = await db.collection("participants").find().toArray();
        console.log(participant)

        const signed_user= await db.collection("messages").findOne({
            from:current_user,
        })
        
        if (!signed_user){
            res.sendStatus(422);
            return;
        }

        await db.collection("message").insertOne({
            from: current_user, to: user_msg.to, text: user_msg.text, type: user_msg.type, time: dayjs().format("HH:MM:ss")
        })

        res.sendStatus(201);
    }
    catch{
        res.sendStatus(422);
    }
})




server.listen(5000,function(){console.log('port 5000')});