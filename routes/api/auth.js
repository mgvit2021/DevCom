const router = require('express').Router();
const User = require('../../models/Users');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
// @route      GET api/auth
// @desc       Test Route
// @access     Protected
router.get('/', auth, async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});

// @route      POST api/auth
// @desc       Authenticate user and get Token!
// @access     Public
router.post(
  '/',
  [
    check('email', 'Enter a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    // check for errors
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    try {
      // Check if user exists
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          errors: [{ msg: 'Invalid credentials' }],
        });
      }

      //Match password!
      let isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          errors: [{ msg: 'Invalid credentials' }],
        });
      }

      //Return JWT
      let payload = {
        user: {
          id: user.id,
        },
      };
      let key = config.get('jwtSecret');
      jwt.sign(payload, key, { expiresIn: 36000 }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });

      //res.send('User registered!');
    } catch (err) {
      console.error(err);
      res.status(500).send('Oops, Server Error!');
    }
  }
);

module.exports = router;
