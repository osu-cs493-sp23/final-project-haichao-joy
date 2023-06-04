const express = require("express");
const morgan = require("morgan");

const app = express();
const PORT = 8000 || process.env.PORT;

const api = require("./api");
app.use(morgan("dev"));
app.use(express.json());

app.use("/", api);

app.use("*", function (req, res, next) {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist",
  });
});

app.use("*", function (err, req, res, next) {
  console.error("== Error:", err);
  res.status(500).send({
    err: "Server error.  Please try again later.",
  });
});

app.listen(PORT, () => {
  console.log(`== Server is running on port ${PORT}`);
});
