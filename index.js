const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
// middelwer
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_pass}@cluster0.cazjtjr.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    const database = client.db("assignment12");
    const usersCullectionDB = database.collection("users");
    const classesCullectionDB = database.collection("classes");
    // routes
    app.get("/classes", async (req, res) => {
      const query = { status: "approved" };
      const resault = await classesCullectionDB.find(query).toArray();
      res.send(resault);
    });
    app.get("/classes/all", async (req, res) => {
      const resault = await classesCullectionDB.find().toArray();
      res.send(resault);
    });
    app.patch("/classes/status/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      console.log(data, 123);
      const update = {
        $set: data,
      };
      const query = { _id: new ObjectId(id) };
      // const resault = await classesCullectionDB.updateOne(query, update);
      res.send(resault);
    });
    app.post("/classes", async (req, res) => {
      const data = req.body;
      const resault = await classesCullectionDB.insertOne(data);
      res.send(resault);
    });
    app.get("/role/", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const projection = { projection: { rol: 1 } };
      const resault = await usersCullectionDB.findOne(query, projection);
      // console.log(resault, email);
      res.send(resault);
    });
    app.patch("/makeinstructor/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const update = {
        $set: data,
      };
      const query = { _id: new ObjectId(id) };
      const resault = await usersCullectionDB.updateOne(query, update);
      res.send(resault);
    });
    app.get("/users", async (req, res) => {
      const resault = await usersCullectionDB.find().toArray();
      res.send(resault);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCullectionDB.findOne(query);
      if (existingUser) {
        return res.send({ massege: "this is our old user" });
      }
      const resault = await usersCullectionDB.insertOne(user);
      res.send(resault);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// ------------------------
app.get("/", (req, res) => {
  res.send(`summer is running ....`);
});
app.listen(port, () => {
  console.log(`the server is running on port ${port}`);
});
