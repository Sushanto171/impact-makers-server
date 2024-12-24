require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://login-signup-form-auth.web.app",
      "https://login-signup-form-auth.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(cookieParser());
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

    // =========================JWT===================================
    // 1.generate token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "20min",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          secure: process.env.NODE_ENV === "production",
        })
        .json({
          message: "token generate success",
        });
    });

    //2. verify token
    const verifyToken = async (req, res, next) => {
      try {
        const token = req.cookies?.token;

        if (!token) {
          res.status(401).send("unAuthorized: no token provided");
          return;
        }
        jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
          if (error) {
            res
              .status(403)
              .send({ message: "Forbidden: Invalid or expired token" });
            return;
          }
          req.user = decoded.email;

          next();
        });
      } catch (error) {
        req.status(500).send({ message: "internal server error" });
      }
    };

    // ______________________________________________________________________________________________________\\
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
      } catch (error) {
        res.status(500).json({ message: "Internal sever error" });
      }
    });

    // 6. get post by user email
    app.get("/volunteers-posts/:email", verifyToken, async (req, res) => {
      try {
        // 1. verify user by
        const user = req.user;
        const email = req.params.email;
        if (user !== email) {
          res.status(403).send({ message: "Forbidden: unAuthorized user!" });
          return;
        }

        const query = { organizer_email: email };
        const result = await volunteerPostsCollection.find(query).toArray();
        res.status(200).json({
          success: true,
          message: "All post fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal sever error" });
      }
    });

    // 7. Update post
    app.patch("/update-post/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const data = req.body;
        const update = { $set: data };
        const result = await volunteerPostsCollection.updateOne(
          { _id: new ObjectId(id) },
          update
        );
        res.status(200).json({
          success: true,
          message: "Post updated success",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal sever error" });
      }
    });

    // 8. delete post
    app.delete("/delete-post/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await volunteerPostsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.status(200).json({
          success: true,
          message: "Post delete success",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal sever error" });
      }
    });

    // 9. get volunteer request data by user email
    app.get("/volunteer-request/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await volunteerRequestCollection
          .find({ volunteer_email: email })
          .toArray();
        res.status(200).json({
          success: true,
          message: "All post fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal sever error" });
      }
    });

    // 10. volunteer req. cancel
    app.delete("/volunteer-req-cancel/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await volunteerRequestCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.status(200).json({
          success: true,
          message: "Successfully requested cancel",
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
