require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(
  cors({
    origin: "http://localhost:5173",
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
    const volunteerRequestCollection = dbName.collection("volunteerRequest");

    //1. get all post
    app.get("/volunteers-posts", async (req, res) => {
      try {
        const { condition, query, currentPage, size } = req.query;
        // 1. query
        let options = {};
        if (query) {
          options = { post_title: { $regex: query, $options: "i" } };
          const result = await volunteerPostsCollection.find(options).toArray();
          res.status(200).json({
            success: true,
            message: "Search on title success",
            data: result,
          });

          return;
        }
        // 2. home route
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
        // 3.pagination
        const page = parseInt(currentPage) - 1;

        const result = await volunteerPostsCollection
          .find(options)
          .skip(page * parseInt(size))
          .limit(parseInt(size))
          .toArray();
        res.status(200).json({
          success: true,
          message: "All post fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal sever error" });
        console.log(error);
      }
    });

    // 2. get post by id
    app.get("/volunteer-post/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await volunteerPostsCollection.findOne(query);
        res.status(200).json({
          success: true,
          message: "Post fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal sever error" });
      }
    });

    // 3. add volunteer req data in db
    app.post("/volunteer-request", async (req, res) => {
      try {
        const reqData = req.body;

        // 1. validate

        // 2. add data
        const result = await volunteerRequestCollection.insertOne(reqData);

        // 3. update
        const doc = { $inc: { volunteers_needed: -1 } };
        const update = await volunteerPostsCollection.updateOne(
          {
            _id: new ObjectId(reqData.job_id),
          },
          doc
        );

        res.status(200).json({
          success: true,
          message: "All post fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal sever error" });
      }
    });

    // 4. count data on the database
    app.get("/count", async (req, res) => {
      const result = await volunteerPostsCollection.estimatedDocumentCount();
      res.send({ count: result });
    });

    // 5.  Add post on the volunteersPostsCollection
    app.post("/volunteers-posts", async (req, res) => {
      try {
        const data = req.body;
        const result = await volunteerPostsCollection.insertOne(data);
        res.status(200).json({
          success: true,
          message: "All post fetching success",
          data: result,
        });
        console.log(result);
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
