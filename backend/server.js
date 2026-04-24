

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const modelRoutes = require("./routes/modelRoutes"); 


const app = express();
app.use(cors({
  origin: "http://localhost:5173", // frontend URLs
  credentials: true,               
  methods: ["GET", "POST", "PUT", "PATCH" ,"DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


app.use(bodyParser.json());

app.use(express.json());
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const scenarioRoutes = require("./routes/scenarioRoutes");

app.use("", modelRoutes);
app.use("/api/scenarios", scenarioRoutes);

app.listen(5000, () => {
  console.log("Listening on port 5000");
});
