require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(
  cors({
    origin: "http://localhost:5174",
    credentials: true,
  })
);
app.use(express.json());

const uri = process.env.DB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  // try {
  //   const result = await volunteerPostsCollection.find().toArray();
  //   res.status(200).json({
  //     success: true,
  //     message: "All post fetching success",
  //     data: result,
  //   });
  // } catch (error) {
  //   res.status(500).json({ message: "Internal sever error" });
  // }
  try {
    // create db
    const dbName = client.db("ImpactMakers");
    const volunteerPostsCollection = dbName.collection("volunteerPosts");

    app.get("/volunteers-posts", async (req, res) => {
      try {
        const { condition } = req.query;
        let query;
        if (condition === "home") {
          const result = await volunteerPostsCollection
            .find({})
            .sort({ deadline: 1 })
            .limit(6)
            .toArray();
          res.status(200).json({
            success: true,
            message: "All post fetching success",
            data: result,
          });
          return;
        }
        const result = await volunteerPostsCollection.find().toArray();
        res.status(200).json({
          success: true,
          message: "All post fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal sever error" });
      }
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Impact Makers running.....");
});

app.listen(port, () => {
  console.log(`Impact Makers running on port- ${port}`);
});
