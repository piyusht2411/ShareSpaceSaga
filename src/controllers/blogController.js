const Blog = require('../models/Blog');
const User = require('../models/User');

const createBlog = async (req, res) => {
    try {
        const userId = req.userId;
        const { title, content, imageUrl } = req.body;
        const newblog = new Blog({ title, content, author: userId, image: imageUrl });
        const savedBlog = await newblog.save();
        const user = await User.findById(userId);
        user.blogs.push(savedBlog._id);
        await user.save();
        res.status(201).json({ message: "Blog created successfully!", blog: savedBlog });
    } catch (err) {
        res.status(500).json({ message: 'Error creating blog', error: err.message });
    }
}

const editBlog = async (req, res) => {
    try {
        const { title, content, imageUrl } = req.body;
        const { blogId } = req.params;
        const userId = req.userId;

        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        if (blog.author.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to edit this blog' });
        }
        if (title) blog.title = title;
        if (content) blog.content = content;
        if (imageUrl) blog.image = imageUrl;
        await blog.save();

        res.status(201).json({ message: "Blog updated successfully!", blog: blog });

    } catch (err) {
        res.status(500).json({ message: 'Error updating blog', error: err.message });
    }
}

const deleteBlog = async (req, res) => {

    try {
        const { blogId } = req.params;
        const userId = req.userId;
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        if (blog.author.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this blog' });
        }

        await Blog.findByIdAndDelete(blogId);
        const user = await User.findById(userId);
        user.blogs = user.blogs.filter(blog => blog.toString() !== blogId);
        await user.save();
        res.status(201).json({ message: "Blog deleted successfully!", blogId: blogId });

    } catch (err) {
        res.status(500).json({ message: 'Error deleting blog', error: err.message });
    }

}

const getAllBlogs = async (req, res) => {
    try {
        const userId = req.userId;
        const pageNumber = parseInt(req.query.pageNumber) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const skip = (pageNumber - 1) * pageSize;

        const blogs = await Blog.find({ author: userId })
            .skip(skip)
            .limit(pageSize)
            .populate('author', 'name color image');

        res.status(200).json({ blogs });
    } catch (err) {
        res.status(500).json({ message: 'Error getting blogs', error: err.message });
    }
}

const getBlog = async (req, res) => {
    try {
        const { blogId } = req.params;
        const userId = req.userId;

        const blog = await Blog.findById(blogId).populate('author', 'name color image');
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isLiked = user.likedBlogs.includes(blogId);
        const isDisliked = user.dislikedBlogs.includes(blogId);

        res.status(200).json({
            blog: blog.toObject(),
            isLiked,
            isDisliked
        });
    } catch (err) {
        res.status(500).json({ message: 'Error getting blog', error: err.message });
    }
}

const likeOrDislikeBlog = async (req, res) => {
    try {
        const { blogId, action } = req.params;
        const userId = req.userId;

        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (action === 'like') {
            if (user.dislikedBlogs.includes(blogId)) {
                blog.dislikeCount--;
                user.dislikedBlogs.pull(blogId);
            }
            if (!user.likedBlogs.includes(blogId)) {
                blog.likeCount++;
                user.likedBlogs.push(blogId);
            }
        } else if (action === 'dislike') {
            if (user.likedBlogs.includes(blogId)) {
                blog.likeCount--;
                user.likedBlogs.pull(blogId);
            }
            if (!user.dislikedBlogs.includes(blogId)) {
                blog.dislikeCount++;
                user.dislikedBlogs.push(blogId);
            }
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        await blog.save();
        await user.save();

        res.status(200).json({ message: 'Action performed successfully', blog });
    } catch (err) {
        res.status(500).json({ message: 'Error performing action', error: err.message });
    }
}



module.exports = {
    createBlog,
    editBlog,
    deleteBlog,
    getAllBlogs,
    getBlog,
    likeOrDislikeBlog
}