const router = require('express').Router();
const User = require('../../models/Users');
const Profile = require('../../models/Profiles');
const Post = require('../../models/Posts');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route      POST api/posts
// @desc       Create new Post!
// @access     Private
router.post(
  '/',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select('-password');
      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });
      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error!');
    }
  }
);

// @route      GET api/posts
// @desc       Get all Posts!
// @access     Private
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});

// @route      GET api/posts/:id
// @desc       Get a post by id
// @access     Private
router.get('/:id', auth, async (req, res) => {
  try {
    const posts = await Post.findById(req.params.id);
    if (!posts) {
      return res.status(404).json({ msg: 'No posts found' });
    }
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'No posts found' });
    }
    res.status(500).send('Server error!');
  }
});

// @route      DELETE api/posts/:id
// @desc       DELETE a post
// @access     Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: 'No posts found' });
    }
    //check bec user can delete only its own posts!
    if (post.user.toString() !== req.user.id) {
      return res.status(401).send({ msg: 'User not authorized!' });
    }
    await post.remove();
    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'No posts found' });
    }
    res.status(500).send('Server error!');
  }
});

// @route      PUT api/posts/like/:id
// @desc       Like a post
// @access     Private
router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: 'No posts found' });
    }
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    ) {
      return res.status(400).json({ msg: 'Post already liked' });
    }

    post.likes.push({ user: req.user.id });

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});

// @route      PUT api/posts/unlike/:id
// @desc       Dislike a post
// @access     Private
router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: 'No posts found' });
    }
    // if post is not liked by the user already
    let liked = post.likes.find((like) => like.user.toString() === req.user.id);
    if (!liked) {
      return res.status(400).json({ msg: 'Post not been liked yet' });
    }
    let index = post.likes.indexOf(liked);
    post.likes.splice(index, 1);

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});

/*-------------------------     COMMENTS     ---------------------------- */

// @route      POST api/posts/comment/:id
// @desc       Comment on a post
// @access     Private
router.post(
  '/comment/:id',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(errors.array());
    }
    try {
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ msg: 'No posts found' });
      }
      const user = await User.findById(req.user.id).select('-password');
      // if post is not liked by the user already
      let newComment = {
        user: req.user.id,
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
      };
      post.comments.unshift(newComment);
      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error!');
    }
  }
);

// @route      POST api/posts/comment/:id/:comment_id
// @desc       Delete comment from a post
// @access     Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: 'No posts found' });
    }
    const comment = post.comments.find(
      (comm) => comm.id === req.params.comment_id
    );
    // if no comment
    if (!comment) {
      return res.status(404).json({ msg: 'Comment does not exists' });
    }
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    let index = post.comments.indexOf(comment);
    post.comments.splice(index, 1);
    await post.save();
    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error!');
  }
});
module.exports = router;
