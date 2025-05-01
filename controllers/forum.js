import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";
import { ForumPost, Comment } from "../models/ForumPost.js";
import { Notification } from "../models/Notification.js";
import sanitizeHtml from "sanitize-html";

// Middleware to check if user is enrolled or tutor
const checkForumAccess = TryCatch(async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.userId.toString(); // Ensure userId is a string

  const course = await Courses.findById(courseId).populate("enrolledStudents Tutor");
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check enrollment using both course.enrolledStudents and user.enrolledCourses for consistency
  const isEnrolled =
    course.enrolledStudents.some((studentId) => studentId.toString() === userId) ||
    user.enrolledCourses.some((enrolledCourseId) => enrolledCourseId.toString() === courseId);
  const isTutor = course.Tutor && course.Tutor.toString() === userId;

  // Debug logging
  console.log(`Checking access for user ${userId} in course ${courseId}:`);
  console.log(`User enrolledCourses:`, user.enrolledCourses);
  console.log(`Course enrolledStudents:`, course.enrolledStudents);
  console.log(`Course Tutor:`, course.Tutor);
  console.log(`isEnrolled: ${isEnrolled}, isTutor: ${isTutor}`);

  if (!isEnrolled && !isTutor) {
    return res.status(403).json({
      message: "Access denied: You are not enrolled in this course or assigned as the tutor",
    });
  }

  req.course = course;
  req.user = user;
  next();
});

// Get all forum posts for a course
export const getForumPosts = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId } = req.params;
    const { search, author, sortBy = "createdAt", order = "desc" } = req.query;

    let query = { course: courseId };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }
    if (author) {
      const authorUser = await User.findOne({ username: author });
      if (!authorUser) {
        return res.status(404).json({ message: "Author not found" });
      }
      query.user = authorUser._id;
    }

    const sortOptions = {};
    if (sortBy === "reactions") {
      sortOptions["reactions.length"] = order === "desc" ? -1 : 1;
    } else {
      sortOptions[sortBy] = order === "desc" ? -1 : 1;
    }

    const posts = await ForumPost.find(query)
      .populate("user", "firstname lastname username role")
      .populate({
        path: "comments",
        populate: [
          { path: "user", select: "firstname lastname username role" },
          { path: "taggedUsers", select: "firstname lastname username" },
          { path: "reactions.user", select: "firstname lastname username" },
          {
            path: "replies",
            populate: [
              { path: "user", select: "firstname lastname username role" },
              { path: "taggedUsers", select: "firstname lastname username" },
              { path: "reactions.user", select: "firstname lastname username" },
            ],
          },
        ],
      })
      .sort(sortOptions);

    res.status(200).json({ success: true, posts });
  }),
];

// Create a new forum post
export const createForumPost = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId } = req.params;
    const { title, content, taggedUsernames } = req.body;
    const userId = req.userId;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "code"]),
      allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, a: ["href"] },
    });

    let taggedUsers = [];
    if (taggedUsernames && Array.isArray(taggedUsernames)) {
      taggedUsers = await User.find({
        username: { $in: taggedUsernames },
        $or: [
          { _id: req.course.Tutor },
          { _id: { $in: req.course.enrolledStudents } },
        ],
      }).select("_id");
    }

    const post = await ForumPost.create({
      course: courseId,
      user: userId,
      title,
      content: sanitizedContent,
      taggedUsers: taggedUsers.map((u) => u._id),
    });

    const populatedPost = await ForumPost.findById(post._id)
      .populate("user", "firstname lastname username role")
      .populate({
        path: "comments",
        populate: [
          { path: "user", select: "firstname lastname username role" },
          { path: "taggedUsers", select: "firstname lastname username" },
          { path: "reactions.user", select: "firstname lastname username" },
        ],
      });

    const recipients = [
      ...req.course.enrolledStudents.map((id) => id.toString()),
      req.course.Tutor?.toString(),
    ].filter((id) => id && id !== userId);

    const io = req.app.get("io");
    recipients.forEach((recipientId) => {
      io.to(recipientId).emit("newForumPost", {
        courseId,
        post: populatedPost,
        message: `New forum post in ${req.course.title}: "${title}" by ${req.user.firstname} ${req.user.lastname}`,
      });
    });

    taggedUsers.forEach((taggedUser) => {
      if (taggedUser._id.toString() !== userId) {
        Notification.create({
          recipient: taggedUser._id,
          message: `You were tagged in a forum post "${title}" by ${req.user.firstname} ${req.user.lastname} in ${req.course.title}`,
          courseId,
        });
        io.to(taggedUser._id.toString()).emit("newNotification", {
          message: `You were tagged in a forum post "${title}"`,
          courseId,
        });
      }
    });

    res.status(201).json({
      success: true,
      post: populatedPost,
      message: "Post created successfully",
    });
  }),
];

