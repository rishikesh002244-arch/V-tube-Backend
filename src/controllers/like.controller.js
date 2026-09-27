import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "incorrect videoID/data");
  }
  const likedAlready = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready._id);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unliked successfully"));
  }
  const like = await Like.create({ video: videoId, likedBy: req.user?._id });
  return res.status(200).json(new ApiResponse(200, {}, "liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "incorrect data");
  }
  const commentLikedAlready = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });
  if (commentLikedAlready) {
    await Like.findByIdAndDelete(commentLikedAlready._id);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unliked comment successfully"));
  }
  const commentLike = await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });
  return res.status(200).json(new ApiResponse(200, {}, "liked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet const {commentId} = req.params
  //TODO: toggle like on comment
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "incorrect data");
  }
  const tweetLikedAlready = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });
  if (tweetLikedAlready) {
    await Like.findByIdAndDelete(tweetLikedAlready._id);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unliked tweet successfully"));
  }
  const tweetLike = await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });
  return res.status(200).json(new ApiResponse(200, {}, "liked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
 const likedVideos = await  Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
      },
    },
    {
      $addFields: {
        likedVideo: {
          $arrayElemAt: ["$likedVideo", 0],
        },
      },
    },
    {
      $project: {
        likedVideo:1,
        _id: 0,
      },
    },
  ]);
  return res.status(200)
  .json (new ApiResponse
    (200, likedVideos, 
        "Liked videos fetched successfully") )   
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
