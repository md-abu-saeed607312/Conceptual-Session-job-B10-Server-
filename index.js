const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const port = process.env.PORT || 9000
const app = express()


// Middleware 
app.use(cors())
app.use(express.json())

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@main.yolij.mongodb.net/?retryWrites=true&w=majority&appName=Main`
const uri = `mongodb+srv://${process.env.ADMIN}:${process.env.PASSWORD}@cluster0.dblis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    const db=client.db("solo-db")
    const  jobaCollection=db.collection('jobs')


    // save to JobData in Database 
    app.post("/add-job",async(req,res)=>{
      const jobData=req.body
      // console.log(jobData);
      const result=await jobaCollection.insertOne(jobData)
      res.send(result)
    })

    // get all jobs Data 
    app.get("/jobs",async(req,res)=>{
      const result=await jobaCollection.find().toArray()
      res.send(result)
    })

    // get all jobs posted by a specific user /my posted data
    app.get("/jobs/:email",async(req,res)=>{
      const email=req.params.email
      const query={"buyer.email":email}
      const result=await jobaCollection.find(query).toArray()
      res.send(result)

    })

    // delete function my posted data
    app.delete('/job/:id',async(req,res)=>{
      const id=req.params.id
      const query={_id:new ObjectId(id)}
      const result= await jobaCollection.deleteOne(query)
      res.send(result)
    })

    // single get job Data Id From DB (Up Datew)
    app.get('/job/:id',async(req,res)=>{
      const id=req.params.id
      const query={_id:new ObjectId(id)}
      const result=await jobaCollection.findOne(query)
      res.send(result)
    })

    app.put("/update-job/:id",async(req,res)=>{
      const id=req.params.id
      const jobData=req.body
      const update={
        $set:jobData,
      }
      const query={_id:new ObjectId(id)}
      const options={upsert:true}
      // console.log(jobData);
      const result=await jobaCollection.updateOne(query,update,options)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
