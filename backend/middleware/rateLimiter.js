// const rateLimit = require("express-rate-limit");
// const { ipKeyGenerator } = require("express-rate-limit");

// //  Common key generator
// const getUserKey = (req) => {
//   // student
//   if (req.user && req.user.roll_no) {
//     return `student_${req.user.roll_no}`;
//   }

//   // faculty
//   if (req.faculty && (req.faculty.facid || req.faculty.id)) {
//     return `faculty_${req.faculty.facid || req.faculty.id}`;
//   }

 
//   return req.student?.roll_no ||
//        req.faculty?.facid ||
//        ipKeyGenerator(req);
// };

// //  Login limiter (still IP-based because user not logged in yet)
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 5,
//   message: "Too many login attempts, try again later",
//   keyGenerator: (req) => req.ip
// });

// //  Evaluation limiter (user-based)
// const submitLimiter = rateLimit({
//   windowMs: 1 * 60 * 1000,
//   max: 3,
//   message: "Too many submissions, slow down",
//   keyGenerator: getUserKey
// });

// //  AI limiter (user-based)
// const aiLimiter = rateLimit({
//   windowMs: 1 * 60 * 1000,
//   max: 5,
//   message: "Too many AI requests",
//   keyGenerator: getUserKey
// });

// module.exports = {
//   loginLimiter,
//   submitLimiter,
//   aiLimiter
// };

const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");


// ==============================
// Common user-based key generator
// ==============================
const getUserKey = (req) => {

  // Student logged in
  if (req.user?.roll_no) {
    return `student_${req.user.roll_no}`;
  }

  // Faculty/Admin logged in
  if (req.faculty?.facid || req.faculty?.id) {
    return `faculty_${req.faculty.facid || req.faculty.id}`;
  }

  // Fallback → SAFE IPv4/IPv6 IP handling
  return ipKeyGenerator(req);
};


// ==============================
// Login limiter
// ==============================
// Login is BEFORE authentication,
// so use IP safely.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,

  message: {
    error: "Too many login attempts, try again later"
  },

  keyGenerator: (req) => {
    return ipKeyGenerator(req);
  },

  standardHeaders: true,
  legacyHeaders: false,
});


// ==============================
// Test submission limiter
// ==============================
const submitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 3,

  message: {
    error: "Too many submissions, slow down"
  },

  keyGenerator: getUserKey,

  standardHeaders: true,
  legacyHeaders: false,
});


// ==============================
// AI generation limiter
// ==============================
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 5,

  message: {
    error: "Too many AI requests"
  },

  keyGenerator: getUserKey,

  standardHeaders: true,
  legacyHeaders: false,
});


module.exports = {
  loginLimiter,
  submitLimiter,
  aiLimiter
};