const router = require('express').Router();
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profiles');
const User = require('../../models/Users');
const { check, validationResult } = require('express-validator');
const config = require('config');
const request = require('request');
// @route      GET api/profile/me
// @desc       Get current user profile
// @access     Private
router.get('/me', auth, async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user.id }).populate(
      'user',
      ['name', 'avatar']
    );
    if (!profile) {
      return res.status(400).json({
        msg: 'There is no profile for this user!',
      });
    }
    res.json({ profile });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});

// @route      POST api/profile
// @desc       Create/Update user profile
// @access     Private
router.post(
  '/',
  [
    auth,
    [
      check('status', 'Status is required!').not().isEmpty(),
      check('skills', 'Skills is required!').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      linkedin,
      instagram,
      facebook,
      twitter,
    } = req.body;

    //set profile fields
    const profileFields = {};
    profileFields.user = req.user.id;
    if (company) profileFields.company = company.trim();
    if (website) profileFields.website = website;
    if (location) profileFields.location = location.trim();
    if (bio) profileFields.bio = bio.trim();
    if (status) profileFields.status = status.trim();
    if (githubusername) profileFields.githubusername = githubusername;

    if (skills) {
      profileFields.skills = skills.split(',').map((skill) => skill.trim());
    }
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (instagram) profileFields.social.instagram = instagram;
    if (facebook) profileFields.social.facebook = facebook;
    if (twitter) profileFields.social.twitter = twitter;

    try {
      let profile = await Profile.findOne({ user: req.user.id });
      if (profile) {
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true } //return the updated document
        );
      }
      //Create if not there already
      else {
        profile = new Profile(profileFields);
      }

      await profile.save();
      res.status(200).json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error!');
    }
  }
);

// @route      Get api/profile
// @desc       Get all profiles
// @access     Public

router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});

// @route      Get api/profile/user/:user_id
// @desc       Get user's profile by id
// @access     Public
router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate('user', ['name', 'avatar']);

    //if profile exists
    if (!profile) {
      return res.status(400).json({
        msg: 'No profile found for this user!',
      });
    }
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({
        msg: 'No profile found for this user!',
      });
    }
    res.status(500).send('Server error!');
  }
});

// @route      DELETE api/profile
// @desc       Delete profile, user & posts
// @access     Private
router.delete('/', auth, async (req, res) => {
  try {
    //  @todo ->  delete user posts
    // delete user profile;
    await Profile.findOneAndDelete({ user: req.user.id });

    //delete user
    await User.findOneAndDelete({ _id: req.user.id });
    //if profile exists
    res.status(200).send({ msg: 'Profile deleted!' });
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({
        msg: 'No profile found for this user!',
      });
    }
    res.status(500).send('Server error!');
  }
});

// @route      PUT api/profile/experience
// @desc       Update user's experience
// @access     Private

router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('company', 'Company is required').not().isEmpty(),
      check('location', 'Location is required').not().isEmpty(),
      check('from', 'From is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    let errors = validationResult(req.body);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    } = req.body;
    let newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    };
    try {
      let profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(newExp);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error!');
    }
  }
);

// @route      DELETE api/profile/experience/:exp_id
// @desc       DELETE user's experience
// @access     Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user.id });

    //find index of experience
    const removeIndex = profile.experience
      .map((exp) => exp.id)
      .indexOf(req.params.exp_id);

    profile.experience.splice(removeIndex, 1);

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});

// @route      PUT api/profile/education
// @desc       Update user's education
// @access     Private
router.put(
  '/education',
  [
    auth,
    [
      check('school', 'Title is required').not().isEmpty(),
      check('degree', 'Company is required').not().isEmpty(),
      check('fieldofstudy', 'Location is required').not().isEmpty(),
      check('from', 'From is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    let errors = validationResult(req.body);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    } = req.body;
    let newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    };
    try {
      let profile = await Profile.findOne({ user: req.user.id });

      profile.education.unshift(newEdu);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error!');
    }
  }
);

// @route      DELETE api/profile/education/:edu_id
// @desc       DELETE user's education
// @access     Private
router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user.id });

    //find index of experience
    const removeIndex = profile.education
      .map((edu) => edu.id)
      .indexOf(req.params.edu_id);

    profile.education.splice(removeIndex, 1);

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});

//GET GITHUB REPOSITORIES
router.get('/github/:username', (req, res) => {
  try {
    const options = {
      uri: encodeURI(
        `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
      ),
      method: 'GET',
      headers: {
        'user-agent': 'node.js',
        Authorization: `token ${config.get('githubToken')}`,
      },
    };
    request(options, (error, response, body) => {
      if (error) throw err;

      if (response.statusCode !== 200) {
        return res.status(404).json({ msg: 'Profile not found' });
      }
      res.json(JSON.parse(body));
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});

module.exports = router;
