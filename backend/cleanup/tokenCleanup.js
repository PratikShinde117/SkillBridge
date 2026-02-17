const cron = require("node-cron");
const pool = require("./db"); 


cron.schedule("0 0 * * *", async () => {
  try {
    const result = await pool.query(
      "DELETE FROM token_blacklist WHERE expires_at < NOW()"
    );
    console.log(`${result.rowCount} expired tokens removed from blacklist`);
  } catch (err) {
    console.error("Error cleaning up blacklisted tokens:", err.message);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" 
});

console.log("Token cleanup cron job scheduled to run every 24 hours");