// Add a comment or reply to a forum post
export const addComment = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId, postId } = req.params;
    const { content, taggedUsernames, parentCommentId } = req.body;
    const userId = req.userId;

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["code"]),
      allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, a: ["href"] },
    });

    let taggedUsers = [];
    if (taggedUsernames && Array.isArray(taggedUsernames)) {
      taggedUsers = await User.find({
        username: { $in: taggedUsernames },
        $or: [
          { _id: req.course.Tutor },
          { _id: { $in: req.course.enrolledStudents } },
        ],
      }).select("_id");
    }

    const comment = await Comment.create({
      user: userId,
      content: sanitizedContent,
      taggedUsers: taggedUsers.map((u) => u._id),
    });

    let post;
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      parentComment.replies.push(comment._id);
      await parentComment.save();
      post = await ForumPost.findOne({ _id: postId, course: courseId });
    } else {
      post = await ForumPost.findOne({ _id: postId, course: courseId });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      post.comments.push(comment._id);
      post.updatedAt = new Date();
      await post.save();
    }

    const populatedComment = await Comment.findById(comment._id)
      .populate("user", "firstname lastname username role")
      .populate("taggedUsers", "firstname lastname username")
      .populate({
        path: "reactions.user",
        select: "firstname lastname username",
      });

    const populatedPost = await ForumPost.findById(postId)
      .populate("user", "firstname lastname username role")
      .populate({
        path: "comments",
        populate: [
          { path: "user", select: "firstname lastname username role" },
          { path: "taggedUsers", select: "firstname lastname username" },
          { path: "reactions.user", select: "firstname lastname username" },
          {
            path: "replies",
            populate: [
              { path: "user", select: "firstname lastname username role" },
              { path: "taggedUsers", select: "firstname lastname username" },
              { path: "reactions.user", select: "firstname lastname username" },
            ],
          },
        ],
      });

    const recipients = [
      ...req.course.enrolledStudents.map((id) => id.toString()),
      req.course.Tutor?.toString(),
    ].filter((id) => id && id !== userId && !taggedUsers.some((u) => u._id.toString() === id));

    const io = req.app.get("io");
    recipients.forEach((recipientId) => {
      io.to(recipientId).emit("newForumComment", {
        courseId,
        postId,
        post: populatedPost,
        message: `New comment on "${post.title}" by ${req.user.firstname} ${req.user.lastname} in ${req.course.title}`,
      });
    });

    taggedUsers.forEach((taggedUser) => {
      if (taggedUser._id.toString() !== userId) {
        Notification.create({
          recipient: taggedUser._id,
          message: `You were tagged in a comment by ${req.user.firstname} ${req.user.lastname} in ${req.course.title}`,
          courseId,
        });
        io.to(taggedUser._id.toString()).emit("newNotification", {
          message: `You were tagged in a comment in ${req.course.title}`,
          courseId,
        });
      }
    });

    res.status(200).json({
      success: true,
      comment: populatedComment,
      post: populatedPost,
      message: "Comment added successfully",
    });
  }),
];

// Add or remove a reaction to a post or comment
export const addReaction = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId, postId } = req.params;
    const { commentId, type } = req.body;
    const userId = req.userId;

    if (!["like", "upvote"].includes(type)) {
      return res.status(400).json({ message: "Invalid reaction type" });
    }

    let target;
    if (commentId) {
      target = await Comment.findById(commentId);
      if (!target) return res.status(404).json({ message: "Comment not found" });
    } else {
      target = await ForumPost.findOne({ _id: postId, course: courseId });
      if (!target) return res.status(404).json({ message: "Post not found" });
    }

    const existingReaction = target.reactions.find(
      (r) => r.user.toString() === userId
    );

    if (existingReaction) {
      if (existingReaction.type === type) {
        target.reactions = target.reactions.filter(
          (r) => r.user.toString() !== userId
        );
      } else {
        existingReaction.type = type;
      }
    } else {
      target.reactions.push({ user: userId, type });
    }

    await target.save();

    const populatedTarget = commentId
      ? await Comment.findById(commentId)
          .populate("user", "firstname lastname username role")
          .populate("taggedUsers", "firstname lastname username")
          .populate("reactions.user", "firstname lastname username")
      : await ForumPost.findById(postId)
          .populate("user", "firstname lastname username role")
          .populate({
            path: "comments",
            populate: [
              { path: "user", select: "firstname lastname username role" },
              { path: "taggedUsers", select: "firstname lastname username" },
              { path: "reactions.user", select: "firstname lastname username" },
              {
                path: "replies",
                populate: [
                  { path: "user", select: "firstname lastname username role" },
                  { path: "taggedUsers", select: "firstname lastname username" },
                  { path: "reactions.user", select: "firstname lastname username" },
                ],
              },
            ],
          });

    res.status(200).json({
      success: true,
      target: populatedTarget,
      message: "Reaction updated",
    });
  }),
];

// Get users for tagging autocomplete
export const getTaggableUsers = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId } = req.params;
    const course = await Courses.findById(courseId).populate(
      "enrolledStudents Tutor",
      "firstname lastname username"
    );

    const users = [
      ...(course.enrolledStudents || []),
      course.Tutor,
    ].filter((user) => user);

    res.status(200).json({ success: true, users });
  }),
];