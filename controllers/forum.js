import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";
import { ForumPost, Comment } from "../models/ForumPost.js";
import { Notification } from "../models/Notification.js";
import sanitizeHtml from "sanitize-html";

const checkForumAccess = TryCatch(async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.userId?.toString();

  if (!userId) {
    console.error("No userId found in request");
    return res.status(401).json({ message: "Authentication required: No user ID provided" });
  }

  const course = await Courses.findById(courseId).populate("enrolledStudents Tutor");
  if (!course) {
    console.error(`Course not found for ID: ${courseId}`);
    return res.status(404).json({ message: "Course not found" });
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error(`User not found for ID: ${userId}`);
    return res.status(404).json({ message: "User not found" });
  }

  // Debugging logs
  console.log("User ID:", userId);
  console.log("Course Tutor:", course.Tutor ? course.Tutor._id?.toString() : "No Tutor Assigned");
  console.log("Course Tutor Details:", course.Tutor ? {
    id: course.Tutor._id?.toString(),
    firstname: course.Tutor.firstname,
    lastname: course.Tutor.lastname,
    username: course.Tutor.username
  } : "None");

  const isEnrolled =
    course.enrolledStudents.some((studentId) => studentId.toString() === userId) ||
    user.enrolledCourses.some((enrolledCourseId) => enrolledCourseId.toString() === courseId);

  const isTutor = course.Tutor && course.Tutor._id?.toString() === userId;

  console.log("Is Enrolled:", isEnrolled);
  console.log("Is Tutor:", isTutor);

  if (!isEnrolled && !isTutor) {
    console.error(`Access denied for user ${userId} on course ${courseId}: Not enrolled or tutor`);
    return res.status(403).json({
      message: "Access denied: You are not enrolled in this course or assigned as the tutor",
    });
  }

  req.course = course;
  req.user = user;
  next();
});

// Utility function to populate comments and nested replies (unchanged)
const populateComments = (query) => {
  return query.populate({
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
          {
            path: "replies",
            populate: [
              { path: "user", select: "firstname lastname username role" },
              { path: "taggedUsers", select: "firstname lastname username" },
              { path: "reactions.user", select: "firstname lastname username" },
            ],
          },
        ],
      },
    ],
  });
};

// Remaining controller functions (unchanged for brevity, but verified for consistency)
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

    const posts = await populateComments(
      ForumPost.find(query)
        .populate("user", "firstname lastname username role")
        .populate("taggedUsers", "firstname lastname username")
    ).sort(sortOptions);

    res.status(200).json({ success: true, posts });
  }),
];

export const getForumPostById = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId, postId } = req.params;

    const post = await populateComments(
      ForumPost.findOne({ _id: postId, course: courseId })
        .populate("user", "firstname lastname username role")
        .populate("taggedUsers", "firstname lastname username")
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    console.log("Fetched Post by ID:", JSON.stringify(post, null, 2));

    res.status(200).json({ success: true, post });
  }),
];

export const getCommentById = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId, commentId } = req.params;

    const comment = await Comment.findById(commentId)
      .populate("user", "firstname lastname username role")
      .populate("taggedUsers", "firstname lastname username")
      .populate({
        path: "reactions.user",
        select: "firstname lastname username",
      })
      .populate({
        path: "replies",
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

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const post = await ForumPost.findOne({ course: courseId, "comments": commentId });
    if (!post) {
      return res.status(403).json({ message: "Comment does not belong to this course" });
    }

    res.status(200).json({ success: true, comment });
  }),
];

