

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const modelRoutes = require("./routes/modelRoutes"); 
const helmet = require("helmet");


const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,               
  methods: ["GET", "POST", "PUT", "PATCH" ,"DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


app.use(bodyParser.json());

app.use(express.json());
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
const scenarioRoutes = require("./routes/scenarioRoutes");

app.use("", modelRoutes);
app.use("/api/scenarios", scenarioRoutes);

app.listen(process.env.BACKEND_PORT, () => {
  console.log(`Listening on port ${process.env.BACKEND_PORT}`);
});
