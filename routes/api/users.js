const express = require('express');
const router = express.Router();
const User = require('../../models/Users');
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

// @route      GET api/users
// @desc       Register user
// @access     Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Enter a valid email').isEmail(),
    check('password', 'Password should have atleast 6 characters').isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    // check for errors
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;
    try {
      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({
          errors: [{ msg: 'User already exists' }],
        });
      }
      //Get users gravatar
      let avatar = gravatar.url(email, {
        s: '200',
        r: 'pg',
        d: 'mm',
      });
      //create user
      user = new User({
        name,
        email,
        avatar,
        password,
      });
      //removing whitespaces
      user.name.trim();
      user.email.trim();
      //Encrypt Password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      //save user to database
      await user.save();

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
