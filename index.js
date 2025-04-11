const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cookieParser=require('cookie-parser')

const port = process.env.PORT || 9000;
const app = express();

const corseOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corseOptions));
app.use(express.json());
app.use(cookieParser())

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@main.yolij.mongodb.net/?retryWrites=true&w=majority&appName=Main`
const uri = `mongodb+srv://${process.env.ADMIN}:${process.env.PASSWORD}@cluster0.dblis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("solo-db");
    const jobaCollection = db.collection("jobs");
    const bidCollection = db.collection("bid-jobs");

    // generate jwt
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      // create Token
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "365d",
      });
      console.log(token);
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true in production for HTTPS
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      });
      res.send({ success: true });
    });

    // logOut jwt Token
    app.get('/logOut',async (req,res)=>{
      res.clearCookie('token',{
        maxAge:0,
        secure:false
      }).send({success:true})
    })

    // jwt.verify token 
    // const verifyToken=(req,res,next)=>{
    //   const token=req.cookies?.token
    //   if(token)return res.status(401).send({message:'unauthorized access'})
    //   jwt.verify(token,process.env.SECRET_KEY,(err,decoded)=>{
    //   if(err){
    //     return res.status(401).send({message:'unauthorized access'})
    //   }
    //   req.user=decoded
    
    //   })
    //   next()

    // }

    const verifyToken = (req, res, next) => {
      const token = req.cookies?.token;
    
      // ❌ যদি token না থাকে, তখনই unauthorized
      if (!token) {
        return res.status(401).send({ message: 'unauthorized access - no token' });
      }
    
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access - invalid token' });
        }
    
        req.user = decoded; // ✅ ডিকোড করা ইনফো রিকোয়েস্টে রাখি
        next(); // ✅ এখন ঠিকঠাক পরের middleware বা রাউটে যাবে
      });
    };
    


    // save to JobData in Database
    app.post("/add-job", async (req, res) => {
      const jobData = req.body;
      // console.log(jobData);
      const result = await jobaCollection.insertOne(jobData);
      res.send(result);
    });

    // get all jobs Data
    app.get("/jobs", async (req, res) => {
      const result = await jobaCollection.find().toArray();
      res.send(result);
    });

    // get all jobs posted by a specific user /my posted data
    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "buyer.email": email };
      const result = await jobaCollection.find(query).toArray();
      res.send(result);
    });

    // delete function my posted data
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobaCollection.deleteOne(query);
      res.send(result);
    });

    // single get job Data Id From DB (Up Date)
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobaCollection.findOne(query);
      res.send(result);
    });

    // save a Job data in db
    app.put("/update-job/:id", async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const update = {
        $set: jobData,
      };
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      // console.log(jobData);
      const result = await jobaCollection.updateOne(query, update, options);
      res.send(result);
    });

    // ---------------------------------save a bid data in db-------------------------------
    app.post("/add-bid", async (req, res) => {
      const bidData = req.body;

      //0.if  a user place a bid already in the job
      const query = { email: bidData.email, jobid: bidData.jobid };
      const alredyExist = await bidCollection.findOne(query);
      console.log("if alredy exist----->", alredyExist);
      if (alredyExist)
        return res
          .status(400)
          .send("you have already placed a bid on this jobs");
      //1.save data in bids collection
      const result = await bidCollection.insertOne(bidData);
      //2.increse bid count in jobs collection
      const filter = { _id: new ObjectId(bidData.jobid) };
      const update = {
        $inc: { bid_count: 1 },
      };
      const updatebidCount = await jobaCollection.updateOne(filter, update);
      console.log(updatebidCount);
      res.send(result);
    });

    // get all bids for a specific user
    app.get("/bid-data/:email",verifyToken, async (req, res) => {
      const decodedEmail=req.user?.email
      const isBuyer = req.query.buyer;
      const email = req.params.email;
        
      if(decodedEmail !==email) return res.status(401).send({message:'unauthorixed access'})

      let query = {};
      if (isBuyer) {
        query.buyer = email;
      } else {
        query.email = email;
      }
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    // Bid request specific email

    // app.get('/bid-request/:email',async(req,res)=>{
    //   const email=req.params.email
    //   const query={buyer:email}
    //   const result= await bidCollection.find(query).toArray()
    //   res.send(result)
    // })

    // update bid Status
    app.patch("/bid-status-update/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: { status },
      };
      const result = await bidCollection.updateOne(filter, update);
      res.send(result);
    });

    // search ,filter for get all jobs api
    app.get("/all-jobs", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;

      let options = {};

      if (sort) options = { sort: { dateLine: sort === "asc" ? 1 : -1 } };

      let query = {
        title: {
          $regex: search,
          $options: "i",
        },
      };
      if (filter) query.category = filter;
      const result = await jobaCollection.find(query, options).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
