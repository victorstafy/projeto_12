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

        await db.collection("messages").insertOne({
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
        console.log('ola') 
        const participants = await db.collection("participants").find().toArray();

        const signed_user= participants.find((value) => value.name === current_user);

        console.log(signed_user)
        if (!signed_user){
            res.sendStatus(422);
            return;
        }

        await db.collection("messages").insertOne({
            from: current_user, to: user_msg.to, text: user_msg.text, type: user_msg.type, time: dayjs().format("HH:MM:ss")
        })

        res.sendStatus(201);
    }
    catch{
        res.sendStatus(422);
    }
})

server.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const current_user = req.headers.user
  
    try {
      const msg = await db.collection("messages").find().toArray();
  
      const allowed_msg = [];
      msg.filter((value, i) => {
        if (
            value.type === "message" || value.type === "status" ||
          (value.type === "private_message" && value.from === current_user) || value.to === current_user     
        ) {
            allowed_msg.push(value);
        }
      });
      res.send(allowed_msg.slice(-limit));
    } catch {
      res.sendStatus(500);
    }
});

server.post('/status', async (req,res)=>{
    const current_user = req.headers.user;
    
    try {

        const signed_user= await db.collection("participants").findOne({
            name:current_user,
        })
        
        if (!signed_user){
            res.sendStatus(404);
            return;
        }
        
        await db.collection("participants").updateOne(
        {lastStatus: signed_user.lastStatus},
        { $set: { lastStatus: Date.now() } }
        );

        setInterval( async ()=>{
            const participants = await db.collection("participants").find().toArray();
            const non_active_participants= participants.filter((value)=>
                (value.lastStatus<Date.now()-10000)
            )
            non_active_participants.map(async (participant)=>{
                
                await db.collection("participants").deleteOne({lastStatus: participant.lastStatus,});
                await db.collection("messages").insertOne({
                from: participant.name,
                to: "Todos",
                text: "sai na sala...",
                type: "status",
                time: dayjs().format("HH:MM:ss"),
                })
            })
            
        },10000)
        
        res.sendStatus(200);
    }
    catch {
        res.sendStatus(500);
    }
})

// server.delete('/status', async (req, res) => {

// });


server.listen(5000,function(){console.log('port 5000')});