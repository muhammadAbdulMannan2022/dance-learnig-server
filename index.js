const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.Stripe_k);
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
    const cartsCullectionDB = database.collection("carts");
    // routes
    app.get("/cart/:uId/:status", async (req, res) => {
      const uid = req.params.uId;
      const status = req.params.status === ":false" ? false : true;
      const query = {
        selectedBy: uid,
        isPayed: status,
      };
      // console.log(uid, status);
      const resault = await cartsCullectionDB.find(query).toArray();
      res.send(resault);
    });
    app.post("/carts/:id/:uid", async (req, res) => {
      const id = req.params.id;
      const uid = req.params.uid;
      const data = req.body;
      const alradyin = await cartsCullectionDB.findOne({
        classId: id,
        selectedBy: uid,
      });
      const price = await classesCullectionDB.findOne(
        { _id: new ObjectId(id) },
        { projection: { price: 1 } }
      );
      const finalData = { ...data, price: price.price };
      // console.log(price.price);
      if (alradyin) {
        // console.log(id, uid);
        return res.send({ massege: "alrady seclected" });
      }
      const resault = await cartsCullectionDB.insertOne(finalData);
      res.send(resault);
    });
    app.get("/classes", async (req, res) => {
      const query = { status: "approv" };
      const resault = await classesCullectionDB.find(query).toArray();
      res.send(resault);
    });
    app.get("/instructorclass", async (req, res) => {
      const email = req.query.email;
      const query = { instructorEmail: email };
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
      // console.log(data, 123);
      const update = {
        $set: data,
      };
      const query = { _id: new ObjectId(id) };
      const resault = await classesCullectionDB.updateOne(query, update);
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
      const projection = { projection: { rol: 1, email: 1 } };
      const resault = await usersCullectionDB.findOne(query, projection);
      // console.log(resault, email);
      res.send(resault);
    });
    app.get("/getinstructor", async (req, res) => {
      const query = { rol: "instructor" };
      const resault = await usersCullectionDB.find(query).toArray();
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
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const resault = await usersCullectionDB.findOne(query);
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
    // payment
    app.post("/create-payment-intent", async (req, res) => {
      const body = req.body;
      // const price = body.price * 100;
      const id = body.classToPayId;
      const email = body.userEmail;
      const user = await usersCullectionDB.findOne({ email: email });
      const cart = await cartsCullectionDB.findOne({
        classId: id,
        selectedBy: user._id.toString(),
      });
      let price = 0;
      if (cart) {
        price = Number(parseFloat(cart.price)).toFixed(2) * 100;
      } else {
        return res.send({ massege: "class not found in your entered id" });
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price,
        currency: "usd",
        payment_method_types: ["card"],
      });
      const theClass = await classesCullectionDB.findOne(
        { _id: new ObjectId(id) },
        { projection: { availableSeats: 1 } }
      );
      const decriseSeats = await parseFloat(
        Number(theClass.availableSeats) - 1
      );
      const update = await classesCullectionDB.updateOne(
        { _id: new ObjectId(id) },
        { $set: { availableSeats: decriseSeats.toString() } }
      );
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.patch("/updatepay", async (req, res) => {
      const id = req.body.classToPayId;
      const email = req.body.userEmail;
      const user = await usersCullectionDB.findOne({ email: email });
      const updateStatus = await cartsCullectionDB.updateOne(
        {
          classId: id,
          selectedBy: user._id.toString(),
        },
        { $set: { isPayed: true } }
      );
      res.send(updateStatus);
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
