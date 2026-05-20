const { Queue } = require("bullmq");
const connection = require("../redisConnection");

const evaluationQueue = new Queue("evaluationQueue", {
  connection
});

module.exports = evaluationQueue;