export const createForumPost = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId } = req.params;
    const { title, content, taggedUsernames } = req.body;
    const userId = req.userId;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const cleanContent = content.replace(/@(\w+)/g, '$1');
    const sanitizedContent = sanitizeHtml(cleanContent, {
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

    const populatedPost = await populateComments(
      ForumPost.findById(post._id)
        .populate("user", "firstname lastname username role")
        .populate("taggedUsers", "firstname lastname username")
    );

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

export const addComment = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId, postId } = req.params;
    const { content, taggedUsernames, parentCommentId } = req.body;
    const userId = req.userId;

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const cleanContent = content.replace(/@(\w+)/g, '$1');
    const sanitizedContent = sanitizeHtml(cleanContent, {
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

    const comment = new Comment({
      user: userId,
      content: sanitizedContent,
      taggedUsers: taggedUsers.map((u) => u._id),
    });
    await comment.save();

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

    const populatedPost = await populateComments(
      ForumPost.findById(postId)
        .populate("user", "firstname lastname username role")
        .populate("taggedUsers", "firstname lastname username")
    );

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

export const addReaction = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId, postId } = req.params;
    const { commentId, type } = req.body;
    const userId = req.userId;

    if (type !== "like") {
      return res.status(400).json({ message: "Invalid reaction type. Only 'like' is allowed." });
    }

    let target;
    if (commentId) {
      target = await Comment.findById(commentId);
      if (!target) return res.status(404).json({ message: "Comment not found" });
    } else {
      target = await ForumPost.findOne({ _id: postId, course: courseId });
      if (!target) return res.status(404).json({ message: "Post not found" });
    }

    const userIdStr = userId.toString();
    const hasLiked = target.reactions.some(
      (r) => r.user.toString() === userIdStr && r.type === "like"
    );

    if (hasLiked) {
      target.reactions = target.reactions.filter(
        (r) => !(r.user.toString() === userIdStr && r.type === "like")
      );
    } else {
      target.reactions = target.reactions.filter((r) => r.user.toString() !== userIdStr);
      target.reactions.push({ user: userId, type: "like" });
    }

    await target.save();

    const populatedTarget = commentId
      ? await Comment.findById(commentId)
          .populate("user", "firstname lastname username role")
          .populate("taggedUsers", "firstname lastname username")
          .populate("reactions.user", "firstname lastname username")
          .populate({
            path: "replies",
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
      : await populateComments(
          ForumPost.findById(postId)
            .populate("user", "firstname lastname username role")
            .populate("taggedUsers", "firstname lastname username")
        );

    res.status(200).json({
      success: true,
      target: populatedTarget,
      message: "Reaction updated",
    });
  }),
];

export const getTaggableUsers = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId } = req.params;
    const course = await Courses.findById(courseId);

    if (!course) {
      console.error(`Course not found for ID: ${courseId}`);
      return res.status(404).json({ message: "Course not found" });
    }

    const enrolledStudents = await User.find({ _id: { $in: course.enrolledStudents } }).select(
      "firstname lastname username email"
    );
    const tutor = course.Tutor
      ? await User.findById(course.Tutor).select("firstname lastname username email")
      : null;

    const users = [...enrolledStudents, tutor]
      .filter((user) => user)
      .map((user) => {
        const firstname = user.firstname || "Unknown";
        const lastname = user.lastname || "User";
        const username = user.username || user.email?.split("@")[0] || `${firstname.toLowerCase()}${lastname.toLowerCase()}`;
        return {
          _id: user._id,
          firstname,
          lastname,
          username,
        };
      });

    if (users.length === 0) {
      return res.status(200).json({ success: true, users, message: "No taggable users found for this course" });
    }

    res.status(200).json({ success: true, users });
  }),
];

export const deleteForumPost = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId, postId } = req.params;
    const userId = req.userId.toString().trim();

    const post = await ForumPost.findOne({ _id: postId, course: courseId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const postUserId = post.user.toString().trim();
    if (postUserId !== userId) {
      return res.status(403).json({ message: "You are not authorized to delete this post" });
    }

    await ForumPost.deleteOne({ _id: postId });

    const io = req.app.get("io");
    const recipients = [
      ...req.course.enrolledStudents.map((id) => id.toString()),
      req.course.Tutor?.toString(),
    ].filter((id) => id && id !== userId);

    recipients.forEach((recipientId) => {
      io.to(recipientId).emit("forumPostDeleted", {
        courseId,
        postId,
        message: `Forum post "${post.title}" was deleted by ${req.user.firstname} ${req.user.lastname}`,
      });
    });

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  }),
];

export const editForumPost = [
  checkForumAccess,
  TryCatch(async (req, res) => {
    const { courseId, postId } = req.params;
    const { title, content, taggedUsernames } = req.body;
    const userId = req.userId.toString().trim();

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const post = await ForumPost.findOne({ _id: postId, course: courseId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const postUserId = post.user.toString().trim();
    if (postUserId !== userId) {
      return res.status(403).json({ message: "You are not authorized to edit this post" });
    }

    const cleanContent = content.replace(/@(\w+)/g, '$1');
    const sanitizedContent = sanitizeHtml(cleanContent, {
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

    post.title = title;
    post.content = sanitizedContent;
    post.taggedUsers = taggedUsers.map((u) => u._id);
    post.updatedAt = new Date();
    await post.save();

    const populatedPost = await populateComments(
      ForumPost.findById(postId)
        .populate("user", "firstname lastname username role")
        .populate("taggedUsers", "firstname lastname username")
    );

    const io = req.app.get("io");
    const recipients = [
      ...req.course.enrolledStudents.map((id) => id.toString()),
      req.course.Tutor?.toString(),
    ].filter((id) => id && id !== userId);

    recipients.forEach((recipientId) => {
      io.to(recipientId).emit("forumPostUpdated", {
        courseId,
        post: populatedPost,
        message: `Forum post "${post.title}" was updated by ${req.user.firstname} ${req.user.lastname}`,
      });
    });

    taggedUsers.forEach((taggedUser) => {
      if (taggedUser._id.toString() !== userId) {
        Notification.create({
          recipient: taggedUser._id,
          message: `You were tagged in an updated forum post "${title}" by ${req.user.firstname} ${req.user.lastname} in ${req.course.title}`,
          courseId,
        });
        io.to(taggedUser._id.toString()).emit("newNotification", {
          message: `You were tagged in an updated forum post "${title}"`,
          courseId,
        });
      }
    });

    res.status(200).json({
      success: true,
      post: populatedPost,
      message: "Post updated successfully",
    });
  }),
];